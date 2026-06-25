<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;

use App\Support\StructuredAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use App\Mail\NewArtisanApplication;
use App\Models\ArtisanStatusLog;
use App\Models\User as UserModel;
use App\Notifications\NewArtisanApplicationNotification;

class ArtisanSetupController extends Controller
{
    public function create()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        
        // Guard: Only artisans can access this page
        if (!$user->isArtisan()) {
            return redirect('/shop');
        }
        
        // Guard: Already approved artisans go to dashboard
        if ($user->isApproved()) {
            return redirect()->route('dashboard');
        }
        
        // Guard: Pending approval artisans go to pending page
        if ($user->isPendingApproval() && $user->setup_completed_at) {
            return redirect()->route('artisan.pending');
        }
        
        return Inertia::render('Auth/ArtisanSetup');
    }

    public function store(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $step = $request->input('current_step');

        // --- STEP 1: SHOP INFO ---
        if ($step == 1) {
            $validated = $request->validate([
                'shop_name' => ['required', 'string', 'max:30', Rule::unique('users', 'shop_name')->ignore($user->id)],
                'phone_number' => 'required|string|max:20',
                'street_address' => 'required|string|max:255',
                'region' => 'required|string|max:255',
                'city' => 'required|string',
                'zip_code' => 'required|string|max:10',
                'barangay' => 'required|string', 
            ]);

            $user->update([
                'shop_name' => $validated['shop_name'],
                'phone_number' => $validated['phone_number'],
                'street_address' => $validated['street_address'],
                'barangay' => $validated['barangay'],
                'city' => $validated['city'],
                'region' => $validated['region'],
                'zip_code' => $validated['zip_code'],
            ]);

            if (!$user->addresses()->exists()) {
                $user->addresses()->create([
                    'label' => 'Shop',
                    'address_type' => 'office',
                    'recipient_name' => $user->name,
                    'phone_number' => $validated['phone_number'],
                    'street_address' => $validated['street_address'],
                    'barangay' => $validated['barangay'],
                    'city' => $validated['city'],
                    'region' => $validated['region'],
                    'postal_code' => $validated['zip_code'],
                    'full_address' => StructuredAddress::formatPhilippineAddress([
                        'street_address' => $validated['street_address'],
                        'barangay' => $validated['barangay'],
                        'city' => $validated['city'],
                        'region' => $validated['region'],
                        'postal_code' => $validated['zip_code'],
                    ]),
                    'is_default' => true,
                ]);
            }

            return back(); 
        }

        // --- STEP 2: LEGAL FILES ---
        if ($step == 2) {
            $request->validate([
                'business_permit' => [$user->business_permit ? 'nullable' : 'required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
                'dti_registration' => [$user->dti_registration ? 'nullable' : 'required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
                'valid_id' => [$user->valid_id ? 'nullable' : 'required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
                'tin_id' => [$user->tin_id ? 'nullable' : 'required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
            ]);

            $documentFlags = [];
            $upload = function ($key) use ($request, $user, &$documentFlags) {
                if ($request->hasFile($key)) {
                    $file = $request->file($key);
                    $flags = [];

                    // Check file size (suspiciously small)
                    if ($file->getSize() < 5120) { // < 5KB
                        $flags[] = 'empty_or_corrupt';
                    }

                    // Check image resolution if it's an image
                    if (str_starts_with($file->getMimeType(), 'image/')) {
                        $dimensions = getimagesize($file->getRealPath());
                        if ($dimensions) {
                            $width = $dimensions[0];
                            $height = $dimensions[1];
                            if ($width < 300 || $height < 300) {
                                $flags[] = 'low_resolution';
                            }
                        }
                    }

                    $documentFlags[$key] = $flags;
                    return $file->store('legal_docs', 'public');
                }
                return $user->{$key};
            };

            $user->update([
                'business_permit' => $upload('business_permit'),
                'dti_registration' => $upload('dti_registration'),
                'valid_id' => $upload('valid_id'),
                'tin_id' => $upload('tin_id'),
                'document_flags' => $documentFlags,
            ]);

            return back();
        }

        // --- STEP 3: PAYMENT DETAILS ---
        if ($step == 3) {
            $validated = $request->validate([
                'payout_method' => 'required|string|max:50',
                'payout_account_name' => 'required|string|max:100',
                'payout_account_number' => 'required|string|max:100',
            ]);

            $user->update([
                'payout_method' => $validated['payout_method'],
                'payout_account_name' => $validated['payout_account_name'],
                'payout_account_number' => $validated['payout_account_number'],
                'setup_completed_at' => now(),
                'artisan_status' => 'pending',
                'artisan_rejection_reason' => null,
            ]);

            ArtisanStatusLog::create([
                'user_id' => $user->id,
                'previous_status' => $user->artisan_status,
                'new_status' => 'pending',
            ]);

            \App\Models\PlatformActivity::create([
                'user_id' => $user->id,
                'action' => 'artisan_registered',
                'description' => 'A new artisan shop applied: ' . $user->shop_name,
                'metadata' => ['shop_name' => $user->shop_name]
            ]);

            $emailResult = $this->sendApplicationEmails($user);
            
            if ($emailResult === 'failed_send') {
                return redirect()
                    ->route('artisan.pending')
                    ->with('warning', 'Application submitted, but the admin notification email could not be sent.');
            }
            
            return redirect()->route('artisan.pending');
        }

        return back()->with('error', 'Invalid step');
    }

    public function dismissWelcome(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        
        if ($user->isArtisan()) {
            $user->update(['artisan_welcomed' => true]);
        }
        
        return back();
    }

    private function sendApplicationEmails(UserModel $user): string
    {
        UserModel::query()
            ->where('role', 'super_admin')
            ->each(function (UserModel $admin) use ($user): void {
                $admin->notify(new NewArtisanApplicationNotification($user));
            });

        $adminEmails = collect([
            config('services.artisan_applications.notification_email'),
        ])
            ->flatMap(function ($value) {
                if (!filled($value)) {
                    return [];
                }

                return preg_split('/[,;]+/', (string) $value) ?: [];
            })
            ->merge(
                UserModel::query()
                    ->where('role', 'super_admin')
                    ->whereNotNull('email')
                    ->pluck('email')
            )
            ->map(fn ($email) => strtolower(trim((string) $email)))
            ->filter(fn ($email) => filter_var($email, FILTER_VALIDATE_EMAIL))
            ->unique()
            ->values();

        if ($adminEmails->isNotEmpty()) {
            try {
                $mailer = Mail::to($adminEmails->all());

                if (app()->environment('production') && config('queue.default') !== 'sync') {
                    $mailer->queue(new NewArtisanApplication($user));
                } else {
                    $mailer->send(new NewArtisanApplication($user));
                }
            } catch (\Throwable $e) {
                report($e);
                return 'failed_send';
            }
        }

        if ($adminEmails->isEmpty()) {
            Log::warning('Artisan application submitted without an email recipient.', [
                'artisan_user_id' => $user->id,
                'shop_name' => $user->shop_name,
            ]);

            return 'no_recipients';
        }

        return 'success';
    }

    public function acceptTerms(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if ($user && $user->isArtisan()) {
            $user->complianceAgreements()->updateOrCreate(
                ['document_type' => 'seller_terms'],
                [
                    'accepted_at' => now(),
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]
            );
        }

        return back()->with('success', 'Terms accepted successfully.');
    }
}

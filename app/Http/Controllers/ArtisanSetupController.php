<?php

namespace App\Http\Controllers;

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
                'business_permit' => 'required|file|mimes:jpg,jpeg,png,pdf|max:10240',
                'dti_registration' => 'required|file|mimes:jpg,jpeg,png,pdf|max:10240',
                'valid_id' => 'required|file|mimes:jpg,jpeg,png,pdf|max:10240',
                'tin_id' => 'required|file|mimes:jpg,jpeg,png,pdf|max:10240',
            ]);

            $upload = function ($key) use ($request) {
                if ($request->hasFile($key)) {
                    return $request->file($key)->store('legal_docs', 'public');
                }
                return null;
            };

            ArtisanStatusLog::create([
                'user_id' => $user->id,
                'previous_status' => $user->artisan_status,
                'new_status' => 'pending',
            ]);

            $user->update([
                'business_permit' => $upload('business_permit'),
                'dti_registration' => $upload('dti_registration'),
                'valid_id' => $upload('valid_id'),
                'tin_id' => $upload('tin_id'),
                'setup_completed_at' => now(),
                'artisan_status' => 'pending',
                'artisan_rejection_reason' => null,
            ]);

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
                    Mail::to($adminEmails->all())->send(new NewArtisanApplication($user));
                } catch (\Throwable $e) {
                    report($e);

                    return redirect()
                        ->route('artisan.pending')
                        ->with('warning', 'Application submitted, but the admin notification email could not be sent.');
                }
            }

            if ($adminEmails->isEmpty()) {
                Log::warning('Artisan application submitted without an email recipient.', [
                    'artisan_user_id' => $user->id,
                    'shop_name' => $user->shop_name,
                ]);

                return redirect()
                    ->route('artisan.pending')
                    ->with('warning', 'Application submitted, but no admin email recipient is configured.');
            }

            return redirect()->route('artisan.pending');
        }

        return back()->with('error', 'Invalid step');
    }
}

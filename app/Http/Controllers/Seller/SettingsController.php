<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Review;
use App\Models\SellerLocation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class SettingsController extends Controller
{
    /**
     * Display the unified Global Settings Hub.
     */
    public function index(Request $request)
    {
        /** @var User $user */
        $user = $request->user();
        abort_unless($user && ($user->isArtisan() || $user->isWorkspaceOwner()), 403, 'Only the shop owner can access workspace settings.');

        $sellerOwner = $user->getEffectiveSeller() ?: $user;

        $locations = rescue(fn() => SellerLocation::where('user_id', $sellerOwner->id)
            ->withCount('employees')
            ->orderBy('created_at', 'desc')
            ->get(), collect());

        $productsCount = (int) Product::where('user_id', $sellerOwner->id)->where('status', 'Active')->count();
        $totalSales = (int) Product::where('user_id', $sellerOwner->id)->where('status', 'Active')->sum('sold');
        $avgRating = (float) (Review::whereHas('product', fn($q) => $q->where('user_id', $sellerOwner->id))
            ->visibleToMarketplace()
            ->avg('rating') ?? 0);

        $products = Product::where('user_id', $sellerOwner->id)
            ->where('status', 'Active')
            ->latest()
            ->take(12)
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'slug' => $p->slug,
                'name' => $p->name,
                'image' => $p->img,
                'price' => (float) $p->price,
                'seller' => $sellerOwner->shop_name ?? $sellerOwner->name,
                'location' => $sellerOwner->city ?? 'Philippines',
                'rating' => $p->rating ? round($p->rating, 1) : 0,
                'sold' => $p->sold ?? 0,
                'is_new' => $p->created_at ? $p->created_at->diffInDays(now()) < 7 : false,
            ]);

        return Inertia::render('Seller/Settings/GlobalSettings', [
            'sellerOwner' => [
                'id' => $sellerOwner->id,
                'name' => $sellerOwner->name,
                'email' => $sellerOwner->email,
                'shop_name' => $sellerOwner->shop_name,
                'shop_slug' => $sellerOwner->shop_slug,
                'city' => $sellerOwner->city ?? 'Philippines',
                'created_at' => $sellerOwner->created_at,
                'premium_tier' => $sellerOwner->premium_tier,
                'bio' => $sellerOwner->bio,
                'avatar' => $sellerOwner->avatar,
                'banner_image' => $sellerOwner->banner_image,
                'auto_reply_on_completion' => $sellerOwner->auto_reply_on_completion ?? false,
                'auto_reply_completion_message' => $sellerOwner->auto_reply_completion_message ?? '',
                'overtime_rate' => $sellerOwner->overtime_rate,
                'overtime_multiplier' => $sellerOwner->overtime_multiplier ?? 1.25,
                'payroll_factor_method' => $sellerOwner->payroll_factor_method ?? 'custom',
                'rest_day_ot_multiplier' => $sellerOwner->rest_day_ot_multiplier ?? 1.69,
                'holiday_ot_multiplier' => $sellerOwner->holiday_ot_multiplier ?? 2.60,
                'payroll_working_days' => $sellerOwner->payroll_working_days ?? 26,
                'standard_workday_hours' => $sellerOwner->standard_workday_hours ?? 8.00,
                'shift_start_time' => $sellerOwner->shift_start_time ?? '08:00',
                'shift_end_time' => $sellerOwner->shift_end_time ?? '17:00',
                'grace_period_minutes' => $sellerOwner->grace_period_minutes ?? 15,
                'earliest_clock_in_minutes' => $sellerOwner->earliest_clock_in_minutes ?? 30,
                'enforce_strict_shift_window' => (bool) ($sellerOwner->enforce_strict_shift_window ?? true),
                'break_window_start' => $sellerOwner->break_window_start ?? '11:30',
                'break_window_end' => $sellerOwner->break_window_end ?? '13:30',
                'break_allowance_minutes' => $sellerOwner->break_allowance_minutes ?? 60,
                'payout_method' => $sellerOwner->payout_method ?? 'GCash',
                'payout_account_name' => $sellerOwner->payout_account_name ?? '',
                'payout_account_number' => $sellerOwner->payout_account_number ?? '',
            ],
            'products' => $products,
            'stats' => [
                'products' => $productsCount,
                'sales' => $totalSales,
                'rating' => number_format($avgRating, 1),
            ],
            'locations' => $locations,
            'permissions' => [
                'can_edit_shop_settings' => $user->isArtisan() || $user->isWorkspaceOwner(),
                'can_edit_hr_settings' => ($user->isArtisan() || $user->can_edit_hr_records) && in_array($sellerOwner->premium_tier, ['premium', 'super_premium']),
                'can_edit_accounting' => ($user->isArtisan() || $user->can_access_accounting) && in_array($sellerOwner->premium_tier, ['premium', 'super_premium']),
                'is_premium_tier' => in_array($sellerOwner->premium_tier, ['premium', 'super_premium']),
            ],
        ]);
    }

    /**
     * Update the artisan's payout settlement account details.
     */
    public function updatePayout(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        abort_unless($user && ($user->isArtisan() || $user->isWorkspaceOwner()), 403, 'Only the shop owner can update payout settlement settings.');

        $sellerOwner = $user->getEffectiveSeller() ?: $user;

        $request->validate([
            'disbursement_method' => ['required', 'string', 'in:gcash,maya,bank,GCash,Maya,Bank Transfer'],
            'account_name' => ['required', 'string', 'min:2', 'max:100'],
            'account_number' => ['required', 'string', 'max:30'],
            'bank_name' => ['nullable', 'string', 'max:100'],
        ]);

        $methodInput = strtolower($request->input('disbursement_method'));
        $rawNumber = (string) $request->input('account_number');

        if (in_array($methodInput, ['gcash', 'maya'])) {
            // Strip all non-numeric characters (spaces, dashes, parentheses, letters, symbols)
            $digits = preg_replace('/[^0-9]/', '', $rawNumber);

            // Normalize +63 / 63 prefix to 09
            if (str_starts_with($digits, '639') && strlen($digits) === 12) {
                $digits = '0' . substr($digits, 2);
            } elseif (str_starts_with($digits, '9') && strlen($digits) === 10) {
                $digits = '0' . $digits;
            }

            if (!preg_match('/^09[0-9]{9}$/', $digits)) {
                return back()->withErrors([
                    'account_number' => 'Please enter a valid 11-digit Philippine mobile number starting with 09 (e.g. 0917 123 4567).',
                ]);
            }

            $sellerOwner->payout_method = $methodInput === 'gcash' ? 'GCash' : 'Maya';
            $sellerOwner->payout_account_number = $digits;
        } else {
            // Bank transfer: strip non-digits, require 8-20 digits
            $cleanNumber = preg_replace('/[^0-9]/', '', $rawNumber);
            if (strlen($cleanNumber) < 8 || strlen($cleanNumber) > 20) {
                return back()->withErrors([
                    'account_number' => 'Please enter a valid bank account number (8 to 20 digits).',
                ]);
            }

            $sellerOwner->payout_method = $request->input('bank_name') ?: 'Bank Transfer';
            $sellerOwner->payout_account_number = $cleanNumber;
        }

        $sellerOwner->payout_account_name = trim($request->input('account_name'));
        $sellerOwner->save();

        return redirect()->back()->with('success', 'Payout settlement details updated successfully.');
    }

    /**
     * Update the user's enabled modules.
     */
    public function updateModules(Request $request)
    {
        $request->validate([
            'hr' => 'boolean',
            'accounting' => 'boolean',
            'procurement' => 'boolean',
        ]);

        /** @var User $user */
        $user = Auth::user();

        if (!$user->canManageSellerModuleSettings()) {
            abort(403, 'Your current plan does not include module customization.');
        }

        $modules = [
            'hr' => $user->isEliteTier() ? true : $request->boolean('hr'),
            'accounting' => $user->isEliteTier() ? true : $request->boolean('accounting'),
            'procurement' => true,
        ];

        $user->modules_enabled = $modules;
        $user->save();

        return redirect()->back()->with('success', 'Module settings updated.');
    }
}

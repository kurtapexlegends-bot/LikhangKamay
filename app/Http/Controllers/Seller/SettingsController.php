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
        /** @var \App\Models\User $user */
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
     * Update the user's enabled modules.
     */
    public function updateModules(Request $request)
    {
        $request->validate([
            'hr' => 'boolean',
            'accounting' => 'boolean',
            'procurement' => 'boolean',
        ]);

        /** @var \App\Models\User $user */
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

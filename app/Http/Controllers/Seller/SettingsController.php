<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
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
        $sellerOwner = $user->getEffectiveSeller() ?: $user;

        $locations = SellerLocation::where('user_id', $sellerOwner->id)
            ->withCount('employees')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Seller/Settings/GlobalSettings', [
            'sellerOwner' => [
                'id' => $sellerOwner->id,
                'name' => $sellerOwner->name,
                'email' => $sellerOwner->email,
                'shop_name' => $sellerOwner->shop_name,
                'shop_slug' => $sellerOwner->shop_slug,
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
            ],
            'locations' => $locations,
            'permissions' => [
                'can_edit_shop_settings' => $user->isArtisan() || $user->isWorkspaceOwner(),
                'can_edit_hr_settings' => $user->isArtisan() || $user->can_edit_hr_records,
                'can_edit_accounting' => $user->isArtisan() || $user->can_access_accounting,
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

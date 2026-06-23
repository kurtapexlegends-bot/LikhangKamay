<?php

namespace App\Support\HR;

use App\Models\User;
use App\Services\SellerEntitlementService;

class HRRolePresets
{
    public static function rolePresetOptions(SellerEntitlementService $entitlementService): array
    {
        $labels = [
            'shop_manager' => ['label' => 'Shop Manager', 'description' => 'Full administrative control. Can manage products, financials, and staff.'],
            'accountant' => ['label' => 'Accountant', 'description' => 'Focus on financials. Can view revenue, manage payroll, and approve payouts.'],
            'stock_clerk' => ['label' => 'Stock Clerk', 'description' => 'Operations focus. Can manage inventory, process orders, and request supplies.'],
            'customer_support' => ['label' => 'Customer Care', 'description' => 'Orders, buyer messages, team inbox, and customer review handling.'],
            'hr' => ['label' => 'People & Payroll', 'description' => 'Employee records, payroll prep, and workspace access coordination.'],
            'accounting' => ['label' => 'Finance Review', 'description' => 'Legacy finance visibility role.'],
            'procurement' => ['label' => 'Procurement', 'description' => 'Legacy inventory tracking role.'],
            'custom' => ['label' => 'Custom Capability Mix', 'description' => 'Start blank and choose the exact capabilities manually.'],
        ];

        return collect($entitlementService->getRolePresetDefaults())
            ->map(function (array $modules, string $key) use ($labels) {
                return [
                    'key' => $key,
                    'label' => $labels[$key]['label'] ?? ucfirst(str_replace('_', ' ', $key)),
                    'description' => $labels[$key]['description'] ?? '',
                    'modules' => $modules,
                ];
            })
            ->values()
            ->all();
    }

    public static function moduleOptions(SellerEntitlementService $entitlementService): array
    {
        $labels = [
            'overview' => ['label' => 'Overview', 'description' => 'Seller dashboard overview.'],
            'products' => ['label' => 'Products', 'description' => 'Product manager and stock actions.'],
            'analytics' => ['label' => 'Analytics', 'description' => 'Sales and product performance reports.'],
            '3d' => ['label' => '3D Manager', 'description' => '3D asset uploads and management.'],
            'orders' => ['label' => 'Orders', 'description' => 'Order processing and status updates.'],
            'messages' => ['label' => 'Messages', 'description' => 'Buyer inbox and seller order conversations.'],
            'team_messages' => ['label' => 'Team Inbox', 'description' => 'Internal seller workspace conversations.'],
            'reviews' => ['label' => 'Reviews', 'description' => 'Customer review replies and moderation.'],
            'shop_settings' => ['label' => 'Shop Settings', 'description' => 'Seller storefront profile settings.'],
            'hr' => ['label' => 'People & Payroll', 'description' => 'Employee records, payroll prep, and workspace access management.'],
            'accounting' => ['label' => 'Finance Approvals', 'description' => 'Finance review, fund visibility, and payroll approval.'],
            'procurement' => ['label' => 'Inventory', 'description' => 'Inventory tracking, supply management, and purchasing workflows.'],
            'stock_requests' => ['label' => 'Restock Requests', 'description' => 'Restock request tracking and approval flow.'],
        ];

        return collect($entitlementService->getSupportedStaffModules())
            ->map(function (string $module) use ($labels) {
                return [
                    'key' => $module,
                    'label' => $labels[$module]['label'] ?? ucfirst(str_replace('_', ' ', $module)),
                    'description' => $labels[$module]['description'] ?? '',
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, string>>
     */
    public static function userLevelOptions(): array
    {
        return [
            [
                'key' => User::DEFAULT_STAFF_USER_LEVEL,
                'label' => 'Staff',
                'description' => 'Can use the modules you grant, but cannot manage other staff logins or permissions.',
            ],
            [
                'key' => User::STAFF_MANAGER_USER_LEVEL,
                'label' => 'Staff Manager',
                'description' => 'Can manage employee logins and staff permissions inside People & Payroll when that capability is enabled.',
            ],
        ];
    }

    public static function permissionLevelLabel(?string $level): string
    {
        return match (User::normalizeStaffAccessPermissionLevel($level)) {
            User::STAFF_ACCESS_PERMISSION_CAN_EDIT => 'Can Edit',
            default => 'Read Only',
        };
    }

    /**
     * @return array<int, string>
     */
    public static function rolePresetModules(string $presetKey): array
    {
        return app(SellerEntitlementService::class)->getRolePresetDefaults()[$presetKey] ?? [];
    }
}

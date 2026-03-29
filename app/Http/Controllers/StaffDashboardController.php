<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Employee;
use App\Models\Order;
use App\Models\Payroll;
use App\Models\Review;
use App\Models\StockRequest;
use App\Models\TeamMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StaffDashboardController extends Controller
{
    use InteractsWithSellerContext;

    public function index(Request $request): Response|RedirectResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        abort_unless($user && $user->isStaff(), 403, 'Staff access only.');

        if (!$user->canAccessSellerWorkspace()) {
            return redirect()->route('staff.home');
        }

        $seller = $user->getEffectiveSeller();

        if (!$seller || !$seller->canAccessSellerOwnerRoutes()) {
            return redirect()->route('staff.home');
        }

        $visibleModules = $user->getSellerEntitlements()['visibleModules'] ?? [];
        $unreadTeamMessages = TeamMessage::query()
            ->where('seller_owner_id', $seller->id)
            ->where('receiver_id', $user->id)
            ->where('is_read', false)
            ->count();

        return Inertia::render('Staff/Dashboard', [
            'hub' => $this->buildHubPayload($user, $seller, $visibleModules, $unreadTeamMessages),
        ]);
    }

    /**
     * @param  array<int, string>  $visibleModules
     * @return array<string, mixed>
     */
    private function buildHubPayload($user, $seller, array $visibleModules, int $unreadTeamMessages): array
    {
        $presetKey = $user->staff_role_preset_key ?: 'custom';
        $variant = in_array($presetKey, ['customer_support', 'custom'], true) ? 'crm' : $presetKey;
        $sellerId = $seller->id;

        $employeeCount = Employee::where('user_id', $sellerId)->count();
        $activeEmployees = Employee::where('user_id', $sellerId)->where('status', 'Active')->count();
        $pendingPayrolls = Payroll::where('user_id', $sellerId)->where('status', 'Pending')->count();
        $pendingReleases = StockRequest::where('user_id', $sellerId)->where('status', StockRequest::STATUS_PENDING)->count();
        $inboundRequests = StockRequest::where('user_id', $sellerId)
            ->whereIn('status', [
                StockRequest::STATUS_ACCOUNTING_APPROVED,
                StockRequest::STATUS_ORDERED,
                StockRequest::STATUS_PARTIALLY_RECEIVED,
                StockRequest::STATUS_RECEIVED,
            ])
            ->count();
        $supplyCount = \App\Models\Supply::where('user_id', $sellerId)->count();
        $lowStockCount = \App\Models\Supply::where('user_id', $sellerId)->where('quantity', '<=', 5)->count();
        $ordersNeedingAttention = Order::where('artisan_id', $sellerId)
            ->whereIn('status', ['Pending', 'Refund/Return'])
            ->count();
        $activeReturns = Order::where('artisan_id', $sellerId)
            ->where('status', 'Refund/Return')
            ->count();
        $unresolvedReviews = Review::where('artisan_id', $sellerId)
            ->whereNull('seller_reply')
            ->count();

        $variantMeta = match ($variant) {
            'hr' => [
                'title' => 'HR Hub',
                'subtitle' => 'Employee records, payroll preparation, and people operations.',
                'eyebrow' => 'Staff Workspace',
                'focus' => 'Human Resources',
                'theme' => 'clay',
                'stats' => [
                    ['label' => 'Employees', 'value' => $employeeCount, 'tone' => 'clay'],
                    ['label' => 'Active Staff', 'value' => $activeEmployees, 'tone' => 'emerald'],
                    ['label' => 'Pending Payrolls', 'value' => $pendingPayrolls, 'tone' => 'amber'],
                    ['label' => 'Unread Team Messages', 'value' => $unreadTeamMessages, 'tone' => 'sky'],
                ],
                'highlights' => [
                    'Keep employee records accurate and payroll drafts ready for accounting review.',
                    'Use the team inbox to confirm staffing updates with the shop owner.',
                ],
            ],
            'accounting' => [
                'title' => 'Accounting Hub',
                'subtitle' => 'Fund releases, payroll approvals, and finance checkpoints.',
                'eyebrow' => 'Staff Workspace',
                'focus' => 'Accounting',
                'theme' => 'emerald',
                'stats' => [
                    ['label' => 'Requests Awaiting Release', 'value' => $pendingReleases, 'tone' => 'emerald'],
                    ['label' => 'Pending Payroll Approvals', 'value' => $pendingPayrolls, 'tone' => 'amber'],
                    ['label' => 'Unread Team Messages', 'value' => $unreadTeamMessages, 'tone' => 'sky'],
                    ['label' => 'Completed Orders', 'value' => Order::where('artisan_id', $sellerId)->where('status', 'Completed')->count(), 'tone' => 'violet'],
                ],
                'highlights' => [
                    'Prioritize stock-request releases and payroll approvals that unblock operations.',
                    'Coordinate handoffs with HR and procurement without leaving the workspace.',
                ],
            ],
            'procurement' => [
                'title' => 'Procurement Hub',
                'subtitle' => 'Inventory health, supply requests, and inbound stock coordination.',
                'eyebrow' => 'Staff Workspace',
                'focus' => 'Procurement',
                'theme' => 'amber',
                'stats' => [
                    ['label' => 'Tracked Supplies', 'value' => $supplyCount, 'tone' => 'amber'],
                    ['label' => 'Low Stock Items', 'value' => $lowStockCount, 'tone' => 'red'],
                    ['label' => 'Inbound Requests', 'value' => $inboundRequests, 'tone' => 'indigo'],
                    ['label' => 'Unread Team Messages', 'value' => $unreadTeamMessages, 'tone' => 'sky'],
                ],
                'highlights' => [
                    'Monitor inventory pressure points before stockouts affect production.',
                    'Track incoming stock requests from approval through receiving.',
                ],
            ],
            default => [
                'title' => $presetKey === 'customer_support' ? 'Customer Support Hub' : 'Custom CRM Hub',
                'subtitle' => 'Orders, returns, reviews, and team coordination in one place.',
                'eyebrow' => 'Staff Workspace',
                'focus' => $presetKey === 'customer_support' ? 'Customer Support' : 'Custom Access',
                'theme' => 'sky',
                'stats' => [
                    ['label' => 'Orders Needing Attention', 'value' => $ordersNeedingAttention, 'tone' => 'sky'],
                    ['label' => 'Active Returns', 'value' => $activeReturns, 'tone' => 'amber'],
                    ['label' => 'Reviews Awaiting Reply', 'value' => $unresolvedReviews, 'tone' => 'violet'],
                    ['label' => 'Unread Team Messages', 'value' => $unreadTeamMessages, 'tone' => 'emerald'],
                ],
                'highlights' => [
                    'Stay on top of orders, replacements, and customer feedback without using the owner dashboard.',
                    'Custom access only surfaces tools the shop owner explicitly granted to this staff account.',
                ],
            ],
        };

        return [
            'variant' => $variant,
            'presetKey' => $presetKey,
            'sellerName' => $seller->shop_name ?: $seller->name,
            'staffName' => $user->name,
            'visibleModules' => array_values($visibleModules),
            'teamMessagesRoute' => 'team-messages.index',
            ...$variantMeta,
            'cards' => $this->buildCardsForVariant(
                $variant,
                $visibleModules,
                [
                    'employeeCount' => $employeeCount,
                    'pendingPayrolls' => $pendingPayrolls,
                    'pendingReleases' => $pendingReleases,
                    'supplyCount' => $supplyCount,
                    'lowStockCount' => $lowStockCount,
                    'inboundRequests' => $inboundRequests,
                    'ordersNeedingAttention' => $ordersNeedingAttention,
                    'activeReturns' => $activeReturns,
                    'unresolvedReviews' => $unresolvedReviews,
                    'unreadTeamMessages' => $unreadTeamMessages,
                ]
            ),
        ];
    }

    /**
     * @param  array<int, string>  $visibleModules
     * @param  array<string, int>  $metrics
     * @return array<int, array<string, mixed>>
     */
    private function buildCardsForVariant(string $variant, array $visibleModules, array $metrics): array
    {
        $hasModule = fn (string $module): bool => in_array($module, $visibleModules, true);

        $catalog = [
            'hr' => [
                'module' => 'hr',
                'title' => 'Employee Directory',
                'description' => 'Manage employees, linked staff accounts, and payroll preparation.',
                'routeName' => 'hr.index',
                'metricLabel' => 'Employees',
                'metricValue' => $metrics['employeeCount'],
                'tone' => 'clay',
            ],
            'accounting' => [
                'module' => 'accounting',
                'title' => 'Accounting Queue',
                'description' => 'Review fund releases and payroll approvals waiting for action.',
                'routeName' => 'accounting.index',
                'metricLabel' => 'Pending Items',
                'metricValue' => $metrics['pendingReleases'] + $metrics['pendingPayrolls'],
                'tone' => 'emerald',
            ],
            'procurement' => [
                'module' => 'procurement',
                'title' => 'Inventory Control',
                'description' => 'Track supply levels and restocking activity.',
                'routeName' => 'procurement.index',
                'metricLabel' => 'Tracked Supplies',
                'metricValue' => $metrics['supplyCount'],
                'tone' => 'amber',
            ],
            'stock_requests' => [
                'module' => 'stock_requests',
                'title' => 'Stock Requests',
                'description' => 'Monitor requests moving through approval and receiving.',
                'routeName' => 'stock-requests.index',
                'metricLabel' => 'Inbound',
                'metricValue' => $metrics['inboundRequests'],
                'tone' => 'indigo',
            ],
            'orders' => [
                'module' => 'orders',
                'title' => 'Orders Needing Attention',
                'description' => 'Jump into pending orders and active replacements quickly.',
                'routeName' => 'orders.index',
                'metricLabel' => 'Needs Action',
                'metricValue' => $metrics['ordersNeedingAttention'],
                'tone' => 'sky',
            ],
            'reviews' => [
                'module' => 'reviews',
                'title' => 'Reviews Queue',
                'description' => 'Reply to customer feedback and close the loop on issues.',
                'routeName' => 'reviews.index',
                'metricLabel' => 'Awaiting Reply',
                'metricValue' => $metrics['unresolvedReviews'],
                'tone' => 'violet',
            ],
            'products' => [
                'module' => 'products',
                'title' => 'Product Manager',
                'description' => 'Review listings and stock-sensitive products from your granted access.',
                'routeName' => 'products.index',
                'metricLabel' => 'Low Stock Items',
                'metricValue' => $metrics['lowStockCount'],
                'tone' => 'rose',
            ],
            'analytics' => [
                'module' => 'analytics',
                'title' => 'Analytics Snapshot',
                'description' => 'Open the allowed analytics view for shop performance context.',
                'routeName' => 'analytics.index',
                'metricLabel' => 'Returns in Flow',
                'metricValue' => $metrics['activeReturns'],
                'tone' => 'slate',
            ],
            'team_messages' => [
                'module' => 'team_messages',
                'title' => 'Team Inbox',
                'description' => 'Coordinate with the owner and teammates without using buyer chat.',
                'routeName' => 'team-messages.index',
                'metricLabel' => 'Unread',
                'metricValue' => $metrics['unreadTeamMessages'],
                'tone' => 'emerald',
            ],
        ];

        $variantOrder = match ($variant) {
            'hr' => ['hr', 'team_messages', 'accounting'],
            'accounting' => ['accounting', 'team_messages', 'orders'],
            'procurement' => ['procurement', 'stock_requests', 'team_messages'],
            default => ['orders', 'reviews', 'team_messages', 'products', 'analytics', 'hr', 'accounting', 'procurement', 'stock_requests'],
        };

        return collect($variantOrder)
            ->filter(function (string $key) use ($catalog, $hasModule) {
                if (!isset($catalog[$key])) {
                    return false;
                }

                if ($key === 'team_messages') {
                    return true;
                }

                return $hasModule($catalog[$key]['module']);
            })
            ->map(fn (string $key) => $catalog[$key])
            ->values()
            ->all();
    }
}

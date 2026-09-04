<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Employee;
use App\Models\Order;
use App\Models\OrderDelivery;
use App\Models\Payroll;
use App\Models\Review;
use App\Models\StockRequest;
use App\Models\TeamMessage;
use App\Models\User;
use App\Services\StaffAttendanceService;
use Illuminate\Support\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StaffDashboardController extends Controller
{
    use InteractsWithSellerContext;

    public function index(Request $request, StaffAttendanceService $attendanceService): Response|RedirectResponse
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

        $isDriver = $user->staff_role_preset_key === 'driver' || ($user->employee && $user->employee->role === 'Logistics / Driver');
        $hasOpenSession = $attendanceService->getOpenSession($user) !== null;

        if ($isDriver && $hasOpenSession) {
            return redirect()->route('staff.deliveries');
        }

        $visibleModules = $user->getSellerEntitlements()['visibleModules'] ?? [];
        $unreadTeamMessages = TeamMessage::query()
            ->where('seller_owner_id', $seller->id)
            ->where('receiver_id', $user->id)
            ->where('is_read', \App\Casts\PostgresCompatibleBoolean::dbVal(false))
            ->count();

        return Inertia::render('Staff/Dashboard', [
            'hub' => $this->buildHubPayload($user, $seller, $visibleModules, $unreadTeamMessages),
        ]);
    }

    /**
     * @param  array<int, string>  $visibleModules
     * @return array<string, mixed>
     */
    private function buildHubPayload(User $user, User $seller, array $visibleModules, int $unreadTeamMessages): array
    {
        $presetKey = $user->staff_role_preset_key ?: 'custom';
        $variant = match ($presetKey) {
            'customer_support', 'custom' => 'crm',
            'stock_clerk' => 'procurement',
            'accountant' => 'accounting',
            'shop_manager' => 'crm',
            default => $presetKey,
        };
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
        $unresolvedReviews = Review::query()
            ->whereNull('seller_reply')
            ->whereHas('product', fn($query) => $query->where('user_id', $sellerId))
            ->count();

        $driverDeliveriesToday = 0;
        if ($variant === 'driver') {
            $employeeId = $user->employee?->id ?? ($user->employee_id ?? null);
            $driverDeliveriesToday = OrderDelivery::query()
                ->where('provider', OrderDelivery::PROVIDER_IN_HOUSE)
                ->where(function ($q) use ($user, $employeeId) {
                    $q->where('driver_user_id', $user->id);
                    if ($employeeId) {
                        $q->orWhere('driver_employee_id', $employeeId);
                    }
                })
                ->where(function ($q) {
                    $q->whereDate('dispatched_at', Carbon::today())
                        ->orWhereDate('delivered_at', Carbon::today());
                })
                ->count();
        }

        $variantMeta = match ($variant) {
            'driver' => [
                'title' => 'Logistics Hub',
                'subtitle' => 'Local delivery dispatches, route runs, and proof-of-delivery checkpoints.',
                'eyebrow' => 'Driver Workspace',
                'focus' => 'Logistics & Dispatch',
                'theme' => 'clay',
                'stats' => [
                    ['label' => 'Today Deliveries', 'value' => $driverDeliveriesToday, 'tone' => 'emerald', 'routeName' => 'staff.deliveries'],
                    ['label' => 'Unread Team Messages', 'value' => $unreadTeamMessages, 'tone' => 'sky', 'routeName' => 'team-messages.index'],
                ],
                'highlights' => [
                    'Complete your quick face photo and store location check to start your shift.',
                    'Once on duty, your local delivery dispatches will appear in your delivery console.',
                ],
            ],
            'hr' => [
                'title' => 'HR Hub',
                'subtitle' => 'Employee records, payroll preparation, and people operations.',
                'eyebrow' => 'Staff Workspace',
                'focus' => 'Human Resources',
                'theme' => 'clay',
                'stats' => array_values(array_filter([
                    ['label' => 'Employees', 'value' => $employeeCount, 'routeName' => 'seller.hr'],
                    ['label' => 'Active Staff', 'value' => $activeEmployees, 'routeName' => 'seller.hr'],
                    $user->hasStaffCapability(User::CAP_VIEW_PAYROLL) ? ['label' => 'Pending Payrolls', 'value' => $pendingPayrolls, 'routeName' => 'seller.hr'] : null,
                    ['label' => 'Unread Team Messages', 'value' => $unreadTeamMessages, 'routeName' => 'team-messages.index'],
                ])),
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
                'stats' => array_values(array_filter([
                    ['label' => 'Requests Awaiting Release', 'value' => $pendingReleases, 'tone' => 'emerald', 'routeName' => 'seller.fund-release.index'],
                    $user->hasStaffCapability(User::CAP_VIEW_PAYROLL) ? ['label' => 'Pending Payroll Approvals', 'value' => $pendingPayrolls, 'tone' => 'amber', 'routeName' => 'seller.hr'] : null,
                    ['label' => 'Unread Team Messages', 'value' => $unreadTeamMessages, 'tone' => 'sky', 'routeName' => 'team-messages.index'],
                    $user->hasStaffCapability(User::CAP_VIEW_REVENUE) ? ['label' => 'Completed Orders', 'value' => Order::where('artisan_id', $sellerId)->where('status', 'Completed')->count(), 'tone' => 'violet', 'routeName' => 'orders.index'] : null,
                ])),
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
                    ['label' => 'Tracked Supplies', 'value' => $supplyCount, 'tone' => 'amber', 'routeName' => 'seller.procurement.index'],
                    ['label' => 'Low Stock Items', 'value' => $lowStockCount, 'tone' => 'red', 'routeName' => 'seller.procurement.index'],
                    ['label' => 'Inbound Requests', 'value' => $inboundRequests, 'tone' => 'indigo', 'routeName' => 'seller.procurement.index'],
                    ['label' => 'Unread Team Messages', 'value' => $unreadTeamMessages, 'tone' => 'sky', 'routeName' => 'team-messages.index'],
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
                    ['label' => 'Orders Needing Attention', 'value' => $ordersNeedingAttention, 'tone' => 'sky', 'routeName' => 'orders.index'],
                    ['label' => 'Active Returns', 'value' => $activeReturns, 'tone' => 'amber', 'routeName' => 'orders.index'],
                    ['label' => 'Reviews Awaiting Reply', 'value' => $unresolvedReviews, 'tone' => 'violet', 'routeName' => 'reviews.index'],
                    ['label' => 'Unread Team Messages', 'value' => $unreadTeamMessages, 'tone' => 'emerald', 'routeName' => 'team-messages.index'],
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
                    'driverDeliveriesToday' => $driverDeliveriesToday,
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
        $hasModule = fn(string $module): bool => in_array($module, $visibleModules, true);

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
            'deliveries' => [
                'module' => 'deliveries',
                'title' => 'Delivery Console',
                'description' => 'View route dispatches and complete drop-offs with proof-of-delivery.',
                'routeName' => 'staff.deliveries',
                'metricLabel' => 'Deliveries',
                'metricValue' => $metrics['driverDeliveriesToday'] ?? 0,
                'tone' => 'clay',
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
            'driver' => ['deliveries', 'orders', 'team_messages'],
            default => ['orders', 'reviews', 'team_messages', 'products', 'analytics', 'hr', 'accounting', 'procurement', 'stock_requests'],
        };

        return collect($variantOrder)
            ->filter(function (string $key) use ($catalog, $hasModule) {
                if (!isset($catalog[$key])) {
                    return false;
                }

                if ($catalog[$key]['module'] === 'deliveries') {
                    return true;
                }

                return $hasModule($catalog[$key]['module']);
            })
            ->map(fn(string $key) => $catalog[$key])
            ->values()
            ->all();
    }
}

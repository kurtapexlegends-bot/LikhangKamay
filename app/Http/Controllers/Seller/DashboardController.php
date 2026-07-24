<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Order;
use App\Models\OrderItem;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Cache;
use App\Services\Analytics\ShopAnalyticsMetricsService;

class DashboardController extends Controller
{
    use InteractsWithSellerContext;

    public function index(Request $request, ShopAnalyticsMetricsService $metricsService)
    {
        try {
            /** @var \App\Models\User $user */
            $user = $request->user();

            if ($user->isAdmin()) {
                return redirect()->route('admin.dashboard');
            }

            if ($user->isStaff()) {
                if (!$user->canAccessSellerWorkspace()) {
                    return redirect()->route('staff.home');
                }

                return redirect()->route('staff.dashboard');
            } elseif (!$user->isArtisan()) {
                return redirect('/shop');
            }

            if ($user->isArtisan() && is_null($user->setup_completed_at)) {
                return redirect()->route('artisan.setup');
            }

            if ($user->isArtisan() && $user->isPendingApproval()) {
                return redirect()->route('artisan.pending');
            }

            if ($user->isArtisan() && $user->isRejected()) {
                return redirect()->route('artisan.setup');
            }

            $seller = $user->getEffectiveSeller() ?? $user;
            $userId = $seller->id;

            $cachedMetrics = $metricsService->getSellerDashboardMetrics($userId);

            // Extract cached variables
            extract($cachedMetrics);

            $query = Order::where('artisan_id', $userId)
                ->with(['items', 'user'])
                ->orderBy('created_at', 'desc');

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('order_number', 'like', "%{$search}%")
                        ->orWhere('customer_name', 'like', "%{$search}%");
                });
            }

            if ($request->filled('status') && $request->status !== 'All') {
                $query->where('status', $request->status);
            }

            if ($request->filled('date')) {
                try {
                    $date = Carbon::parse($request->date);
                    $query->whereDate('created_at', $date);
                } catch (\Exception $e) {
                    // Ignore invalid date.
                }
            }

            $recentOrdersPaginator = $query->paginate(5)->withQueryString();

            $recentOrders = [
                'data' => collect($recentOrdersPaginator->items())->map(function ($order) {
                    return [
                        'id' => $order->order_number,
                        'customer' => $order->customer_name,
                        'customer_avatar' => \App\Services\StorageUrl::url($order->user?->avatar),
                        'date' => $order->created_at->format('M d, Y'),
                        'amount' => $order->seller_net_amount,
                        'status' => $order->status,
                        'img' => \App\Services\StorageUrl::url($order->items->first()?->product_img, '/images/placeholder.svg'),
                    ];
                }),
                'links' => $recentOrdersPaginator->linkCollection(),
                'current_page' => $recentOrdersPaginator->currentPage(),
                'last_page' => $recentOrdersPaginator->lastPage(),
                'total' => $recentOrdersPaginator->total(),
            ];

            $pendingRequests = \App\Models\StockRequest::where('user_id', $userId)
                ->where('status', 'pending')
                ->count();

            $totalDeductions = \App\Models\StockRequest::where('user_id', $userId)
                ->whereIn('status', [
                    'accounting_approved',
                    'ordered',
                    'partially_received',
                    'received',
                    'completed',
                    ])
                ->sum('total_cost');

            return Inertia::render('Seller/Layout/Dashboard', [
                'metrics' => [
                    'revenue' => $revenueData['value'] ?? 0,
                    'revenue_growth' => $revenueData['growth'] ?? 0,
                    'orders' => $ordersData['value'] ?? 0,
                    'orders_growth' => $ordersData['growth'] ?? 0,
                    'customers' => $customersData['value'] ?? 0,
                    'customers_growth' => $customersData['growth'] ?? 0,
                    'avg_value' => $avgValue ?? 0,
                    'avg_growth' => $avgGrowth ?? 0,
                    'pending_requests' => $pendingRequests ?? 0,
                    'total_deductions' => $totalDeductions ?? 0,
                    'pending_orders' => $pendingOrders ?? 0,
                    'stalled_orders' => $stalledOrders ?? 0,
                    'low_stock_count' => $lowStockProducts ?? 0,
                ],
                'subscription' => [
                    'plan' => $seller->premium_tier ?? 'Basic',
                    'activeCount' => 0,
                    'limit' => 5,
                ],
                'chartData' => ['monthly' => $monthlyData ?? [], 'yearly' => $yearlyData ?? []],
                'categoryData' => $categoryData ?? [],
                'recentOrders' => $recentOrders ?? ['data' => [], 'links' => [], 'current_page' => 1, 'last_page' => 1, 'total' => 0],
                'filters' => $request->only(['search', 'status', 'date']),
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Dashboard error: " . $e->getMessage());
            return Inertia::render('Seller/Layout/Dashboard', [
                'metrics' => [
                    'revenue' => 0, 'revenue_growth' => 0, 'orders' => 0, 'orders_growth' => 0,
                    'customers' => 0, 'customers_growth' => 0, 'avg_value' => 0, 'avg_growth' => 0,
                    'pending_requests' => 0, 'total_deductions' => 0, 'pending_orders' => 0,
                    'stalled_orders' => 0, 'low_stock_count' => 0,
                ],
                'subscription' => ['plan' => 'Basic', 'activeCount' => 0, 'limit' => 5],
                'chartData' => ['monthly' => [], 'yearly' => []],
                'categoryData' => [],
                'recentOrders' => ['data' => [], 'links' => [], 'current_page' => 1, 'last_page' => 1, 'total' => 0],
                'filters' => [],
                'db_error' => true 
            ]);
        }
    }

}

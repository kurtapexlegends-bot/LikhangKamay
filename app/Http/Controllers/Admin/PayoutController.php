<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payout;
use App\Models\User;
use App\Services\AccountingLedgerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class PayoutController extends Controller
{
    protected AccountingLedgerService $ledgerService;

    public function __construct(AccountingLedgerService $ledgerService)
    {
        $this->ledgerService = $ledgerService;
    }

    /**
     * Display the Payouts Management view.
     */
    public function index(Request $request)
    {
        Gate::authorize('admin-action');

        // 1. Fetch approved artisans
        $artisanUsers = User::where('role', 'artisan')
            ->where('artisan_status', 'approved')
            ->orderBy('shop_name', 'asc')
            ->get();

        $artisanIds = $artisanUsers->pluck('id')->all();

        // 1a. Pre-aggregate completed sales metrics
        $completedSalesAggregates = Order::whereIn('artisan_id', $artisanIds)
            ->where('status', 'Completed')
            ->selectRaw('artisan_id, SUM(merchandise_subtotal) as gross_sales, SUM(platform_commission_amount) as platform_fees, SUM(seller_net_amount) as net_sales')
            ->groupBy('artisan_id')
            ->get()
            ->keyBy('artisan_id');

        // 1b. Pre-aggregate completed payouts
        $payoutAggregates = DB::table('payouts')
            ->whereIn('user_id', $artisanIds)
            ->where('status', 'Completed')
            ->selectRaw('user_id, SUM(amount) as total_payouts')
            ->groupBy('user_id')
            ->get()
            ->keyBy('user_id');

        // 1c. Pre-aggregate dispute holds
        $disputeHoldAggregates = Order::whereIn('artisan_id', $artisanIds)
            ->where('status', 'Completed')
            ->where(function ($query) {
                $query->whereHas('dispute', function ($q) {
                    $q->whereIn('status', ['open', 'escalated', 'under_review']);
                })->orWhere(function ($q) {
                    $q->whereNotNull('return_reason')
                      ->whereNull('replacement_resolved_at')
                      ->where('status', '!=', 'Refunded');
                });
            })
            ->selectRaw('artisan_id, SUM(seller_net_amount) as total_held')
            ->groupBy('artisan_id')
            ->get()
            ->keyBy('artisan_id');

        // 1d. Pre-aggregate orders in progress
        $ordersInProgressAggregates = Order::whereIn('artisan_id', $artisanIds)
            ->whereIn('status', ['Pending', 'Accepted', 'Processing', 'Shipped', 'Ready for Pickup'])
            ->selectRaw('artisan_id, SUM(seller_net_amount) as total_in_progress')
            ->groupBy('artisan_id')
            ->get()
            ->keyBy('artisan_id');

        // 1e. Pre-fetch recent completed orders
        $recentOrdersGrouped = Order::whereIn('artisan_id', $artisanIds)
            ->where('status', 'Completed')
            ->select('id', 'artisan_id', 'order_number', 'customer_name', 'merchandise_subtotal', 'platform_commission_amount', 'seller_net_amount', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('artisan_id');

        $artisans = $artisanUsers->map(function ($user) use (
            $completedSalesAggregates,
            $payoutAggregates,
            $disputeHoldAggregates,
            $ordersInProgressAggregates,
            $recentOrdersGrouped
        ) {
            $sales = $completedSalesAggregates->get($user->id);
            $grossSales = (float) ($sales->gross_sales ?? 0);
            $platformFees = (float) ($sales->platform_fees ?? 0);
            $netSales = (float) ($sales->net_sales ?? 0);

            $payouts = (float) ($payoutAggregates->get($user->id)->total_payouts ?? 0);
            $heldForDispute = (float) ($disputeHoldAggregates->get($user->id)->total_held ?? 0);
            $ordersInProgress = (float) ($ordersInProgressAggregates->get($user->id)->total_in_progress ?? 0);

            $unpaidBalance = max(0.00, $netSales - $payouts - $heldForDispute);

            $recentOrders = ($recentOrdersGrouped->get($user->id) ?? collect())
                ->take(10)
                ->map(fn($o) => [
                    'id' => $o->id,
                    'order_number' => $o->order_number,
                    'customer_name' => $o->customer_name,
                    'gross' => (float) $o->merchandise_subtotal,
                    'fee' => (float) $o->platform_commission_amount,
                    'net' => (float) $o->seller_net_amount,
                    'date' => $o->created_at?->format('M d, Y') ?? 'N/A',
                ])
                ->values();

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'premium_tier' => $user->premium_tier,
                'avatar' => $user->avatar,
                'avatar_url' => $user->avatar_url,
                'updated_at' => $user->updated_at?->toIso8601String(),
                'shop_name' => $user->shop_name,
                'shop_slug' => $user->shop_slug,
                'payout_method' => $user->payout_method ?? 'GCash',
                'payout_account_name' => $user->payout_account_name ?? '',
                'payout_account_number' => $user->payout_account_number ?? '',
                'has_payout_account' => !empty($user->payout_account_number),
                'balance' => $unpaidBalance,
                'ready_for_payout' => $unpaidBalance,
                'gross_sales' => $grossSales,
                'platform_fees' => $platformFees,
                'net_sales' => $netSales,
                'payouts' => $payouts,
                'orders_in_progress' => $ordersInProgress,
                'held_for_dispute' => $heldForDispute,
                'recent_orders' => $recentOrders,
            ];
        });

        // 2. Fetch payout history
        $payoutHistory = Payout::with('user:id,shop_name,shop_slug,name,role,premium_tier,avatar,updated_at')
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->through(fn($payout) => [
                'id' => $payout->id,
                'shop_name' => $payout->user?->shop_name ?? 'N/A',
                'artisan_name' => $payout->user?->name ?? 'N/A',
                'user' => $payout->user ? [
                    'id' => $payout->user->id,
                    'name' => $payout->user->name,
                    'shop_name' => $payout->user->shop_name,
                    'shop_slug' => $payout->user->shop_slug,
                    'role' => $payout->user->role,
                    'premium_tier' => $payout->user->premium_tier,
                    'avatar' => $payout->user->avatar,
                    'avatar_url' => $payout->user->avatar_url,
                    'updated_at' => $payout->user->updated_at?->toIso8601String(),
                ] : null,
                'amount' => (float) $payout->amount,
                'payout_method' => $payout->payout_method,
                'payout_account_name' => $payout->payout_account_name,
                'payout_account_number' => $payout->payout_account_number,
                'reference_number' => $payout->reference_number,
                'created_at' => $payout->created_at->format('M d, Y h:i A'),
                'created_at_raw' => $payout->created_at->toIso8601String(),
            ]);

        // 3. Compute KPI metrics
        $totalOwed = $artisans->where('balance', '>', 0)->sum('balance');
        $totalPaid = (float) Payout::where('status', 'Completed')->sum('amount');
        $artisansOwedCount = $artisans->where('balance', '>', 0)->count();

        return Inertia::render('Admin/Payouts/PayoutManager', [
            'artisans' => $artisans,
            'payoutHistory' => $payoutHistory,
            'metrics' => [
                'total_owed' => $totalOwed,
                'total_paid' => $totalPaid,
                'artisans_owed_count' => $artisansOwedCount,
                'total_artisans_count' => $artisans->count(),
            ],
        ]);
    }

    /**
     * Record a manual payout disbursement.
     */
    public function store(Request $request)
    {
        Gate::authorize('admin-action');

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'amount' => 'required|numeric|min:0.01',
            'payout_method' => 'required|string|max:50',
            'payout_account_name' => 'required|string|max:100',
            'payout_account_number' => 'required|string|max:100',
            'reference_number' => 'nullable|string|max:100',
        ]);

        $artisan = User::findOrFail($validated['user_id']);
        
        // Ensure artisan is approved
        if ($artisan->artisan_status !== 'approved') {
            return back()->with('error', 'Cannot disburse payout to an unapproved artisan.');
        }

        // Validate that disbursement amount does not exceed available unpaid balance
        $snapshot = $this->ledgerService->buildFinancialSnapshot($artisan);
        $availableBalance = max(0.00, round((float) ($snapshot['ready_for_payout'] > 0 ? $snapshot['ready_for_payout'] : $snapshot['balance']), 2));

        if ((float) $validated['amount'] > $availableBalance) {
            return back()->with('error', "Disbursement amount (PHP " . number_format($validated['amount'], 2) . ") exceeds the artisan's available balance of PHP " . number_format($availableBalance, 2) . ".");
        }

        $payout = DB::transaction(function () use ($validated, $artisan) {
            $payout = Payout::create([
                'user_id' => $validated['user_id'],
                'amount' => $validated['amount'],
                'payout_method' => $validated['payout_method'],
                'payout_account_name' => $validated['payout_account_name'],
                'payout_account_number' => $validated['payout_account_number'],
                'reference_number' => $validated['reference_number'],
                'status' => 'Completed',
            ]);

            \App\Models\PlatformActivity::create([
                'user_id' => \Illuminate\Support\Facades\Auth::id(),
                'action' => 'payout_disbursed',
                'description' => "Disbursed payout of PHP " . number_format($validated['amount'], 2) . " to {$artisan->shop_name}",
                'metadata' => [
                    'artisan_id' => $artisan->id,
                    'shop_name' => $artisan->shop_name,
                    'amount' => $validated['amount'],
                    'reference_number' => $validated['reference_number'],
                ]
            ]);

            return $payout;
        });

        // Dispatch in-app & email notification to artisan
        \Illuminate\Support\Facades\Notification::send(
            $artisan,
            new \App\Notifications\PayoutDisbursedNotification($payout, $artisan)
        );

        return back()->with('success', 'Manual payout registered successfully.');
    }

    /**
     * Export all payout disbursement records as CSV.
     */
    public function export()
    {
        Gate::authorize('admin-action');

        $payouts = Payout::with('user:id,shop_name,name,email')
            ->orderBy('created_at', 'desc')
            ->get();

        $filename = 'payouts_report_' . date('Y-m-d_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($payouts) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'Disbursement ID',
                'Date',
                'Artisan Name',
                'Shop Name',
                'Email',
                'Payout Method',
                'Account Name',
                'Account Number',
                'Reference Number',
                'Amount (PHP)',
                'Status',
            ]);

            foreach ($payouts as $p) {
                fputcsv($handle, [
                    $p->id,
                    $p->created_at->format('Y-m-d H:i:s'),
                    $p->user?->name ?? 'N/A',
                    $p->user?->shop_name ?? 'N/A',
                    $p->user?->email ?? 'N/A',
                    $p->payout_method,
                    $p->payout_account_name,
                    $p->payout_account_number,
                    $p->reference_number ?? 'N/A',
                    number_format($p->amount, 2, '.', ''),
                    $p->status,
                ]);
            }

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }
}

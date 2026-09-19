<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payout;
use App\Models\Payroll;
use App\Models\StockRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SettlementReportService
{
    /**
     * Aggregate monthly settlement statement data for an artisan.
     *
     * @param User $seller
     * @param int $year
     * @param int $month
     * @return array
     */
    public function getMonthlyStatementData(User $seller, int $year, int $month): array
    {
        $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        // Completed orders within the month
        $completedOrders = Order::where('artisan_id', $seller->id)
            ->where('status', 'Completed')
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->with(['items', 'user'])
            ->orderBy('updated_at', 'asc')
            ->get();

        $grossSales = (float) $completedOrders->sum('merchandise_subtotal');
        $ordersCount = $completedOrders->count();

        $codOrders = $completedOrders->where('payment_method', 'COD');
        $onlineOrders = $completedOrders->where('payment_method', '!=', 'COD');

        $codSales = (float) $codOrders->sum('merchandise_subtotal');
        $onlineSales = (float) $onlineOrders->sum('merchandise_subtotal');

        $shippingFees = (float) $completedOrders->sum('shipping_fee_amount');
        $platformFees = (float) $completedOrders->sum('platform_commission_amount');
        $convenienceFees = (float) $completedOrders->sum('convenience_fee_amount');
        $netEarnings = (float) $completedOrders->sum('seller_net_amount');

        // Material Supply procurement expenses approved or received in this month
        $supplyExpenses = (float) StockRequest::where('user_id', $seller->id)
            ->whereIn('status', [
                StockRequest::STATUS_ACCOUNTING_APPROVED,
                StockRequest::STATUS_ORDERED,
                StockRequest::STATUS_RECEIVED,
                StockRequest::STATUS_COMPLETED,
            ])
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->sum('total_cost');

        // Approved payroll runs in this month
        $payrollExpenses = (float) Payroll::where('user_id', $seller->id)
            ->whereIn('status', ['accounting_approved', 'paid'])
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->sum('total_amount');

        // Payouts disbursed to the artisan in this month
        $payouts = Payout::where('user_id', $seller->id)
            ->where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->orderBy('created_at', 'asc')
            ->get();

        $totalPayouts = (float) $payouts->sum('amount');

        // Net settlement balance for this period
        $periodNetBalance = $netEarnings - $supplyExpenses - $payrollExpenses - $totalPayouts;

        $orderLines = $completedOrders->map(function ($order) {
            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'date' => $order->updated_at->format('M d, Y'),
                'customer_name' => $order->customer_name ?: ($order->user?->name ?? 'Customer'),
                'payment_method' => $order->payment_method,
                'merchandise_subtotal' => (float) $order->merchandise_subtotal,
                'shipping_fee' => (float) $order->shipping_fee_amount,
                'platform_fee' => (float) $order->platform_commission_amount,
                'seller_net' => (float) $order->seller_net_amount,
            ];
        })->values()->all();

        $payoutLines = $payouts->map(function ($payout) {
            return [
                'id' => $payout->id,
                'reference_number' => $payout->reference_number ?: ("PAY-" . $payout->id),
                'date' => $payout->created_at->format('M d, Y'),
                'amount' => (float) $payout->amount,
                'payout_method' => $payout->payout_method,
                'account_name' => $payout->payout_account_name,
                'account_number' => $payout->payout_account_number,
            ];
        })->values()->all();

        return [
            'period' => [
                'year' => $year,
                'month' => $month,
                'month_name' => $startDate->format('F Y'),
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
            ],
            'artisan' => [
                'id' => $seller->id,
                'name' => $seller->name,
                'shop_name' => $seller->shop_name ?: $seller->name,
                'email' => $seller->email,
                'payout_method' => $seller->payout_method,
                'payout_account_name' => $seller->payout_account_name,
                'payout_account_number' => $seller->payout_account_number,
            ],
            'summary' => [
                'gross_sales' => $grossSales,
                'orders_count' => $ordersCount,
                'cod_sales' => $codSales,
                'online_sales' => $onlineSales,
                'shipping_fees' => $shippingFees,
                'platform_fees' => $platformFees,
                'convenience_fees' => $convenienceFees,
                'net_earnings' => $netEarnings,
                'supply_expenses' => $supplyExpenses,
                'payroll_expenses' => $payrollExpenses,
                'total_payouts' => $totalPayouts,
                'period_net_balance' => $periodNetBalance,
            ],
            'orders' => $orderLines,
            'payouts' => $payoutLines,
        ];
    }

    /**
     * Stream a CSV export of the monthly settlement statement.
     *
     * @param User $seller
     * @param int $year
     * @param int $month
     * @return StreamedResponse
     */
    public function streamCsvExport(User $seller, int $year, int $month): StreamedResponse
    {
        $data = $this->getMonthlyStatementData($seller, $year, $month);
        $periodName = $data['period']['month_name'];
        $shopName = $data['artisan']['shop_name'];
        $filename = "settlement_statement_{$year}_{$month}_" . Str::slug($shopName) . ".csv";

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        return response()->stream(function () use ($data, $periodName, $shopName) {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM for Excel compatibility
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

            // 1. Header Information
            fputcsv($handle, ['LIKHANGKAMAY ARTISAN SETTLEMENT STATEMENT']);
            fputcsv($handle, ['Workshop / Shop Name', $shopName]);
            fputcsv($handle, ['Artisan Account', $data['artisan']['name'] . " ({$data['artisan']['email']})"]);
            fputcsv($handle, ['Statement Period', $periodName]);
            fputcsv($handle, ['Generated At', now()->format('Y-m-d H:i:s')]);
            fputcsv($handle, []);

            // 2. Financial Summary
            fputcsv($handle, ['PERIOD FINANCIAL SUMMARY']);
            fputcsv($handle, ['Completed Orders Count', $data['summary']['orders_count']]);
            fputcsv($handle, ['Gross Merchandise Value (GMV)', number_format($data['summary']['gross_sales'], 2)]);
            fputcsv($handle, ['  - Cash On Delivery (COD) Sales', number_format($data['summary']['cod_sales'], 2)]);
            fputcsv($handle, ['  - Online / Card / GCash Sales', number_format($data['summary']['online_sales'], 2)]);
            fputcsv($handle, ['Total Shipping / Courier Fees', number_format($data['summary']['shipping_fees'], 2)]);
            fputcsv($handle, ['Total Platform Commission Fees', number_format($data['summary']['platform_fees'], 2)]);
            fputcsv($handle, ['Total Net Seller Merchandise Earnings', number_format($data['summary']['net_earnings'], 2)]);
            fputcsv($handle, ['Workshop Material Supply Expenses', number_format($data['summary']['supply_expenses'], 2)]);
            fputcsv($handle, ['Disbursed Staff Payroll Expenses', number_format($data['summary']['payroll_expenses'], 2)]);
            fputcsv($handle, ['Disbursed Artisan Payouts (Bank/GCash)', number_format($data['summary']['total_payouts'], 2)]);
            fputcsv($handle, ['Period Net Remaining Balance', number_format($data['summary']['period_net_balance'], 2)]);
            fputcsv($handle, []);

            // 3. Itemized Completed Orders
            fputcsv($handle, ['COMPLETED RETAIL & B2B ORDERS']);
            fputcsv($handle, ['Order Number', 'Date', 'Customer Name', 'Payment Method', 'Gross (PHP)', 'Shipping Fee', 'Commission', 'Seller Net (PHP)']);
            foreach ($data['orders'] as $order) {
                fputcsv($handle, [
                    $order['order_number'],
                    $order['date'],
                    $order['customer_name'],
                    $order['payment_method'],
                    number_format($order['merchandise_subtotal'], 2),
                    number_format($order['shipping_fee'], 2),
                    number_format($order['platform_fee'], 2),
                    number_format($order['seller_net'], 2),
                ]);
            }
            fputcsv($handle, []);

            // 4. Itemized Disbursements / Payouts
            fputcsv($handle, ['PERIOD DISBURSEMENTS & PAYOUTS']);
            fputcsv($handle, ['Reference', 'Date', 'Amount (PHP)', 'Method', 'Account Name', 'Account Number']);
            foreach ($data['payouts'] as $payout) {
                fputcsv($handle, [
                    $payout['reference_number'],
                    $payout['date'],
                    number_format($payout['amount'], 2),
                    $payout['payout_method'],
                    $payout['account_name'],
                    $payout['account_number'],
                ]);
            }

            fclose($handle);
        }, 200, $headers);
    }
}

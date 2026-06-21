<?php

namespace App\Actions\Seller\Orders;

use App\Models\Order;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportOrdersCsv
{
    /**
     * Export seller orders to CSV streamed response
     *
     * @param int $sellerId
     * @return StreamedResponse
     */
    public function execute(int $sellerId): StreamedResponse
    {
        $orders = Order::where('artisan_id', $sellerId)
            ->with(['items', 'user'])
            ->orderBy('created_at', 'desc')
            ->get();

        $filename = "orders_" . date('Y-m-d_H-i-s') . ".csv";

        $headers = [
            "Content-Type" => "text/csv",
            "Content-Disposition" => "attachment; filename=\"$filename\"",
            "Pragma" => "no-cache",
            "Cache-Control" => "must-revalidate, post-check=0, pre-check=0",
            "Expires" => "0"
        ];

        $callback = function () use ($orders) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Order ID', 'Date', 'Customer', 'Status', 'Total', 'Payment Method', 'Payment Status', 'Shipping Method', 'Tracking Number']);

            foreach ($orders as $order) {
                fputcsv($file, [
                    $order->order_number,
                    $order->created_at->format('Y-m-d H:i:s'),
                    $order->customer_name,
                    $order->status,
                    $order->total_amount,
                    $order->payment_method,
                    $order->payment_status,
                    $order->shipping_method,
                    $order->tracking_number
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}

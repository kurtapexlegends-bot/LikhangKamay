<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Order;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class OrderPrintController extends Controller
{
    use InteractsWithSellerContext;

    public function bulkPackingSlips(Request $request)
    {
        $request->validate([
            'order_ids' => ['required', 'array', 'min:1', 'max:15'],
            'order_ids.*' => ['required', 'string'],
        ], [
            'order_ids.max' => 'To prevent server timeouts, a maximum of 15 packing slips can be generated at once. Please export in smaller batches.',
        ]);

        $artisanId = $this->sellerOwnerId();
        $artisan = $this->sellerOwner();

        $orders = Order::query()
            ->with(['items.product', 'user', 'delivery'])
            ->whereIn('order_number', $request->input('order_ids'))
            ->where('artisan_id', $artisanId)
            ->get();

        if ($orders->isEmpty()) {
            abort(404, 'No orders found to print.');
        }

        $fontDir = is_writable(storage_path()) ? storage_path('fonts') : sys_get_temp_dir() . '/dompdf_fonts';
        if (!file_exists($fontDir)) {
            @mkdir($fontDir, 0755, true);
        }

        $pdf = Pdf::loadView('pdf.packing-slips', compact('orders', 'artisan'))
                  ->setPaper('a4', 'portrait')
                  ->setOptions([
                      'defaultFont' => 'DejaVu Sans',
                      'isHtml5ParserEnabled' => true,
                      'isRemoteEnabled' => false,
                      'dpi' => 96,
                      'fontDir' => $fontDir,
                      'fontCache' => $fontDir,
                      'tempDir' => sys_get_temp_dir(),
                  ]);

        return $pdf->download('Packing_Slips_' . now()->format('Ymd_His') . '.pdf');
    }
}

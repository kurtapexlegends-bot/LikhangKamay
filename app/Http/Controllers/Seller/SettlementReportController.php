<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Services\SettlementReportService;
use Illuminate\Http\Request;

class SettlementReportController extends Controller
{
    use InteractsWithSellerContext;

    protected SettlementReportService $settlementReportService;

    public function __construct(SettlementReportService $settlementReportService)
    {
        $this->settlementReportService = $settlementReportService;
    }

    /**
     * View or print monthly settlement statement for the authenticated artisan.
     */
    public function viewStatement(Request $request)
    {
        $seller = $this->sellerOwner();
        $year = (int) $request->query('year', now()->year);
        $month = (int) $request->query('month', now()->month);

        if ($month < 1 || $month > 12) {
            $month = now()->month;
        }

        $data = $this->settlementReportService->getMonthlyStatementData($seller, $year, $month);

        if ($request->wantsJson() || $request->query('format') === 'json') {
            return response()->json($data);
        }

        return view('pdf.settlement_statement', ['data' => $data]);
    }

    /**
     * Stream CSV export of the monthly settlement statement.
     */
    public function downloadCsv(Request $request)
    {
        $seller = $this->sellerOwner();
        $year = (int) $request->query('year', now()->year);
        $month = (int) $request->query('month', now()->month);

        if ($month < 1 || $month > 12) {
            $month = now()->month;
        }

        return $this->settlementReportService->streamCsvExport($seller, $year, $month);
    }
}

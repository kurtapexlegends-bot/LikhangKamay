<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payout;
use App\Models\User;
use App\Services\AccountingLedgerService;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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

        $artisans = $this->ledgerService->getArtisansPayoutLedgerSummary();
        $payoutHistory = $this->getPayoutHistory();
        $metrics = $this->calculatePayoutMetrics($artisans);

        return Inertia::render('Admin/Payouts/PayoutManager', [
            'artisans' => $artisans,
            'payoutHistory' => $payoutHistory,
            'metrics' => $metrics,
        ]);
    }

    private function getPayoutHistory()
    {
        return Payout::with('user:id,shop_name,shop_slug,name,role,premium_tier,avatar,updated_at')
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->through(fn($payout) => [
                'id' => $payout->id,
                'amount' => (float) $payout->amount,
                'payout_method' => $payout->payout_method,
                'payout_account_name' => $payout->payout_account_name,
                'artisan' => [
                    'id' => $payout->user->id,
                    'name' => $payout->user->name,
                    'shop_name' => $payout->user->shop_name,
                    'shop_slug' => $payout->user->shop_slug,
                    'role' => $payout->user->role,
                    'premium_tier' => $payout->user->premium_tier,
                    'avatar' => $payout->user->avatar,
                    'avatar_url' => $payout->user->avatar_url,
                    'updated_at' => $payout->user->updated_at?->toIso8601String(),
                ],
                'artisan_name' => $payout->user->name ?? 'Unknown Artisan',
                'shop_name' => $payout->user->shop_name ?? 'Unknown Shop',
                'payout_account_number' => $payout->payout_account_number,
                'reference_number' => $payout->reference_number,
                'created_at' => $payout->created_at->format('M d, Y h:i A'),
                'created_at_raw' => $payout->created_at->toIso8601String(),
            ]);
    }

    private function calculatePayoutMetrics(\Illuminate\Support\Collection $artisans): array
    {
        $totalOwed = (float) $artisans->sum('ready_for_payout');
        $totalSettled = (float) DB::table('payouts')->where('status', 'Completed')->sum('amount');
        $totalPaid = (float) Payout::where('status', 'Completed')->sum('amount');
        $totalPlatformFees = (float) DB::table('orders')->where('status', 'Completed')->sum('platform_commission_amount');
        $artisansOwedCount = $artisans->where('ready_for_payout', '>', 0)->count();

        return [
            'total_settled' => $totalSettled,
            'total_platform_fees_collected' => $totalPlatformFees,
            'total_owed' => $totalOwed,
            'total_paid' => $totalPaid,
            'artisans_owed_count' => $artisansOwedCount,
            'total_artisans_count' => $artisans->count(),
        ];
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
            'reference_number' => 'nullable|string|max:100|unique:payouts,reference_number',
        ]);

        $artisan = null;
        $lockKey = "admin-payout-disburse:{$validated['user_id']}";
        $lock = Cache::lock($lockKey, 15);

        try {
            $payout = $lock->block(10, function () use ($validated, &$artisan) {
                return DB::transaction(function () use ($validated, &$artisan) {
                    $artisan = User::where('id', $validated['user_id'])->lockForUpdate()->firstOrFail();

                    // Ensure artisan is approved
                    if ($artisan->artisan_status !== 'approved') {
                        throw new \DomainException('Cannot disburse payout to an unapproved artisan.');
                    }

                    // Validate that disbursement amount does not exceed available unpaid balance
                    $snapshot = $this->ledgerService->buildFinancialSnapshot($artisan);
                    $availableBalance = max(0.00, round((float) ($snapshot['ready_for_payout'] ?? 0), 2));

                    if ((float) $validated['amount'] > $availableBalance) {
                        throw new \DomainException("Disbursement amount (PHP " . number_format($validated['amount'], 2) . ") exceeds the artisan's available balance of PHP " . number_format($availableBalance, 2) . ".");
                    }

                    $payout = Payout::create([
                        'user_id' => $validated['user_id'],
                        'amount' => $validated['amount'],
                        'payout_method' => $validated['payout_method'],
                        'payout_account_name' => $validated['payout_account_name'],
                        'payout_account_number' => $validated['payout_account_number'],
                        'reference_number' => $validated['reference_number'] ?? null,
                        'status' => 'Completed',
                    ]);

                    app(\App\Actions\Audit\RecordAuditActivity::class)->execute(
                        action: 'payout.disbursed',
                        description: "Disbursed payout of PHP " . number_format($validated['amount'], 2) . " to {$artisan->shop_name}",
                        subject: $payout,
                        diff: [
                            'artisan_id' => $artisan->id,
                            'shop_name' => $artisan->shop_name,
                            'amount' => $validated['amount'],
                            'payout_method' => $validated['payout_method'],
                            'reference_number' => $validated['reference_number'] ?? null,
                        ],
                        actorId: \Illuminate\Support\Facades\Auth::id(),
                    );

                    return $payout;
                });
            });
        } catch (\DomainException $e) {
            return back()->with('error', $e->getMessage());
        } catch (LockTimeoutException $e) {
            return back()->with('error', 'A payout for this artisan is currently being processed. Please wait a moment.');
        }

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

    /**
     * Download or view printable Payout Disbursement Voucher.
     */
    public function voucher(Request $request, string $id)
    {
        /** @var User|null $actor */
        $actor = $request->user();

        $payout = Payout::with('user:id,name,shop_name,email,phone_number')
            ->findOrFail($id);

        $isAdmin = $actor && in_array($actor->role, ['super_admin', 'admin'], true);
        $isOwner = $actor && (int) $actor->id === (int) $payout->user_id;

        if (!$isAdmin && !$isOwner) {
            abort(403, 'Unauthorized access to payout disbursement voucher.');
        }

        return view('pdf.payout_voucher', [
            'payout' => $payout,
            'artisan' => $payout->user,
        ]);
    }
}

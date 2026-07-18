<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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
        $artisans = User::where('role', 'artisan')
            ->where('artisan_status', 'approved')
            ->orderBy('shop_name', 'asc')
            ->get()
            ->map(function ($user) {
                // Compute outstanding balance using ledger service
                $snapshot = $this->ledgerService->buildFinancialSnapshot($user);
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'shop_name' => $user->shop_name,
                    'payout_method' => $user->payout_method ?? 'GCash',
                    'payout_account_name' => $user->payout_account_name ?? '',
                    'payout_account_number' => $user->payout_account_number ?? '',
                    'balance' => $snapshot['balance'],
                    'revenue' => $snapshot['revenue'],
                    'expenses' => $snapshot['expenses'],
                    'payouts' => $snapshot['payouts'] ?? 0.00,
                ];
            });

        // 2. Fetch payout history
        $payoutHistory = Payout::with('user:id,shop_name,name')
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->through(fn($payout) => [
                'id' => $payout->id,
                'shop_name' => $payout->user?->shop_name ?? 'N/A',
                'artisan_name' => $payout->user?->name ?? 'N/A',
                'amount' => (float) $payout->amount,
                'payout_method' => $payout->payout_method,
                'payout_account_name' => $payout->payout_account_name,
                'payout_account_number' => $payout->payout_account_number,
                'reference_number' => $payout->reference_number,
                'created_at' => $payout->created_at->format('M d, Y h:i A'),
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

        DB::transaction(function () use ($validated, $artisan) {
            Payout::create([
                'user_id' => $validated['user_id'],
                'amount' => $validated['amount'],
                'payout_method' => $validated['payout_method'],
                'payout_account_name' => $validated['payout_account_name'],
                'payout_account_number' => $validated['payout_account_number'],
                'reference_number' => $validated['reference_number'],
                'status' => 'Completed',
            ]);

            \App\Models\PlatformActivity::create([
                'user_id' => auth()->id(),
                'action' => 'payout_disbursed',
                'description' => "Disbursed payout of PHP " . number_format($validated['amount'], 2) . " to {$artisan->shop_name}",
                'metadata' => [
                    'artisan_id' => $artisan->id,
                    'shop_name' => $artisan->shop_name,
                    'amount' => $validated['amount'],
                    'reference_number' => $validated['reference_number'],
                ]
            ]);
        });

        return back()->with('success', 'Manual payout registered successfully.');
    }
}

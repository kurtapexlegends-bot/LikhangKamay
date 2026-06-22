<?php

namespace App\Http\Controllers\Core;

use App\Http\Controllers\Controller;
use App\Models\Dispute;
use App\Models\User;
use App\Actions\Disputes\BuyerInitiateDispute;
use App\Actions\Disputes\SellerRespondToDispute;
use App\Actions\Disputes\BuyerReactToDispute;
use App\Actions\Disputes\AdminArbitrateDispute;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class DisputeController extends Controller
{
    /**
     * BUYER: Initiate return/refund dispute
     */
    public function buyerInitiateDispute(
        Request $request,
        string $orderId,
        BuyerInitiateDispute $action
    ) {
        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
            'proof_photos' => 'required|array|min:1|max:5',
            'proof_photos.*' => 'required|image|max:5120', // 5MB max each
        ]);

        try {
            $action->execute($orderId, $validated['reason'], $request->file('proof_photos'), Auth::id());
            return back()->with('success', 'Dispute request submitted successfully.');
        } catch (\Throwable $e) {
            Log::error("Dispute initiation failed: " . $e->getMessage());
            return back()->withErrors(['message' => $e->getMessage()]);
        }
    }

    /**
     * SELLER: Respond to dispute (accept, reject, propose replacement)
     */
    public function sellerRespond(
        Request $request,
        string $disputeId,
        SellerRespondToDispute $action
    ) {
        $validated = $request->validate([
            'response_type' => 'required|string|in:accept,reject,replacement',
            'seller_explanation' => 'required_if:response_type,reject|nullable|string|max:1000',
            'seller_proposed_description' => 'required_if:response_type,replacement|nullable|string|max:1000',
        ]);

        try {
            $actor = Auth::user();
            assert($actor instanceof User);
            $action->execute(
                $disputeId,
                $validated['response_type'],
                $validated['seller_explanation'] ?? null,
                $validated['seller_proposed_description'] ?? null,
                $actor
            );
            return back()->with('success', 'Dispute response registered successfully.');
        } catch (\Throwable $e) {
            Log::error("Seller dispute response failed: " . $e->getMessage());
            return back()->withErrors(['message' => $e->getMessage()]);
        }
    }

    /**
     * BUYER: React to dispute (escalate or accept replacement)
     */
    public function buyerReact(
        Request $request,
        string $disputeId,
        BuyerReactToDispute $action
    ) {
        $validated = $request->validate([
            'action' => 'required|string|in:accept_replacement,escalate',
            'escalation_reason' => 'required_if:action,escalate|nullable|string|max:1000',
        ]);

        try {
            $action->execute(
                $disputeId,
                $validated['action'],
                $validated['escalation_reason'] ?? null,
                Auth::id()
            );
            return back()->with('success', 'Dispute response registered successfully.');
        } catch (\Throwable $e) {
            Log::error("Buyer dispute action failed: " . $e->getMessage());
            return back()->withErrors(['message' => $e->getMessage()]);
        }
    }

    /**
     * ADMIN: List escalated disputes
     */
    public function adminIndex(Request $request)
    {
        $this->authorizeAdmin();

        $search = $request->input('search');
        $like = \Illuminate\Support\Facades\DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'like';

        $disputes = Dispute::with(['order.user', 'order.artisan'])
            ->where('status', 'escalated')
            ->when($search, function ($q) use ($search, $like) {
                $q->where(function ($sq) use ($search, $like) {
                    $sq->where('reason', $like, "%{$search}%")
                        ->orWhere('escalation_reason', $like, "%{$search}%")
                        ->orWhereHas('order', function ($oq) use ($search, $like) {
                            $oq->where('order_number', $like, "%{$search}%")
                               ->orWhere('customer_name', $like, "%{$search}%")
                               ->orWhereHas('artisan', function ($aq) use ($search, $like) {
                                   $aq->where('name', $like, "%{$search}%")
                                      ->orWhere('shop_name', $like, "%{$search}%");
                               });
                        });
                });
            })
            ->orderBy('updated_at', 'desc')
            ->get();

        return Inertia::render('Admin/Disputes/DisputeEscalationDashboard', [
            'disputes' => $disputes,
            'filters' => [
                'search' => $search
            ]
        ]);
    }

    /**
     * ADMIN: Arbitrate/Resolve escalated dispute
     */
    public function adminArbitrate(
        Request $request,
        string $disputeId,
        AdminArbitrateDispute $action
    ) {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'decision' => 'required|string|in:refund,reject',
            'admin_notes' => 'required|string|max:1000',
        ]);

        try {
            $actor = Auth::user();
            assert($actor instanceof User);
            $action->execute(
                $disputeId,
                $validated['decision'],
                $validated['admin_notes'],
                $actor
            );
            return back()->with('success', 'Arbitration decision registered successfully.');
        } catch (\Throwable $e) {
            Log::error("Admin arbitration failed: " . $e->getMessage());
            return back()->withErrors(['message' => $e->getMessage()]);
        }
    }

    private function authorizeAdmin(): void
    {
        $user = Auth::user();
        if (!$user || !($user instanceof User) || !$user->isAdmin()) {
            abort(403, 'Unauthorized.');
        }
    }
}

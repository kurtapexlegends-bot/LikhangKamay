<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\OwnerApproval;
use App\Services\OwnerApprovalService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class ApprovalController extends Controller
{
    use InteractsWithSellerContext;

    /**
     * Display the Executive Approvals & Review Hub.
     */
    public function index(Request $request, OwnerApprovalService $approvalService): Response
    {
        $seller = $this->sellerOwner();
        $user = $request->user();

        // Enforce owner-only or staff with executive access
        if ($user->isStaff() && !$user->canEditSellerModule('overview')) {
            abort(403, 'Unauthorized access to the approval hub.');
        }

        $filters = $request->only(['status', 'domain', 'search']);
        $filters['status'] = $filters['status'] ?? OwnerApproval::STATUS_PENDING;

        try {
            $approvals = $approvalService->getPaginatedApprovals($seller, $filters, 12);
            $stats = $approvalService->getStats($seller);

            return Inertia::render('Seller/Approvals/ApprovalManager', [
                'approvals' => $approvals,
                'stats' => $stats,
                'pendingCount' => $stats['pending_count'],
                'filters' => $filters,
                'isElite' => $seller->isEliteTier(),
                'isPremium' => $seller->isPremiumTier(),
            ]);
        } catch (\Throwable $e) {
            Log::error('ApprovalController index error: ' . $e->getMessage(), [
                'exception' => $e,
            ]);

            $emptyPaginator = new \Illuminate\Pagination\LengthAwarePaginator([], 0, 12);
            $emptyStats = [
                'pending_count' => 0,
                'approved_count' => 0,
                'declined_count' => 0,
                'active_staff_count' => 0,
            ];

            return Inertia::render('Seller/Approvals/ApprovalManager', [
                'approvals' => $emptyPaginator,
                'stats' => $emptyStats,
                'pendingCount' => 0,
                'filters' => $filters,
                'isElite' => $seller->isEliteTier(),
                'isPremium' => $seller->isPremiumTier(),
                'load_error' => 'Unable to load approvals at this moment.',
            ]);
        }
    }

    /**
     * Approve a single pending request.
     */
    public function approve(Request $request, OwnerApproval $approval, OwnerApprovalService $approvalService): RedirectResponse
    {
        $seller = $this->sellerOwner();
        $user = $request->user();

        if ($user->isStaff() && !$user->canEditSellerModule('overview')) {
            abort(403, 'Only the shop owner can approve requests.');
        }

        if ($approval->seller_id !== $seller->id) {
            abort(403, 'This approval does not belong to your shop.');
        }

        if ($user->id === $approval->requester_id) {
            abort(403, 'You cannot approve your own submitted request.');
        }

        $success = $approvalService->approve($approval, $user);

        if ($success) {
            return back()->with('success', "Approved: {$approval->title}");
        }

        return back()->with('error', 'Could not process approval. The item may have already been reviewed.');
    }

    /**
     * Reject a single pending request with an explanation.
     */
    public function reject(Request $request, OwnerApproval $approval, OwnerApprovalService $approvalService): RedirectResponse
    {
        $seller = $this->sellerOwner();
        $user = $request->user();

        if ($user->isStaff() && !$user->canEditSellerModule('overview')) {
            abort(403, 'Only the shop owner can decline requests.');
        }

        if ($approval->seller_id !== $seller->id) {
            abort(403, 'This approval does not belong to your shop.');
        }

        if ($user->id === $approval->requester_id) {
            abort(403, 'You cannot decline your own submitted request.');
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $success = $approvalService->reject($approval, $user, $validated['reason'] ?? null);

        if ($success) {
            return back()->with('success', "Declined: {$approval->title}");
        }

        return back()->with('error', 'Could not decline request. The item may have already been reviewed.');
    }

    /**
     * Batch approve all or selected pending items (Elite feature).
     */
    public function batchApprove(Request $request, OwnerApprovalService $approvalService): RedirectResponse
    {
        $seller = $this->sellerOwner();
        $user = $request->user();

        if (!$seller->isEliteTier()) {
            abort(403, 'Batch approvals are exclusively available on the Elite plan.');
        }

        $validated = $request->validate([
            'approval_ids' => ['required', 'array', 'min:1'],
            'approval_ids.*' => ['integer', 'exists:owner_approvals,id'],
        ]);

        $approvedCount = $approvalService->batchApprove($seller, $user, $validated['approval_ids']);

        return back()->with('success', "Successfully batch approved {$approvedCount} request(s).");
    }
}

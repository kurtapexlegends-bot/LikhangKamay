<?php

declare(strict_types=1);

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Http\Requests\Commission\StoreCommissionRequest;
use App\Models\CustomCommission;
use App\Services\Chat\DirectMessageService;
use App\Services\CustomCommissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CustomCommissionController extends Controller
{
    use InteractsWithSellerContext;

    protected CustomCommissionService $commissionService;
    protected DirectMessageService $directMessageService;

    public function __construct(
        CustomCommissionService $commissionService,
        DirectMessageService $directMessageService
    ) {
        $this->commissionService = $commissionService;
        $this->directMessageService = $directMessageService;
    }

    /**
     * Store new milestone downpayment commission (Artisan).
     */
    public function store(StoreCommissionRequest $request): JsonResponse|RedirectResponse
    {
        $actor = $request->user();
        $sellerPerspective = $this->directMessageService->isSellerWorkspaceChatActor($actor);
        abort_unless($sellerPerspective, 403, 'Only artisan workshops or authorized staff can create custom commission proposals.');
        $this->directMessageService->authorizeChatActor($actor, true);
        $this->directMessageService->ensureSellerMessagingWritable($actor, true);

        $artisan = $this->sellerOwner();
        $receiver = \App\Models\User::findOrFail($request->integer('receiver_id'));
        $this->directMessageService->authorizeConversationCounterpart($artisan, $receiver, true);

        $commission = $this->commissionService->createCommission($artisan, $request->validated());
        $message = \App\Models\Message::where('commission_id', $commission->id)->with('commission')->first();
        $formattedMessage = $message ? $this->directMessageService->formatMessageItem($message, $artisan->id) : null;

        if ($request->wantsJson() || $request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Custom commission milestone created successfully.',
                'commission' => $commission,
                'message_item' => $formattedMessage,
            ]);
        }

        return back()->with('success', 'Custom commission downpayment request sent.');
    }

    /**
     * Checkout / Pay initial downpayment (Buyer).
     */
    public function checkoutDeposit(Request $request, CustomCommission $commission): JsonResponse|RedirectResponse
    {
        $buyer = $request->user();
        if ($commission->buyer_id !== $buyer->id) {
            abort(403, 'Unauthorized.');
        }

        if (!$commission->isAwaitingDeposit()) {
            return response()->json(['error' => 'Downpayment is not awaiting payment.'], 422);
        }

        $isTestMode = app()->environment('testing') || (app()->environment('local') && empty(config('services.paymongo.secret_key')));

        if ($isTestMode) {
            $this->commissionService->recordDepositPaid($commission, 'GCash (Mock Test)', 'TEST-DEP-' . time());
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'paid' => true,
                    'message' => 'Initial downpayment verified successfully.',
                ]);
            }
            return back()->with('success', 'Initial downpayment verified successfully.');
        }

        $returnUrl = route('buyer.chat', ['user_id' => $commission->artisan_id, 'commission_id' => $commission->id]);
        $session = $this->commissionService->createPayMongoDepositSession($commission, $buyer, $returnUrl);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'checkout_url' => $session['checkout_url'],
            ]);
        }

        return redirect()->away($session['checkout_url']);
    }

    /**
     * Mark custom craft complete and request final balance (Artisan).
     */
    public function markReady(Request $request, CustomCommission $commission): JsonResponse|RedirectResponse
    {
        $actor = $request->user();
        $sellerPerspective = $this->directMessageService->isSellerWorkspaceChatActor($actor);
        abort_unless($sellerPerspective, 403, 'Unauthorized.');
        $artisan = $this->sellerOwner();

        $updated = $this->commissionService->markCraftComplete($commission, $artisan);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'commission' => $updated,
                'message' => 'Craft marked as complete. Buyer has been notified for final balance.',
            ]);
        }

        return back()->with('success', 'Craft marked as complete. Final balance requested.');
    }

    /**
     * Checkout / Pay final balance (Buyer).
     */
    public function checkoutBalance(Request $request, CustomCommission $commission): JsonResponse|RedirectResponse
    {
        $buyer = $request->user();
        if ($commission->buyer_id !== $buyer->id) {
            abort(403, 'Unauthorized.');
        }

        if (!$commission->isReadyForBalance()) {
            return response()->json(['error' => 'Final balance is not due yet.'], 422);
        }

        $isTestMode = app()->environment('testing') || (app()->environment('local') && empty(config('services.paymongo.secret_key')));

        if ($isTestMode) {
            $this->commissionService->recordBalancePaid($commission, 'GCash (Mock Test)', 'TEST-BAL-' . time());
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'paid' => true,
                    'message' => 'Final balance verified successfully. Order created!',
                ]);
            }
            return back()->with('success', 'Final balance verified successfully. Order created!');
        }

        $returnUrl = route('buyer.chat', ['user_id' => $commission->artisan_id, 'commission_id' => $commission->id]);
        $session = $this->commissionService->createPayMongoBalanceSession($commission, $buyer, $returnUrl);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'checkout_url' => $session['checkout_url'],
            ]);
        }

        return redirect()->away($session['checkout_url']);
    }

    /**
     * Cancel an unfulfilled commission.
     */
    public function cancel(Request $request, CustomCommission $commission): JsonResponse|RedirectResponse
    {
        $actor = $request->user();
        $sellerPerspective = $this->directMessageService->isSellerWorkspaceChatActor($actor);
        $effectiveActor = $sellerPerspective ? $this->sellerOwner() : $actor;

        $updated = $this->commissionService->cancelCommission(
            $commission,
            $effectiveActor,
            $request->input('reason', 'Cancelled by user')
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'commission' => $updated,
                'message' => 'Custom commission has been cancelled.',
            ]);
        }

        return back()->with('success', 'Custom commission has been cancelled.');
    }
}

<?php

namespace App\Http\Controllers\Core;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Dispute;
use App\Models\Product;
use App\Models\User;
use App\Models\SellerActivityLog;
use App\Notifications\DisputeStatusNotification;
use App\Notifications\RefundRequestNotification;
use App\Notifications\ReplacementResolutionNotification;
use App\Mail\RefundProcessed;
use App\Mail\ReturnRequested;
use App\Services\OrderFinanceService;
use App\Services\OrderLogisticsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class DisputeController extends Controller
{
    /**
     * BUYER: Initiate return/refund dispute
     */
    public function buyerInitiateDispute(Request $request, string $orderId)
    {
        $request->validate([
            'reason' => 'required|string|max:1000',
            'proof_photos' => 'required|array|min:1|max:5',
            'proof_photos.*' => 'required|image|max:5120', // 5MB max each
        ]);

        try {
            return DB::transaction(function () use ($orderId, $request) {
                $order = Order::lockForUpdate()->where('id', $orderId)
                    ->where('user_id', Auth::id())
                    ->firstOrFail();

                if ($order->status !== 'Completed') {
                    return back()->withErrors(['message' => 'This order is not completed.']);
                }

                // Check 1-day warranty window
                if (!$order->received_at && $order->delivered_at) {
                    $order->received_at = $order->delivered_at;
                }
                $warrantyExpires = $order->warranty_expires_at ?? ($order->received_at ? $order->received_at->addDay() : null);

                if (!$warrantyExpires || now()->greaterThan($warrantyExpires)) {
                    return back()->withErrors(['message' => 'Dispute window has expired. Disputes must be filed within 1 day of receiving the order.']);
                }

                // Check if a dispute already exists for this order
                if (Dispute::where('order_id', $order->id)->exists()) {
                    return back()->withErrors(['message' => 'A dispute has already been filed for this order.']);
                }

                // Store proof photos
                $paths = [];
                if ($request->hasFile('proof_photos')) {
                    foreach ($request->file('proof_photos') as $file) {
                        $paths[] = $file->store('disputes', 'public');
                    }
                }

                // Create Dispute record
                $dispute = Dispute::create([
                    'order_id' => $order->id,
                    'status' => 'pending',
                    'reason' => $request->reason,
                    'proof_photos' => $paths,
                ]);

                // Move order status to 'Refund/Return'
                $order->update([
                    'status' => 'Refund/Return',
                ]);

                // Record audit log
                SellerActivityLog::recordEvent([
                    'seller_owner_id' => $order->artisan_id,
                    'actor_user_id' => Auth::id(),
                    'actor_type' => 'buyer',
                    'category' => 'operations',
                    'module' => 'orders',
                    'event_type' => 'dispute_initiated',
                    'severity' => 'warning',
                    'status' => 'refund_return',
                    'title' => 'Dispute Initiated',
                    'summary' => "Buyer filed dispute for Order #{$order->order_number}.",
                    'subject_type' => Order::class,
                    'subject_id' => $order->id,
                    'subject_label' => $order->order_number,
                    'reference' => $order->customer_name,
                    'amount_label' => 'PHP ' . number_format((float) $order->total_amount, 2),
                ]);

                // Notify seller
                $seller = User::find($order->artisan_id);
                if ($seller) {
                    $seller->notify(new RefundRequestNotification($order));
                    $this->sendMailSilently($seller->email, new ReturnRequested($order));
                }

                return back()->with('success', 'Dispute request submitted successfully.');
            });
        } catch (\Throwable $e) {
            Log::error("Dispute initiation failed: " . $e->getMessage());
            return back()->withErrors(['message' => $e->getMessage()]);
        }
    }

    /**
     * SELLER: Respond to dispute (accept, reject, propose replacement)
     */
    public function sellerRespond(Request $request, string $disputeId)
    {
        $request->validate([
            'response_type' => 'required|string|in:accept,reject,replacement',
            'seller_explanation' => 'required_if:response_type,reject|nullable|string|max:1000',
            'seller_proposed_description' => 'required_if:response_type,replacement|nullable|string|max:1000',
        ]);

        try {
            return DB::transaction(function () use ($disputeId, $request) {
                $dispute = Dispute::lockForUpdate()->findOrFail($disputeId);
                $order = Order::lockForUpdate()->findOrFail($dispute->order_id);

                // Authenticate seller (owner or authorized staff)
                $actor = Auth::user();
                assert($actor instanceof User);
                $effectiveSellerId = $actor->getEffectiveSellerId();
                if ($order->artisan_id !== $effectiveSellerId) {
                    abort(403, 'Unauthorized.');
                }

                if ($dispute->status !== 'pending') {
                    return back()->withErrors(['message' => 'This dispute is no longer pending.']);
                }

                if ($request->response_type === 'accept') {
                    // Update dispute
                    $dispute->update([
                        'status' => 'seller_accepted',
                        'seller_response_type' => 'refund',
                        'resolved_at' => now(),
                    ]);

                    // Update order
                    $order->update([
                        'status' => 'Refunded',
                        'payment_status' => 'refunded',
                    ]);

                    // Record audit log
                    SellerActivityLog::recordEvent([
                        'seller_owner_id' => $order->artisan_id,
                        'actor_user_id' => $actor->id,
                        'actor_type' => SellerActivityLog::resolveActorType($actor, 'seller'),
                        'category' => 'operations',
                        'module' => 'orders',
                        'event_type' => 'dispute_accepted',
                        'severity' => 'info',
                        'status' => 'refunded',
                        'title' => 'Dispute Accepted',
                        'summary' => "Seller accepted refund request for Order #{$order->order_number}.",
                        'subject_type' => Order::class,
                        'subject_id' => $order->id,
                        'subject_label' => $order->order_number,
                        'reference' => $order->customer_name,
                        'amount_label' => 'PHP ' . number_format((float) $order->total_amount, 2),
                    ]);

                    // Notify buyer
                    $buyer = $order->user;
                    if ($buyer) {
                        $buyer->notify(new DisputeStatusNotification(
                            'dispute_accepted',
                            'Dispute Request Approved',
                            "Seller approved refund for Order #{$order->order_number}.",
                            route('my-orders.index')
                        ));
                        $this->sendMailSilently($buyer->email, new RefundProcessed($order));
                    }
                } elseif ($request->response_type === 'replacement') {
                    // Update dispute
                    $dispute->update([
                        'status' => 'seller_proposed_replacement',
                        'seller_response_type' => 'replacement',
                        'seller_proposed_description' => $request->seller_proposed_description,
                    ]);

                    // Record audit log
                    SellerActivityLog::recordEvent([
                        'seller_owner_id' => $order->artisan_id,
                        'actor_user_id' => $actor->id,
                        'actor_type' => SellerActivityLog::resolveActorType($actor, 'seller'),
                        'category' => 'operations',
                        'module' => 'orders',
                        'event_type' => 'dispute_replacement_proposed',
                        'severity' => 'info',
                        'status' => 'refund_return',
                        'title' => 'Replacement Proposed',
                        'summary' => "Seller proposed replacement exchange for Order #{$order->order_number}.",
                        'subject_type' => Order::class,
                        'subject_id' => $order->id,
                        'subject_label' => $order->order_number,
                        'reference' => $order->customer_name,
                        'amount_label' => 'PHP ' . number_format((float) $order->total_amount, 2),
                    ]);

                    // Notify buyer
                    $buyer = $order->user;
                    if ($buyer) {
                        $buyer->notify(new DisputeStatusNotification(
                            'dispute_replacement_proposed',
                            'Replacement Exchange Proposed',
                            "Seller proposed a replacement option for Order #{$order->order_number}.",
                            route('my-orders.index')
                        ));
                    }
                } elseif ($request->response_type === 'reject') {
                    // Update dispute
                    $dispute->update([
                        'status' => 'seller_rejected',
                        'seller_response_type' => 'reject',
                        'seller_explanation' => $request->seller_explanation,
                    ]);

                    // Record audit log
                    SellerActivityLog::recordEvent([
                        'seller_owner_id' => $order->artisan_id,
                        'actor_user_id' => $actor->id,
                        'actor_type' => SellerActivityLog::resolveActorType($actor, 'seller'),
                        'category' => 'operations',
                        'module' => 'orders',
                        'event_type' => 'dispute_rejected',
                        'severity' => 'warning',
                        'status' => 'refund_return',
                        'title' => 'Dispute Rejected by Seller',
                        'summary' => "Seller rejected return request for Order #{$order->order_number}.",
                        'subject_type' => Order::class,
                        'subject_id' => $order->id,
                        'subject_label' => $order->order_number,
                        'reference' => $order->customer_name,
                        'amount_label' => 'PHP ' . number_format((float) $order->total_amount, 2),
                    ]);

                    // Notify buyer
                    $buyer = $order->user;
                    if ($buyer) {
                        $buyer->notify(new DisputeStatusNotification(
                            'dispute_rejected',
                            'Dispute Request Rejected',
                            "Seller rejected the return request for Order #{$order->order_number}. You can escalate to admin support.",
                            route('my-orders.index')
                        ));
                    }
                }

                return back()->with('success', 'Dispute response registered successfully.');
            });
        } catch (\Throwable $e) {
            Log::error("Seller dispute response failed: " . $e->getMessage());
            return back()->withErrors(['message' => $e->getMessage()]);
        }
    }

    /**
     * BUYER: React to dispute (escalate or accept replacement)
     */
    public function buyerReact(Request $request, string $disputeId)
    {
        $request->validate([
            'action' => 'required|string|in:accept_replacement,escalate',
            'escalation_reason' => 'required_if:action,escalate|nullable|string|max:1000',
        ]);

        try {
            return DB::transaction(fn() => $this->executeBuyerReaction($request, $disputeId));
        } catch (\Throwable $e) {
            Log::error("Buyer dispute action failed: " . $e->getMessage());
            return back()->withErrors(['message' => $e->getMessage()]);
        }
    }

    private function executeBuyerReaction(Request $request, string $disputeId)
    {
        $dispute = Dispute::lockForUpdate()->findOrFail($disputeId);
        $order = Order::lockForUpdate()->findOrFail($dispute->order_id);

        if ($order->user_id !== Auth::id()) {
            abort(403, 'Unauthorized.');
        }

        if ($request->action === 'accept_replacement') {
            $this->handleReplacementAcceptance($dispute, $order);
        } elseif ($request->action === 'escalate') {
            $this->handleDisputeEscalation($request, $dispute, $order);
        }

        return back()->with('success', 'Dispute response registered successfully.');
    }

    private function handleReplacementAcceptance(Dispute $dispute, Order $order): void
    {
        if ($dispute->status !== 'seller_proposed_replacement') {
            throw new \Exception('No replacement offer exists for this dispute.');
        }

        // Decrement stock for items
        $order->load('items');
        foreach ($order->items as $item) {
            $product = Product::lockForUpdate()->find($item->product_id);
            if (!$product || $product->stock < $item->quantity) {
                throw new \Exception("Insufficient stock to replace " . ($product ? $product->name : 'Unknown Product') . ".");
            }
            $product->decrement('stock', $item->quantity);
            if ($product->track_as_supply && $product->supply) {
                $product->supply->update(['quantity' => $product->stock]);
            }
        }

        // Delete existing delivery if necessary
        if ($order->shipping_method === 'Delivery' && $order->delivery) {
            $order->delivery()->delete();
            $order->unsetRelation('delivery');
        }

        // Reset order status to 'Accepted' for delivery
        $order->update([
            'status' => 'Accepted',
            'accepted_at' => now(),
            'shipped_at' => null,
            'delivered_at' => null,
            'received_at' => null,
            'warranty_expires_at' => null,
            'tracking_number' => null,
            'shipping_notes' => null,
            'proof_of_delivery' => null,
            'replacement_resolution_description' => $dispute->seller_proposed_description,
            'replacement_started_at' => now(),
            'replacement_resolved_at' => null,
        ]);

        // Resolve dispute
        $dispute->update([
            'status' => 'resolved_replacement',
            'resolved_at' => now(),
        ]);

        // Attempt auto-booking
        if ($order->shipping_method === 'Delivery') {
            try {
                $seller = User::find($order->artisan_id);
                app(OrderLogisticsService::class)->bookLalamoveDelivery($order, $seller);
            } catch (\Throwable $e) {
                Log::warning("Failed to auto-book Lalamove: " . $e->getMessage());
            }
        }

        // Record audit log
        SellerActivityLog::recordEvent([
            'seller_owner_id' => $order->artisan_id,
            'actor_user_id' => Auth::id(),
            'actor_type' => 'buyer',
            'category' => 'operations',
            'module' => 'orders',
            'event_type' => 'dispute_replacement_accepted',
            'severity' => 'info',
            'status' => 'accepted',
            'title' => 'Replacement Accepted',
            'summary' => "Buyer accepted replacement for Order #{$order->order_number}.",
            'subject_type' => Order::class,
            'subject_id' => $order->id,
            'subject_label' => $order->order_number,
            'reference' => $order->customer_name,
            'amount_label' => 'PHP ' . number_format((float) $order->total_amount, 2),
        ]);

        // Notify seller
        $seller = User::find($order->artisan_id);
        if ($seller) {
            $seller->notify(new ReplacementResolutionNotification($order, $dispute->seller_proposed_description ?? ''));
        }
    }

    private function handleDisputeEscalation(Request $request, Dispute $dispute, Order $order): void
    {
        if (!in_array($dispute->status, ['seller_proposed_replacement', 'seller_rejected'])) {
            throw new \Exception('You cannot escalate this dispute yet.');
        }

        $dispute->update([
            'status' => 'escalated',
            'escalation_reason' => $request->escalation_reason,
        ]);

        // Record audit log
        SellerActivityLog::recordEvent([
            'seller_owner_id' => $order->artisan_id,
            'actor_user_id' => Auth::id(),
            'actor_type' => 'buyer',
            'category' => 'operations',
            'module' => 'orders',
            'event_type' => 'dispute_escalated',
            'severity' => 'warning',
            'status' => 'refund_return',
            'title' => 'Dispute Escalated',
            'summary' => "Buyer escalated dispute for Order #{$order->order_number}.",
            'subject_type' => Order::class,
            'subject_id' => $order->id,
            'subject_label' => $order->order_number,
            'reference' => $order->customer_name,
            'amount_label' => 'PHP ' . number_format((float) $order->total_amount, 2),
        ]);

        // Notify super admins
        $admins = User::where('role', 'super_admin')->get();
        foreach ($admins as $admin) {
            $admin->notify(new DisputeStatusNotification(
                'dispute_escalated',
                'New Escalation Queue',
                "Order #{$order->order_number} has been escalated for dispute arbitration.",
                route('admin.disputes.index')
            ));
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
    public function adminArbitrate(Request $request, string $disputeId)
    {
        $this->authorizeAdmin();

        $request->validate([
            'decision' => 'required|string|in:refund,reject',
            'admin_notes' => 'required|string|max:1000',
        ]);

        try {
            return DB::transaction(function () use ($disputeId, $request) {
                $dispute = Dispute::lockForUpdate()->findOrFail($disputeId);
                $order = Order::lockForUpdate()->findOrFail($dispute->order_id);

                if ($dispute->status !== 'escalated') {
                    return back()->withErrors(['message' => 'This dispute is not escalated for arbitration.']);
                }

                $actor = Auth::user();

                if ($request->decision === 'refund') {
                    // Refund order
                    $dispute->update([
                        'status' => 'resolved_refunded',
                        'admin_decision' => 'refund',
                        'admin_notes' => $request->admin_notes,
                        'resolved_at' => now(),
                    ]);

                    $order->update([
                        'status' => 'Refunded',
                        'payment_status' => 'refunded',
                    ]);

                    // Notify buyer and seller
                    $buyer = $order->user;
                    if ($buyer) {
                        $buyer->notify(new DisputeStatusNotification(
                            'dispute_arbitrated_refund',
                            'Dispute Resolved: Refunded',
                            "Platform administrator has ruled in favor of refund for Order #{$order->order_number}.",
                            route('my-orders.index')
                        ));
                        $this->sendMailSilently($buyer->email, new RefundProcessed($order));
                    }

                    $seller = User::find($order->artisan_id);
                    if ($seller) {
                        $seller->notify(new DisputeStatusNotification(
                            'dispute_arbitrated_refund',
                            'Dispute Arbitrated: Refunded',
                            "Platform administrator has ruled in favor of buyer refund for Order #{$order->order_number}.",
                            route('orders.index')
                        ));
                    }

                    // Log activity
                    SellerActivityLog::recordEvent([
                        'seller_owner_id' => $order->artisan_id,
                        'actor_user_id' => $actor->id,
                        'actor_type' => 'system',
                        'category' => 'operations',
                        'module' => 'orders',
                        'event_type' => 'dispute_arbitrated_refund',
                        'severity' => 'warning',
                        'status' => 'refunded',
                        'title' => 'Admin Ruled Refund',
                        'summary' => "Admin arbitrated dispute in favor of Refund for Order #{$order->order_number}.",
                        'subject_type' => Order::class,
                        'subject_id' => $order->id,
                        'subject_label' => $order->order_number,
                        'reference' => $order->customer_name,
                        'amount_label' => 'PHP ' . number_format((float) $order->total_amount, 2),
                    ]);
                } elseif ($request->decision === 'reject') {
                    // Reject claim, restore order status back to Completed
                    $dispute->update([
                        'status' => 'resolved_rejected',
                        'admin_decision' => 'reject',
                        'admin_notes' => $request->admin_notes,
                        'resolved_at' => now(),
                    ]);

                    $order->update([
                        'status' => 'Completed',
                    ]);

                    // Notify buyer and seller
                    $buyer = $order->user;
                    if ($buyer) {
                        $buyer->notify(new DisputeStatusNotification(
                            'dispute_arbitrated_rejected',
                            'Dispute Resolved: Claim Rejected',
                            "Platform administrator has rejected the return claim for Order #{$order->order_number}.",
                            route('my-orders.index')
                        ));
                    }

                    $seller = User::find($order->artisan_id);
                    if ($seller) {
                        $seller->notify(new DisputeStatusNotification(
                            'dispute_arbitrated_rejected',
                            'Dispute Arbitrated: Rejected',
                            "Platform administrator has ruled in favor of seller for Order #{$order->order_number}.",
                            route('orders.index')
                        ));
                    }

                    // Log activity
                    SellerActivityLog::recordEvent([
                        'seller_owner_id' => $order->artisan_id,
                        'actor_user_id' => $actor->id,
                        'actor_type' => 'system',
                        'category' => 'operations',
                        'module' => 'orders',
                        'event_type' => 'dispute_arbitrated_rejected',
                        'severity' => 'info',
                        'status' => 'completed',
                        'title' => 'Admin Ruled Rejection',
                        'summary' => "Admin arbitrated dispute in favor of Seller for Order #{$order->order_number}.",
                        'subject_type' => Order::class,
                        'subject_id' => $order->id,
                        'subject_label' => $order->order_number,
                        'reference' => $order->customer_name,
                        'amount_label' => 'PHP ' . number_format((float) $order->total_amount, 2),
                    ]);
                }

                return back()->with('success', 'Arbitration decision registered successfully.');
            });
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

    private function sendMailSilently(string $recipient, \Illuminate\Mail\Mailable $mailable): void
    {
        try {
            Mail::to($recipient)->send($mailable);
        } catch (\Throwable $e) {
            Log::warning("Failed to send mail to {$recipient}: " . $e->getMessage());
        }
    }
}

<?php

namespace App\Http\Controllers\Core;

use App\Http\Controllers\Controller;
use App\Models\Dispute;
use App\Models\User;
use App\Actions\Disputes\BuyerInitiateDispute;
use App\Actions\Disputes\SellerRespondToDispute;
use App\Actions\Disputes\BuyerReactToDispute;
use App\Actions\Disputes\AdminArbitrateDispute;
use App\Services\StorageUrl;
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
            'reason' => 'required_without:return_reason|nullable|string|max:1000',
            'return_reason' => 'required_without:reason|nullable|string|max:1000',
            'proof_photos' => 'required_without_all:return_proof_image,proof_photo|nullable|array|min:1|max:5',
            'proof_photos.*' => 'nullable|image|max:4096', // 4MB max each
            'return_proof_image' => 'required_without_all:proof_photos,proof_photo|nullable|image|max:4096',
            'proof_photo' => 'nullable|image|max:4096',
            'policy_id' => 'nullable|integer',
            'damage_reason_code' => 'nullable|string|max:100',
            'checklist_confirmations' => 'nullable|array',
            'checklist_confirmations.*' => 'nullable|string|max:100',
            'photo_angle_keys' => 'nullable|array|max:5',
            'photo_angle_keys.*' => 'nullable|string|max:100',
        ]);

        $reason = (string) ($request->input('reason') ?: $request->input('return_reason'));
        $photos = $request->file('proof_photos');
        if (empty($photos)) {
            $single = $request->file('return_proof_image') ?: $request->file('proof_photo');
            $photos = $single ? [$single] : [];
        } elseif (!is_array($photos)) {
            $photos = [$photos];
        }

        $criteriaInput = $request->only([
            'policy_id',
            'damage_reason_code',
            'checklist_confirmations',
            'photo_angle_keys',
        ]);

        try {
            $action->execute(
                $orderId,
                $reason,
                $photos,
                Auth::id(),
                $criteriaInput,
                true,
                $request
            );
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

        $disputes = Dispute::with(['order.user', 'order.artisan', 'order.items.product'])
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
            ->latest('updated_at')
            ->get()
            ->map(function (Dispute $dispute) {
                $payload = $dispute->toArray();
                $payload['proof_photos'] = collect($dispute->proof_photos ?? [])
                    ->map(fn ($p) => StorageUrl::url($p))
                    ->filter()
                    ->values()
                    ->all();

                if (is_array($dispute->photo_angles)) {
                    $payload['photo_angles'] = collect($dispute->photo_angles)
                        ->map(function ($angle) {
                            if (is_array($angle) && !empty($angle['path'])) {
                                $angle['url'] = StorageUrl::url($angle['path']);
                            }
                            return $angle;
                        })
                        ->values()
                        ->all();
                }

                if ($dispute->order && isset($payload['order']) && is_array($payload['order'])) {
                    $payload['order']['proof_of_delivery'] = StorageUrl::url($dispute->order->proof_of_delivery);

                    if (isset($payload['order']['packing_photos']) && is_array($payload['order']['packing_photos'])) {
                        $payload['order']['packing_photos'] = collect($payload['order']['packing_photos'])
                            ->map(fn ($p) => StorageUrl::url($p))
                            ->filter()
                            ->values()
                            ->all();
                    }

                    if (isset($payload['order']['items']) && is_array($payload['order']['items'])) {
                        foreach ($dispute->order->items as $idx => $item) {
                            if (!isset($payload['order']['items'][$idx])) {
                                continue;
                            }
                            $resolvedItemImg = StorageUrl::url($item->product_img ?: $item->product?->cover_photo_path);
                            $payload['order']['items'][$idx]['product_img'] = $resolvedItemImg;

                            if ($item->product && isset($payload['order']['items'][$idx]['product']) && is_array($payload['order']['items'][$idx]['product'])) {
                                $payload['order']['items'][$idx]['product']['cover_photo_path'] = StorageUrl::url($item->product->cover_photo_path);
                            }
                        }
                    }
                }

                return $payload;
            });

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
            'decision' => 'required|string|in:refund,reject,partial_refund',
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
            return back()->with('success', 'Dispute decision registered successfully.');
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

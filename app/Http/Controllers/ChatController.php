<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Message;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache; // <--- Added
use Inertia\Inertia;

class ChatController extends Controller
{
    use InteractsWithSellerContext;

    // 1. SELLER VIEW
    public function index(Request $request)
    {
        return $this->getChatData($request, 'Seller/Chat', true);
    }

    // 2. BUYER VIEW
    public function buyerIndex(Request $request)
    {
        return $this->getChatData($request, 'Buyer/Chat', false);
    }

    // 3. SEND MESSAGE (Shared)
    public function store(Request $request)
    {
        $actor = $request->user();
        $sellerPerspective = $this->isSellerWorkspaceChatActor($actor);
        $this->authorizeChatActor($actor, $sellerPerspective);

        $request->validate([
            'receiver_id' => 'required|exists:users,id',
            'message' => 'nullable|string', // Allow empty message if there's an attachment
            'attachment' => 'nullable|file|max:10240', // 10MB max
        ]);

        if (!$request->filled('message') && !$request->hasFile('attachment')) {
            return back()->withErrors(['message' => 'Message or attachment is required']);
        }

        $receiver = User::findOrFail($request->integer('receiver_id'));
        $this->authorizeConversationCounterpart($actor, $receiver, $sellerPerspective);

        $attachmentPath = null;
        $attachmentType = null;

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $attachmentPath = $file->store('chat_attachments', 'public');
            $mimeType = $file->getMimeType();
            $attachmentType = str_starts_with($mimeType, 'image/') ? 'image' : 'document';
        }

        $senderId = $this->resolveConversationUserId($actor, $sellerPerspective);

        $msg = Message::create([
            'sender_id' => $senderId,
            'receiver_id' => $request->receiver_id,
            'message' => $request->message ?? '',
            'attachment_path' => $attachmentPath,
            'attachment_type' => $attachmentType,
        ]);

        // Notify Receiver
        $senderIdentity = $sellerPerspective ? $this->sellerOwner() : $actor;
        $senderName = $senderIdentity->shop_name ?: $senderIdentity->name;
        $receiver->notify(new \App\Notifications\NewMessageNotification($msg, $senderName));

        return redirect()->back();
    }

    public function markAsSeen(Request $request) 
    {
        $actor = $request->user();
        $sellerPerspective = $this->isSellerWorkspaceChatActor($actor);
        $this->authorizeChatActor($actor, $sellerPerspective);

        $request->validate([
            'sender_id' => 'required|exists:users,id'
        ]);

        $sender = User::findOrFail($request->integer('sender_id'));
        $this->authorizeConversationCounterpart($actor, $sender, $sellerPerspective);

        $conversationUserId = $this->resolveConversationUserId($actor, $sellerPerspective);

        Message::where('sender_id', $request->sender_id)
            ->where('receiver_id', $conversationUserId)
            ->update(['is_read' => true]);

        return response()->json(['success' => true]);
    }

    // 5. SIGNAL TYPING
    public function signalTyping(Request $request)
    {
        $actor = $request->user();
        $sellerPerspective = $this->isSellerWorkspaceChatActor($actor);
        $this->authorizeChatActor($actor, $sellerPerspective);

        $request->validate([
            'receiver_id' => 'required|exists:users,id'
        ]);

        $userId = $this->resolveConversationUserId($actor, $sellerPerspective);
        $receiverId = $request->receiver_id;
        $receiver = User::findOrFail((int) $receiverId);
        $this->authorizeConversationCounterpart($actor, $receiver, $sellerPerspective);

        // Store typing status in cache for 4 seconds
        Cache::put("typing-{$userId}-to-{$receiverId}", true, 4);

        return response()->json(['success' => true]);
    }

    // --- SHARED LOGIC (THE ENGINE) ---
    private function getChatData(Request $request, string $viewName, bool $sellerPerspective)
    {
        $actor = $request->user();
        $this->authorizeChatActor($actor, $sellerPerspective);

        $userId = $this->resolveConversationUserId($actor, $sellerPerspective);
        $activeChatId = (int) $request->query('user_id');

        // A. GET CONVERSATION LIST
        $contactIds = Message::where('sender_id', $userId)
            ->orWhere('receiver_id', $userId)
            ->selectRaw('CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as contact_id', [$userId])
            ->distinct()
            ->pluck('contact_id');

        $contacts = User::whereIn('id', $contactIds)
            ->get()
            ->filter(fn (User $user) => $this->canAccessConversationForPerspective($actor, $user, $sellerPerspective))
            ->values();

        $contactIds = $contacts->pluck('id');

        // Pre-fetch latest messages for all contacts
        $latestMessagesQuery = Message::where(function($q) use ($userId, $contactIds) {
            $q->where('sender_id', $userId)->whereIn('receiver_id', $contactIds);
        })->orWhere(function($q) use ($userId, $contactIds) {
            $q->whereIn('sender_id', $contactIds)->where('receiver_id', $userId);
        })->latest()->get();

        // Also pre-fetch unread counts
        $unreadCounts = Message::whereIn('sender_id', $contactIds)
            ->where('receiver_id', $userId)
            ->where('is_read', false)
            ->selectRaw('sender_id, count(*) as count')
            ->groupBy('sender_id')
            ->pluck('count', 'sender_id');

        $conversations = $contacts->map(function($user) use ($userId, $latestMessagesQuery, $unreadCounts) {
            $lastMsg = $latestMessagesQuery->first(function($msg) use ($userId, $user) {
                return ($msg->sender_id == $userId && $msg->receiver_id == $user->id) ||
                       ($msg->sender_id == $user->id && $msg->receiver_id == $userId);
            });

            return [
                'id' => $user->id,
                'name' => $user->name,
                'avatar' => $user->avatar,
                'avatar_url' => $user->avatar ? '/storage/' . $user->avatar : null,
                'initial' => substr($user->shop_name ?: $user->name, 0, 1),
                'premium_tier' => $user->premium_tier,
                'role' => $user->role,
                'shop_name' => $user->shop_name,
                'lastMsg' => $lastMsg ? $lastMsg->message : 'Start chatting',
                'last_message_at' => $lastMsg?->created_at?->toIso8601String(),
                'time' => $lastMsg ? $lastMsg->created_at->shortAbsoluteDiffForHumans() : '',
                'unread' => $unreadCounts[$user->id] ?? 0,
                'is_online' => Cache::has('user-is-online-' . $user->id),
            ];
        });

        // B. GET ACTIVE MESSAGES
        $messages = [];
        $activeUser = null;
        $currentOrderContext = null;

        if ($activeChatId) {
            $activeUser = User::find($activeChatId);

            if ($activeUser) {
                $this->authorizeConversationCounterpart($actor, $activeUser, $sellerPerspective);
            }

            // Add online status to active user
            if ($activeUser) {
                $activeUser->is_online = Cache::has('user-is-online-' . $activeUser->id);
                $activeUser->last_seen_at_iso = $activeUser->last_seen_at?->toIso8601String();
                $activeUser->last_seen = $activeUser->last_seen_at 
                    ? $activeUser->last_seen_at->diffForHumans() 
                    : 'Offline';
                    
                // Check if this specific user is typing TO the current user
                $activeUser->is_typing = Cache::has("typing-{$activeChatId}-to-{$userId}");
            }

            // Fetch history
            $messages = Message::where(function($q) use ($userId, $activeChatId) {
                $q->where('sender_id', $userId)->where('receiver_id', $activeChatId);
            })->orWhere(function($q) use ($userId, $activeChatId) {
                $q->where('sender_id', $activeChatId)->where('receiver_id', $userId);
            })->orderBy('created_at', 'asc')->get()->map(function($m) use ($userId) {
                return [
                    'id' => $m->id,
                    'text' => $m->message,
                    'attachment_path' => $m->attachment_path,
                    'attachment_type' => $m->attachment_type,
                    'sender' => $m->sender_id === $userId ? 'me' : 'other',
                    'created_at' => $m->created_at?->toIso8601String(),
                    'time' => $m->created_at->format('g:i A'),
                    'is_read' => $m->is_read
                ];
            });

            $currentOrderContext = $this->resolveCurrentOrderContext(
                $request->user(),
                $activeUser,
                $sellerPerspective
            );
        }

        return Inertia::render($viewName, [
            'conversations' => $conversations,
            'activeMessages' => $messages,
            'currentChatUser' => $activeUser,
            'currentOrderContext' => $currentOrderContext,
        ]);
    }

    private function resolveCurrentOrderContext(?User $actor, ?User $counterpart, bool $sellerPerspective): ?array
    {
        if (!$actor || !$counterpart || !$this->isSupportedConversationUser($counterpart)) {
            return null;
        }

        $orderQuery = Order::query()
            ->with('items')
            ->whereNotIn('status', $this->terminalOrderStatuses());

        if ($sellerPerspective) {
            $orderQuery
                ->where('artisan_id', $this->sellerOwnerId())
                ->where('user_id', $counterpart->id);
        } else {
            $orderQuery
                ->where('user_id', $actor->id)
                ->where('artisan_id', $counterpart->id);
        }

        $pendingOrder = (clone $orderQuery)
            ->where('status', 'Pending')
            ->latest('created_at')
            ->first();

        $activeOrdersCount = (clone $orderQuery)->count();

        $order = $pendingOrder ?: (clone $orderQuery)
            ->latest('created_at')
            ->first();

        if (!$order) {
            return null;
        }

        $canRespond = $sellerPerspective
            && $order->status === 'Pending'
            && $actor->canAccessSellerModule('orders');

        $lineItemsCount = $order->items->count();
        $unitsCount = (int) $order->items->sum('quantity');

        return [
            'orderNumber' => $order->order_number,
            'dbId' => $order->id,
            'status' => $order->status,
            'paymentStatus' => $order->payment_status ?? 'pending',
            'customerName' => $order->customer_name,
            'placedAt' => $order->created_at?->format('M d, Y h:i A'),
            'shippingAddress' => $order->shipping_address,
            'shippingMethod' => $order->shipping_method,
            'shippingNotes' => $order->shipping_notes,
            'paymentMethod' => $order->payment_method,
            'trackingNumber' => $order->tracking_number,
            'totalAmount' => (float) $order->total_amount,
            'formattedTotal' => number_format((float) $order->total_amount, 2),
            'canRespond' => $canRespond,
            'isReadOnly' => !$canRespond,
            'detailsRoute' => $sellerPerspective ? route('orders.index') : route('my-orders.index'),
            'activeOrdersCount' => $activeOrdersCount,
            'otherActiveOrdersCount' => max(0, $activeOrdersCount - 1),
            'lineItemsCount' => $lineItemsCount,
            'itemsCount' => $lineItemsCount,
            'unitsCount' => $unitsCount,
            'selectionSummary' => $activeOrdersCount > 1
                ? ($pendingOrder
                    ? 'Showing the pending order first. View Orders to review the other active orders in this conversation.'
                    : 'Showing the latest active order. View Orders to review the rest of this conversation\'s open orders.')
                : null,
            'items' => $order->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->product_name,
                    'variant' => $item->variant ?: 'Standard',
                    'quantity' => $item->quantity,
                    'price' => (float) $item->price,
                    'img' => $this->resolveProductImagePath($item->product_img),
                ];
            })->values()->all(),
        ];
    }

    /**
     * @return array<int, string>
     */
    private function terminalOrderStatuses(): array
    {
        return ['Completed', 'Cancelled', 'Rejected', 'Refunded', 'Replaced'];
    }

    private function authorizeChatActor(?User $actor, bool $sellerPerspective = false): void
    {
        abort_unless($actor, 403, 'Authentication required.');

        if ($sellerPerspective) {
            abort_unless(
                $this->isSellerWorkspaceChatActor($actor),
                403,
                'Unauthorized seller chat access.'
            );

            return;
        }

        abort_if($actor->isAdmin() || $actor->isStaff(), 403, 'Unauthorized chat access.');
    }

    private function authorizeConversationCounterpart(User $actor, User $counterpart, bool $sellerPerspective): void
    {
        abort_unless(
            $this->canAccessConversationForPerspective($actor, $counterpart, $sellerPerspective),
            403,
            'Unauthorized chat recipient.'
        );
    }

    private function authorizeSharedConversationCounterpart(User $actor, User $counterpart): void
    {
        $isAuthorized = $this->canAccessConversationForPerspective($actor, $counterpart, false)
            || $this->canAccessConversationForPerspective($actor, $counterpart, true);

        abort_unless($isAuthorized, 403, 'Unauthorized chat recipient.');
    }

    private function isSupportedConversationUser(User $user): bool
    {
        return !$user->isAdmin() && !$user->isStaff();
    }

    private function canAccessConversationForPerspective(User $actor, User $counterpart, bool $sellerPerspective): bool
    {
        if (
            $actor->id === $counterpart->id
            || !$this->isSupportedConversationUser($counterpart)
        ) {
            return false;
        }

        if ($sellerPerspective) {
            if (!$this->isSellerWorkspaceChatActor($actor)) {
                return false;
            }

            $sellerUserId = $this->resolveConversationUserId($actor, true);

            return $this->hasOrderRelationship($this->sellerOwnerId(), $counterpart->id)
                || $this->hasExistingConversation($sellerUserId, $counterpart->id);
        }

        if (!$counterpart->isArtisan()) {
            return false;
        }

        return $this->hasOrderRelationship($counterpart->id, $actor->id)
            || $this->hasExistingConversation($actor->id, $counterpart->id);
    }

    private function isSellerWorkspaceChatActor(?User $actor): bool
    {
        if (!$actor || !$actor->canAccessSellerModule('messages')) {
            return false;
        }

        if ($actor->isArtisan()) {
            return $actor->canAccessSellerOwnerRoutes();
        }

        return $actor->isStaff() && $actor->canAccessSellerWorkspace();
    }

    private function resolveConversationUserId(User $actor, bool $sellerPerspective): int
    {
        return $sellerPerspective ? $this->sellerOwnerId() : $actor->id;
    }

    private function hasExistingConversation(int $firstUserId, int $secondUserId): bool
    {
        return Message::query()
            ->where(function ($query) use ($firstUserId, $secondUserId) {
                $query->where('sender_id', $firstUserId)
                    ->where('receiver_id', $secondUserId);
            })
            ->orWhere(function ($query) use ($firstUserId, $secondUserId) {
                $query->where('sender_id', $secondUserId)
                    ->where('receiver_id', $firstUserId);
            })
            ->exists();
    }

    private function hasOrderRelationship(int $sellerId, int $buyerId): bool
    {
        return Order::query()
            ->where('artisan_id', $sellerId)
            ->where('user_id', $buyerId)
            ->exists();
    }

    private function resolveProductImagePath(?string $path): string
    {
        if (!$path) {
            return '/images/placeholder.svg';
        }

        if (
            str_starts_with($path, 'http')
            || str_starts_with($path, '/storage/')
            || str_starts_with($path, '/images/')
        ) {
            return $path;
        }

        return '/storage/' . ltrim($path, '/');
    }
}

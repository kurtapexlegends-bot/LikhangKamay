<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Message;
use App\Models\User;
use App\Services\Chat\DirectMessageService;
use App\Actions\Chat\ResolveCurrentOrderContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class ChatController extends Controller
{
    use InteractsWithSellerContext;

    protected DirectMessageService $directMessageService;
    protected ResolveCurrentOrderContext $resolveCurrentOrderContext;

    public function __construct(
        DirectMessageService $directMessageService,
        ResolveCurrentOrderContext $resolveCurrentOrderContext
    ) {
        $this->directMessageService = $directMessageService;
        $this->resolveCurrentOrderContext = $resolveCurrentOrderContext;
    }

    // 1. SELLER VIEW
    public function index(Request $request)
    {
        return $this->getChatData($request, 'Seller/Chat/Chat', true);
    }

    // 2. BUYER VIEW
    public function buyerIndex(Request $request)
    {
        return $this->getChatData($request, 'Consumer/Buyer/Chat', false);
    }

    // 3. SEND MESSAGE (Shared)
    public function store(Request $request)
    {
        $actor = $request->user();
        $sellerPerspective = $this->directMessageService->isSellerWorkspaceChatActor($actor);
        $this->directMessageService->authorizeChatActor($actor, $sellerPerspective);
        $this->directMessageService->ensureSellerMessagingWritable($actor, $sellerPerspective);

        $request->validate([
            'receiver_id' => 'required|exists:users,id',
            'message' => 'nullable|string|max:2000',
            'attachment' => 'nullable|file|max:10240', // 10MB max
        ]);

        if (!$request->filled('message') && !$request->hasFile('attachment')) {
            return back()->withErrors(['message' => 'Message or attachment is required']);
        }

        $receiver = User::findOrFail($request->integer('receiver_id'));
        $this->directMessageService->authorizeConversationCounterpart($actor, $receiver, $sellerPerspective);

        $attachmentPath = null;
        $attachmentType = null;

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $attachmentPath = $file->store('chat_attachments', 'public');
            $mimeType = $file->getMimeType();
            $attachmentType = str_starts_with($mimeType, 'image/') ? 'image' : 'document';
        }

        $senderId = $this->directMessageService->resolveConversationUserId($actor, $sellerPerspective);

        $msg = Message::create([
            'sender_id' => $senderId,
            'receiver_id' => $request->receiver_id,
            'message' => $request->message ?? '',
            'attachment_path' => $attachmentPath,
            'attachment_type' => $attachmentType,
        ]);

        $senderIdentity = $sellerPerspective ? $this->sellerOwner() : $actor;
        $senderName = $senderIdentity->shop_name ?: $senderIdentity->name;

        // Notify Receiver (Remove older unread notifications from same sender to prevent spam)
        try {
            $receiver->unreadNotifications()
                ->where('type', \App\Notifications\NewMessageNotification::class)
                ->where(function ($q) use ($senderId) {
                    $q->where('data->sender_id', (string) $senderId)
                      ->orWhere('data->sender_id', (int) $senderId);
                })
                ->delete();
        } catch (\Throwable $e) {
            report($e);
        }

        try {
            if ($receiver->isArtisan()) {
                $receiver->notifySellerWorkspace(new \App\Notifications\NewMessageNotification($msg, $senderName), 'messages');
            } else {
                $receiver->notify(new \App\Notifications\NewMessageNotification($msg, $senderName));
            }
        } catch (\Throwable $e) {
            report($e);
        }

        try {
            broadcast(new \App\Events\MessageSent($msg))->toOthers();
        } catch (\Throwable $e) {
            report($e);
        }

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $this->directMessageService->formatMessageItem($msg, $senderId),
            ]);
        }

        if ($sellerPerspective) {
            return redirect()->route('chat.index', ['user_id' => $request->receiver_id]);
        } else {
            return redirect()->route('buyer.chat', ['user_id' => $request->receiver_id]);
        }
    }

    // 4. MARK AS SEEN
    public function markAsSeen(Request $request) 
    {
        $actor = $request->user();
        $sellerPerspective = $this->directMessageService->isSellerWorkspaceChatActor($actor);
        $this->directMessageService->authorizeChatActor($actor, $sellerPerspective);

        $request->validate([
            'sender_id' => 'required|exists:users,id'
        ]);

        $sender = User::findOrFail($request->integer('sender_id'));
        $this->directMessageService->authorizeConversationCounterpart($actor, $sender, $sellerPerspective);

        $conversationUserId = $this->directMessageService->resolveConversationUserId($actor, $sellerPerspective);

        Message::where('sender_id', $request->sender_id)
            ->where('receiver_id', $conversationUserId)
            ->where('is_read', \App\Casts\PostgresCompatibleBoolean::dbVal(false))
            ->update(['is_read' => \App\Casts\PostgresCompatibleBoolean::dbVal(true)]);

        try {
            broadcast(new \App\Events\MessageSeen($request->sender_id, $conversationUserId))->toOthers();
        } catch (\Throwable $e) {
            // Broadcast failure should never fail HTTP response
        }

        return response()->json(['success' => true]);
    }

    // 5. SIGNAL TYPING
    public function signalTyping(Request $request)
    {
        $actor = $request->user();
        $sellerPerspective = $this->directMessageService->isSellerWorkspaceChatActor($actor);
        $this->directMessageService->authorizeChatActor($actor, $sellerPerspective);
        $this->directMessageService->ensureSellerMessagingWritable($actor, $sellerPerspective);

        $request->validate([
            'receiver_id' => 'required|exists:users,id'
        ]);

        $userId = $this->directMessageService->resolveConversationUserId($actor, $sellerPerspective);
        $receiverId = $request->receiver_id;
        $receiver = User::findOrFail((int) $receiverId);
        $this->directMessageService->authorizeConversationCounterpart($actor, $receiver, $sellerPerspective);

        // Store typing status in cache for 4 seconds
        Cache::put("typing-{$userId}-to-{$receiverId}", true, 4);

        try {
            broadcast(new \App\Events\UserTyping($receiverId, $userId))->toOthers();
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json(['success' => true]);
    }

    // --- MESSAGE TEMPLATES ---
    public function storeTemplate(Request $request)
    {
        $this->directMessageService->authorizeChatActor($request->user(), true);
        $this->directMessageService->ensureSellerMessagingWritable($request->user(), true);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'shortcut' => 'nullable|string|max:50',
            'content' => 'nullable|string|max:2000',
            'message' => 'nullable|string|max:2000',
        ]);

        $content = trim((string) ($validated['content'] ?? $validated['message'] ?? ''));
        if ($content === '') {
            return back()->withErrors(['content' => 'The message content field is required.']);
        }

        $shortcut = null;
        if (!empty($validated['shortcut'])) {
            $cleaned = trim($validated['shortcut']);
            $shortcut = str_starts_with($cleaned, '/') ? $cleaned : '/' . $cleaned;
        }

        \App\Models\ChatMessageTemplate::create([
            'user_id' => $this->sellerOwnerId(),
            'title' => $validated['title'],
            'shortcut' => $shortcut,
            'content' => $content,
        ]);

        return back()->with('success', 'Message template created.');
    }

    public function updateTemplate(Request $request, int|string $id)
    {
        $this->directMessageService->authorizeChatActor($request->user(), true);
        $this->directMessageService->ensureSellerMessagingWritable($request->user(), true);

        $template = \App\Models\ChatMessageTemplate::where('user_id', $this->sellerOwnerId())->findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'shortcut' => 'nullable|string|max:50',
            'content' => 'nullable|string|max:2000',
            'message' => 'nullable|string|max:2000',
        ]);

        $content = trim((string) ($validated['content'] ?? $validated['message'] ?? ''));
        if ($content === '') {
            return back()->withErrors(['content' => 'The message content field is required.']);
        }

        $shortcut = null;
        if (!empty($validated['shortcut'])) {
            $cleaned = trim($validated['shortcut']);
            $shortcut = str_starts_with($cleaned, '/') ? $cleaned : '/' . $cleaned;
        }

        $template->update([
            'title' => $validated['title'],
            'shortcut' => $shortcut,
            'content' => $content,
        ]);

        return back()->with('success', 'Message template updated.');
    }

    public function deleteTemplate(Request $request, int|string $id)
    {
        $this->directMessageService->authorizeChatActor($request->user(), true);
        $this->directMessageService->ensureSellerMessagingWritable($request->user(), true);

        $template = \App\Models\ChatMessageTemplate::where('user_id', $this->sellerOwnerId())->findOrFail($id);
        $template->delete();

        return back()->with('success', 'Message template removed.');
    }

    public function updateAutoReplySettings(Request $request)
    {
        $this->directMessageService->authorizeChatActor($request->user(), true);
        $this->directMessageService->ensureSellerMessagingWritable($request->user(), true);

        $seller = $this->sellerOwner();
        if (!$seller->isPremiumTier()) {
            return back()->with('error', 'Automated Thank-You Messages require a Premium or Elite seller plan.');
        }

        $validated = $request->validate([
            'auto_reply_on_completion' => 'required|boolean',
            'auto_reply_completion_message' => 'nullable|string|max:1000',
        ]);

        $seller->auto_reply_on_completion = (bool) $validated['auto_reply_on_completion'];
        $seller->auto_reply_completion_message = $validated['auto_reply_completion_message'] ?? null;
        $seller->save();

        return back()->with('success', 'Order completion auto-reply settings updated successfully.');
    }

    public function olderMessages(Request $request, User $user)
    {
        $actor = $request->user();
        $sellerPerspective = $this->directMessageService->isSellerWorkspaceChatActor($actor);
        $this->directMessageService->authorizeChatActor($actor, $sellerPerspective);

        $userId = $this->directMessageService->resolveConversationUserId($actor, $sellerPerspective);
        $beforeId = (int) $request->query('before_id');

        if (!$beforeId) {
            return response()->json(['error' => 'before_id is required'], 422);
        }

        $result = $this->directMessageService->loadOlderMessages(
            $actor,
            $userId,
            $user->id,
            $sellerPerspective,
            $beforeId,
            50
        );

        return response()->json([
            'success' => true,
            'messages' => $result['messages'],
            'hasMore' => $result['hasMore'],
        ]);
    }

    // --- SHARED DATA LOADING ---
    private function getChatData(Request $request, string $viewName, bool $sellerPerspective)
    {
        $actor = $request->user();
        $this->directMessageService->authorizeChatActor($actor, $sellerPerspective);

        $userId = $this->directMessageService->resolveConversationUserId($actor, $sellerPerspective);
        $activeChatId = $request->query('user_id') ? (int) $request->query('user_id') : null;

        $isPartial = $request->header('X-Inertia-Partial-Component') === $viewName;
        $partialData = explode(',', (string) $request->header('X-Inertia-Partial-Data', ''));
        $includeConversations = !$isPartial || in_array('conversations', $partialData);

        $chatPayload = $this->directMessageService->getChatData(
            $actor,
            $userId,
            $activeChatId,
            $sellerPerspective,
            null,
            50,
            $includeConversations
        );

        $currentOrderContext = null;
        $userOrders = [];
        if ($activeChatId && $chatPayload['currentChatUser']) {
            $currentOrderContext = $this->resolveCurrentOrderContext->execute(
                $actor,
                $chatPayload['currentChatUser'],
                $sellerPerspective
            );

            $artisanId = $sellerPerspective ? $userId : $activeChatId;
            $buyerUserId = $sellerPerspective ? $activeChatId : $userId;

            $userOrders = \App\Models\Order::with('items')
                ->where('artisan_id', $artisanId)
                ->where('user_id', $buyerUserId)
                ->latest()
                ->get()
                ->map(function ($ord) {
                    $firstItem = $ord->items->first();
                    $coverImg = \App\Services\StorageUrl::url($firstItem?->product_img, '/images/placeholder.svg');

                    return [
                        'id' => $ord->id,
                        'order_number' => $ord->order_number,
                        'status' => $ord->status,
                        'total_amount' => (float) $ord->total_amount,
                        'created_at' => $ord->created_at ? $ord->created_at->format('M d, Y') : '',
                        'items_summary' => $ord->items->pluck('product_name')->filter()->join(', '),
                        'cover_img' => $coverImg,
                        'items' => $ord->items->map(fn($item) => [
                            'name' => $item->product_name,
                            'price' => (float) $item->price,
                            'qty' => $item->quantity,
                            'variant' => $item->variant_name ?? 'Standard',
                            'img' => \App\Services\StorageUrl::url($item->product_img, '/images/placeholder.svg'),
                        ]),
                    ];
                });
        }

        return Inertia::render($viewName, [
            'conversations' => fn () => $chatPayload['conversations'],
            'activeMessages' => fn () => $chatPayload['activeMessages'],
            'hasMore' => fn () => (bool) ($chatPayload['hasMore'] ?? false),
            'currentChatUser' => fn () => $chatPayload['currentChatUser'],
            'currentOrderContext' => fn () => $currentOrderContext,
            'userOrders' => fn () => $userOrders,
            'chatTemplates' => $sellerPerspective ? fn () => \App\Models\ChatMessageTemplate::where('user_id', $this->sellerOwnerId())->get() : [],
            'autoReplySettings' => ($sellerPerspective && $this->sellerOwner()->isPremiumTier()) ? fn () => [
                'enabled' => (bool) ($this->sellerOwner()->auto_reply_on_completion ?? true),
                'message' => (string) ($this->sellerOwner()->auto_reply_completion_message ?? ''),
            ] : null,
        ]);
    }
}


<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache; // <--- Added
use Inertia\Inertia;

class ChatController extends Controller
{
    // 1. SELLER VIEW
    public function index(Request $request)
    {
        return $this->getChatData($request, 'Seller/Chat');
    }

    // 2. BUYER VIEW
    public function buyerIndex(Request $request)
    {
        return $this->getChatData($request, 'Buyer/Chat');
    }

    // 3. SEND MESSAGE (Shared)
    public function store(Request $request)
    {
        $request->validate([
            'receiver_id' => 'required|exists:users,id',
            'message' => 'nullable|string', // Allow empty message if there's an attachment
            'attachment' => 'nullable|file|max:10240', // 10MB max
        ]);

        if (!$request->filled('message') && !$request->hasFile('attachment')) {
            return back()->withErrors(['message' => 'Message or attachment is required']);
        }

        $attachmentPath = null;
        $attachmentType = null;

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $attachmentPath = $file->store('chat_attachments', 'public');
            $mimeType = $file->getMimeType();
            $attachmentType = str_starts_with($mimeType, 'image/') ? 'image' : 'document';
        }

        $msg = Message::create([
            'sender_id' => Auth::id(),
            'receiver_id' => $request->receiver_id,
            'message' => $request->message ?? '',
            'attachment_path' => $attachmentPath,
            'attachment_type' => $attachmentType,
        ]);

        // Notify Receiver
        $receiver = User::find($request->receiver_id);
        if ($receiver) {
            $senderName = Auth::user()->shop_name ?: Auth::user()->name;
            $receiver->notify(new \App\Notifications\NewMessageNotification($msg, $senderName));
        }

        return redirect()->back();
    }

    public function markAsSeen(Request $request) 
    {
        $request->validate([
            'sender_id' => 'required|exists:users,id'
        ]);

        Message::where('sender_id', $request->sender_id)
            ->where('receiver_id', Auth::id())
            ->update(['is_read' => true]);

        return response()->json(['success' => true]);
    }

    // 5. SIGNAL TYPING
    public function signalTyping(Request $request)
    {
        $request->validate([
            'receiver_id' => 'required|exists:users,id'
        ]);

        $userId = Auth::id();
        $receiverId = $request->receiver_id;

        // Store typing status in cache for 4 seconds
        Cache::put("typing-{$userId}-to-{$receiverId}", true, 4);

        return response()->json(['success' => true]);
    }

    // --- SHARED LOGIC (THE ENGINE) ---
    private function getChatData(Request $request, $viewName)
    {
        $userId = Auth::id();
        $activeChatId = (int) $request->query('user_id');

        // A. GET CONVERSATION LIST
        $contactIds = Message::where('sender_id', $userId)
            ->orWhere('receiver_id', $userId)
            ->selectRaw('CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as contact_id', [$userId])
            ->distinct()
            ->pluck('contact_id');

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

        $conversations = User::whereIn('id', $contactIds)->get()->map(function($user) use ($userId, $latestMessagesQuery, $unreadCounts) {
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
                'time' => $lastMsg ? $lastMsg->created_at->shortAbsoluteDiffForHumans() : '',
                'unread' => $unreadCounts[$user->id] ?? 0,
                'is_online' => Cache::has('user-is-online-' . $user->id),
            ];
        });

        // B. GET ACTIVE MESSAGES
        $messages = [];
        $activeUser = null;

        if ($activeChatId) {
            $activeUser = User::find($activeChatId);
            
            // Add online status to active user
            if ($activeUser) {
                $activeUser->is_online = Cache::has('user-is-online-' . $activeUser->id);
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
                    'time' => $m->created_at->format('g:i A'),
                    'is_read' => $m->is_read
                ];
            });
        }

        return Inertia::render($viewName, [
            'conversations' => $conversations,
            'activeMessages' => $messages,
            'currentChatUser' => $activeUser,
        ]);
    }
}

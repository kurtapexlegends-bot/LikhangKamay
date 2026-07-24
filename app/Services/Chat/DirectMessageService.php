<?php

namespace App\Services\Chat;

use App\Models\Message;
use App\Models\User;
use App\Models\Order;
use App\Services\StorageUrl;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DirectMessageService
{
    public function getChatData(User $actor, int $userId, ?int $activeChatId, bool $sellerPerspective): array
    {
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

        if ($contactIds->isEmpty()) {
            $latestMessagesQuery = collect();
            $unreadCounts = collect();
        } else {
            // Pre-fetch only the latest message for each contact to avoid loading the entire message history
            $latestMessagesSubquery = Message::query()
                ->selectRaw('MAX(id) as max_id')
                ->where(function($q) use ($userId, $contactIds) {
                    $q->where('sender_id', $userId)->whereIn('receiver_id', $contactIds);
                })->orWhere(function($q) use ($userId, $contactIds) {
                    $q->whereIn('sender_id', $contactIds)->where('receiver_id', $userId);
                })
                ->groupBy(DB::raw('CASE WHEN sender_id = ' . (int)$userId . ' THEN receiver_id ELSE sender_id END'));

            $latestMessagesQuery = Message::whereIn('id', $latestMessagesSubquery)->get();

            // Also pre-fetch unread counts
            $unreadCounts = Message::whereIn('sender_id', $contactIds)
                ->where('receiver_id', $userId)
                ->whereRaw('is_read = false')
                ->selectRaw('sender_id, count(*) as count')
                ->groupBy('sender_id')
                ->pluck('count', 'sender_id');
        }

        $conversations = $contacts->map(function($user) use ($userId, $latestMessagesQuery, $unreadCounts) {
            $lastMsg = $latestMessagesQuery->first(function($msg) use ($userId, $user) {
                return ($msg->sender_id == $userId && $msg->receiver_id == $user->id) ||
                       ($msg->sender_id == $user->id && $msg->receiver_id == $userId);
            });

            return [
                'id' => $user->id,
                'name' => $user->name,
                'avatar' => $user->avatar,
                'avatar_url' => StorageUrl::url($user->avatar),
                'initial' => substr($user->shop_name ?: $user->name, 0, 1),
                'premium_tier' => $user->premium_tier,
                'role' => $user->role,
                'lastMsg' => $lastMsg 
                    ? ($lastMsg->message ?: ($lastMsg->attachment_type === 'image' ? 'Sent an image' : 'Sent an attachment')) 
                    : 'Start chatting',
                'last_message_at' => $lastMsg?->created_at?->toIso8601String(),
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

            if ($activeUser) {
                $this->authorizeConversationCounterpart($actor, $activeUser, $sellerPerspective);
                
                // Automatically mark unread incoming messages from activeChatId to current user as read
                $readUpdated = Message::where('sender_id', $activeChatId)
                    ->where('receiver_id', $userId)
                    ->whereRaw('is_read = false')
                    ->update(['is_read' => \App\Casts\PostgresCompatibleBoolean::dbVal(true)]);

                if ($readUpdated > 0) {
                    try {
                        broadcast(new \App\Events\MessageSeen($activeChatId, $userId))->toOthers();
                    } catch (\Throwable $e) {
                        // Broadcast failure should never fail HTTP request
                    }
                }

                // Add online status to active user
                $activeUser->is_online = Cache::has('user-is-online-' . $activeUser->id);
                $activeUser->last_seen_at_iso = $activeUser->last_seen_at?->toIso8601String();
                $activeUser->last_seen = $activeUser->last_seen_at 
                    ? $activeUser->last_seen_at->diffForHumans() 
                    : 'Offline';
                    
                // Check if this specific user is typing TO the current user
                $activeUser->is_typing = Cache::has("typing-{$activeChatId}-to-{$userId}");

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
            }
        }

        return [
            'conversations' => $conversations,
            'activeMessages' => $messages,
            'currentChatUser' => $activeUser,
        ];
    }

    public function authorizeChatActor(?User $actor, bool $sellerPerspective = false): void
    {
        abort_unless($actor !== null, 403, 'Authentication required.');

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

    public function authorizeConversationCounterpart(User $actor, User $counterpart, bool $sellerPerspective): void
    {
        abort_unless(
            $this->canAccessConversationForPerspective($actor, $counterpart, $sellerPerspective),
            403,
            'Unauthorized chat recipient.'
        );
    }

    public function authorizeSharedConversationCounterpart(User $actor, User $counterpart): void
    {
        $isAuthorized = $this->canAccessConversationForPerspective($actor, $counterpart, false)
            || $this->canAccessConversationForPerspective($actor, $counterpart, true);

        abort_unless($isAuthorized, 403, 'Unauthorized chat recipient.');
    }

    public function isSupportedConversationUser(User $user): bool
    {
        return !$user->isAdmin() && !$user->isStaff();
    }

    public function canAccessConversationForPerspective(User $actor, User $counterpart, bool $sellerPerspective): bool
    {
        if (
            $actor->id === $counterpart->id
            || !$this->isSupportedConversationUser($counterpart)
        ) {
            return false;
        }

        if ($counterpart->banned_at !== null) {
            $sellerId = $counterpart->isArtisan() ? $counterpart->id : $this->resolveConversationUserId($actor, $sellerPerspective);
            $buyerId = $counterpart->isArtisan() ? $actor->id : $counterpart->id;

            if (!$this->hasActiveOrderRelationship($sellerId, $buyerId)) {
                return false;
            }
        }

        if ($sellerPerspective) {
            if (!$this->isSellerWorkspaceChatActor($actor)) {
                return false;
            }

            // In seller context, getEffectiveSeller() is used
            $sellerOwner = $actor->getEffectiveSeller();
            $sellerUserId = $sellerOwner ? $sellerOwner->id : $actor->id;

            return $this->hasOrderRelationship($sellerUserId, $counterpart->id)
                || $this->hasExistingConversation($sellerUserId, $counterpart->id);
        }

        if (!$counterpart->isArtisan()) {
            return false;
        }

        return $this->hasOrderRelationship($counterpart->id, $actor->id)
            || $this->hasExistingConversation($actor->id, $counterpart->id);
    }

    public function isSellerWorkspaceChatActor(?User $actor): bool
    {
        if (!$actor || !$actor->canAccessSellerModule('messages')) {
            return false;
        }

        if ($actor->isArtisan()) {
            return $actor->canAccessSellerOwnerRoutes();
        }

        return $actor->isStaff() && $actor->canAccessSellerWorkspace();
    }

    public function resolveConversationUserId(User $actor, bool $sellerPerspective): int
    {
        if ($sellerPerspective) {
            $sellerOwner = $actor->getEffectiveSeller();
            return $sellerOwner ? $sellerOwner->id : $actor->id;
        }
        return $actor->id;
    }

    public function ensureSellerMessagingWritable(User $actor, bool $sellerPerspective): void
    {
        if (!$sellerPerspective) {
            return;
        }

        abort_unless(
            $actor->canEditSellerModule('messages'),
            403,
            'This capability is read-only for your account.'
        );
    }

    public function hasExistingConversation(int $firstUserId, int $secondUserId): bool
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

    public function hasOrderRelationship(int $sellerId, int $buyerId): bool
    {
        return Order::query()
            ->where('artisan_id', $sellerId)
            ->where('user_id', $buyerId)
            ->exists();
    }

    public function hasActiveOrderRelationship(int $sellerId, int $buyerId): bool
    {
        return Order::query()
            ->where('artisan_id', $sellerId)
            ->where('user_id', $buyerId)
            ->whereIn('status', ['Pending', 'Accepted', 'Shipped', 'Delivered'])
            ->exists();
    }
}

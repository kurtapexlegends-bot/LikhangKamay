<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\TeamMessage;
use App\Models\User;
use App\Services\Chat\TeamMessageQueryService;
use App\Notifications\NewTeamMessageNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class TeamMessageController extends Controller
{
    use InteractsWithSellerContext;

    protected TeamMessageQueryService $queryService;

    public function __construct(TeamMessageQueryService $queryService)
    {
        $this->queryService = $queryService;
    }

    public function index(Request $request): Response
    {
        $actor = $this->authorizeTeamActor($request->user());
        $sellerOwner = $this->sellerOwner();
        $contactId = $request->integer('user_id');
        $channelId = $request->integer('channel_id');
        $contacts = $this->eligibleContacts($actor, $sellerOwner->id);

        // Fetch channels actor is a member of
        $channels = \App\Models\TeamChannel::where('seller_owner_id', $sellerOwner->id)
            ->whereHas('members', function ($q) use ($actor) {
                $q->where('user_id', $actor->id);
            })
            ->with(['members'])
            ->get();

        $latestMessages = $this->queryService->getLatestMessagesPerContact($actor, $sellerOwner, $contacts);
        $unreadCounts = $this->queryService->getUnreadCounts($actor, $sellerOwner, $contacts);

        $latestChannelMessages = $this->queryService->getLatestMessagesPerChannel($channels);
        $channelUnreadCounts = $this->queryService->getChannelUnreadCounts($actor, $channels);

        $directConversations = $contacts->map(function (User $contact) use ($latestMessages, $unreadCounts, $actor) {
            $lastMessage = $latestMessages->first(function (TeamMessage $message) use ($contact, $actor) {
                return ($message->sender_id === $actor->id && $message->receiver_id === $contact->id)
                    || ($message->sender_id === $contact->id && $message->receiver_id === $actor->id);
            });

            return [
                'id' => $contact->id,
                'name' => $contact->name,
                'avatar' => $contact->avatar,
                'roleLabel' => $this->teamRoleLabel($contact, $actor->getEffectiveSellerId()),
                'lastMessage' => $this->summarizeLastMessage($lastMessage),
                'time' => $lastMessage?->created_at?->shortAbsoluteDiffForHumans() ?: '',
                'unread' => (int) ($unreadCounts[$contact->id] ?? 0),
                'is_online' => Cache::has('user-is-online-' . $contact->id),
                'last_seen_at_iso' => $contact->last_seen_at?->toIso8601String(),
                'last_seen' => $contact->last_seen_at ? $contact->last_seen_at->diffForHumans() : 'Offline',
                'type' => 'direct',
            ];
        });

        $channelConversations = $channels->map(function ($channel) use ($latestChannelMessages, $channelUnreadCounts) {
            $lastMessage = $latestChannelMessages->firstWhere('team_channel_id', $channel->id);

            return [
                'id' => $channel->id,
                'name' => $channel->name,
                'avatar' => null,
                'roleLabel' => 'Channel',
                'lastMessage' => $lastMessage ? $lastMessage->sender->name . ': ' . $this->summarizeLastMessage($lastMessage) : 'Start an internal conversation',
                'time' => $lastMessage?->created_at?->shortAbsoluteDiffForHumans() ?: '',
                'unread' => (int) ($channelUnreadCounts[$channel->id] ?? 0),
                'is_online' => false,
                'last_seen' => '',
                'type' => 'channel',
                'description' => $channel->description,
            ];
        });

        $conversations = $directConversations->concat($channelConversations)->values();

        $activeContact = $contactId
            ? $contacts->firstWhere('id', $contactId)
            : null;

        if ($contactId && !$activeContact) {
            abort(403, 'Unauthorized team conversation.');
        }

        $activeChannel = $channelId
            ? $channels->firstWhere('id', $channelId)
            : null;

        if ($channelId && !$activeChannel) {
            abort(403, 'Unauthorized team channel conversation.');
        }

        $messages = [];

        if ($activeContact) {
            $messages = TeamMessage::query()
                ->with(['reactions.user'])
                ->withCount('replies')
                ->where('seller_owner_id', $sellerOwner->id)
                ->whereNull('team_channel_id')
                ->whereNull('parent_id')
                ->where(function ($query) use ($actor, $activeContact) {
                    $query->where(function ($branch) use ($actor, $activeContact) {
                        $branch->where('sender_id', $actor->id)
                            ->where('receiver_id', $activeContact->id);
                    })->orWhere(function ($branch) use ($actor, $activeContact) {
                        $branch->where('sender_id', $activeContact->id)
                            ->where('receiver_id', $actor->id);
                    });
                })
                ->orderBy('created_at')
                ->get()
                ->map(fn (TeamMessage $message) => [
                    'id' => $message->id,
                    'text' => $message->message,
                    'attachment_path' => $message->attachment_path,
                    'attachment_type' => $message->attachment_type,
                    'sender' => $message->sender_id === $actor->id ? 'me' : 'other',
                    'time' => $message->created_at->format('g:i A'),
                    'dateLabel' => $message->created_at->isToday()
                        ? 'Today'
                        : ($message->created_at->isYesterday() ? 'Yesterday' : $message->created_at->format('M d, Y')),
                    'isRead' => (bool) $message->is_read,
                    'replies_count' => (int) $message->replies_count,
                    'reactions' => $this->formatReactions($message, $actor),
                ])
                ->values()
                ->all();
        } elseif ($activeChannel) {
            $messages = TeamMessage::query()
                ->with(['sender', 'reactions.user'])
                ->withCount('replies')
                ->where('team_channel_id', $activeChannel->id)
                ->whereNull('parent_id')
                ->orderBy('created_at')
                ->get()
                ->map(fn (TeamMessage $message) => [
                    'id' => $message->id,
                    'text' => $message->message,
                    'attachment_path' => $message->attachment_path,
                    'attachment_type' => $message->attachment_type,
                    'sender' => $message->sender_id === $actor->id ? 'me' : 'other',
                    'sender_name' => $message->sender?->name ?: 'Unknown',
                    'sender_avatar' => $message->sender?->avatar,
                    'time' => $message->created_at->format('g:i A'),
                    'dateLabel' => $message->created_at->isToday()
                        ? 'Today'
                        : ($message->created_at->isYesterday() ? 'Yesterday' : $message->created_at->format('M d, Y')),
                    'isRead' => true,
                    'replies_count' => (int) $message->replies_count,
                    'reactions' => $this->formatReactions($message, $actor),
                ])
                ->values()
                ->all();

            // Mark the channel as seen by updating last_read_at
            \App\Models\TeamChannelMember::where('team_channel_id', $activeChannel->id)
                ->where('user_id', $actor->id)
                ->update(['last_read_at' => now()]);
        }

        return Inertia::render('Seller/Chat/TeamMessages', [
            'conversations' => fn () => $conversations,
            'activeMessages' => fn () => $messages,
            'currentChatUser' => fn () => $activeContact ? [
                'id' => $activeContact->id,
                'name' => $activeContact->name,
                'avatar' => $activeContact->avatar,
                'roleLabel' => $this->teamRoleLabel($activeContact, $actor->getEffectiveSellerId()),
                'email' => $activeContact->email,
                'phone_number' => $activeContact->phone_number,
                'is_online' => Cache::has('user-is-online-' . $activeContact->id),
                'last_seen_at_iso' => $activeContact->last_seen_at?->toIso8601String(),
                'last_seen' => $activeContact->last_seen_at ? $activeContact->last_seen_at->diffForHumans() : 'Offline',
                'is_typing' => Cache::has("team-typing-{$activeContact->id}-to-{$actor->id}"),
            ] : null,
            'currentChannel' => fn () => $activeChannel ? [
                'id' => $activeChannel->id,
                'name' => $activeChannel->name,
                'description' => $activeChannel->description,
                'members_count' => $activeChannel->members()->count(),
                'members' => $activeChannel->members->map(fn ($member) => [
                    'id' => $member->id,
                    'name' => $member->name,
                    'avatar' => $member->avatar,
                    'roleLabel' => $this->teamRoleLabel($member, $actor->getEffectiveSellerId()),
                ]),
            ] : null,
            'eligibleContacts' => fn () => $contacts->map(fn ($contact) => [
                'id' => $contact->id,
                'name' => $contact->name,
                'avatar' => $contact->avatar,
                'roleLabel' => $this->teamRoleLabel($contact, $actor->getEffectiveSellerId()),
            ])->values()->all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $actor = $this->authorizeTeamActor($request->user());
        $sellerOwner = $this->sellerOwner();

        $validated = $request->validate([
            'receiver_id' => ['nullable', 'integer', 'exists:users,id'],
            'team_channel_id' => ['nullable', 'integer', 'exists:team_channels,id'],
            'parent_id' => ['nullable', 'integer', 'exists:team_messages,id'],
            'message' => ['nullable', 'string', 'max:5000'],
            'attachment' => ['nullable', 'file', 'max:10240'],
        ]);

        if (!$request->filled('message') && !$request->hasFile('attachment')) {
            return back()->withErrors(['message' => 'Message or attachment is required.']);
        }

        if (!$request->filled('receiver_id') && !$request->filled('team_channel_id') && !$request->filled('parent_id')) {
            return back()->withErrors(['message' => 'Recipient, channel, or parent thread is required.']);
        }

        $parentId = $request->filled('parent_id') ? (int) $validated['parent_id'] : null;
        $parentMessage = null;

        if ($parentId) {
            $parentMessage = TeamMessage::findOrFail($parentId);
            
            // Check authorization to access this parent message
            if ($parentMessage->team_channel_id) {
                abort_unless(
                    \App\Models\TeamChannelMember::where('team_channel_id', $parentMessage->team_channel_id)
                        ->where('user_id', $actor->id)
                        ->exists(),
                    403,
                    'Unauthorized channel thread messaging.'
                );
                
                $validated['team_channel_id'] = $parentMessage->team_channel_id;
                $validated['receiver_id'] = null;
            } else {
                abort_unless(
                    $parentMessage->sender_id === $actor->id || $parentMessage->receiver_id === $actor->id,
                    403,
                    'Unauthorized direct thread messaging.'
                );
                
                $validated['team_channel_id'] = null;
                $validated['receiver_id'] = $parentMessage->sender_id === $actor->id 
                    ? $parentMessage->receiver_id 
                    : $parentMessage->sender_id;
            }
        }

        $attachmentPath = null;
        $attachmentType = null;

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $attachmentPath = $file->store('team_message_attachments', 'public');
            $mimeType = $file->getMimeType();
            $attachmentType = Str::startsWith($mimeType, 'image/') ? 'image' : 'document';
        }

        if ($validated['team_channel_id'] ?? null) {
            $channel = \App\Models\TeamChannel::findOrFail($validated['team_channel_id']);
            
            // Check channel membership if parent was not validated
            if (!$parentId) {
                abort_unless(
                    \App\Models\TeamChannelMember::where('team_channel_id', $channel->id)->where('user_id', $actor->id)->exists(),
                    403,
                    'Unauthorized channel messaging.'
                );
            }

            $message = TeamMessage::create([
                'seller_owner_id' => $sellerOwner->id,
                'sender_id' => $actor->id,
                'receiver_id' => null,
                'team_channel_id' => $channel->id,
                'parent_id' => $parentId,
                'message' => trim((string) ($validated['message'] ?? '')),
                'attachment_path' => $attachmentPath,
                'attachment_type' => $attachmentType,
                'is_read' => true,
            ]);

            // Notify other members
            $members = $channel->members()->where('users.id', '!=', $actor->id)->get();
            foreach ($members as $member) {
                $member->unreadNotifications()
                    ->where('type', \App\Notifications\NewTeamChannelMessageNotification::class)
                    ->where('data->team_channel_id', $channel->id)
                    ->delete();

                $member->notify(new \App\Notifications\NewTeamChannelMessageNotification($message, $actor->name, $channel->name));
            }

            try {
                broadcast(new \App\Events\TeamMessageSent($message))->toOthers();
            } catch (\Throwable $e) {
                report($e);
            }

            return redirect()->route('team-messages.index', ['channel_id' => $channel->id]);
        }

        $receiver = User::findOrFail($validated['receiver_id']);
        if (!$parentId) {
            $this->authorizeCounterpart($actor, $receiver, $sellerOwner->id);
        }

        $message = TeamMessage::create([
            'seller_owner_id' => $sellerOwner->id,
            'sender_id' => $actor->id,
            'receiver_id' => $receiver->id,
            'team_channel_id' => null,
            'parent_id' => $parentId,
            'message' => trim((string) ($validated['message'] ?? '')),
            'attachment_path' => $attachmentPath,
            'attachment_type' => $attachmentType,
            'is_read' => false,
        ]);

        $receiver->unreadNotifications()
            ->where('type', NewTeamMessageNotification::class)
            ->where('data->sender_id', $actor->id)
            ->delete();

        $receiver->notify(new NewTeamMessageNotification($message, $actor->name));

        try {
            broadcast(new \App\Events\TeamMessageSent($message))->toOthers();
        } catch (\Throwable $e) {
            report($e);
        }

        return redirect()->route('team-messages.index', ['user_id' => $receiver->id]);
    }

    public function showThread(Request $request, TeamMessage $message): JsonResponse
    {
        $actor = $this->authorizeTeamActor($request->user());
        $sellerOwner = $this->sellerOwner();

        // Check authorization to access this parent message
        if ($message->team_channel_id) {
            abort_unless(
                \App\Models\TeamChannelMember::where('team_channel_id', $message->team_channel_id)
                    ->where('user_id', $actor->id)
                    ->exists(),
                403,
                'Unauthorized channel thread access.'
            );
        } else {
            abort_unless(
                $message->sender_id === $actor->id || $message->receiver_id === $actor->id,
                403,
                'Unauthorized direct thread access.'
            );
        }

        // Fetch replies with sender details
        $replies = TeamMessage::query()
            ->with(['sender', 'reactions.user'])
            ->where('parent_id', $message->id)
            ->orderBy('created_at')
            ->get()
            ->map(function (TeamMessage $reply) use ($actor) {
                return [
                    'id' => $reply->id,
                    'text' => $reply->message,
                    'attachment_path' => $reply->attachment_path,
                    'attachment_type' => $reply->attachment_type,
                    'sender' => $reply->sender_id === $actor->id ? 'me' : 'other',
                    'sender_name' => $reply->sender?->name ?: 'Unknown',
                    'sender_avatar' => $reply->sender?->avatar,
                    'time' => $reply->created_at->format('g:i A'),
                    'dateLabel' => $reply->created_at->isToday()
                        ? 'Today'
                        : ($reply->created_at->isYesterday() ? 'Yesterday' : $reply->created_at->format('M d, Y')),
                    'isRead' => (bool) $reply->is_read,
                    'reactions' => $this->formatReactions($reply, $actor),
                ];
            });

        $message->load(['reactions.user']);

        $parentData = [
            'id' => $message->id,
            'text' => $message->message,
            'attachment_path' => $message->attachment_path,
            'attachment_type' => $message->attachment_type,
            'sender' => $message->sender_id === $actor->id ? 'me' : 'other',
            'sender_name' => $message->sender?->name ?: 'Unknown',
            'sender_avatar' => $message->sender?->avatar,
            'time' => $message->created_at->format('g:i A'),
            'dateLabel' => $message->created_at->isToday()
                ? 'Today'
                : ($message->created_at->isYesterday() ? 'Yesterday' : $message->created_at->format('M d, Y')),
            'reactions' => $this->formatReactions($message, $actor),
        ];

        return response()->json([
            'success' => true,
            'parent' => $parentData,
            'replies' => $replies,
        ]);
    }

    public function createChannel(Request $request): RedirectResponse
    {
        $actor = $this->authorizeTeamActor($request->user());
        $sellerOwner = $this->sellerOwner();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'regex:/^[a-zA-Z0-9-_]+$/'],
            'description' => ['nullable', 'string', 'max:255'],
            'member_ids' => ['nullable', 'array'],
            'member_ids.*' => ['integer', 'exists:users,id'],
        ], [
            'name.regex' => 'The channel name can only contain letters, numbers, hyphens, and underscores.',
        ]);

        $memberIds = collect($validated['member_ids'] ?? [])
            ->push($actor->id)
            ->unique();

        $contacts = $this->eligibleContacts($actor, $sellerOwner->id);
        $allowedIds = $contacts->pluck('id')->push($actor->id);

        foreach ($memberIds as $memberId) {
            if (!$allowedIds->contains($memberId)) {
                abort(403, 'Unauthorized channel member selection.');
            }
        }

        $channel = \App\Models\TeamChannel::create([
            'seller_owner_id' => $sellerOwner->id,
            'name' => strtolower($validated['name']),
            'description' => $validated['description'] ?? null,
            'created_by_id' => $actor->id,
        ]);

        $channel->members()->attach(
            $memberIds->mapWithKeys(fn ($id) => [$id => ['last_read_at' => now()]])->all()
        );

        return redirect()->route('team-messages.index', ['channel_id' => $channel->id]);
    }

    public function markChannelAsSeen(Request $request): JsonResponse
    {
        $actor = $this->authorizeTeamActor($request->user());
        
        $validated = $request->validate([
            'team_channel_id' => ['required', 'integer', 'exists:team_channels,id'],
        ]);

        $membership = \App\Models\TeamChannelMember::where('team_channel_id', $validated['team_channel_id'])
            ->where('user_id', $actor->id)
            ->firstOrFail();

        $membership->update(['last_read_at' => now()]);

        return response()->json(['success' => true]);
    }

    public function markAsSeen(Request $request): JsonResponse
    {
        $actor = $this->authorizeTeamActor($request->user());
        $sellerOwner = $this->sellerOwner();

        $validated = $request->validate([
            'sender_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $sender = User::findOrFail($validated['sender_id']);
        $this->authorizeCounterpart($actor, $sender, $sellerOwner->id);

        TeamMessage::query()
            ->where('seller_owner_id', $sellerOwner->id)
            ->where('sender_id', $sender->id)
            ->where('receiver_id', $actor->id)
            ->update(['is_read' => true]);

        try {
            broadcast(new \App\Events\TeamMessageSeen($sender->id, $actor->id))->toOthers();
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json(['success' => true]);
    }

    public function signalTyping(Request $request): JsonResponse
    {
        $actor = $this->authorizeTeamActor($request->user());
        $sellerOwner = $this->sellerOwner();

        $validated = $request->validate([
            'receiver_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $receiver = User::findOrFail($validated['receiver_id']);
        $this->authorizeCounterpart($actor, $receiver, $sellerOwner->id);

        Cache::put("team-typing-{$actor->id}-to-{$receiver->id}", true, 4);

        try {
            broadcast(new \App\Events\TeamUserTyping($receiver->id, $actor->id))->toOthers();
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json(['success' => true]);
    }

    private function authorizeTeamActor(?User $actor): User
    {
        abort_unless($actor instanceof User, 403, 'Authentication required.');
        abort_unless(
            $actor->canAccessSellerWorkspace() && $actor->canAccessSellerModule('team_messages'),
            403,
            'Unauthorized team messaging access.'
        );

        return $actor;
    }

    private function authorizeCounterpart(User $actor, User $counterpart, int $sellerOwnerId): void
    {
        abort_unless(
            $this->eligibleContacts($actor, $sellerOwnerId)->contains('id', $counterpart->id),
            403,
            'Unauthorized team chat recipient.'
        );
    }

    /**
     * @return Collection<int, User>
     */
    private function eligibleContacts(User $actor, int $sellerOwnerId): Collection
    {
        $sellerOwner = $actor->isSellerOwner()
            ? $actor
            : User::findOrFail($sellerOwnerId);

        $staffMembers = $sellerOwner->staffMembers()
            ->get()
            ->filter(fn (User $staff) => $staff->isWorkspaceAccessEnabled())
            ->values();

        $contacts = $staffMembers;

        if ($actor->isStaff()) {
            $contacts = $contacts->push($sellerOwner);
        }

        return $contacts
            ->filter(fn (User $contact) => $contact->id !== $actor->id)
            ->values();
    }

    private function teamRoleLabel(User $user, ?int $sellerOwnerId): string
    {
        if ($user->id === $sellerOwnerId || $user->isSellerOwner()) {
            return 'Seller Owner';
        }

        $preset = $user->staff_role_preset_key ?: 'custom';

        return collect(explode('_', $preset))
            ->map(fn (string $segment) => ucfirst($segment))
            ->implode(' ');
    }

    private function summarizeLastMessage(?TeamMessage $message): string
    {
        if (!$message) {
            return 'Start an internal conversation';
        }

        if (filled($message->message)) {
            return $message->message;
        }

        return $message->attachment_type === 'image'
            ? 'Sent an image'
            : 'Sent an attachment';
    }

    public function toggleReaction(Request $request): JsonResponse
    {
        $actor = $this->authorizeTeamActor($request->user());
        
        $validated = $request->validate([
            'team_message_id' => ['required', 'integer', 'exists:team_messages,id'],
            'emoji' => ['required', 'string', 'max:50'],
        ]);

        $message = TeamMessage::findOrFail($validated['team_message_id']);

        // Check authorization to access this message's conversation context
        if ($message->team_channel_id) {
            abort_unless(
                \App\Models\TeamChannelMember::where('team_channel_id', $message->team_channel_id)
                    ->where('user_id', $actor->id)
                    ->exists(),
                403,
                'Unauthorized channel message reaction.'
            );
        } else {
            abort_unless(
                $message->sender_id === $actor->id || $message->receiver_id === $actor->id,
                403,
                'Unauthorized direct message reaction.'
            );
        }

        // Toggle logic
        $reaction = \App\Models\TeamMessageReaction::where('team_message_id', $message->id)
            ->where('user_id', $actor->id)
            ->where('emoji', $validated['emoji'])
            ->first();

        if ($reaction) {
            $reaction->delete();
        } else {
            \App\Models\TeamMessageReaction::create([
                'team_message_id' => $message->id,
                'user_id' => $actor->id,
                'emoji' => $validated['emoji'],
            ]);
        }

        // Query fresh formatted reactions
        $freshReactions = $this->formatReactions($message->fresh(['reactions.user']), $actor);

        // Broadcast the update in real-time
        try {
            broadcast(new \App\Events\TeamMessageReactionUpdated($message, $freshReactions))->toOthers();
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'success' => true,
            'reactions' => $freshReactions,
        ]);
    }

    private function formatReactions(TeamMessage $message, User $actor): array
    {
        return $message->reactions
            ->groupBy('emoji')
            ->map(function ($group, $emoji) use ($actor) {
                return [
                    'emoji' => $emoji,
                    'count' => $group->count(),
                    'reacted_by_me' => $group->contains('user_id', $actor->id),
                    'users_list' => $group->pluck('user.name')->filter()->values()->all(),
                ];
            })
            ->values()
            ->all();
    }
}

<?php

namespace App\Http\Controllers\Seller;

use App\Actions\Seller\Chat\CreateTeamChannel;
use App\Actions\Seller\Chat\GetTeamMessageThread;
use App\Actions\Seller\Chat\StoreTeamMessage;
use App\Actions\Seller\Chat\ToggleTeamMessageReaction;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Http\Controllers\Controller;
use App\Models\TeamMessage;
use App\Models\User;
use App\Services\Chat\TeamMessageQueryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
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

        $reactionFormatter = new ToggleTeamMessageReaction;

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
                'is_online' => Cache::has('user-is-online-'.$contact->id),
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
                'lastMessage' => $lastMessage ? $lastMessage->sender->name.': '.$this->summarizeLastMessage($lastMessage) : 'Start an internal conversation',
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

        if ($contactId && ! $activeContact) {
            abort(403, 'Unauthorized team conversation.');
        }

        $activeChannel = $channelId
            ? $channels->firstWhere('id', $channelId)
            : null;

        if ($channelId && ! $activeChannel) {
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
                    'reactions' => $reactionFormatter->formatReactions($message, $actor),
                    'team_channel_id' => null,
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
                    'reactions' => $reactionFormatter->formatReactions($message, $actor),
                    'team_channel_id' => $message->team_channel_id,
                ])
                ->values()
                ->all();

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
                'is_online' => Cache::has('user-is-online-'.$activeContact->id),
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

    public function store(Request $request, StoreTeamMessage $action): RedirectResponse
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

        if (! $request->filled('message') && ! $request->hasFile('attachment')) {
            return back()->withErrors(['message' => 'Message or attachment is required.']);
        }

        if (! $request->filled('receiver_id') && ! $request->filled('team_channel_id') && ! $request->filled('parent_id')) {
            return back()->withErrors(['message' => 'Recipient, channel, or parent thread is required.']);
        }

        $message = $action->execute($actor, $sellerOwner, $validated, $request->file('attachment'));

        if ($message->team_channel_id) {
            return redirect()->route('team-messages.index', ['channel_id' => $message->team_channel_id]);
        }

        return redirect()->route('team-messages.index', ['user_id' => $message->receiver_id]);
    }

    public function showThread(Request $request, TeamMessage $message, GetTeamMessageThread $action): JsonResponse
    {
        $actor = $this->authorizeTeamActor($request->user());
        $data = $action->execute($actor, $message);

        return response()->json([
            'success' => true,
            'parent' => $data['parent'],
            'replies' => $data['replies'],
        ]);
    }

    public function createChannel(Request $request, CreateTeamChannel $action): RedirectResponse
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

        $channel = $action->execute($actor, $sellerOwner, $validated);

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
            ->whereRaw('is_read = false')
            ->update(['is_read' => \App\Casts\PostgresCompatibleBoolean::dbVal(true)]);

        try {
            broadcast(new \App\Events\TeamMessageSeen($sender->id, $actor->id))->toOthers();
        } catch (\Throwable $e) {
            // Broadcast error should not fail HTTP response
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

    public function toggleReaction(Request $request, ToggleTeamMessageReaction $action): JsonResponse
    {
        $actor = $this->authorizeTeamActor($request->user());

        $validated = $request->validate([
            'team_message_id' => ['required', 'integer', 'exists:team_messages,id'],
            'emoji' => ['required', 'string', 'max:50'],
        ]);

        $message = TeamMessage::findOrFail($validated['team_message_id']);
        $freshReactions = $action->execute($actor, $message, $validated['emoji']);

        return response()->json([
            'success' => true,
            'reactions' => $freshReactions,
        ]);
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
        $cacheKey = "eligible_contacts_actor_{$actor->id}_seller_{$sellerOwnerId}";

        return \Illuminate\Support\Facades\Cache::remember($cacheKey, now()->addSeconds(15), function () use ($actor, $sellerOwnerId) {
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
        });
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
        if (! $message) {
            return 'Start an internal conversation';
        }

        if (filled($message->message)) {
            return $message->message;
        }

        return $message->attachment_type === 'image'
            ? 'Sent an image'
            : 'Sent an attachment';
    }
}

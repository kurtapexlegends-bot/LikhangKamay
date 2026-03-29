<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\TeamMessage;
use App\Models\User;
use App\Notifications\NewTeamMessageNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TeamMessageController extends Controller
{
    use InteractsWithSellerContext;

    public function index(Request $request): Response
    {
        $actor = $this->authorizeTeamActor($request->user());
        $sellerOwner = $this->sellerOwner();
        $contactId = $request->integer('user_id');
        $contacts = $this->eligibleContacts($actor, $sellerOwner->id);
        $contactIds = $contacts->pluck('id');

        $latestMessages = TeamMessage::query()
            ->where('seller_owner_id', $sellerOwner->id)
            ->where(function ($query) use ($actor, $contactIds) {
                $query->where(function ($branch) use ($actor, $contactIds) {
                    $branch->where('sender_id', $actor->id)
                        ->whereIn('receiver_id', $contactIds);
                })->orWhere(function ($branch) use ($actor, $contactIds) {
                    $branch->whereIn('sender_id', $contactIds)
                        ->where('receiver_id', $actor->id);
                });
            })
            ->latest()
            ->get();

        $unreadCounts = TeamMessage::query()
            ->where('seller_owner_id', $sellerOwner->id)
            ->whereIn('sender_id', $contactIds)
            ->where('receiver_id', $actor->id)
            ->where('is_read', false)
            ->selectRaw('sender_id, count(*) as count')
            ->groupBy('sender_id')
            ->pluck('count', 'sender_id');

        $conversations = $contacts->map(function (User $contact) use ($latestMessages, $unreadCounts, $actor) {
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
            ];
        })->values();

        $activeContact = $contactId
            ? $contacts->firstWhere('id', $contactId)
            : null;

        if ($contactId && !$activeContact) {
            abort(403, 'Unauthorized team conversation.');
        }

        $messages = [];

        if ($activeContact) {
            $messages = TeamMessage::query()
                ->where('seller_owner_id', $sellerOwner->id)
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
                ])
                ->values()
                ->all();
        }

        return Inertia::render('Seller/TeamMessages', [
            'conversations' => $conversations,
            'activeMessages' => $messages,
            'currentChatUser' => $activeContact ? [
                'id' => $activeContact->id,
                'name' => $activeContact->name,
                'avatar' => $activeContact->avatar,
                'roleLabel' => $this->teamRoleLabel($activeContact, $actor->getEffectiveSellerId()),
            ] : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $actor = $this->authorizeTeamActor($request->user());
        $sellerOwner = $this->sellerOwner();

        $validated = $request->validate([
            'receiver_id' => ['required', 'integer', 'exists:users,id'],
            'message' => ['nullable', 'string', 'max:5000'],
            'attachment' => ['nullable', 'file', 'max:10240'],
        ]);

        if (!$request->filled('message') && !$request->hasFile('attachment')) {
            return back()->withErrors(['message' => 'Message or attachment is required.']);
        }

        $receiver = User::findOrFail($validated['receiver_id']);
        $this->authorizeCounterpart($actor, $receiver, $sellerOwner->id);

        $attachmentPath = null;
        $attachmentType = null;

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $attachmentPath = $file->store('team_message_attachments', 'public');
            $mimeType = $file->getMimeType();
            $attachmentType = Str::startsWith($mimeType, 'image/') ? 'image' : 'document';
        }

        $message = TeamMessage::create([
            'seller_owner_id' => $sellerOwner->id,
            'sender_id' => $actor->id,
            'receiver_id' => $receiver->id,
            'message' => trim((string) ($validated['message'] ?? '')),
            'attachment_path' => $attachmentPath,
            'attachment_type' => $attachmentType,
            'is_read' => false,
        ]);

        $receiver->notify(new NewTeamMessageNotification($message, $actor->name));

        return back();
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

        return response()->json(['success' => true]);
    }

    private function authorizeTeamActor(?User $actor): User
    {
        abort_unless($actor, 403, 'Authentication required.');
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
     * @return \Illuminate\Support\Collection<int, \App\Models\User>
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
}

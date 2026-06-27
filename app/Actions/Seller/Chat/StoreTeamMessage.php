<?php

namespace App\Actions\Seller\Chat;

use App\Events\TeamMessageSent;
use App\Models\TeamMessage;
use App\Models\User;
use App\Notifications\NewTeamChannelMessageNotification;
use App\Notifications\NewTeamMessageNotification;
use App\Notifications\TeamMessageMentionedNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

class StoreTeamMessage
{
    /**
     * Execute the store team message action.
     */
    public function execute(User $actor, User $sellerOwner, array $data, ?UploadedFile $attachment = null): TeamMessage
    {
        $parentId = ! empty($data['parent_id']) ? (int) $data['parent_id'] : null;
        $parentMessage = null;

        if ($parentId) {
            $parentMessage = TeamMessage::findOrFail($parentId);

            // Check authorization to access this parent message
            abort_unless($parentMessage->seller_owner_id === $sellerOwner->id, 403, 'Unauthorized thread parent access.');

            if ($parentMessage->team_channel_id) {
                abort_unless(
                    \App\Models\TeamChannelMember::where('team_channel_id', $parentMessage->team_channel_id)
                        ->where('user_id', $actor->id)
                        ->exists(),
                    403,
                    'Unauthorized channel thread messaging.'
                );

                $data['team_channel_id'] = $parentMessage->team_channel_id;
                $data['receiver_id'] = null;
            } else {
                abort_unless(
                    $parentMessage->sender_id === $actor->id || $parentMessage->receiver_id === $actor->id,
                    403,
                    'Unauthorized direct thread messaging.'
                );

                $data['team_channel_id'] = null;
                $data['receiver_id'] = $parentMessage->sender_id === $actor->id
                    ? $parentMessage->receiver_id
                    : $parentMessage->sender_id;
            }
        }

        $attachmentPath = null;
        $attachmentType = null;

        if ($attachment) {
            $attachmentPath = $attachment->store('team_message_attachments', 'public');
            $mimeType = $attachment->getMimeType();
            $attachmentType = Str::startsWith($mimeType, 'image/') ? 'image' : 'document';
        }

        if (! empty($data['team_channel_id'])) {
            $channel = \App\Models\TeamChannel::findOrFail($data['team_channel_id']);

            abort_unless($channel->seller_owner_id === $sellerOwner->id, 403, 'Unauthorized channel messaging.');

            // Check channel membership if parent was not validated
            if (! $parentId) {
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
                'message' => trim((string) ($data['message'] ?? '')),
                'attachment_path' => $attachmentPath,
                'attachment_type' => $attachmentType,
                'is_read' => true,
            ]);

            // Notify other members in bulk
            $members = $channel->members()->where('users.id', '!=', $actor->id)->get();
            if ($members->isNotEmpty()) {
                $memberIds = $members->pluck('id')->all();

                DB::table('notifications')
                    ->whereIn('notifiable_id', $memberIds)
                    ->where('notifiable_type', User::class)
                    ->where('type', NewTeamChannelMessageNotification::class)
                    ->where('data->team_channel_id', $channel->id)
                    ->delete();

                Notification::send($members, new NewTeamChannelMessageNotification($message, $actor->name, $channel->name));
            }

            try {
                broadcast(new TeamMessageSent($message))->toOthers();
            } catch (\Throwable $e) {
                report($e);
            }

            $this->parseMentionsAndNotify($message, $actor);

            return $message;
        }

        $receiverId = $data['receiver_id'] ?? null;
        if (! $receiverId) {
            abort(400, 'Recipient is required.');
        }
        $receiver = User::findOrFail($receiverId);
        $this->authorizeCounterpart($actor, $receiver, $sellerOwner->id);

        $message = TeamMessage::create([
            'seller_owner_id' => $sellerOwner->id,
            'sender_id' => $actor->id,
            'receiver_id' => $receiver->id,
            'team_channel_id' => null,
            'parent_id' => $parentId,
            'message' => trim((string) ($data['message'] ?? '')),
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
            broadcast(new TeamMessageSent($message))->toOthers();
        } catch (\Throwable $e) {
            report($e);
        }

        $this->parseMentionsAndNotify($message, $actor);

        return $message;
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

    private function parseMentionsAndNotify(TeamMessage $message, User $actor): void
    {
        if (is_null($message->team_channel_id)) {
            return;
        }

        if (blank($message->message)) {
            return;
        }

        preg_match_all('/@\[([^\]]+)\]/', $message->message, $matches);
        $names = array_unique($matches[1] ?? []);

        if (empty($names)) {
            return;
        }

        $eligibleContacts = $this->eligibleContacts($actor, $message->seller_owner_id);

        $targetUsers = collect();
        foreach ($names as $name) {
            $targetUser = $eligibleContacts->first(function ($user) use ($name) {
                return strcasecmp($user->name, $name) === 0;
            });

            if ($targetUser && $targetUser->id !== $actor->id) {
                $targetUsers->push($targetUser);
            }
        }

        if ($targetUsers->isNotEmpty()) {
            $targetUserIds = $targetUsers->pluck('id')->all();

            DB::table('notifications')
                ->whereIn('notifiable_id', $targetUserIds)
                ->where('notifiable_type', User::class)
                ->where('type', TeamMessageMentionedNotification::class)
                ->where('data->team_message_id', $message->id)
                ->delete();

            Notification::send($targetUsers, new TeamMessageMentionedNotification($message, $actor->name));
        }
    }
}

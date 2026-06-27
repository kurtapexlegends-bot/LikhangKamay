<?php

namespace App\Actions\Seller\Chat;

use App\Models\TeamMessage;
use App\Models\User;

class GetTeamMessageThread
{
    /**
     * Execute the get team message thread action.
     */
    public function execute(User $actor, TeamMessage $message): array
    {
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

        $reactionFormatter = new ToggleTeamMessageReaction;

        // Fetch replies with sender details
        $replies = TeamMessage::query()
            ->with(['sender', 'reactions.user'])
            ->where('parent_id', $message->id)
            ->orderBy('created_at')
            ->get()
            ->map(function (TeamMessage $reply) use ($actor, $reactionFormatter) {
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
                    'reactions' => $reactionFormatter->formatReactions($reply, $actor),
                    'team_channel_id' => $reply->team_channel_id,
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
            'reactions' => $reactionFormatter->formatReactions($message, $actor),
            'team_channel_id' => $message->team_channel_id,
        ];

        return [
            'parent' => $parentData,
            'replies' => $replies,
        ];
    }
}

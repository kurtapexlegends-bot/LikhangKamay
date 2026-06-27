<?php

namespace App\Actions\Seller\Chat;

use App\Events\TeamMessageReactionUpdated;
use App\Models\TeamMessage;
use App\Models\TeamMessageReaction;
use App\Models\User;

class ToggleTeamMessageReaction
{
    /**
     * Execute the reaction toggle action.
     */
    public function execute(User $actor, TeamMessage $message, string $emoji): array
    {
        abort_unless($message->seller_owner_id === $actor->getEffectiveSellerId(), 403, 'Unauthorized message reaction.');

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
        $reaction = TeamMessageReaction::where('team_message_id', $message->id)
            ->where('user_id', $actor->id)
            ->where('emoji', $emoji)
            ->first();

        if ($reaction) {
            $reaction->delete();
        } else {
            TeamMessageReaction::create([
                'team_message_id' => $message->id,
                'user_id' => $actor->id,
                'emoji' => $emoji,
            ]);
        }

        // Query fresh formatted reactions
        $freshReactions = $this->formatReactions($message->fresh(['reactions.user']), $actor);

        // Broadcast the update in real-time
        try {
            broadcast(new TeamMessageReactionUpdated($message, $freshReactions))->toOthers();
        } catch (\Throwable $e) {
            report($e);
        }

        return $freshReactions;
    }

    /**
     * Helper to format reactions.
     */
    public function formatReactions(TeamMessage $message, User $actor): array
    {
        return $message->reactions
            ->groupBy('emoji')
            ->map(fn ($group, $emoji) => [
                'emoji' => $emoji,
                'count' => $group->count(),
                'reacted_by_me' => $group->contains('user_id', $actor->id),
                'users_list' => $group->pluck('user.name')->filter()->values()->all(),
            ])
            ->values()
            ->all();
    }
}

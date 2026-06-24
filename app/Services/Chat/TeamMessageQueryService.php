<?php

declare(strict_types=1);

namespace App\Services\Chat;

use App\Models\TeamMessage;
use App\Models\TeamChannelMember;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TeamMessageQueryService
{
    /**
     * Get the latest messages for each eligible contact.
     *
     * @param User $actor
     * @param User $sellerOwner
     * @param Collection<int, User> $contacts
     * @return Collection<int, TeamMessage>
     */
    public function getLatestMessagesPerContact(User $actor, User $sellerOwner, Collection $contacts): Collection
    {
        if ($contacts->isEmpty()) {
            return collect();
        }

        $contactIds = $contacts->pluck('id');

        $subquery = TeamMessage::query()
            ->selectRaw('MAX(id) as max_id')
            ->where('seller_owner_id', $sellerOwner->id)
            ->whereNull('team_channel_id') // Exclude channel messages from direct message queries
            ->where(function ($query) use ($actor, $contactIds) {
                $query->where(function ($b) use ($actor, $contactIds) {
                    $b->where('sender_id', $actor->id)->whereIn('receiver_id', $contactIds);
                })->orWhere(function ($b) use ($actor, $contactIds) {
                    $b->whereIn('sender_id', $contactIds)->where('receiver_id', $actor->id);
                });
            })
            ->groupBy(DB::raw('CASE WHEN sender_id = ' . $actor->id . ' THEN receiver_id ELSE sender_id END'));

        return TeamMessage::query()
            ->whereIn('id', $subquery)
            ->get();
    }

    /**
     * Get unread message counts from eligible contacts for the actor.
     *
     * @param User $actor
     * @param User $sellerOwner
     * @param Collection<int, User> $contacts
     * @return Collection<int, int>
     */
    public function getUnreadCounts(User $actor, User $sellerOwner, Collection $contacts): Collection
    {
        if ($contacts->isEmpty()) {
            return collect();
        }

        $contactIds = $contacts->pluck('id');

        return TeamMessage::query()
            ->where('seller_owner_id', $sellerOwner->id)
            ->whereNull('team_channel_id') // Exclude channel messages
            ->whereIn('sender_id', $contactIds)
            ->where('receiver_id', $actor->id)
            ->whereRaw('is_read = false')
            ->selectRaw('sender_id, count(*) as count')
            ->groupBy('sender_id')
            ->pluck('count', 'sender_id');
    }

    /**
     * Get the latest messages for each active channel.
     *
     * @param Collection<int, TeamChannel> $channels
     * @return Collection<int, TeamMessage>
     */
    public function getLatestMessagesPerChannel(Collection $channels): Collection
    {
        if ($channels->isEmpty()) {
            return collect();
        }

        $channelIds = $channels->pluck('id');

        $subquery = TeamMessage::query()
            ->selectRaw('MAX(id) as max_id')
            ->whereIn('team_channel_id', $channelIds)
            ->groupBy('team_channel_id');

        return TeamMessage::query()
            ->whereIn('id', $subquery)
            ->get();
    }

    /**
     * Get unread message counts for each channel for the actor.
     *
     * @param User $actor
     * @param Collection<int, TeamChannel> $channels
     * @return Collection<int, int>
     */
    public function getChannelUnreadCounts(User $actor, Collection $channels): Collection
    {
        if ($channels->isEmpty()) {
            return collect();
        }

        $counts = collect();

        foreach ($channels as $channel) {
            $membership = TeamChannelMember::where('team_channel_id', $channel->id)
                ->where('user_id', $actor->id)
                ->first();

            $query = TeamMessage::where('team_channel_id', $channel->id)
                ->where('sender_id', '!=', $actor->id);

            if ($membership && $membership->last_read_at) {
                $query->where('created_at', '>', $membership->last_read_at);
            }

            $counts->put($channel->id, $query->count());
        }

        return $counts;
    }
}

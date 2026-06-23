<?php

declare(strict_types=1);

namespace App\Services\Chat;

use App\Models\TeamMessage;
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
            ->whereIn('sender_id', $contactIds)
            ->where('receiver_id', $actor->id)
            ->where('is_read', false)
            ->selectRaw('sender_id, count(*) as count')
            ->groupBy('sender_id')
            ->pluck('count', 'sender_id');
    }
}

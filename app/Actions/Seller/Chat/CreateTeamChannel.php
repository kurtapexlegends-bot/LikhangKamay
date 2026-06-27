<?php

namespace App\Actions\Seller\Chat;

use App\Models\TeamChannel;
use App\Models\User;
use Illuminate\Support\Collection;

class CreateTeamChannel
{
    /**
     * Execute the channel creation action.
     */
    public function execute(User $actor, User $sellerOwner, array $data): TeamChannel
    {
        $memberIds = collect($data['member_ids'] ?? [])
            ->push($actor->id)
            ->unique();

        $contacts = $this->eligibleContacts($actor, $sellerOwner->id);
        $allowedIds = $contacts->pluck('id')->push($actor->id);

        foreach ($memberIds as $memberId) {
            if (! $allowedIds->contains($memberId)) {
                abort(403, 'Unauthorized channel member selection.');
            }
        }

        $channel = TeamChannel::create([
            'seller_owner_id' => $sellerOwner->id,
            'name' => strtolower($data['name']),
            'description' => $data['description'] ?? null,
            'created_by_id' => $actor->id,
        ]);

        $channel->members()->attach(
            $memberIds->mapWithKeys(fn ($id) => [$id => ['last_read_at' => now()]])->all()
        );

        return $channel;
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
}

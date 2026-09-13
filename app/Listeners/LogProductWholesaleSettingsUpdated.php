<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\ProductWholesaleSettingsUpdated;
use App\Models\Product;
use App\Models\SellerActivityLog;

class LogProductWholesaleSettingsUpdated
{
    /**
     * Handle the product wholesale settings updated event by recording an activity log.
     */
    public function handle(ProductWholesaleSettingsUpdated $event): void
    {
        $product = $event->product;
        $actor = $event->actor;
        $validated = $event->validated;
        $isListed = $event->isListed;

        SellerActivityLog::recordEvent([
            'seller_owner_id' => $actor->id,
            'actor_user_id' => $actor->id,
            'actor_type' => SellerActivityLog::resolveActorType($actor, 'owner'),
            'category' => 'operations',
            'module' => 'supply_hub',
            'event_type' => $isListed ? 'supply_listed' : 'supply_unlisted',
            'severity' => 'info',
            'status' => $isListed ? 'published' : 'unlisted',
            'title' => $isListed ? 'Material Listed on Supply Hub' : 'Material Delisted from Supply Hub',
            'summary' => $isListed
                ? "Published \"{$product->name}\" to peer studio supplies."
                : "Unpublished \"{$product->name}\" from peer studio supplies.",
            'subject_type' => Product::class,
            'subject_id' => $product->id,
            'subject_label' => $product->name,
            'reference' => $product->sku,
            'amount_label' => isset($validated['wholesale_price']) && $validated['wholesale_price'] !== null
                ? 'PHP ' . number_format((float) $validated['wholesale_price'], 2)
                : null,
            'details' => [
                'is_b2b_supply' => $isListed,
                'moq' => $product->moq,
                'wholesale_price' => $product->wholesale_price,
            ],
            'target_url' => route('seller.supply-hub.my-listings'),
            'target_label' => 'View Listings',
        ]);
    }
}

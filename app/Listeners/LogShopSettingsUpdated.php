<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\ShopSettingsUpdated;
use App\Models\SellerActivityLog;
use App\Models\User;

class LogShopSettingsUpdated
{
    /**
     * Handle the shop settings updated event by recording an activity log.
     */
    public function handle(ShopSettingsUpdated $event): void
    {
        $seller = $event->seller;
        $actor = $event->actor;

        SellerActivityLog::recordEvent([
            'seller_owner_id' => $seller->id,
            'actor_user_id' => $actor?->id,
            'actor_type' => SellerActivityLog::resolveActorType($actor, 'owner'),
            'category' => 'operations',
            'module' => 'shop_settings',
            'event_type' => 'settings_updated',
            'severity' => 'info',
            'status' => 'updated',
            'title' => 'Shop Settings Updated',
            'summary' => 'Seller workspace profile details were updated.',
            'subject_type' => User::class,
            'subject_id' => $seller->id,
            'subject_label' => $seller->shop_name ?: $seller->name,
            'details' => [
                'before' => $event->before,
                'after' => [
                    'bio' => (string) ($seller->bio ?? ''),
                    'has_banner' => filled($seller->banner_image),
                    'has_avatar' => filled($seller->avatar),
                ],
                'lines' => $event->lines,
            ],
            'target_url' => route('shop.settings'),
            'target_label' => 'Open Shop Settings',
        ]);
    }
}

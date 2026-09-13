<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ShopSettingsUpdated
{
    use Dispatchable, SerializesModels;

    /**
     * @param User $seller
     * @param User|null $actor
     * @param array<string, mixed> $before
     * @param array<int, string> $lines
     */
    public function __construct(
        public readonly User $seller,
        public readonly ?User $actor,
        public readonly array $before,
        public readonly array $lines
    ) {}
}

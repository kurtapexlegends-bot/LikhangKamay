<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProductWholesaleSettingsUpdated
{
    use Dispatchable, SerializesModels;

    /**
     * @param Product $product
     * @param User $actor
     * @param array<string, mixed> $validated
     * @param bool $isListed
     */
    public function __construct(
        public readonly Product $product,
        public readonly User $actor,
        public readonly array $validated,
        public readonly bool $isListed
    ) {}
}

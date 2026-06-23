<?php

namespace App\Http\Controllers\Seller\Concerns;

use App\Models\Message;
use App\Models\Order;
use App\Models\Product;
use App\Models\Supply;
use App\Models\User;

trait ProductControllerHelpers
{
    private function draftActivationRequirementMessage(array $missingRequirements): string
    {
        return 'Product saved as Draft. Add ' . $this->humanizeRequirementList($missingRequirements) . ' before listing it as Active.';
    }

    private function activationBlockedMessage(array $missingRequirements): string
    {
        return 'This product needs ' . $this->humanizeRequirementList($missingRequirements) . ' before it can be listed as Active. It remains in Draft.';
    }

    private function humanizeRequirementList(array $requirements): string
    {
        $requirements = array_values(array_unique($requirements));
        $count = count($requirements);

        if ($count === 0) {
            return 'the required media';
        }

        if ($count === 1) {
            return $requirements[0];
        }

        if ($count === 2) {
            return $requirements[0] . ' and ' . $requirements[1];
        }

        $lastRequirement = array_pop($requirements);

        return implode(', ', $requirements) . ', and ' . $lastRequirement;
    }

    private function bulkActivationMessage(int $activated, int $drafted, int $skipped): string
    {
        if ($activated === 0 && $skipped > 0 && $drafted === 0) {
            return "No selected products were activated. Your active product limit has already been reached.";
        }

        $message = "{$activated} product(s) were activated.";
        if ($activated === 1) {
            $message = "1 product was activated.";
        } elseif ($activated > 1) {
            $message = "{$activated} products were activated.";
        }

        if ($drafted > 0) {
            $productWord = $drafted === 1 ? 'product' : 'products';
            $message .= " {$drafted} {$productWord} was kept in Draft because required media is incomplete.";
            if ($drafted > 1) {
                $message = str_replace('was kept in Draft', 'were kept in Draft', $message);
            }
        }

        if ($skipped > 0) {
            $productWord = $skipped === 1 ? 'product' : 'products';
            $message .= " {$skipped} {$productWord} were skipped due to plan limits.";
        }

        return trim($message);
    }

    private function viewerCanChatSeller(?User $viewer, ?User $seller): bool
    {
        if (
            !$viewer
            || !$seller
            || $viewer->id === $seller->id
            || !$viewer->isBuyer()
            || !$seller->isArtisan()
        ) {
            return false;
        }

        return Order::query()
            ->where('artisan_id', $seller->id)
            ->where('user_id', $viewer->id)
            ->exists()
            || Message::query()
                ->where(function ($query) use ($viewer, $seller) {
                    $query->where('sender_id', $viewer->id)
                        ->where('receiver_id', $seller->id);
                })
                ->orWhere(function ($query) use ($viewer, $seller) {
                    $query->where('sender_id', $seller->id)
                        ->where('receiver_id', $viewer->id);
                })
                ->exists();
    }

    private function supplyLookupAttributes(Product $product, int $sellerId): array
    {
        return Supply::filterSchemaCompatibleAttributes([
            'user_id' => $sellerId,
            'product_id' => $product->id,
            'name' => $product->name,
            'category' => 'Finished Goods',
        ]);
    }

    private function findSupplyForProduct(Product $product, int $sellerId, ?string $fallbackName = null): ?Supply
    {
        $query = Supply::where('user_id', $sellerId);

        if (Supply::supportsProductIdColumn()) {
            return $query->where('product_id', $product->id)->first();
        }

        $names = collect([$product->name, $fallbackName])
            ->filter()
            ->unique()
            ->values();

        if ($names->isEmpty()) {
            return null;
        }

        return $query
            ->where('category', 'Finished Goods')
            ->whereIn('name', $names->all())
            ->first();
    }
}

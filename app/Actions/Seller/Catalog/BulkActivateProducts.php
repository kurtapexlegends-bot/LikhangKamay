<?php

namespace App\Actions\Seller\Catalog;

use App\Models\Product;
use App\Models\User;
use App\Models\SellerActivityLog;
use Illuminate\Support\Facades\DB;

class BulkActivateProducts
{
    /**
     * Bulk activate/submit for review products with limits
     *
     * @param User $seller
     * @param array $productIds
     * @param User $actor
     * @return array
     */
    public function execute(User $seller, array $productIds, User $actor): array
    {
        $products = Product::query()
            ->where('user_id', $seller->id)
            ->whereIn('id', $productIds)
            ->get();

        if ($products->isEmpty()) {
            return [
                'status' => 'error',
                'message' => 'No matching products were found.',
                'activated' => 0,
                'drafted' => 0,
                'skipped' => 0
            ];
        }

        $result = DB::transaction(function () use ($seller, $products, $productIds, $actor) {
            $remainingActivationSlots = max(0, $seller->getActiveProductLimit() - $seller->products()->where('status', 'Active')->count());
            $activated = 0;
            $draftedForMissingMedia = 0;
            $skippedForLimit = 0;

            $selectedIds = collect($productIds)->map(fn ($id) => (int) $id)->unique()->values();

            foreach ($selectedIds as $selectedId) {
                /** @var Product|null $product */
                $product = $products->firstWhere('id', $selectedId);
                if (!$product || $product->status === 'Active') continue;

                $activationReadiness = $this->evaluateActivationReadiness(
                    filled($product->cover_photo_path),
                    count($product->gallery_paths ?? []),
                    filled($product->model_3d_path)
                );

                if (!$activationReadiness['canBeActive']) {
                    $product->update(['status' => 'Draft']);
                    $draftedForMissingMedia++;
                    continue;
                }

                if ($remainingActivationSlots <= 0) {
                    $skippedForLimit++;
                    continue;
                }

                $product->update([
                    'status' => 'pending_review',
                    'rejection_reason' => null
                ]);
                $remainingActivationSlots--;
                $activated++;
            }

            SellerActivityLog::recordEvent([
                'seller_owner_id' => $seller->id,
                'actor_user_id' => $actor->id,
                'actor_type' => SellerActivityLog::resolveActorType($actor, 'owner'),
                'category' => 'operations',
                'module' => 'products',
                'event_type' => 'product_bulk_status',
                'severity' => $skippedForLimit > 0 || $draftedForMissingMedia > 0 ? 'warning' : 'info',
                'status' => 'active',
                'title' => 'Bulk Product Activation',
                'summary' => "{$activated} product(s) were activated.",
                'subject_label' => 'Bulk product update',
                'details' => [
                    'lines' => array_values(array_filter([
                        "Activated {$activated} selected product(s).",
                        $draftedForMissingMedia > 0 ? "{$draftedForMissingMedia} product(s) remained Draft due to missing media requirements." : null,
                        $skippedForLimit > 0 ? "{$skippedForLimit} product(s) were skipped because your current plan limit is full." : null,
                    ])),
                ],
                'target_url' => route('products.index'),
                'target_label' => 'Open Products',
            ]);

            return [
                'status' => ($activated === 0 && ($draftedForMissingMedia > 0 || $skippedForLimit > 0)) ? 'error' : 'success',
                'activated' => $activated,
                'drafted' => $draftedForMissingMedia,
                'skipped' => $skippedForLimit
            ];
        });

        return $result;
    }

    private function evaluateActivationReadiness(bool $hasCoverPhoto, int $galleryImageCount, bool $hasThreeDModel): array
    {
        $missing = [];

        if (!$hasCoverPhoto) {
            $missing[] = 'a cover image';
        }

        if ($galleryImageCount < 3 || $galleryImageCount > 5) {
            $missing[] = '3 to 5 gallery images';
        }

        if (!$hasThreeDModel) {
            $missing[] = 'a 3D model';
        }

        return [
            'canBeActive' => empty($missing),
            'missing' => $missing,
        ];
    }
}

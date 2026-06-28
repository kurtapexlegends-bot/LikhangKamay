<?php

namespace App\Actions\Seller\Catalog;

use App\Models\Product;
use App\Models\SellerActivityLog;
use App\Services\Catalog\ProductMediaService;
use App\Services\Catalog\ThreeDAssetService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateProduct
{
    private ProductMediaService $productMediaService;
    private ThreeDAssetService $threeDAssetService;
    private SyncProductRecipes $syncProductRecipes;

    public function __construct(
        ProductMediaService $productMediaService,
        ThreeDAssetService $threeDAssetService,
        SyncProductRecipes $syncProductRecipes
    ) {
        $this->productMediaService = $productMediaService;
        $this->threeDAssetService = $threeDAssetService;
        $this->syncProductRecipes = $syncProductRecipes;
    }

    public function execute(Product $product, array $validated, $request, $seller): array
    {
        $before = [
            'name' => $product->name,
            'status' => $product->status,
            'stock' => $product->stock,
            'price' => (float) $product->price,
            'category' => $product->category,
        ];

        $retainedGallery = $request->input('retained_gallery', []);
        $activationReadiness = $this->evaluateActivationReadiness(
            $request->hasFile('cover_photo') || filled($product->cover_photo_path),
            count($retainedGallery) + count($request->file('gallery', [])),
            $request->hasFile('model_3d') || filled($product->model_3d_path)
        );
        $requestedStatus = $this->normalizeStatusForActivationRequirements(
            $validated['status'],
            $activationReadiness['canBeActive']
        );

        if ($requestedStatus === 'Active' && $product->status !== 'Active' && !$seller->canAddMoreProducts()) {
            throw ValidationException::withMessages(['limit' => 'You have reached your active products limit. Please upgrade your plan to activate more products.']);
        }

        if ($request->hasFile('cover_photo')) {
            $this->productMediaService->deleteCoverPhoto($product->cover_photo_path);
            $product->cover_photo_path = $this->productMediaService->resizeAndSave($request->file('cover_photo'), 'products/covers');
        }

        if ($request->hasFile('model_3d')) {
            $product->model_3d_path = $this->threeDAssetService->validateAndStore($request, $seller->id, $product->model_3d_path);
        }

        $product->gallery_paths = $this->productMediaService->handleGallery(
            $request->file('gallery'),
            $retainedGallery,
            $product->gallery_paths ?? []
        );

        $existingSupplyLookupName = $product->name;
        $sellerId = $seller->id;

        DB::transaction(function () use ($product, $request, $validated, $requestedStatus, $sellerId, $existingSupplyLookupName, $before) {
            $name = trim(strip_tags($request->name));

            $product->update([
                'name' => $name,
                'description' => $request->description,
                'category' => $request->category,
                'price' => $request->price,
                'cost_price' => $request->cost_price ?? 0,
                'stock' => $request->stock,
                'status' => $requestedStatus,
                'clay_type' => $request->clay_type,
                'glaze_type' => $request->glaze_type,
                'firing_method' => $request->firing_method,
                'colors' => $request->colors,
                'food_safe' => $request->boolean('food_safe'),
                'height' => $request->height,
                'width' => $request->width,
                'weight' => $request->weight,
                'track_as_supply' => true,
                'production_method' => $validated['production_method'] ?? $product->production_method,
            ]);

            $product->save();

            $this->syncProductRecipes->execute($product, $validated, $sellerId, $existingSupplyLookupName);

            SellerActivityLog::recordEvent([
                'seller_owner_id' => $sellerId,
                'actor_user_id' => Auth::id(),
                'actor_type' => SellerActivityLog::resolveActorType(Auth::user(), 'owner'),
                'category' => 'operations',
                'module' => 'products',
                'event_type' => 'product_updated',
                'severity' => 'info',
                'status' => strtolower($product->status),
                'title' => 'Product Updated',
                'summary' => "{$product->name} details were updated.",
                'subject_type' => Product::class,
                'subject_id' => $product->id,
                'subject_label' => $product->name,
                'reference' => $product->sku,
                'amount_label' => 'PHP ' . number_format((float) $product->price, 2),
                'details' => [
                    'before' => $before,
                    'after' => [
                        'name' => $product->name,
                        'status' => $product->status,
                        'stock' => $product->stock,
                        'price' => (float) $product->price,
                        'category' => $product->category,
                    ],
                    'lines' => array_values(array_filter([
                        $request->hasFile('cover_photo') ? 'Updated cover image' : null,
                        $request->hasFile('gallery') ? 'Updated gallery images' : null,
                        $request->hasFile('model_3d') ? 'Updated 3D model bundle' : null,
                    ])),
                ],
                'target_url' => route('products.index', ['highlight_product' => $product->id]),
                'target_label' => 'Open Products',
            ]);
        });

        $product->refresh();

        return [
            'product' => $product,
            'requestedStatus' => $requestedStatus,
            'activationReadiness' => $activationReadiness,
        ];
    }

    private function normalizeStatusForActivationRequirements(string $requestedStatus, bool $canBeActive): string
    {
        if ($requestedStatus === 'Active' && !$canBeActive) {
            return 'Draft';
        }

        return $requestedStatus;
    }

    private function evaluateActivationReadiness(bool $hasCoverPhoto, int $galleryImageCount, bool $hasThreeDModel): array
    {
        $missing = [];

        if (!$hasCoverPhoto) {
            $missing[] = 'a cover image';
        }

        if (
            $galleryImageCount < 3
            || $galleryImageCount > 5
        ) {
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

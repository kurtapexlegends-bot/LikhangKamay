<?php

namespace App\Actions\Seller\Catalog;

use App\Models\Product;
use App\Models\SellerActivityLog;
use App\Services\Catalog\ProductMediaService;
use App\Services\Catalog\ThreeDAssetService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateProduct
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

    public function execute(array $validated, $request, $sellerOwner): array
    {
        $activationReadiness = $this->evaluateActivationReadiness(
            $request->hasFile('cover_photo'),
            count($request->file('gallery', [])),
            $request->hasFile('model_3d')
        );
        $requestedStatus = $this->normalizeStatusForActivationRequirements(
            $validated['status'],
            $activationReadiness['canBeActive']
        );

        if ($requestedStatus === 'Active' && !$sellerOwner->canAddMoreProducts()) {
            throw ValidationException::withMessages(['limit' => 'You have reached your active products limit. Please upgrade your plan to add more active products.']);
        }

        $coverPath = null;
        if ($request->hasFile('cover_photo')) {
            $coverPath = $this->productMediaService->resizeAndSave($request->file('cover_photo'), 'products/covers');
        }

        $modelPath = $this->threeDAssetService->validateAndStore($request, $sellerOwner->id);

        $galleryPaths = [];
        if ($request->hasFile('gallery')) {
            foreach ($request->file('gallery') as $file) {
                $galleryPaths[] = $this->productMediaService->resizeAndSave($file, 'products/gallery');
            }
        }

        $sellerId = $sellerOwner->id;

        $product = DB::transaction(function () use ($validated, $request, $modelPath, $coverPath, $galleryPaths, $sellerId, $requestedStatus) {
            $sku = trim(strip_tags($validated['sku']));
            $name = trim(strip_tags($validated['name']));

            $product = Product::create([
                'user_id' => $sellerId,
                'sku' => $sku,
                'name' => $name,
                'description' => $validated['description'] ?? '',
                'category' => $validated['category'],
                'price' => $validated['price'],
                'cost_price' => $validated['cost_price'] ?? 0,
                'stock' => $validated['stock'],
                'lead_time' => $validated['lead_time'] ?? 3,
                'status' => $requestedStatus,
                'clay_type' => $validated['clay_type'] ?? null,
                'glaze_type' => $validated['glaze_type'] ?? null,
                'firing_method' => $validated['firing_method'] ?? null,
                'food_safe' => $request->boolean('food_safe'),
                'colors' => $validated['colors'] ?? [],
                'height' => $validated['height'] ?? 0,
                'width' => $validated['width'] ?? 0,
                'weight' => $validated['weight'] ?? 0,
                'model_3d_path' => $modelPath,
                'cover_photo_path' => $coverPath,
                'gallery_paths' => $galleryPaths,
                'track_as_supply' => true,
                'production_method' => $validated['production_method'] ?? 'resell',
            ]);

            $this->syncProductRecipes->execute($product, $validated, $sellerId);

            SellerActivityLog::recordEvent([
                'seller_owner_id' => $sellerId,
                'actor_user_id' => Auth::id(),
                'actor_type' => SellerActivityLog::resolveActorType(Auth::user(), 'owner'),
                'category' => 'operations',
                'module' => 'products',
                'event_type' => 'product_created',
                'severity' => 'success',
                'status' => strtolower($requestedStatus),
                'title' => 'Product Created',
                'summary' => "{$product->name} was added to the catalog.",
                'subject_type' => Product::class,
                'subject_id' => $product->id,
                'subject_label' => $product->name,
                'reference' => $product->sku,
                'amount_label' => 'PHP ' . number_format((float) $product->price, 2),
                'details' => [
                    'after' => [
                        'status' => $product->status,
                        'stock' => $product->stock,
                        'price' => (float) $product->price,
                        'category' => $product->category,
                    ],
                    'lines' => array_values(array_filter([
                        $requestedStatus === 'Draft' && $validated['status'] === 'Active'
                            ? 'Saved as Draft because activation requirements are incomplete'
                            : 'Saved with requested status',
                    ])),
                ],
                'target_url' => route('products.index', ['highlight_product' => $product->id]),
                'target_label' => 'Open Products',
            ]);

            return $product;
        });

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

<?php

namespace App\Http\Requests\Seller;

use App\Models\Category;
use App\Models\Product;
use App\Services\Catalog\ThreeDAssetService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    private const MAX_GALLERY_IMAGES = 5;

    public function authorize(): bool
    {
        $productId = $this->route('id');
        $product = Product::find($productId);

        return $product ? Gate::allows('update', $product) : false;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('category')) {
            $this->merge([
                'category' => trim((string) $this->input('category')),
            ]);
        }
    }

    public function rules(ThreeDAssetService $threeDAssetService): array
    {
        return [
            'name' => ['required', 'string', 'min:10', 'max:60'],
            'price' => ['required', 'numeric', 'min:0'],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'status' => ['required', 'string'],
            'production_method' => ['nullable', 'string', 'in:resell,manufactured'],
            'recipes' => ['nullable', 'array'],
            'recipes.*.supply_id' => ['required', 'exists:supplies,id'],
            'recipes.*.quantity_required' => ['required', 'numeric', 'min:0.01'],
            'category' => ['required', 'string', Rule::in(Category::pluck('name')->toArray())],
            'description' => ['nullable', 'string', 'max:5000'],
            'clay_type' => ['nullable', 'string', 'max:100'],
            'glaze_type' => ['nullable', 'string', 'max:100'],
            'firing_method' => ['nullable', 'string', 'max:100'],
            'colors' => ['nullable', 'array'],
            'cover_photo' => ['nullable', 'image', 'max:10240'],
            'gallery' => ['nullable', 'array', 'max:' . self::MAX_GALLERY_IMAGES],
            'gallery.*' => ['nullable', 'image', 'max:10240'],
            'retained_gallery' => ['nullable', 'array'],
            'height' => ['nullable', 'numeric', 'min:0'],
            'width' => ['nullable', 'numeric', 'min:0'],
            'weight' => ['nullable', 'numeric', 'min:0'],
            'lead_time' => ['nullable', 'integer', 'min:0'],
            'model_3d' => $threeDAssetService->getUploadRules(),
            ...$threeDAssetService->getAssetRules(),
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            /** @var \App\Models\User|null $user */
            $user = $this->user();
            $seller = $user?->getEffectiveSeller();

            if (!$seller || !$seller->isApproved()) {
                $validator->errors()->add('status', 'Your artisan account is not yet approved. You cannot update products.');
                return;
            }

            $productId = $this->route('id');
            $product = Product::find($productId);

            if (!$product) {
                return;
            }

            // 1. Quota Enforcement: Active Product Listing Limit by Tier
            $requestedStatus = $this->input('status');
            $retainedGallery = $this->input('retained_gallery', []);
            $totalGalleryCount = count($retainedGallery) + count($this->file('gallery', []));
            $hasCover = $this->hasFile('cover_photo') || filled($product->cover_photo_path);
            $hasThreeD = $this->hasFile('model_3d') || filled($product->model_3d_path) || (is_string($this->input('model_3d')) && filled($this->input('model_3d')));
            $meetsActivationMedia = $hasCover && ($totalGalleryCount >= 3 && $totalGalleryCount <= 5) && $hasThreeD;

            if ($requestedStatus === 'Active' && $product->status !== 'Active' && $meetsActivationMedia && !$seller->canAddMoreProducts()) {
                $limit = $seller->getActiveProductLimit();
                $tier = $seller->getSellerTierLabel();
                $validator->errors()->add('limit', "You have reached your active products limit of {$limit} for the {$tier} plan. Please upgrade your plan to activate more products.");
            }

            // 2. Feature Gate: Material Recipe Tracking (Premium & Elite only)
            $hasRecipes = $this->filled('recipes') && count($this->input('recipes', [])) > 0;
            $isManufactured = $this->input('production_method') === 'manufactured';

            if (($hasRecipes || $isManufactured) && !$seller->isPremiumTier()) {
                $error = 'Material recipe tracking is only available on Premium and Elite plans. Please upgrade your plan to link raw materials to your products.';
                $validator->errors()->add('recipes', $error);
                $validator->errors()->add('production_method', $error);
            }
        });
    }
}

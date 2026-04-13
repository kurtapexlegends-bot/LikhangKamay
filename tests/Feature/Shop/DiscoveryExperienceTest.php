<?php

namespace Tests\Feature\Shop;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DiscoveryExperienceTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalog_search_prioritizes_direct_shop_match_over_description_only_match(): void
    {
        $sellerWithMatchingShop = User::factory()->artisanApproved()->create([
            'shop_name' => 'Heritage Clay Studio',
            'name' => 'Heritage Owner',
        ]);

        $descriptionOnlySeller = User::factory()->artisanApproved()->create([
            'shop_name' => 'Plain Pottery Corner',
            'name' => 'Plain Owner',
        ]);

        $this->makeProduct($sellerWithMatchingShop, [
            'name' => 'Ivory Vase',
            'description' => 'Wheel-thrown ceramic vase.',
            'sold' => 4,
        ]);

        $this->makeProduct($descriptionOnlySeller, [
            'name' => 'Stone Pitcher',
            'description' => 'Inspired by Heritage Clay techniques for rustic interiors.',
            'sold' => 9,
        ]);

        $this->get(route('shop.index', ['search' => 'Heritage Clay']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Shop/Catalog')
                ->where('filters.search', 'Heritage Clay')
                ->where('products.0.seller', 'Heritage Clay Studio')
                ->where('products.0.name', 'Ivory Vase')
                ->has('products', 2)
            );
    }

    public function test_product_show_prefers_related_products_with_closer_material_and_category_match(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'shop_name' => 'Clay Form House',
        ]);

        $product = $this->makeProduct($seller, [
            'name' => 'Ocean Blue Vase',
            'category' => 'Vases',
            'clay_type' => 'Stoneware',
            'glaze_type' => 'Glossy Blue',
            'firing_method' => 'High Fire',
            'sold' => 5,
        ]);

        $closeMatch = $this->makeProduct($seller, [
            'name' => 'Azure Stoneware Vase',
            'category' => 'Vases',
            'clay_type' => 'Stoneware',
            'glaze_type' => 'Glossy Blue',
            'firing_method' => 'High Fire',
            'sold' => 8,
        ]);

        $sameCategory = $this->makeProduct($seller, [
            'name' => 'Neutral Display Vase',
            'category' => 'Vases',
            'clay_type' => 'Earthenware',
            'glaze_type' => 'Matte White',
            'firing_method' => 'Low Fire',
            'sold' => 6,
        ]);

        $differentCategory = $this->makeProduct($seller, [
            'name' => 'Blue Serving Plate',
            'category' => 'Plates',
            'clay_type' => 'Stoneware',
            'glaze_type' => 'Glossy Blue',
            'firing_method' => 'High Fire',
            'sold' => 20,
        ]);

        $fallback = $this->makeProduct($seller, [
            'name' => 'Clay Centerpiece Bowl',
            'category' => 'Bowls',
            'clay_type' => 'Stoneware',
            'glaze_type' => 'Glossy Blue',
            'firing_method' => 'High Fire',
            'sold' => 3,
        ]);

        $this->get(route('product.show', $product->slug))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Shop/ProductShow')
                ->where('relatedProducts.0.slug', $closeMatch->slug)
                ->where('relatedProducts.1.slug', $sameCategory->slug)
                ->where('relatedProducts.2.slug', $differentCategory->slug)
                ->where('relatedProducts.3.slug', $fallback->slug)
                ->missing("relatedProducts.4")
            );
    }

    private function makeProduct(User $seller, array $overrides = []): Product
    {
        return Product::create(array_merge([
            'user_id' => $seller->id,
            'sku' => 'DISCOVER-' . strtoupper(fake()->unique()->bothify('??###')),
            'name' => 'Discovery Product',
            'description' => 'Discovery test product.',
            'category' => 'Vases',
            'status' => 'Active',
            'clay_type' => 'Stoneware',
            'glaze_type' => 'Glossy Blue',
            'firing_method' => 'High Fire',
            'price' => 320,
            'cost_price' => 150,
            'stock' => 10,
            'sold' => 0,
            'lead_time' => '3 days',
            'cover_photo_path' => 'products/discovery-test.jpg',
            'gallery_paths' => ['products/discovery-1.jpg', 'products/discovery-2.jpg', 'products/discovery-3.jpg'],
            'model_3d_path' => 'products/discovery.glb',
        ], $overrides));
    }
}

<?php

namespace Tests\Feature\Homepage;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HomepageMerchandisingTest extends TestCase
{
    use RefreshDatabase;

    public function test_homepage_featured_products_exclude_active_sponsored_products(): void
    {
        $seller = User::factory()->artisanApproved()->create();

        $sponsoredProduct = $this->createProduct($seller, [
            'name' => 'Sponsored Vessel',
            'sold' => 99,
            'is_sponsored' => true,
            'sponsored_until' => now()->addDay(),
        ]);

        $featuredProduct = $this->createProduct($seller, [
            'name' => 'Featured Bowl',
            'sold' => 88,
            'is_sponsored' => false,
            'sponsored_until' => null,
        ]);

        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Welcome')
                ->where('sponsoredProducts', function ($products) use ($sponsoredProduct) {
                    return collect($products)->pluck('id')->contains($sponsoredProduct->id);
                })
                ->where('featuredProducts', function ($products) use ($sponsoredProduct, $featuredProduct) {
                    $productIds = collect($products)->pluck('id');

                    return !$productIds->contains($sponsoredProduct->id)
                        && $productIds->contains($featuredProduct->id);
                })
            );
    }

    public function test_homepage_featured_products_fall_back_when_only_sponsored_products_exist(): void
    {
        $seller = User::factory()->artisanApproved()->create();

        $onlyProduct = $this->createProduct($seller, [
            'name' => 'Only Sponsored Centerpiece',
            'sold' => 52,
            'is_sponsored' => true,
            'sponsored_until' => now()->addDay(),
        ]);

        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Welcome')
                ->where('sponsoredProducts', function ($products) use ($onlyProduct) {
                    return collect($products)->pluck('id')->contains($onlyProduct->id);
                })
                ->where('featuredProducts', function ($products) use ($onlyProduct) {
                    return collect($products)->pluck('id')->contains($onlyProduct->id);
                })
            );
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createProduct(User $seller, array $overrides = []): Product
    {
        return Product::create(array_merge([
            'user_id' => $seller->id,
            'sku' => 'SKU-' . strtoupper(fake()->bothify('??###')),
            'name' => 'Homepage Product ' . fake()->unique()->word(),
            'description' => 'Homepage merchandising test product.',
            'category' => 'Home Decor',
            'status' => 'Active',
            'price' => 1200,
            'cost_price' => 400,
            'stock' => 8,
            'lead_time' => 3,
            'sold' => 4,
            'track_as_supply' => false,
            'is_sponsored' => false,
            'sponsored_until' => null,
        ], $overrides));
    }
}

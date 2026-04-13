<?php

namespace Tests\Feature\Seller;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductActivationRequirementsTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_cannot_be_activated_without_required_media(): void
    {
        $seller = User::factory()->artisanApproved()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'ACTIVATE-' . strtoupper(fake()->unique()->bothify('??###')),
            'name' => 'Activation Gate Test Product',
            'description' => 'Activation requirements should block this product.',
            'category' => 'Vases',
            'status' => 'Draft',
            'price' => 250,
            'cost_price' => 120,
            'stock' => 8,
        ]);

        $this->from(route('products.index'))
            ->actingAs($seller)
            ->post(route('products.activate', $product->id))
            ->assertRedirect(route('products.index', absolute: false))
            ->assertSessionHas('error', 'This product needs a cover image, 3 to 5 gallery images, and a 3D model before it can be listed as Active. It remains in Draft.');

        $this->assertSame('Draft', $product->fresh()->status);
    }

    public function test_bulk_activate_only_activates_ready_products(): void
    {
        $seller = User::factory()->artisanApproved()->create(['premium_tier' => 'premium']);

        $readyProduct = $this->makeProduct($seller, [
            'status' => 'Draft',
            'cover_photo_path' => 'products/covers/ready.jpg',
            'gallery_paths' => ['products/gallery/1.jpg', 'products/gallery/2.jpg', 'products/gallery/3.jpg'],
            'model_3d_path' => 'products/models/ready.glb',
        ]);

        $incompleteProduct = $this->makeProduct($seller, [
            'status' => 'Archived',
        ]);

        $this->from(route('products.index'))
            ->actingAs($seller)
            ->post(route('products.bulk-status'), [
                'ids' => [$readyProduct->id, $incompleteProduct->id],
                'status' => 'Active',
            ])
            ->assertRedirect(route('products.index', absolute: false))
            ->assertSessionHas('success', '1 product was activated. 1 product was kept in Draft because required media is incomplete.');

        $this->assertSame('Active', $readyProduct->fresh()->status);
        $this->assertSame('Draft', $incompleteProduct->fresh()->status);
    }

    public function test_bulk_activate_respects_active_product_limit(): void
    {
        $seller = User::factory()->artisanApproved()->create(['premium_tier' => 'free']);

        foreach (range(1, 3) as $index) {
            $this->makeProduct($seller, [
                'sku' => 'LIVE-' . $index . '-' . strtoupper(fake()->unique()->bothify('??###')),
                'status' => 'Active',
                'cover_photo_path' => "products/covers/live-{$index}.jpg",
                'gallery_paths' => ["products/gallery/live-{$index}-1.jpg", "products/gallery/live-{$index}-2.jpg", "products/gallery/live-{$index}-3.jpg"],
                'model_3d_path' => "products/models/live-{$index}.glb",
            ]);
        }

        $readyProduct = $this->makeProduct($seller, [
            'status' => 'Draft',
            'cover_photo_path' => 'products/covers/ready-limit.jpg',
            'gallery_paths' => ['products/gallery/a.jpg', 'products/gallery/b.jpg', 'products/gallery/c.jpg'],
            'model_3d_path' => 'products/models/ready-limit.glb',
        ]);

        $this->from(route('products.index'))
            ->actingAs($seller)
            ->post(route('products.bulk-status'), [
                'ids' => [$readyProduct->id],
                'status' => 'Active',
            ])
            ->assertRedirect(route('products.index', absolute: false))
            ->assertSessionHas('error', 'No selected products were activated. Your active product limit has already been reached.');

        $this->assertSame('Draft', $readyProduct->fresh()->status);
    }

    private function makeProduct(User $seller, array $overrides = []): Product
    {
        return Product::create(array_merge([
            'user_id' => $seller->id,
            'sku' => 'BULK-' . strtoupper(fake()->unique()->bothify('??###')),
            'name' => 'Bulk Product ' . fake()->unique()->word(),
            'description' => 'Product used for bulk activation tests.',
            'category' => 'Vases',
            'status' => 'Draft',
            'price' => 250,
            'cost_price' => 120,
            'stock' => 8,
        ], $overrides));
    }
}

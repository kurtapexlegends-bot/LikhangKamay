<?php

declare(strict_types=1);

namespace Tests\Feature\Catalog;

use App\Models\Category;
use App\Models\Product;
use App\Models\SellerComplianceAgreement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CatalogPayloadOptimizationTest extends TestCase
{
    use RefreshDatabase;

    private User $artisan;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'shop_name' => 'Terra Forge Pottery',
            'shop_slug' => 'terra-forge',
            'city' => 'Bacoor',
        ]);

        SellerComplianceAgreement::create([
            'user_id' => $this->artisan->id,
            'document_type' => 'seller_terms',
            'accepted_at' => now(),
            'ip_address' => '127.0.0.1',
        ]);

        $this->category = Category::create([
            'name' => 'Tableware',
            'slug' => 'tableware',
        ]);
    }

    public function test_catalog_browse_query_prunes_heavy_columns(): void
    {
        $hugeDescription = str_repeat('A very long product narrative that should not be transmitted on browse grid. ', 50);

        Product::create([
            'user_id' => $this->artisan->id,
            'sku' => 'PRUNE-001',
            'name' => 'Heavy Spec Plate',
            'description' => $hugeDescription,
            'category' => $this->category->name,
            'status' => 'Active',
            'price' => 450,
            'stock' => 12,
            'sold' => 8,
            'cover_photo_path' => 'products/cover.jpg',
            'gallery_paths' => ['products/g1.jpg', 'products/g2.jpg', 'products/g3.jpg'],
            'model_3d_path' => 'models/sample.glb',
            'colors' => ['Terracotta', 'Cream'],
            'height' => 15.5,
            'width' => 15.5,
            'weight' => 600,
        ]);

        $queries = [];
        DB::listen(function ($query) use (&$queries) {
            $queries[] = $query->sql;
        });

        $response = $this->get(route('shop.index'));
        $response->assertOk();

        // 1. Assert database query selects specific columns rather than select *
        $productSelectQueries = array_filter($queries, fn ($sql) => str_contains($sql, 'from "products"') && str_contains($sql, 'order by'));
        $this->assertNotEmpty($productSelectQueries);

        foreach ($productSelectQueries as $sql) {
            $this->assertStringNotContainsString('select * from "products"', $sql);
            $this->assertStringNotContainsString('select "products".*', $sql);
            $this->assertStringContainsString('"products"."name"', $sql);
            $this->assertStringContainsString('"products"."price"', $sql);
        }

        // 2. Assert serialized card payload omits heavy description, dimensional specs, and raw metadata
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Consumer/Shop/Catalog')
            ->has('products.data.0', fn (Assert $item) => $item
                ->where('name', 'Heavy Spec Plate')
                ->where('price', '450.00')
                ->where('seller', 'Terra Forge Pottery')
                ->where('location', 'Bacoor')
                ->missing('description')
                ->missing('gallery_paths')
                ->missing('model_3d_path')
                ->missing('colors')
                ->missing('height')
                ->missing('width')
                ->missing('weight')
                ->etc()
            )
        );
    }

    public function test_desktop_user_agent_defaults_to_24_items_per_page(): void
    {
        for ($i = 1; $i <= 30; $i++) {
            Product::create([
                'user_id' => $this->artisan->id,
                'sku' => "DESK-{$i}",
                'name' => "Desktop Product {$i}",
                'category' => $this->category->name,
                'status' => 'Active',
                'price' => 100 + $i,
                'stock' => 10,
                'sold' => $i,
                'cover_photo_path' => "products/p{$i}.jpg",
            ]);
        }

        $desktopUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

        $response = $this->withHeader('User-Agent', $desktopUa)->get(route('shop.index'));
        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Consumer/Shop/Catalog')
            ->where('products.per_page', 24)
            ->has('products.data', 24)
        );
    }

    public function test_mobile_user_agent_defaults_to_12_items_per_page(): void
    {
        for ($i = 1; $i <= 20; $i++) {
            Product::create([
                'user_id' => $this->artisan->id,
                'sku' => "MOBI-{$i}",
                'name' => "Mobile Product {$i}",
                'category' => $this->category->name,
                'status' => 'Active',
                'price' => 100 + $i,
                'stock' => 10,
                'sold' => $i,
                'cover_photo_path' => "products/p{$i}.jpg",
            ]);
        }

        $mobileUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

        $response = $this->withHeader('User-Agent', $mobileUa)->get(route('shop.index'));
        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Consumer/Shop/Catalog')
            ->where('products.per_page', 12)
            ->has('products.data', 12)
        );
    }

    public function test_sec_ch_ua_mobile_hint_triggers_mobile_pagination(): void
    {
        for ($i = 1; $i <= 20; $i++) {
            Product::create([
                'user_id' => $this->artisan->id,
                'sku' => "HINT-{$i}",
                'name' => "Hint Product {$i}",
                'category' => $this->category->name,
                'status' => 'Active',
                'price' => 100 + $i,
                'stock' => 10,
                'sold' => $i,
                'cover_photo_path' => "products/p{$i}.jpg",
            ]);
        }

        // Even with generic UA, Sec-CH-UA-Mobile '?1' should trigger 12 items
        $response = $this->withHeader('Sec-CH-UA-Mobile', '?1')->get(route('shop.index'));
        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Consumer/Shop/Catalog')
            ->where('products.per_page', 12)
            ->has('products.data', 12)
        );
    }

    public function test_explicit_per_page_override_within_safe_bounds(): void
    {
        for ($i = 1; $i <= 25; $i++) {
            Product::create([
                'user_id' => $this->artisan->id,
                'sku' => "BOUND-{$i}",
                'name' => "Bound Product {$i}",
                'category' => $this->category->name,
                'status' => 'Active',
                'price' => 100 + $i,
                'stock' => 10,
                'sold' => $i,
                'cover_photo_path' => "products/p{$i}.jpg",
            ]);
        }

        // Explicit 15 per page requested
        $response = $this->get(route('shop.index', ['per_page' => 15]));
        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Consumer/Shop/Catalog')
            ->where('products.per_page', 15)
            ->has('products.data', 15)
        );

        // Out-of-bounds requested (e.g. 999 to overwhelm DB) falls back to UA default (24)
        $response = $this->get(route('shop.index', ['per_page' => 999]));
        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Consumer/Shop/Catalog')
            ->where('products.per_page', 24)
            ->has('products.data', 24)
        );
    }

    public function test_soft_deleted_artisan_does_not_crash_catalog_with_trashed_safety(): void
    {
        $product = Product::create([
            'user_id' => $this->artisan->id,
            'sku' => 'TRASH-001',
            'name' => 'Soft Deleted Seller Item',
            'category' => $this->category->name,
            'status' => 'Active',
            'price' => 300,
            'stock' => 5,
            'sold' => 2,
            'cover_photo_path' => 'products/trash.jpg',
        ]);

        // Soft delete the artisan
        $this->artisan->delete();

        // Catalog query should safely load with null-safe operators
        $response = $this->get(route('shop.index'));
        $response->assertOk();

        // Related products on product show should also not crash
        $related = $product->getRelatedProducts();
        $this->assertInstanceOf(\Illuminate\Support\Collection::class, $related);
    }
}

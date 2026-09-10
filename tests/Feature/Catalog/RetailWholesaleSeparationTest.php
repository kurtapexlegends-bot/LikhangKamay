<?php

namespace Tests\Feature\Catalog;

use App\Models\Category;
use App\Models\Product;
use App\Models\SellerComplianceAgreement;
use App\Models\User;
use App\Services\CatalogService;
use Database\Seeders\CategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RetailWholesaleSeparationTest extends TestCase
{
    use RefreshDatabase;

    private User $artisan;
    private Product $retailPottery;
    private Product $b2bRawMaterial;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(CategorySeeder::class);

        $this->artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'shop_name' => 'Artisan Test Studio',
            'city' => 'Cavite',
            'premium_tier' => 'super_premium',
        ]);

        SellerComplianceAgreement::create([
            'user_id' => $this->artisan->id,
            'document_type' => 'seller_terms',
            'accepted_at' => now(),
            'ip_address' => '127.0.0.1',
        ]);

        // Retail product: Handcrafted Ceramic Vase
        $this->retailPottery = Product::factory()->create([
            'user_id' => $this->artisan->id,
            'name' => 'Handcrafted Ceramic Vase',
            'sku' => 'RTL-VSE-001',
            'status' => 'Active',
            'category' => 'Vases & Jars',
            'price' => 750.00,
            'is_b2b_supply' => false,
        ]);

        // B2B Supply product: Dipping Glaze (5 Liters)
        $this->b2bRawMaterial = Product::factory()->create([
            'user_id' => $this->artisan->id,
            'name' => 'Matte Celadon Dipping Glaze 5L',
            'sku' => 'B2B-GLZ-001',
            'status' => 'Active',
            'category' => 'Glazes & Oxides',
            'price' => 1450.00,
            'is_b2b_supply' => true,
            'moq' => 2,
            'wholesale_price' => 1250.00,
            'wholesale_min_qty' => 4,
            'supply_unit' => 'liters',
        ]);
    }

    public function test_consumer_shop_catalog_excludes_b2b_wholesale_supplies(): void
    {
        $response = $this->get(route('shop.index'));
        $response->assertOk();

        $products = $response->viewData('page')['props']['products']['data'];
        $productIds = collect($products)->pluck('id')->all();

        $this->assertContains($this->retailPottery->id, $productIds);
        $this->assertNotContains($this->b2bRawMaterial->id, $productIds);
    }

    public function test_consumer_catalog_metadata_counts_only_retail_products(): void
    {
        $service = new CatalogService();
        $metadata = $service->getCatalogMetadata();

        $categoryCounts = $metadata['categoryCounts'];
        $this->assertArrayHasKey('Vases & Jars', $categoryCounts);
        $this->assertEquals(1, $categoryCounts['Vases & Jars']);

        // Wholesale raw material category should NOT be counted in consumer metadata
        $this->assertArrayNotHasKey('Glazes & Oxides', $categoryCounts);
    }

    public function test_guest_cannot_access_b2b_supply_on_retail_product_page(): void
    {
        // Retail product should be visible (HTTP 200)
        $retailResponse = $this->get(route('product.show', $this->retailPottery->slug));
        $retailResponse->assertOk();

        // B2B supply product should return 404 on retail show route
        $b2bResponse = $this->get(route('product.show', $this->b2bRawMaterial->slug));
        $b2bResponse->assertNotFound();
    }

    public function test_search_suggestions_excludes_b2b_supplies(): void
    {
        $response = $this->getJson(route('api.search.suggestions', ['q' => 'Matte Celadon']));
        $response->assertOk();

        $products = $response->json('products');
        $productIds = collect($products)->pluck('id')->all();

        $this->assertNotContains($this->b2bRawMaterial->id, $productIds);
    }
}

<?php

namespace Tests\Feature\Catalog;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Models\SellerComplianceAgreement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SearchFilterTest extends TestCase
{
    use RefreshDatabase;

    private User $artisan;
    private Category $tableware;
    private Category $drinkware;

    protected function setUp(): void
    {
        parent::setUp();

        $this->artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'shop_name' => 'Earth & Fire Studio',
            'shop_slug' => 'earth-and-fire',
        ]);

        SellerComplianceAgreement::create([
            'user_id' => $this->artisan->id,
            'document_type' => 'seller_terms',
            'accepted_at' => now(),
            'ip_address' => '127.0.0.1',
        ]);

        $this->tableware = Category::create([
            'name' => 'Tableware',
            'slug' => 'tableware',
        ]);

        $this->drinkware = Category::create([
            'name' => 'Drinkware',
            'slug' => 'drinkware',
        ]);
    }

    public function test_search_by_artisan_name_respects_category_filter(): void
    {
        // Tableware product by Earth & Fire Studio
        $plate = Product::factory()->create([
            'user_id' => $this->artisan->id,
            'name' => 'Ceramic Plate',
            'sku' => 'PLT-001',
            'status' => 'Active',
            'category' => $this->tableware->name,
            'price' => 500,
        ]);

        // Drinkware product by Earth & Fire Studio
        $mug = Product::factory()->create([
            'user_id' => $this->artisan->id,
            'name' => 'Clay Mug',
            'sku' => 'MUG-001',
            'status' => 'Active',
            'category' => $this->drinkware->name,
            'price' => 300,
        ]);

        // Search for "Earth" with category filter = "Tableware"
        $response = $this->get(route('shop.index', [
            'search' => 'Earth',
            'category' => 'Tableware',
        ]));

        $response->assertOk();
        $products = $response->viewData('page')['props']['products']['data'];

        $productIds = collect($products)->pluck('id')->all();

        // Must include the plate, but MUST NOT include the mug from Drinkware category!
        $this->assertContains($plate->id, $productIds);
        $this->assertNotContains($mug->id, $productIds);
    }

    public function test_search_suggestions_returns_valid_payload(): void
    {
        Product::factory()->create([
            'user_id' => $this->artisan->id,
            'name' => 'Terracotta Vase',
            'sku' => 'VSE-001',
            'status' => 'Active',
            'category' => $this->tableware->name,
            'cover_photo_path' => 'products/terracotta.jpg',
            'price' => 1200,
        ]);

        $response = $this->getJson(route('api.search.suggestions', ['q' => 'Terracotta']));

        $response->assertOk()
            ->assertJsonStructure([
                'products' => [
                    '*' => ['id', 'name', 'slug', 'price', 'image', 'seller']
                ],
                'artisans' => []
            ]);

        $this->assertNotNull($response->json('products.0.image'));
    }
}

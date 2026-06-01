<?php

namespace Tests\Unit;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Services\CatalogService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class HomepageMerchandisingSourceTest extends TestCase
{
    use RefreshDatabase;

    public function test_homepage_sections_use_the_required_source_order(): void
    {
        $source = file_get_contents(base_path('resources/js/Pages/Consumer/Welcome.jsx'));

        $this->assertNotFalse($source);

        $sponsoredPos = strpos($source, '{/* SPONSORED PRODUCTS SECTION */}');
        $categoriesPos = strpos($source, '{/* CATEGORIES */}');
        $featuredPos = strpos($source, '{/* FEATURED PRODUCTS */}');
        $topSellersPos = strpos($source, '{/* TOP STORES - DSS Dashboard */}');

        $this->assertNotFalse($sponsoredPos);
        $this->assertNotFalse($categoriesPos);
        $this->assertNotFalse($featuredPos);
        $this->assertNotFalse($topSellersPos);

        $this->assertTrue($sponsoredPos < $categoriesPos);
        $this->assertTrue($categoriesPos < $featuredPos);
        $this->assertTrue($featuredPos < $topSellersPos);
    }

    public function test_homepage_gives_sponsored_products_visual_priority(): void
    {
        $source = file_get_contents(base_path('resources/js/Pages/Consumer/Welcome.jsx'));

        $this->assertNotFalse($source);
        $this->assertStringContainsString('Sponsored Collection', $source);
        $this->assertStringContainsString('order-1 relative overflow-hidden rounded-2xl', $source);
        $this->assertStringContainsString('bg-gradient-to-r from-amber-50/60 via-white to-clay-50/30', $source);
        $this->assertStringContainsString("data-sponsored-placement={sponsoredPlacement}", $source);
    }

    /**
     * Test caching behavior: query performance, cache hits, and eviction on product modifications.
     */
    public function test_homepage_merchandising_queries_are_cached_and_evicted(): void
    {
        Cache::clear();

        $seller = User::factory()->artisanApproved()->create([
            'shop_name' => 'Artisan Pottery Inc.',
            'city' => 'Manila',
        ]);

        $seller->complianceAgreements()->create([
            'document_type' => 'seller_terms',
            'accepted_at' => now(),
        ]);

        Product::forceCreate([
            'user_id' => $seller->id,
            'sku' => 'TEST-001',
            'name' => 'Clay Mug',
            'category' => 'Mugs',
            'status' => 'Active',
            'price' => 150.00,
            'stock' => 10,
            'sold' => 15,
            'rating' => 4.50,
            'reviews_count' => 5,
        ]);

        $service = new CatalogService();

        // 1. Initial invocation (should trigger database queries)
        DB::enableQueryLog();
        DB::flushQueryLog();

        $sponsored = $service->getSponsoredProducts();
        $featured = $service->getFeaturedProducts();
        $topSellers = $service->getTopSellers();
        $categories = $service->getCategories();

        $initialQueriesCount = count(DB::getQueryLog());
        $this->assertTrue($initialQueriesCount > 0, 'Database queries should be run on initial load.');

        // 2. Second invocation (should hit cache, resulting in 0 database queries)
        DB::flushQueryLog();

        $service->getSponsoredProducts();
        $service->getFeaturedProducts();
        $service->getTopSellers();
        $service->getCategories();

        $secondQueriesCount = count(DB::getQueryLog());
        $this->assertEquals(0, $secondQueriesCount, 'Merchandising data must be fetched from cache on secondary loads.');

        // 3. Clear cache via model updates (should trigger eviction)
        DB::flushQueryLog();

        $newProduct = Product::forceCreate([
            'user_id' => $seller->id,
            'sku' => 'TEST-002',
            'name' => 'Porcelain Bowl',
            'category' => 'Bowls',
            'status' => 'Active',
            'price' => 450.00,
            'stock' => 5,
            'sold' => 20,
            'rating' => 4.80,
            'reviews_count' => 10,
        ]);

        // Evicted cache means queries must be re-run on subsequent invocation
        $service->getSponsoredProducts();
        $service->getFeaturedProducts();
        $service->getTopSellers();
        $service->getCategories();

        $afterEvictionQueriesCount = count(DB::getQueryLog());
        $this->assertTrue($afterEvictionQueriesCount > 0, 'Database queries should run again after cache is evicted via model saved.');

        // 4. Test cache eviction on model delete
        DB::flushQueryLog();
        
        $service->getSponsoredProducts();
        $service->getFeaturedProducts();
        $service->getTopSellers();
        $service->getCategories();
        
        $this->assertEquals(0, count(DB::getQueryLog()), 'Cache is active again.');

        $newProduct->delete();

        DB::flushQueryLog();
        $service->getSponsoredProducts();
        $service->getFeaturedProducts();
        $service->getTopSellers();
        $service->getCategories();

        $this->assertTrue(count(DB::getQueryLog()) > 0, 'Database queries should run again after cache is evicted via model deleted.');

        DB::disableQueryLog();
    }

    /**
     * Test multi-layered tie-breaking sorting logic for catalog searching.
     */
    public function test_multi_layered_tie_breaking_sorting(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'shop_name' => 'Sorting Studio',
            'city' => 'Cebu',
        ]);

        $seller->complianceAgreements()->create([
            'document_type' => 'seller_terms',
            'accepted_at' => now(),
        ]);

        // Clean slate
        Product::query()->delete();

        // Setup products for Popularity Sort testing
        // Sort priority: sold DESC -> rating DESC -> created_at DESC
        $popA = Product::forceCreate([
            'user_id' => $seller->id, 'sku' => 'POP-A', 'name' => 'Vase A',
            'category' => 'Vases', 'status' => 'Active', 'price' => 100,
            'stock' => 10, 'sold' => 10, 'rating' => 4.5,
        ]);
        $popA->created_at = now()->subMinutes(10);
        $popA->save();

        $popB = Product::forceCreate([
            'user_id' => $seller->id, 'sku' => 'POP-B', 'name' => 'Vase B',
            'category' => 'Vases', 'status' => 'Active', 'price' => 100,
            'stock' => 10, 'sold' => 10, 'rating' => 4.8,
        ]);
        $popB->created_at = now()->subMinutes(5);
        $popB->save();

        $popC = Product::forceCreate([
            'user_id' => $seller->id, 'sku' => 'POP-C', 'name' => 'Vase C',
            'category' => 'Vases', 'status' => 'Active', 'price' => 100,
            'stock' => 10, 'sold' => 10, 'rating' => 4.8,
        ]);
        $popC->created_at = now()->subMinutes(2);
        $popC->save();

        $popD = Product::forceCreate([
            'user_id' => $seller->id, 'sku' => 'POP-D', 'name' => 'Vase D',
            'category' => 'Vases', 'status' => 'Active', 'price' => 100,
            'stock' => 10, 'sold' => 5, 'rating' => 5.0,
        ]);
        $popD->created_at = now()->subMinutes(1);
        $popD->save();

        $service = new CatalogService();

        // Popularity: sold DESC -> rating DESC -> created_at DESC
        // Expected order: Vase C (10 sold, 4.8 rat, newer) -> Vase B (10 sold, 4.8 rat, older) -> Vase A (10 sold, 4.5 rat) -> Vase D (5 sold)
        $popularResult = $service->buildCatalogQuery(['sort' => 'popular'])->get();
        $this->assertEquals($popC->id, $popularResult[0]->id);
        $this->assertEquals($popB->id, $popularResult[1]->id);
        $this->assertEquals($popA->id, $popularResult[2]->id);
        $this->assertEquals($popD->id, $popularResult[3]->id);

        // Clean slate
        Product::query()->delete();

        // Setup products for Rating Sort testing
        // Sort priority: rating DESC -> sold DESC -> created_at DESC
        $ratA = Product::forceCreate([
            'user_id' => $seller->id, 'sku' => 'RAT-A', 'name' => 'Plate A',
            'category' => 'Plates', 'status' => 'Active', 'price' => 100,
            'stock' => 10, 'sold' => 20, 'rating' => 4.5,
        ]);
        $ratA->created_at = now()->subMinutes(10);
        $ratA->save();

        $ratB = Product::forceCreate([
            'user_id' => $seller->id, 'sku' => 'RAT-B', 'name' => 'Plate B',
            'category' => 'Plates', 'status' => 'Active', 'price' => 100,
            'stock' => 10, 'sold' => 20, 'rating' => 4.5,
        ]);
        $ratB->created_at = now()->subMinutes(5);
        $ratB->save();

        $ratC = Product::forceCreate([
            'user_id' => $seller->id, 'sku' => 'RAT-C', 'name' => 'Plate C',
            'category' => 'Plates', 'status' => 'Active', 'price' => 100,
            'stock' => 10, 'sold' => 10, 'rating' => 4.5,
        ]);
        $ratC->created_at = now()->subMinutes(2);
        $ratC->save();

        $ratD = Product::forceCreate([
            'user_id' => $seller->id, 'sku' => 'RAT-D', 'name' => 'Plate D',
            'category' => 'Plates', 'status' => 'Active', 'price' => 100,
            'stock' => 10, 'sold' => 100, 'rating' => 4.0,
        ]);
        $ratD->created_at = now()->subMinutes(1);
        $ratD->save();

        // Rating: rating DESC -> sold DESC -> created_at DESC
        // Expected order: Plate B (4.5 rating, 20 sold, newer) -> Plate A (4.5 rating, 20 sold, older) -> Plate C (4.5 rating, 10 sold) -> Plate D (4.0 rating)
        $ratingResult = $service->buildCatalogQuery(['sort' => 'rating'])->get();
        $this->assertEquals($ratB->id, $ratingResult[0]->id);
        $this->assertEquals($ratA->id, $ratingResult[1]->id);
        $this->assertEquals($ratC->id, $ratingResult[2]->id);
        $this->assertEquals($ratD->id, $ratingResult[3]->id);

        // Clean slate
        Product::query()->delete();

        // Setup products for Date/Newest Sort testing
        // Sort priority: created_at DESC -> sold DESC -> rating DESC
        $now = now();
        $dateA = Product::forceCreate([
            'user_id' => $seller->id, 'sku' => 'DATE-A', 'name' => 'Bowl A',
            'category' => 'Bowls', 'status' => 'Active', 'price' => 100,
            'stock' => 10, 'sold' => 10, 'rating' => 4.5,
        ]);
        $dateA->created_at = $now;
        $dateA->save();

        $dateB = Product::forceCreate([
            'user_id' => $seller->id, 'sku' => 'DATE-B', 'name' => 'Bowl B',
            'category' => 'Bowls', 'status' => 'Active', 'price' => 100,
            'stock' => 10, 'sold' => 10, 'rating' => 4.0,
        ]);
        $dateB->created_at = $now;
        $dateB->save();

        $dateC = Product::forceCreate([
            'user_id' => $seller->id, 'sku' => 'DATE-C', 'name' => 'Bowl C',
            'category' => 'Bowls', 'status' => 'Active', 'price' => 100,
            'stock' => 10, 'sold' => 5, 'rating' => 5.0,
        ]);
        $dateC->created_at = $now;
        $dateC->save();

        $dateD = Product::forceCreate([
            'user_id' => $seller->id, 'sku' => 'DATE-D', 'name' => 'Bowl D',
            'category' => 'Bowls', 'status' => 'Active', 'price' => 100,
            'stock' => 10, 'sold' => 100, 'rating' => 5.0,
        ]);
        $dateD->created_at = $now->copy()->subHour();
        $dateD->save();

        // Newest: created_at DESC -> sold DESC -> rating DESC
        // Expected order: Bowl A (now, 10 sold, 4.5 rating) -> Bowl B (now, 10 sold, 4.0 rating) -> Bowl C (now, 5 sold) -> Bowl D (older)
        $newestResult = $service->buildCatalogQuery(['sort' => 'newest'])->get();
        $this->assertEquals($dateA->id, $newestResult[0]->id);
        $this->assertEquals($dateB->id, $newestResult[1]->id);
        $this->assertEquals($dateC->id, $newestResult[2]->id);
        $this->assertEquals($dateD->id, $newestResult[3]->id);
    }
}

<?php

namespace Tests\Feature\Catalog;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Services\CatalogService;
use Database\Seeders\CategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class MarketplaceCategoriesTest extends TestCase
{
    use RefreshDatabase;

    public function test_category_seeder_populates_all_seven_standard_categories(): void
    {
        $this->seed(CategorySeeder::class);

        $categories = Category::all();
        $this->assertCount(7, $categories);

        $slugs = $categories->pluck('slug')->all();
        $this->assertContains('tableware', $slugs);
        $this->assertContains('drinkware', $slugs);
        $this->assertContains('vases-jars', $slugs);
        $this->assertContains('planters-pots', $slugs);
        $this->assertContains('home-decor', $slugs);
        $this->assertContains('kitchenware', $slugs);
        $this->assertContains('artisan-sets', $slugs);

        foreach ($categories as $cat) {
            $this->assertNotNull($cat->icon, "Category {$cat->name} should have an icon assigned");
        }
    }

    public function test_home_page_receives_all_categories_with_icons(): void
    {
        $this->seed(CategorySeeder::class);

        $response = $this->get(route('home'));
        $response->assertOk();

        $categories = $response->viewData('page')['props']['categories'];
        $this->assertCount(7, $categories);

        $names = collect($categories)->pluck('name')->all();
        $this->assertContains('Tableware', $names);
        $this->assertContains('Drinkware', $names);
        $this->assertContains('Vases & Jars', $names);
        $this->assertContains('Planters & Pots', $names);
        $this->assertContains('Home Decor', $names);
        $this->assertContains('Kitchenware', $names);
        $this->assertContains('Artisan Sets', $names);
    }

    public function test_category_cache_is_invalidated_when_category_changes(): void
    {
        $this->seed(CategorySeeder::class);

        $service = new CatalogService();
        $cached = $service->getCategories();
        $this->assertCount(7, $cached);

        // Add a new category
        $newCat = Category::create([
            'name' => 'Textiles & Rugs',
            'slug' => 'textiles-rugs',
            'icon' => 'Tag',
        ]);

        // Cache must have been forgotten by the model hook
        $this->assertNull(Cache::get('home_categories'));

        $fresh = $service->getCategories();
        $this->assertCount(8, $fresh);

        // Delete category
        $newCat->delete();
        $this->assertNull(Cache::get('home_categories'));

        $afterDelete = $service->getCategories();
        $this->assertCount(7, $afterDelete);
    }
}

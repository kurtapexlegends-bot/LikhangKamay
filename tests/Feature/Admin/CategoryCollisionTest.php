<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryCollisionTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_delete_empty_category(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $category = Category::create(['name' => 'Ceramics', 'slug' => 'ceramics']);

        $this->actingAs($admin)
            ->delete(route('admin.taxonomy.destroy', $category->id))
            ->assertRedirect();

        $this->assertSoftDeleted($category);
    }

    public function test_super_admin_cannot_delete_category_with_products(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $category = Category::create(['name' => 'Ceramics', 'slug' => 'ceramics']);

        $seller = User::factory()->artisanApproved()->create();
        $this->makeProduct($seller, [
            'category' => 'Ceramics'
        ]);

        $this->actingAs($admin)
            ->delete(route('admin.taxonomy.destroy', $category->id))
            ->assertSessionHas('error');

        $this->assertDatabaseHas('categories', ['id' => $category->id, 'deleted_at' => null]);
    }

    public function test_creating_category_with_same_name_as_deleted_resolves_collision(): void
    {
        $admin = User::factory()->superAdmin()->create();
        
        // 1. Create and delete category
        $category = Category::create(['name' => 'Ceramics', 'slug' => 'ceramics']);
        $category->delete(); // Soft delete
        $this->assertSoftDeleted($category);

        // 2. Try creating a new category with the same name
        $this->actingAs($admin)
            ->post(route('admin.taxonomy.store'), ['name' => 'Ceramics'])
            ->assertRedirect();

        // 3. Verify old soft-deleted category is permanently deleted (force-deleted)
        $this->assertDatabaseMissing('categories', ['id' => $category->id]);

        // 4. Verify new category exists
        $newCategory = Category::where('name', 'Ceramics')->first();
        $this->assertNotNull($newCategory);
        $this->assertNull($newCategory->deleted_at);
    }

    public function test_renaming_category_to_same_name_as_deleted_resolves_collision(): void
    {
        $admin = User::factory()->superAdmin()->create();
        
        // 1. Create and delete category
        $deletedCategory = Category::create(['name' => 'Old Clay', 'slug' => 'old-clay']);
        $deletedCategory->delete(); // Soft delete
        $this->assertSoftDeleted($deletedCategory);

        // 2. Create another category to rename
        $currentCategory = Category::create(['name' => 'New Clay', 'slug' => 'new-clay']);

        // 3. Rename currentCategory to the name of the deleted category via PATCH
        $this->actingAs($admin)
            ->patch(route('admin.taxonomy.update', $currentCategory->id), ['name' => 'Old Clay'])
            ->assertRedirect();

        // 4. Verify deletedCategory is permanently deleted
        $this->assertDatabaseMissing('categories', ['id' => $deletedCategory->id]);

        // 5. Verify currentCategory was renamed
        $this->assertEquals('Old Clay', $currentCategory->fresh()->name);
        $this->assertEquals('old-clay', $currentCategory->fresh()->slug);
    }

    private function makeProduct(User $seller, array $overrides = []): Product
    {
        return Product::create(array_merge([
            'user_id' => $seller->id,
            'sku' => 'CATALOG-' . strtoupper(fake()->unique()->bothify('??###')),
            'name' => 'Test Product',
            'description' => 'Test description.',
            'category' => 'Ceramics',
            'status' => 'Active',
            'clay_type' => 'Stoneware',
            'glaze_type' => 'Glossy',
            'firing_method' => 'High Fire',
            'price' => 150,
            'cost_price' => 50,
            'stock' => 10,
            'sold' => 0,
            'lead_time' => '3 days',
        ], $overrides));
    }
}

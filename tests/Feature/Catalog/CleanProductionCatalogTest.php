<?php

namespace Tests\Feature\Catalog;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CleanProductionCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalog_clean_command_archives_test_and_flawed_products(): void
    {
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'shop_name' => 'Kapwa Ceramics',
        ]);

        $flawedCup = Product::factory()->create([
            'user_id' => $artisan->id,
            'sku' => 'KAPWA-MUG-004',
            'name' => 'Rustic Stoneware Espresso Cup',
            'category' => 'Drinkware',
            'price' => 260,
            'status' => 'Active',
        ]);

        $syntheticBamboo = Product::factory()->create([
            'user_id' => $artisan->id,
            'sku' => 'TEST-BAMBOO-01',
            'name' => 'E2E Synthetic ₱1 Bamboo Cup',
            'category' => 'Drinkware',
            'price' => 1,
            'status' => 'Active',
        ]);

        $informalVase = Product::factory()->create([
            'user_id' => $artisan->id,
            'sku' => 'CUSTOM-VASE-001',
            'name' => 'VASE NA BLUE GALING ETIVAC',
            'category' => 'Vases & Jars',
            'price' => 500,
            'status' => 'Active',
        ]);

        $authenticMug = Product::factory()->create([
            'user_id' => $artisan->id,
            'sku' => 'KAPWA-MUG-001',
            'name' => 'Speckled Ceramic Studio Mug',
            'category' => 'Drinkware',
            'price' => 340,
            'status' => 'Active',
        ]);

        $this->artisan('catalog:clean-test-data')
            ->assertExitCode(0);

        // Flawed and test products must be soft-deleted and marked Archived
        $this->assertSoftDeleted('products', ['id' => $flawedCup->id]);
        $this->assertSame('Archived', $flawedCup->fresh()->status);

        $this->assertSoftDeleted('products', ['id' => $syntheticBamboo->id]);
        $this->assertSame('Archived', $syntheticBamboo->fresh()->status);

        $this->assertSoftDeleted('products', ['id' => $informalVase->id]);
        $this->assertSame('Archived', $informalVase->fresh()->status);

        // Authentic product must remain untouched and active
        $this->assertNull($authenticMug->fresh()->deleted_at);
        $this->assertSame('Active', $authenticMug->fresh()->status);
    }
}

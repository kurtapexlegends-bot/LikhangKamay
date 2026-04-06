<?php

namespace Tests\Feature\Seller;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ThreeDModelUploadValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_store_accepts_glb_file_with_generic_mime_type(): void
    {
        Storage::fake('public');

        $seller = User::factory()->artisanApproved()->create();

        $response = $this->actingAs($seller)->post(route('products.store'), [
            'sku' => 'LK-GLB1',
            'name' => 'Test Vase',
            'category' => 'Vases & Jars',
            'price' => 200,
            'stock' => 10,
            'status' => 'Active',
            'model_3d' => UploadedFile::fake()->create('test-model.glb', 100, 'application/octet-stream'),
        ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors(['model_3d']);

        $product = Product::where('sku', 'LK-GLB1')->firstOrFail();

        $this->assertNotNull($product->model_3d_path);
        Storage::disk('public')->assertExists($product->model_3d_path);
    }

    public function test_product_update_accepts_gltf_file_with_json_mime_type(): void
    {
        Storage::fake('public');

        $seller = User::factory()->artisanApproved()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'LK-GLTF1',
            'name' => 'Update Test Vase',
            'description' => '',
            'category' => 'Vases & Jars',
            'price' => 180,
            'cost_price' => 0,
            'stock' => 5,
            'lead_time' => 3,
            'status' => 'Draft',
        ]);

        $response = $this->actingAs($seller)->post(route('products.update', $product->id), [
            'name' => 'Updated Test Vase',
            'description' => '',
            'category' => 'Vases & Jars',
            'price' => 180,
            'cost_price' => 0,
            'stock' => 5,
            'status' => 'Active',
            'model_3d' => UploadedFile::fake()->create('replacement-model.gltf', 100, 'application/json'),
        ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors(['model_3d']);

        $product->refresh();

        $this->assertNotNull($product->model_3d_path);
        Storage::disk('public')->assertExists($product->model_3d_path);
    }

    public function test_three_d_manager_upload_accepts_gltf_file_with_json_mime_type(): void
    {
        Storage::fake('public');

        $seller = User::factory()->artisanApproved()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'LK-3DM1',
            'name' => '3D Manager Test Vase',
            'description' => '',
            'category' => 'Vases & Jars',
            'price' => 220,
            'cost_price' => 0,
            'stock' => 7,
            'lead_time' => 3,
            'status' => 'Draft',
        ]);

        $response = $this->actingAs($seller)->post(route('3d.upload'), [
            'product_id' => $product->id,
            'model' => UploadedFile::fake()->create('manager-model.gltf', 100, 'application/json'),
        ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors(['model']);

        $product->refresh();

        $this->assertNotNull($product->model_3d_path);
        Storage::disk('public')->assertExists($product->model_3d_path);
    }
}

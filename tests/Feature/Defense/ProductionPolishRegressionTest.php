<?php

namespace Tests\Feature\Defense;

use App\Models\Product;
use App\Models\User;
use App\Support\NotificationPresenter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductionPolishRegressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_new_message_notification_url_is_normalized_to_buyer_chat(): void
    {
        $buyer = User::factory()->create([
            'role' => 'buyer',
        ]);
        $seller = User::factory()->artisanApproved()->create();

        $payload = NotificationPresenter::resolveUrl([
            'type' => 'new_message',
            'sender_id' => $seller->id,
            'url' => route('chat.index', ['user_id' => $seller->id]),
        ], $buyer);

        $this->assertSame(route('buyer.chat', ['user_id' => $seller->id]), $payload);
    }

    public function test_artisan_application_notification_url_uses_the_pending_artisans_route(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $payload = NotificationPresenter::resolveUrl([
            'type' => 'artisan_application',
            'url' => '/admin/artisans/pending',
        ], $admin);

        $this->assertSame(route('admin.pending'), $payload);
    }

    public function test_three_d_delete_route_accepts_numeric_product_id_binding(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'SKU-3D-DELETE-1',
            'name' => '3D Delete Product',
            'description' => 'Product with 3D asset',
            'category' => 'Pottery',
            'status' => 'Active',
            'price' => 149.00,
            'stock' => 5,
            'lead_time' => 2,
            'model_3d_path' => 'products/models/example.glb',
        ]);

        $response = $this->actingAs($seller)
            ->delete(route('3d.destroy', $product->id));

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertNull($product->fresh()->model_3d_path);
        $this->assertSame('Draft', $product->fresh()->status);
    }
}

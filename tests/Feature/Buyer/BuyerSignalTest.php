<?php

namespace Tests\Feature\Buyer;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BuyerSignalTest extends TestCase
{
    use RefreshDatabase;

    private User $buyer;
    private User $artisan;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buyer = User::factory()->create([
            'role' => 'buyer',
        ]);

        $this->artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'shop_name' => 'Artisan Pottery',
            'shop_slug' => 'artisan-pottery',
        ]);

        $category = Category::create([
            'name' => 'Tableware',
            'slug' => 'tableware',
        ]);

        $this->product = Product::factory()->create([
            'user_id' => $this->artisan->id,
            'sku' => 'SKU-' . rand(10000, 99999),
            'name' => 'Artisan Clay Vase',
            'price' => 750,
            'status' => 'Active',
            'category' => $category->name,
        ]);
    }

    public function test_guest_cannot_toggle_wishlist(): void
    {
        $response = $this->postJson(route('buyer.wishlist.toggle'), [
            'product_id' => $this->product->id,
        ]);

        $response->assertStatus(401);
    }

    public function test_authenticated_buyer_can_toggle_wishlist_in_database(): void
    {
        // Add to wishlist
        $response = $this->actingAs($this->buyer)
            ->postJson(route('buyer.wishlist.toggle'), [
                'product_id' => $this->product->id,
            ]);

        $response->assertOk()
            ->assertJson(['success' => true, 'is_wishlisted' => true]);

        $this->assertDatabaseHas('wishlists', [
            'user_id' => $this->buyer->id,
            'product_id' => $this->product->id,
        ]);

        // Remove from wishlist
        $response2 = $this->actingAs($this->buyer)
            ->postJson(route('buyer.wishlist.toggle'), [
                'product_id' => $this->product->id,
            ]);

        $response2->assertOk()
            ->assertJson(['success' => true, 'is_wishlisted' => false]);

        $this->assertDatabaseMissing('wishlists', [
            'user_id' => $this->buyer->id,
            'product_id' => $this->product->id,
        ]);
    }

    public function test_authenticated_buyer_can_toggle_follow_shop_in_database(): void
    {
        // Follow shop
        $response = $this->actingAs($this->buyer)
            ->postJson(route('buyer.shops.toggle-follow'), [
                'shop_id' => $this->artisan->id,
            ]);

        $response->assertOk()
            ->assertJson(['success' => true, 'is_followed' => true]);

        $this->assertDatabaseHas('followed_shops', [
            'user_id' => $this->buyer->id,
            'shop_id' => $this->artisan->id,
        ]);

        // Unfollow shop
        $response2 = $this->actingAs($this->buyer)
            ->postJson(route('buyer.shops.toggle-follow'), [
                'shop_id' => $this->artisan->id,
            ]);

        $response2->assertOk()
            ->assertJson(['success' => true, 'is_followed' => false]);

        $this->assertDatabaseMissing('followed_shops', [
            'user_id' => $this->buyer->id,
            'shop_id' => $this->artisan->id,
        ]);
    }

    public function test_buyer_can_sync_guest_signals_on_login(): void
    {
        $response = $this->actingAs($this->buyer)
            ->postJson(route('buyer.signals.sync'), [
                'product_ids' => [$this->product->id],
                'shop_ids' => [$this->artisan->id],
            ]);

        $response->assertOk()
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('wishlists', [
            'user_id' => $this->buyer->id,
            'product_id' => $this->product->id,
        ]);

        $this->assertDatabaseHas('followed_shops', [
            'user_id' => $this->buyer->id,
            'shop_id' => $this->artisan->id,
        ]);
    }

    public function test_buyer_can_clear_wishlist_and_followed_shops(): void
    {
        $this->actingAs($this->buyer)->postJson(route('buyer.signals.sync'), [
            'product_ids' => [$this->product->id],
            'shop_ids' => [$this->artisan->id],
        ]);

        // Clear wishlist
        $this->actingAs($this->buyer)->deleteJson(route('buyer.wishlist.clear'))->assertOk();
        $this->assertDatabaseMissing('wishlists', ['user_id' => $this->buyer->id]);

        // Clear followed shops
        $this->actingAs($this->buyer)->deleteJson(route('buyer.shops.clear-followed'))->assertOk();
        $this->assertDatabaseMissing('followed_shops', ['user_id' => $this->buyer->id]);
    }
}

<?php

namespace Tests\Feature\Reviews;

use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReplacementReviewManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_normal_completed_order_review_creation_still_works_for_standard_orders(): void
    {
        [$buyer, $product] = $this->createCompletedPurchase();

        $this->actingAs($buyer)
            ->post(route('reviews.store'), [
                'product_id' => $product->id,
                'rating' => 4,
                'comment' => 'Nicely packed and arrived in great condition.',
            ])
            ->assertSessionHas('success', 'Review submitted successfully!');

        $this->assertDatabaseHas('reviews', [
            'user_id' => $buyer->id,
            'product_id' => $product->id,
            'rating' => 4,
            'comment' => 'Nicely packed and arrived in great condition.',
        ]);
    }

    public function test_review_update_is_blocked_before_replacement_resolution(): void
    {
        [$buyer, $product] = $this->createCompletedPurchase();

        $review = Review::create([
            'user_id' => $buyer->id,
            'product_id' => $product->id,
            'rating' => 2,
            'comment' => 'Initial damaged delivery.',
            'photos' => [],
        ]);

        $this->actingAs($buyer)
            ->patch(route('reviews.update', $review->id), [
                'rating' => 4,
                'comment' => 'Trying to edit too early.',
            ])
            ->assertForbidden();
    }

    public function test_review_delete_is_blocked_before_replacement_resolution(): void
    {
        [$buyer, $product] = $this->createCompletedPurchase();

        $review = Review::create([
            'user_id' => $buyer->id,
            'product_id' => $product->id,
            'rating' => 1,
            'comment' => 'Broken item.',
            'photos' => [],
        ]);

        $this->actingAs($buyer)
            ->delete(route('reviews.destroy', $review->id))
            ->assertForbidden();

        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
        ]);
    }

    public function test_review_update_is_allowed_after_resolved_replacement_for_same_product(): void
    {
        [$buyer, $product] = $this->createCompletedPurchase();

        $review = Review::create([
            'user_id' => $buyer->id,
            'product_id' => $product->id,
            'rating' => 1,
            'comment' => 'Damaged on first delivery.',
            'photos' => [],
        ]);

        $this->createResolvedReplacementOrder($buyer, $product);

        $this->actingAs($buyer)
            ->from(route('my-orders.index'))
            ->patch(route('reviews.update', $review->id), [
                'rating' => 4,
                'comment' => 'Seller replaced it and handled the issue well.',
            ])
            ->assertRedirect(route('my-orders.index', absolute: false))
            ->assertSessionHas('success', 'Review updated successfully!');

        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'rating' => 4,
            'comment' => 'Seller replaced it and handled the issue well.',
        ]);
    }

    public function test_review_delete_is_allowed_after_resolved_replacement_for_same_product(): void
    {
        [$buyer, $product] = $this->createCompletedPurchase();

        $review = Review::create([
            'user_id' => $buyer->id,
            'product_id' => $product->id,
            'rating' => 1,
            'comment' => 'Damaged on first delivery.',
            'photos' => [],
        ]);

        $this->createResolvedReplacementOrder($buyer, $product);

        $this->actingAs($buyer)
            ->from(route('my-orders.index'))
            ->delete(route('reviews.destroy', $review->id))
            ->assertRedirect(route('my-orders.index', absolute: false))
            ->assertSessionHas('success', 'Review deleted successfully.');

        $this->assertDatabaseMissing('reviews', [
            'id' => $review->id,
        ]);
    }

    private function createCompletedPurchase(): array
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'REVIEW-' . strtoupper(substr(uniqid(), -8)),
            'name' => 'Review Test Vase',
            'description' => 'Review management test product.',
            'category' => 'Vases',
            'status' => 'Active',
            'price' => 350,
            'cost_price' => 120,
            'stock' => 12,
            'sold' => 4,
            'lead_time' => '3 days',
            'cover_photo_path' => 'products/review-test-vase.jpg',
        ]);

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-REVIEW-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 350,
            'convenience_fee_amount' => 20,
            'platform_commission_amount' => 17.5,
            'seller_net_amount' => 332.5,
            'total_amount' => 370,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => '123 Review Street',
            'shipping_method' => 'Delivery',
            'received_at' => now()->subDay(),
            'warranty_expires_at' => now()->addDay(),
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant' => 'Standard',
            'price' => 350,
            'cost' => 120,
            'quantity' => 1,
            'product_img' => 'products/review-test-vase.jpg',
        ]);

        return [$buyer, $product, $order];
    }

    private function createResolvedReplacementOrder(User $buyer, Product $product): Order
    {
        $seller = User::findOrFail($product->user_id);

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-REPLACE-REVIEW-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 350,
            'convenience_fee_amount' => 20,
            'platform_commission_amount' => 17.5,
            'seller_net_amount' => 332.5,
            'total_amount' => 370,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => '123 Replacement Review Street',
            'shipping_method' => 'Delivery',
            'replacement_resolution_description' => 'Seller replaced the damaged item and reinforced the packaging.',
            'replacement_started_at' => now()->subDays(2),
            'replacement_resolved_at' => now()->subDay(),
            'received_at' => now()->subDay(),
            'warranty_expires_at' => now()->addDay(),
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant' => 'Standard',
            'price' => 350,
            'cost' => 120,
            'quantity' => 1,
            'product_img' => 'products/review-test-vase.jpg',
        ]);

        return $order;
    }
}

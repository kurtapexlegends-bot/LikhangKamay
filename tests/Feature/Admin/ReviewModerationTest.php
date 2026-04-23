<?php

namespace Tests\Feature\Admin;

use App\Models\Product;
use App\Models\Review;
use App\Models\ReviewDispute;
use App\Models\User;
use App\Notifications\ReviewModerationStatusNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReviewModerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_view_review_moderation_queue(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $seller = User::factory()->artisanApproved()->create(['shop_name' => 'Clay House']);
        $buyer = User::factory()->create(['role' => 'buyer']);

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'SKU-REVIEW-MOD-001',
            'name' => 'Studio Vase',
            'description' => 'Handmade vase',
            'category' => 'Vases & Jars',
            'status' => 'Active',
            'price' => 899,
            'cost_price' => 300,
            'stock' => 8,
            'sold' => 4,
            'lead_time' => 3,
            'cover_photo_path' => 'products/studio-vase.jpg',
            'slug' => 'studio-vase',
        ]);

        $review = Review::create([
            'user_id' => $buyer->id,
            'product_id' => $product->id,
            'rating' => 1,
            'comment' => 'Needs moderation.',
        ]);

        ReviewDispute::create([
            'review_id' => $review->id,
            'seller_owner_id' => $seller->id,
            'reported_by_user_id' => $seller->id,
            'status' => 'pending',
            'reason' => 'Misleading review',
            'details' => 'Review does not match the delivered item.',
        ]);

        $this->actingAs($admin)
            ->get(route('admin.review-moderation'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/ReviewModeration')
                ->where('disputes.0.shop_name', 'Clay House')
                ->where('disputes.0.product_name', 'Studio Vase')
                ->where('disputes.0.status', 'pending')
            );
    }

    public function test_super_admin_can_update_review_moderation_status(): void
    {
        Notification::fake();

        $admin = User::factory()->superAdmin()->create();
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'SKU-REVIEW-MOD-002',
            'name' => 'Clay Plate',
            'description' => 'Handmade plate',
            'category' => 'Dinnerware',
            'status' => 'Active',
            'price' => 599,
            'cost_price' => 210,
            'stock' => 12,
            'sold' => 3,
            'lead_time' => 3,
            'cover_photo_path' => 'products/clay-plate.jpg',
            'slug' => 'clay-plate',
        ]);

        $review = Review::create([
            'user_id' => $buyer->id,
            'product_id' => $product->id,
            'rating' => 2,
            'comment' => 'This is not accurate.',
            'is_pinned' => true,
        ]);

        $dispute = ReviewDispute::create([
            'review_id' => $review->id,
            'seller_owner_id' => $seller->id,
            'reported_by_user_id' => $seller->id,
            'status' => 'pending',
            'reason' => 'Misleading review',
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.review-moderation.update', $dispute), [
                'status' => 'resolved',
                'resolution_notes' => 'Reviewed and closed by admin.',
            ])
            ->assertSessionHas('success', 'Moderation request updated.');

        $this->assertDatabaseHas('review_disputes', [
            'id' => $dispute->id,
            'status' => 'resolved',
            'resolution_notes' => 'Reviewed and closed by admin.',
        ]);

        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'is_hidden_from_marketplace' => true,
            'is_pinned' => false,
        ]);

        Notification::assertSentTo(
            $buyer,
            ReviewModerationStatusNotification::class,
            fn (ReviewModerationStatusNotification $notification) => $notification->toArray($buyer)['hidden_from_marketplace'] === true
        );

        $this->get(route('product.show', $product->slug))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Shop/ProductShow')
                ->has('product.reviews', 0)
                ->where('product.reviews_count', 0)
                ->where('product.rating', 0)
            );
    }

    public function test_rejected_review_moderation_request_keeps_review_visible_to_buyers(): void
    {
        Notification::fake();

        $admin = User::factory()->superAdmin()->create();
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'SKU-REVIEW-MOD-003',
            'name' => 'Clay Pitcher',
            'description' => 'Handmade pitcher',
            'category' => 'Drinkware',
            'status' => 'Active',
            'price' => 799,
            'cost_price' => 250,
            'stock' => 10,
            'sold' => 5,
            'lead_time' => 3,
            'cover_photo_path' => 'products/clay-pitcher.jpg',
            'slug' => 'clay-pitcher',
        ]);

        $review = Review::create([
            'user_id' => $buyer->id,
            'product_id' => $product->id,
            'rating' => 4,
            'comment' => 'Helpful review that should stay visible.',
        ]);

        $dispute = ReviewDispute::create([
            'review_id' => $review->id,
            'seller_owner_id' => $seller->id,
            'reported_by_user_id' => $seller->id,
            'status' => 'under_review',
            'reason' => 'Misleading review',
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.review-moderation.update', $dispute), [
                'status' => 'rejected',
                'resolution_notes' => 'Review stays visible.',
            ])
            ->assertSessionHas('success', 'Moderation request updated.');

        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'is_hidden_from_marketplace' => false,
        ]);

        Notification::assertSentTo(
            $buyer,
            ReviewModerationStatusNotification::class,
            fn (ReviewModerationStatusNotification $notification) => $notification->toArray($buyer)['hidden_from_marketplace'] === false
        );

        $this->get(route('product.show', $product->slug))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Shop/ProductShow')
                ->has('product.reviews', 1)
                ->where('product.reviews.0.comment', 'Helpful review that should stay visible.')
                ->where('product.reviews_count', 1)
                ->where('product.rating', 4)
            );
    }

    public function test_super_admin_can_remove_moderation_request_and_restore_review_visibility(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'SKU-REVIEW-MOD-004',
            'name' => 'Clay Lantern',
            'description' => 'Handmade lantern',
            'category' => 'Decor',
            'status' => 'Active',
            'price' => 920,
            'cost_price' => 340,
            'stock' => 7,
            'sold' => 2,
            'lead_time' => 3,
            'cover_photo_path' => 'products/clay-lantern.jpg',
            'slug' => 'clay-lantern',
        ]);

        $review = Review::create([
            'user_id' => $buyer->id,
            'product_id' => $product->id,
            'rating' => 3,
            'comment' => 'Review hidden by moderation.',
            'is_hidden_from_marketplace' => true,
            'hidden_at' => now(),
            'hidden_by' => $admin->id,
        ]);

        $dispute = ReviewDispute::create([
            'review_id' => $review->id,
            'seller_owner_id' => $seller->id,
            'reported_by_user_id' => $seller->id,
            'status' => 'resolved',
            'reason' => 'Misleading review',
            'resolution_notes' => 'Approved and hidden.',
            'resolved_at' => now(),
        ]);

        $this->actingAs($admin)
            ->delete(route('admin.review-moderation.destroy', $dispute))
            ->assertSessionHas('success', 'Moderation request removed.');

        $this->assertDatabaseMissing('review_disputes', [
            'id' => $dispute->id,
        ]);

        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'is_hidden_from_marketplace' => false,
            'hidden_by' => null,
        ]);

        $this->get(route('product.show', $product->slug))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Shop/ProductShow')
                ->has('product.reviews', 1)
                ->where('product.reviews.0.comment', 'Review hidden by moderation.')
            );
    }

    public function test_hidden_review_cannot_be_pinned_by_seller(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'SKU-REVIEW-MOD-005',
            'name' => 'Clay Bowl',
            'description' => 'Handmade bowl',
            'category' => 'Dinnerware',
            'status' => 'Active',
            'price' => 520,
            'cost_price' => 210,
            'stock' => 9,
            'sold' => 1,
            'lead_time' => 3,
            'cover_photo_path' => 'products/clay-bowl.jpg',
            'slug' => 'clay-bowl',
        ]);

        $review = Review::create([
            'user_id' => $buyer->id,
            'product_id' => $product->id,
            'rating' => 4,
            'comment' => 'Good bowl.',
            'is_hidden_from_marketplace' => true,
            'is_pinned' => false,
        ]);

        $this->actingAs($seller)
            ->post(route('reviews.toggle-pin', $review))
            ->assertSessionHas('error', 'Hidden reviews cannot be pinned.');

        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'is_pinned' => false,
            'is_hidden_from_marketplace' => true,
        ]);
    }
}

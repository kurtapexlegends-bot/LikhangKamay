<?php

namespace Tests\Feature\Seller;

use App\Models\Product;
use App\Models\Review;
use App\Models\ReviewDispute;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReviewDisputeFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_submit_review_dispute_and_view_status_in_reviews_page(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'SKU-REVIEW-001',
            'name' => 'Clay Mug',
            'description' => 'Handmade mug',
            'category' => 'Drinkware',
            'status' => 'Active',
            'price' => 499,
            'cost_price' => 200,
            'stock' => 10,
            'sold' => 2,
            'lead_time' => 3,
            'cover_photo_path' => 'products/test-mug.jpg',
            'slug' => 'clay-mug-test',
        ]);

        $review = Review::create([
            'user_id' => $buyer->id,
            'product_id' => $product->id,
            'rating' => 1,
            'comment' => 'This review needs moderation.',
        ]);

        $this->actingAs($seller)
            ->post(route('reviews.dispute', $review->id), [
                'reason' => 'Misleading review',
                'details' => 'The review does not match the delivered item or transaction record.',
            ])
            ->assertSessionHas('success', 'Moderation request sent to the admin review queue.');

        $this->assertDatabaseHas('review_disputes', [
            'review_id' => $review->id,
            'seller_owner_id' => $seller->id,
            'reported_by_user_id' => $seller->id,
            'status' => 'pending',
            'reason' => 'Misleading review',
        ]);

        $this->actingAs($seller)
            ->get(route('reviews.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Reviews')
                ->where('reviews.0.dispute.status', 'pending')
                ->where('reviews.0.dispute.reason', 'Misleading review')
            );
    }

    public function test_owner_cannot_submit_duplicate_open_review_dispute(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'SKU-REVIEW-002',
            'name' => 'Clay Vase',
            'description' => 'Handmade vase',
            'category' => 'Vases & Jars',
            'status' => 'Active',
            'price' => 899,
            'cost_price' => 350,
            'stock' => 6,
            'sold' => 1,
            'lead_time' => 4,
            'cover_photo_path' => 'products/test-vase.jpg',
            'slug' => 'clay-vase-test',
        ]);

        $review = Review::create([
            'user_id' => $buyer->id,
            'product_id' => $product->id,
            'rating' => 2,
            'comment' => 'This is still under review.',
        ]);

        ReviewDispute::create([
            'review_id' => $review->id,
            'seller_owner_id' => $seller->id,
            'reported_by_user_id' => $seller->id,
            'status' => 'pending',
            'reason' => 'Abusive language',
        ]);

        $this->actingAs($seller)
            ->post(route('reviews.dispute', $review->id), [
                'reason' => 'Misleading review',
                'details' => 'Attempting another request.',
            ])
            ->assertSessionHas('error', 'This review already has an open moderation request.');
    }

    public function test_owner_can_edit_open_review_dispute(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'SKU-REVIEW-003',
            'name' => 'Clay Bowl',
            'description' => 'Handmade bowl',
            'category' => 'Bowls',
            'status' => 'Active',
            'price' => 650,
            'cost_price' => 220,
            'stock' => 9,
            'sold' => 2,
            'lead_time' => 4,
            'cover_photo_path' => 'products/test-bowl.jpg',
            'slug' => 'clay-bowl-test',
        ]);

        $review = Review::create([
            'user_id' => $buyer->id,
            'product_id' => $product->id,
            'rating' => 2,
            'comment' => 'Needs review.',
        ]);

        $dispute = ReviewDispute::create([
            'review_id' => $review->id,
            'seller_owner_id' => $seller->id,
            'reported_by_user_id' => $seller->id,
            'status' => 'pending',
            'reason' => 'Misleading review',
            'details' => 'Original details.',
        ]);

        $this->actingAs($seller)
            ->patch(route('review-disputes.update', $dispute), [
                'reason' => 'Abusive language',
                'details' => 'Updated details for moderation.',
            ])
            ->assertSessionHas('success', 'Moderation request updated.');

        $this->assertDatabaseHas('review_disputes', [
            'id' => $dispute->id,
            'reason' => 'Abusive language',
            'details' => 'Updated details for moderation.',
        ]);
    }

    public function test_owner_can_remove_open_review_dispute(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'SKU-REVIEW-004',
            'name' => 'Clay Tray',
            'description' => 'Handmade tray',
            'category' => 'Serveware',
            'status' => 'Active',
            'price' => 720,
            'cost_price' => 260,
            'stock' => 5,
            'sold' => 1,
            'lead_time' => 4,
            'cover_photo_path' => 'products/test-tray.jpg',
            'slug' => 'clay-tray-test',
        ]);

        $review = Review::create([
            'user_id' => $buyer->id,
            'product_id' => $product->id,
            'rating' => 1,
            'comment' => 'Open dispute to remove.',
        ]);

        $dispute = ReviewDispute::create([
            'review_id' => $review->id,
            'seller_owner_id' => $seller->id,
            'reported_by_user_id' => $seller->id,
            'status' => 'under_review',
            'reason' => 'Misleading review',
        ]);

        $this->actingAs($seller)
            ->delete(route('review-disputes.destroy', $dispute))
            ->assertSessionHas('success', 'Moderation request removed.');

        $this->assertDatabaseMissing('review_disputes', [
            'id' => $dispute->id,
        ]);
    }
}

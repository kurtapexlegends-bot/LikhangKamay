<?php

namespace Tests\Feature\Consumer;

use App\Models\Product;
use App\Models\Review;
use App\Models\ReviewDispute;
use App\Models\User;
use App\Notifications\ArtisanReviewReplyNotification;
use App\Support\NotificationPresenter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BuyerReviewsTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_can_view_my_reviews_page_with_artisan_replies_and_content_safety_status(): void
    {
        $seller = User::factory()->artisanApproved()->create(['shop_name' => 'Bulacan Pottery']);
        $buyer = User::factory()->create(['role' => 'buyer']);

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'SKU-TEST-001',
            'name' => 'Handmade Clay Bowl',
            'description' => 'Earthy clay bowl',
            'category' => 'Kitchenware',
            'status' => 'Active',
            'price' => 450,
            'cost_price' => 150,
            'stock' => 10,
            'sold' => 1,
            'lead_time' => 2,
            'cover_photo_path' => 'products/bowl.jpg',
            'slug' => 'handmade-clay-bowl',
        ]);

        $product2 = Product::create([
            'user_id' => $seller->id,
            'sku' => 'SKU-TEST-001B',
            'name' => 'Glazed Ceramic Cup',
            'description' => 'Ceramic cup',
            'category' => 'Drinkware',
            'status' => 'Active',
            'price' => 350,
            'cost_price' => 120,
            'stock' => 8,
            'sold' => 1,
            'lead_time' => 2,
            'cover_photo_path' => 'products/cup.jpg',
            'slug' => 'glazed-ceramic-cup',
        ]);

        // Review 1: Has artisan reply
        $reviewWithReply = Review::create([
            'user_id' => $buyer->id,
            'product_id' => $product->id,
            'rating' => 5,
            'comment' => 'Beautiful craftsmanship and fast delivery!',
            'seller_reply' => 'Thank you for supporting local artisans!',
        ]);

        // Review 2: Disputed and hidden by moderation
        $hiddenReview = Review::create([
            'user_id' => $buyer->id,
            'product_id' => $product2->id,
            'rating' => 1,
            'comment' => 'Review that was hidden by moderation.',
            'is_hidden_from_marketplace' => true,
        ]);

        ReviewDispute::create([
            'review_id' => $hiddenReview->id,
            'seller_owner_id' => $seller->id,
            'reported_by_user_id' => $seller->id,
            'status' => 'resolved',
            'reason' => 'Misleading review content',
            'details' => 'Handled and resolved by moderation team.',
        ]);

        $response = $this->actingAs($buyer)->get(route('buyer.reviews'));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Consumer/Buyer/Reviews')
                ->has('reviews', 2)
                ->where('reviews.0.seller_reply', 'Thank you for supporting local artisans!')
                ->where('reviews.0.moderation.status_label', 'Public Review')
                ->where('reviews.0.moderation.is_hidden', false)
                ->where('reviews.1.is_hidden_from_marketplace', true)
                ->where('reviews.1.moderation.status_label', 'Hidden from Storefront')
                ->where('reviews.1.moderation.is_hidden', true)
            );
    }

    public function test_artisan_reply_notifies_buyer_with_artisan_review_reply_notification(): void
    {
        Notification::fake();

        $seller = User::factory()->artisanApproved()->create(['shop_name' => 'Cavite Weavers']);
        $buyer = User::factory()->create(['role' => 'buyer']);

        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'SKU-TEST-002',
            'name' => 'Woven Abaca Mat',
            'description' => 'Handwoven mat',
            'category' => 'Home Decor',
            'status' => 'Active',
            'price' => 850,
            'cost_price' => 300,
            'stock' => 5,
            'sold' => 1,
            'lead_time' => 3,
            'cover_photo_path' => 'products/mat.jpg',
            'slug' => 'woven-abaca-mat',
        ]);

        $review = Review::create([
            'user_id' => $buyer->id,
            'product_id' => $product->id,
            'rating' => 5,
            'comment' => 'The weave quality is incredible.',
        ]);

        $this->actingAs($seller)
            ->post(route('reviews.reply', $review->id), [
                'seller_reply' => 'Salamat! We take great pride in our traditional weaving process.',
            ])
            ->assertSessionHas('success', 'Reply posted successfully!');

        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'seller_reply' => 'Salamat! We take great pride in our traditional weaving process.',
        ]);

        Notification::assertSentTo(
            $buyer,
            ArtisanReviewReplyNotification::class,
            function (ArtisanReviewReplyNotification $notification) use ($buyer, $review) {
                $data = $notification->toArray($buyer);
                return $data['type'] === 'review_reply'
                    && $data['review_id'] === $review->id
                    && $data['url'] === route('buyer.reviews', ['review' => $review->id])
                    && str_contains($data['message'], 'replied to your review');
            }
        );
    }

    public function test_notification_presenter_resolves_review_reply_and_moderation_to_buyer_reviews(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);

        $notification = new DatabaseNotification([
            'id' => '00000000-0000-0000-0000-000000000001',
            'type' => 'App\Notifications\ArtisanReviewReplyNotification',
            'notifiable_type' => User::class,
            'notifiable_id' => $buyer->id,
            'data' => [
                'type' => 'review_reply',
                'title' => 'Artisan Replied to Your Review',
                'message' => 'Cavite Weavers replied to your review.',
                'review_id' => 99,
                'url' => route('buyer.reviews', ['review' => 99]),
            ],
            'read_at' => null,
        ]);

        $presented = NotificationPresenter::present($notification, $buyer);
        $this->assertEquals(route('buyer.reviews', ['review' => 99]), $presented['url']);

        $modNotification = new DatabaseNotification([
            'id' => '00000000-0000-0000-0000-000000000002',
            'type' => 'App\Notifications\ReviewModerationStatusNotification',
            'notifiable_type' => User::class,
            'notifiable_id' => $buyer->id,
            'data' => [
                'type' => 'review_moderation_status',
                'title' => 'Review Hidden from Marketplace',
                'message' => 'Your review is now hidden.',
                'review_id' => 101,
                'url' => route('buyer.reviews', ['review' => 101]),
            ],
            'read_at' => null,
        ]);

        $modPresented = NotificationPresenter::present($modNotification, $buyer);
        $this->assertEquals(route('buyer.reviews', ['review' => 101]), $modPresented['url']);
    }
}

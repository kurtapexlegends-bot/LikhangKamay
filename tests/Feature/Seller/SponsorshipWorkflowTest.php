<?php

namespace Tests\Feature\Seller;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\SponsorshipRequest;
use App\Models\User;
use App\Notifications\SponsorshipStatusNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SponsorshipWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_reject_requires_reason(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $seller = $this->createEliteSeller();
        $product = $this->createProduct($seller);
        $requestRecord = SponsorshipRequest::create([
            'user_id' => $seller->id,
            'product_id' => $product->id,
            'status' => 'pending',
        ]);

        $response = $this->from(route('admin.sponsorships'))
            ->actingAs($admin)
            ->post(route('admin.sponsorships.reject', $requestRecord));

        $response->assertRedirect(route('admin.sponsorships'));
        $response->assertSessionHasErrors('rejection_reason');

        $this->assertDatabaseHas('sponsorship_requests', [
            'id' => $requestRecord->id,
            'status' => 'pending',
            'rejection_reason' => null,
        ]);
    }

    public function test_admin_reject_stores_reason_and_notifies_seller(): void
    {
        Notification::fake();

        $admin = User::factory()->superAdmin()->create();
        $seller = $this->createEliteSeller();
        $product = $this->createProduct($seller);
        $requestRecord = SponsorshipRequest::create([
            'user_id' => $seller->id,
            'product_id' => $product->id,
            'status' => 'pending',
        ]);

        $this->actingAs($admin)
            ->post(route('admin.sponsorships.reject', $requestRecord), [
                'rejection_reason' => 'The product photography needs to be clearer before promotion.',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('sponsorship_requests', [
            'id' => $requestRecord->id,
            'status' => 'rejected',
            'rejection_reason' => 'The product photography needs to be clearer before promotion.',
        ]);

        Notification::assertSentTo($seller, SponsorshipStatusNotification::class, function (SponsorshipStatusNotification $notification) use ($seller, $requestRecord) {
            $payload = $notification->toArray($seller);

            return $payload['status'] === 'rejected'
                && $payload['rejection_reason'] === 'The product photography needs to be clearer before promotion.'
                && str_contains($payload['url'], '#request-' . $requestRecord->id);
        });
    }

    public function test_admin_approve_updates_product_and_notifies_seller(): void
    {
        Notification::fake();

        $admin = User::factory()->superAdmin()->create();
        $seller = $this->createEliteSeller();
        $product = $this->createProduct($seller, [
            'is_sponsored' => false,
            'sponsored_until' => null,
        ]);
        $requestRecord = SponsorshipRequest::create([
            'user_id' => $seller->id,
            'product_id' => $product->id,
            'status' => 'pending',
        ]);

        $this->actingAs($admin)
            ->post(route('admin.sponsorships.approve', $requestRecord))
            ->assertRedirect();

        $requestRecord->refresh();
        $product->refresh();

        $this->assertSame('approved', $requestRecord->status);
        $this->assertNotNull($requestRecord->approved_at);
        $this->assertTrue($product->is_sponsored);
        $this->assertTrue($product->sponsored_until->isFuture());

        Notification::assertSentTo($seller, SponsorshipStatusNotification::class, function (SponsorshipStatusNotification $notification) use ($seller, $requestRecord) {
            $payload = $notification->toArray($seller);

            return $payload['status'] === 'approved'
                && str_contains($payload['url'], '#request-' . $requestRecord->id);
        });
    }

    public function test_seller_sponsorship_history_exposes_rejection_reason(): void
    {
        $seller = $this->createEliteSeller();
        $product = $this->createProduct($seller);

        SponsorshipRequest::create([
            'user_id' => $seller->id,
            'product_id' => $product->id,
            'status' => 'rejected',
            'rejection_reason' => 'Please improve the primary image contrast.',
        ]);

        $response = $this->actingAs($seller)->get(route('seller.sponsorships'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Seller/Sponsorships')
            ->where('requests.0.status', 'rejected')
            ->where('requests.0.rejection_reason', 'Please improve the primary image contrast.')
        );
    }

    public function test_analytics_page_reports_sponsorship_metrics_from_tracked_events_and_attributed_orders(): void
    {
        $seller = $this->createEliteSeller();
        $product = $this->createProduct($seller, [
            'is_sponsored' => true,
            'sponsored_until' => now()->addDays(5),
        ]);
        $requestRecord = SponsorshipRequest::create([
            'user_id' => $seller->id,
            'product_id' => $product->id,
            'status' => 'approved',
            'approved_at' => now()->subDay(),
        ]);

        $this->post(route('sponsorships.track'), [
            'product_id' => $product->id,
            'event_type' => 'impression',
            'placement' => 'home_sponsored',
        ])->assertNoContent();

        $this->post(route('sponsorships.track'), [
            'product_id' => $product->id,
            'event_type' => 'click',
            'placement' => 'home_sponsored',
        ])->assertNoContent();

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => User::factory()->create()->id,
            'order_number' => 'ORD-SPONSORED-001',
            'customer_name' => 'Buyer Test',
            'total_amount' => 2499,
            'status' => 'Completed',
            'payment_method' => 'COD',
            'payment_status' => 'paid',
            'shipping_address' => 'Cavite',
            'shipping_method' => 'Delivery',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'price' => 2499,
            'cost' => 900,
            'quantity' => 1,
            'product_img' => $product->cover_photo_path,
            'was_sponsored' => true,
            'sponsorship_request_id' => $requestRecord->id,
            'sponsored_at_checkout' => now()->subHour(),
        ]);

        $response = $this->actingAs($seller)->get(route('analytics.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Seller/Analytics')
            ->where('sellerSubscription.canRequestSponsorships', true)
            ->where('sponsorshipMetrics.impressions', 1)
            ->where('sponsorshipMetrics.clicks', 1)
            ->where('sponsorshipMetrics.ctr', 100)
            ->where('sponsorshipMetrics.sponsored_orders', 1)
            ->where('sponsorshipMetrics.sponsored_revenue', 2499)
            ->where('sponsorshipAnalyticsAvailability.is_available', true)
            ->where('sponsorshipAnalyticsAvailability.state', 'active')
        );
    }

    public function test_non_elite_seller_does_not_receive_sponsored_performance_payload(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);

        $response = $this->actingAs($seller)->get(route('analytics.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Seller/Analytics')
            ->where('sellerSubscription.canRequestSponsorships', false)
            ->where('sponsorshipMetrics', null)
            ->where('sponsorshipChartData', null)
            ->where('sponsorshipAnalyticsAvailability.state', 'not_allowed')
            ->where('sponsorshipAnalyticsAvailability.is_available', false)
        );
    }

    public function test_checkout_snapshots_sponsorship_attribution(): void
    {
        Mail::fake();
        Notification::fake();

        $seller = $this->createEliteSeller();
        $buyer = User::factory()->create();
        $product = $this->createProduct($seller, [
            'price' => 1450,
            'stock' => 20,
            'is_sponsored' => true,
            'sponsored_until' => now()->addDays(4),
        ]);
        $requestRecord = SponsorshipRequest::create([
            'user_id' => $seller->id,
            'product_id' => $product->id,
            'status' => 'approved',
            'approved_at' => now()->subHours(3),
        ]);

        $this->actingAs($buyer)
            ->post(route('checkout.store'), [
                'items' => [[
                    'id' => $product->id,
                    'artisan_id' => $seller->id,
                    'qty' => 2,
                    'variant' => 'Standard',
                ]],
                'shipping_method' => 'Delivery',
                'shipping_address' => 'Dasmarinas, Cavite',
                'payment_method' => 'GCash',
                'total' => 2900,
            ])
            ->assertRedirect(route('my-orders.index'));

        $this->assertDatabaseHas('order_items', [
            'product_id' => $product->id,
            'was_sponsored' => true,
            'sponsorship_request_id' => $requestRecord->id,
            'quantity' => 2,
        ]);

        $this->assertNotNull(
            OrderItem::where('product_id', $product->id)->first()?->sponsored_at_checkout
        );
    }

    private function createEliteSeller(): User
    {
        return User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createProduct(User $seller, array $overrides = []): Product
    {
        return Product::create(array_merge([
            'user_id' => $seller->id,
            'sku' => 'SKU-' . strtoupper(fake()->bothify('??###')),
            'name' => 'Featured Clay Vase ' . fake()->unique()->word(),
            'description' => 'Handcrafted product for sponsorship testing.',
            'category' => 'Home Decor',
            'status' => 'Active',
            'price' => 1999,
            'cost_price' => 800,
            'stock' => 10,
            'lead_time' => 3,
            'sold' => 4,
            'track_as_supply' => false,
        ], $overrides));
    }
}




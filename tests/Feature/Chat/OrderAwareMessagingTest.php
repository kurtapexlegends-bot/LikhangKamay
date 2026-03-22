<?php

namespace Tests\Feature\Chat;

use App\Models\Order;
use App\Models\User;
use App\Notifications\NewMessageNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OrderAwareMessagingTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_chat_includes_latest_active_order_context_for_conversation(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $activeOrder = $this->createOrder($seller, $buyer, [
            'order_number' => 'ORD-ACTIVE-1',
            'status' => 'Pending',
            'customer_name' => 'Checkout Snapshot Buyer',
            'shipping_address' => '123 Clay Street, Manila',
            'payment_method' => 'GCash',
            'shipping_method' => 'Delivery',
            'shipping_notes' => 'Leave at the front desk.',
            'total_amount' => 650.00,
            'created_at' => now()->subHour(),
        ]);

        $this->createOrder($seller, $buyer, [
            'order_number' => 'ORD-DONE-1',
            'status' => 'Completed',
            'created_at' => now(),
        ]);

        $response = $this->actingAs($seller)->get(route('chat.index', [
            'user_id' => $buyer->id,
        ]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Seller/Chat')
            ->where('currentOrderContext.orderNumber', $activeOrder->order_number)
            ->where('currentOrderContext.status', 'Pending')
            ->where('currentOrderContext.customerName', 'Checkout Snapshot Buyer')
            ->where('currentOrderContext.paymentMethod', 'GCash')
            ->where('currentOrderContext.canRespond', true)
            ->where('currentOrderContext.isReadOnly', false)
            ->where('currentOrderContext.items.0.name', 'Handbuilt Vase')
            ->where('currentOrderContext.items.0.variant', 'Sand')
        );
    }

    public function test_seller_chat_prefers_pending_order_context_over_newer_non_terminal_order(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $pendingOrder = $this->createOrder($seller, $buyer, [
            'order_number' => 'ORD-PENDING-FIRST',
            'status' => 'Pending',
            'created_at' => now()->subHours(2),
        ]);

        $this->createOrder($seller, $buyer, [
            'order_number' => 'ORD-ACCEPTED-LATEST',
            'status' => 'Accepted',
            'created_at' => now()->subHour(),
        ]);

        $this->actingAs($seller)
            ->get(route('chat.index', ['user_id' => $buyer->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Chat')
                ->where('currentOrderContext.orderNumber', $pendingOrder->order_number)
                ->where('currentOrderContext.status', 'Pending')
                ->where('currentOrderContext.canRespond', true)
            );
    }

    public function test_buyer_chat_uses_checkout_snapshot_data_for_current_order_context(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'name' => 'Snapshot Seller',
        ]);
        $buyer = User::factory()->create([
            'name' => 'Original Buyer Name',
            'street_address' => 'Old Street',
            'city' => 'Quezon City',
        ]);

        $order = $this->createOrder($seller, $buyer, [
            'order_number' => 'ORD-SNAPSHOT-1',
            'status' => 'Accepted',
            'customer_name' => 'Checkout Name Snapshot',
            'shipping_address' => '456 Snapshot Avenue, Makati',
            'payment_method' => 'Maya',
            'shipping_method' => 'Pick Up',
            'shipping_notes' => 'Pickup after lunch.',
            'total_amount' => 480.00,
        ]);

        $buyer->update([
            'name' => 'Updated Buyer Name',
            'street_address' => 'New Street',
            'city' => 'Pasig',
        ]);

        $response = $this->actingAs($buyer)->get(route('buyer.chat', [
            'user_id' => $seller->id,
        ]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Buyer/Chat')
            ->where('currentOrderContext.orderNumber', $order->order_number)
            ->where('currentOrderContext.customerName', 'Checkout Name Snapshot')
            ->where('currentOrderContext.shippingAddress', '456 Snapshot Avenue, Makati')
            ->where('currentOrderContext.paymentMethod', 'Maya')
            ->where('currentOrderContext.shippingMethod', 'Pick Up')
            ->where('currentOrderContext.shippingNotes', 'Pickup after lunch.')
            ->where('currentOrderContext.status', 'Accepted')
            ->where('currentOrderContext.canRespond', false)
            ->where('currentOrderContext.isReadOnly', true)
        );
    }

    public function test_chat_order_context_reports_item_count_and_multiple_items_for_large_orders(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $order = $this->createOrder($seller, $buyer, [
            'order_number' => 'ORD-BULK-ITEMS',
            'status' => 'Pending',
            'items' => [
                [
                    'product_name' => 'Large Clay Jar',
                    'variant' => 'Ochre',
                    'price' => 1200.00,
                    'cost' => 400.00,
                    'quantity' => 2,
                    'product_img' => 'products/jar.jpg',
                ],
                [
                    'product_name' => 'Table Vase',
                    'variant' => 'Sand',
                    'price' => 850.00,
                    'cost' => 280.00,
                    'quantity' => 1,
                    'product_img' => 'products/vase.jpg',
                ],
                [
                    'product_name' => 'Mini Bowl Set',
                    'variant' => 'Natural',
                    'price' => 650.00,
                    'cost' => 220.00,
                    'quantity' => 3,
                    'product_img' => 'products/bowl.jpg',
                ],
            ],
        ]);

        $this->actingAs($seller)
            ->get(route('chat.index', ['user_id' => $buyer->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Chat')
                ->where('currentOrderContext.orderNumber', $order->order_number)
                ->where('currentOrderContext.lineItemsCount', 3)
                ->where('currentOrderContext.itemsCount', 3)
                ->where('currentOrderContext.unitsCount', 6)
                ->has('currentOrderContext.items', 3)
                ->where('currentOrderContext.items.2.name', 'Mini Bowl Set')
                ->where('currentOrderContext.items.2.quantity', 3)
            );
    }

    public function test_chat_order_context_reports_other_active_orders_in_same_conversation(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $pendingOrder = $this->createOrder($seller, $buyer, [
            'order_number' => 'ORD-PENDING-CURRENT',
            'status' => 'Pending',
            'created_at' => now()->subHours(2),
        ]);

        $this->createOrder($seller, $buyer, [
            'order_number' => 'ORD-ACCEPTED-SECOND',
            'status' => 'Accepted',
            'created_at' => now()->subHour(),
        ]);

        $this->createOrder($seller, $buyer, [
            'order_number' => 'ORD-SHIPPED-THIRD',
            'status' => 'Shipped',
            'created_at' => now()->subMinutes(30),
        ]);

        $this->actingAs($seller)
            ->get(route('chat.index', ['user_id' => $buyer->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Chat')
                ->where('currentOrderContext.orderNumber', $pendingOrder->order_number)
                ->where('currentOrderContext.activeOrdersCount', 3)
                ->where('currentOrderContext.otherActiveOrdersCount', 2)
                ->where('currentOrderContext.selectionSummary', 'Showing the pending order first. View Orders to review the other active orders in this conversation.')
            );
    }

    public function test_terminal_orders_do_not_expose_current_order_context_in_chat(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $this->createOrder($seller, $buyer, [
            'order_number' => 'ORD-FINAL-1',
            'status' => 'Completed',
        ]);

        $response = $this->actingAs($seller)->get(route('chat.index', [
            'user_id' => $buyer->id,
        ]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Seller/Chat')
            ->where('currentOrderContext', null)
        );
    }

    public function test_seller_chat_order_context_becomes_read_only_after_accepting_pending_order(): void
    {
        Mail::fake();

        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();
        $order = $this->createOrder($seller, $buyer, [
            'order_number' => 'ORD-PENDING-1',
            'status' => 'Pending',
        ]);

        $this->actingAs($seller)
            ->post(route('orders.update', $order->order_number), [
                'status' => 'Accepted',
            ])
            ->assertRedirect();

        $order->refresh();

        $this->assertSame('Accepted', $order->status);
        $this->assertNotNull($order->accepted_at);

        $this->actingAs($seller)
            ->get(route('chat.index', ['user_id' => $buyer->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Chat')
                ->where('currentOrderContext.orderNumber', $order->order_number)
                ->where('currentOrderContext.status', 'Accepted')
                ->where('currentOrderContext.canRespond', false)
                ->where('currentOrderContext.isReadOnly', true)
            );
    }

    public function test_buyer_can_send_message_to_seller_through_shared_chat_endpoint_when_they_have_an_order_relationship(): void
    {
        Notification::fake();

        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();
        $this->createOrder($seller, $buyer, [
            'order_number' => 'ORD-CHAT-REL',
            'status' => 'Pending',
        ]);

        $this->actingAs($buyer)
            ->post(route('chat.store'), [
                'receiver_id' => $seller->id,
                'message' => 'Can we discuss the order timing?',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('messages', [
            'sender_id' => $buyer->id,
            'receiver_id' => $seller->id,
            'message' => 'Can we discuss the order timing?',
        ]);

        Notification::assertSentTo($seller, NewMessageNotification::class);
    }

    public function test_buyer_cannot_send_message_to_unrelated_seller_without_order_or_existing_conversation(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $this->actingAs($buyer)
            ->post(route('chat.store'), [
                'receiver_id' => $seller->id,
                'message' => 'Hello from an unrelated account.',
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('messages', [
            'sender_id' => $buyer->id,
            'receiver_id' => $seller->id,
            'message' => 'Hello from an unrelated account.',
        ]);
    }

    public function test_seller_cannot_force_an_invalid_order_status_transition(): void
    {
        Mail::fake();

        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();
        $order = $this->createOrder($seller, $buyer, [
            'order_number' => 'ORD-INVALID-TRANSITION',
            'status' => 'Pending',
        ]);

        $this->from(route('orders.index'))
            ->actingAs($seller)
            ->post(route('orders.update', $order->order_number), [
                'status' => 'Shipped',
            ])
            ->assertRedirect(route('orders.index', absolute: false))
            ->assertSessionHas('error');

        $this->assertSame('Pending', $order->fresh()->status);
    }

    private function createOrder(User $seller, User $buyer, array $overrides = []): Order
    {
        $createdAt = $overrides['created_at'] ?? null;
        $items = $overrides['items'] ?? null;
        unset($overrides['created_at']);
        unset($overrides['items']);

        $order = Order::create(array_merge([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-' . strtoupper(uniqid()),
            'customer_name' => $buyer->name,
            'total_amount' => 350.00,
            'status' => 'Pending',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_address' => 'Default Snapshot Address',
            'shipping_notes' => 'Default snapshot note',
            'shipping_method' => 'Delivery',
        ], $overrides));

        if ($createdAt) {
            $order->forceFill([
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ])->saveQuietly();
        }

        collect($items ?: [[
            'product_name' => 'Handbuilt Vase',
            'variant' => 'Sand',
            'price' => 350.00,
            'cost' => 120.00,
            'quantity' => 1,
            'product_img' => 'products/vase.jpg',
        ]])->each(function (array $item) use ($order) {
            $order->items()->create($item);
        });

        return $order->refresh();
    }
}

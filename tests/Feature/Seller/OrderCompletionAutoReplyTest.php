<?php

namespace Tests\Feature\Seller;

use App\Actions\Seller\Chat\SendOrderCompletionAutoReply;
use App\Models\Message;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class OrderCompletionAutoReplyTest extends TestCase
{
    use RefreshDatabase;

    public function test_sends_automated_thank_you_message_on_order_completion(): void
    {
        Event::fake([\App\Events\MessageSent::class]);

        $seller = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'shop_name' => 'Artisan Craft Haven',
            'premium_tier' => 'premium',
            'auto_reply_on_completion' => true,
            'auto_reply_completion_message' => 'Thank you {buyer_name}! Order #{order_number} is completed by {shop_name}.',
        ]);

        $buyer = User::factory()->create([
            'role' => 'customer',
            'name' => 'Maria Santos',
            'first_name' => 'Maria',
        ]);

        $order = Order::create([
            'seller_id' => $seller->id,
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-100200',
            'status' => 'Completed',
            'total_amount' => 500,
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'customer_name' => 'Maria Santos',
            'customer_email' => $buyer->email,
            'shipping_address' => 'Manila',
        ]);

        $action = new SendOrderCompletionAutoReply();
        $message = $action->execute($order);

        $this->assertNotNull($message);
        $this->assertDatabaseHas('messages', [
            'id' => $message->id,
            'sender_id' => $seller->id,
            'receiver_id' => $buyer->id,
            'message' => 'Thank you Maria! Order #ORD-100200 is completed by Artisan Craft Haven.',
        ]);
    }

    public function test_prevents_duplicate_auto_reply_for_same_order(): void
    {
        $seller = User::factory()->create([
            'role' => 'artisan',
            'premium_tier' => 'premium',
            'auto_reply_on_completion' => true,
        ]);

        $buyer = User::factory()->create(['role' => 'customer']);

        $order = Order::create([
            'seller_id' => $seller->id,
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-999888',
            'status' => 'Completed',
            'total_amount' => 500,
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'customer_name' => 'Maria Santos',
            'customer_email' => $buyer->email,
            'shipping_address' => 'Manila',
        ]);

        $action = new SendOrderCompletionAutoReply();
        $first = $action->execute($order);
        $second = $action->execute($order);

        $this->assertNotNull($first);
        $this->assertNull($second);
        $this->assertEquals(1, Message::where('receiver_id', $buyer->id)->count());
    }

    public function test_does_not_send_message_when_seller_is_standard_free_tier(): void
    {
        $seller = User::factory()->create([
            'role' => 'artisan',
            'premium_tier' => 'standard',
            'auto_reply_on_completion' => true,
        ]);

        $buyer = User::factory()->create(['role' => 'customer']);

        $order = Order::create([
            'seller_id' => $seller->id,
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-555444',
            'status' => 'Completed',
            'total_amount' => 500,
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'customer_name' => 'Maria Santos',
            'customer_email' => $buyer->email,
            'shipping_address' => 'Manila',
        ]);

        $action = new SendOrderCompletionAutoReply();
        $message = $action->execute($order);

        $this->assertNull($message);
        $this->assertDatabaseMissing('messages', [
            'receiver_id' => $buyer->id,
        ]);
    }

    public function test_does_not_send_message_when_auto_reply_is_disabled(): void
    {
        $seller = User::factory()->create([
            'role' => 'artisan',
            'premium_tier' => 'premium',
            'auto_reply_on_completion' => false,
        ]);

        $buyer = User::factory()->create(['role' => 'customer']);

        $order = Order::create([
            'seller_id' => $seller->id,
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-777666',
            'status' => 'Completed',
            'total_amount' => 500,
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'customer_name' => 'Maria Santos',
            'customer_email' => $buyer->email,
            'shipping_address' => 'Manila',
        ]);

        $action = new SendOrderCompletionAutoReply();
        $message = $action->execute($order);

        $this->assertNull($message);
        $this->assertDatabaseMissing('messages', [
            'receiver_id' => $buyer->id,
        ]);
    }

    public function test_case_insensitive_matching_prevents_duplicate_auto_reply_for_completed_order(): void
    {
        $seller = User::factory()->create([
            'role' => 'artisan',
            'premium_tier' => 'premium',
            'auto_reply_on_completion' => true,
        ]);

        $buyer = User::factory()->create(['role' => 'customer']);

        $order = Order::create([
            'seller_id' => $seller->id,
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-CASE-999',
            'status' => 'Completed',
            'total_amount' => 500,
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'customer_name' => 'Maria Santos',
            'customer_email' => $buyer->email,
            'shipping_address' => 'Manila',
        ]);

        Message::create([
            'sender_id' => $seller->id,
            'receiver_id' => $buyer->id,
            'message' => 'Thank you! Order #ORD-CASE-999 is COMPLETED.',
        ]);

        $action = new SendOrderCompletionAutoReply();
        $result = $action->execute($order);

        $this->assertNull($result);
        $this->assertEquals(1, Message::where('receiver_id', $buyer->id)->count());
    }
}

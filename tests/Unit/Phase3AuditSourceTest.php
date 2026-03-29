<?php

namespace Tests\Unit;

use Tests\TestCase;

class Phase3AuditSourceTest extends TestCase
{
    public function test_buyer_order_receive_action_only_shows_after_delivery(): void
    {
        $source = file_get_contents(base_path('resources/js/Pages/Buyer/MyOrders.jsx'));

        $this->assertNotFalse($source);
        $this->assertStringContainsString("(order.status === 'Delivered' && !order.received_at)", $source);
        $this->assertStringNotContainsString("(order.status === 'Shipped' || order.status === 'Ready for Pickup' || (order.status === 'Delivered' && !order.received_at))", $source);
    }

    public function test_seller_order_manager_waits_for_buyer_confirmation_on_delivered_replacements(): void
    {
        $source = file_get_contents(base_path('resources/js/Pages/Seller/OrderManager.jsx'));

        $this->assertNotFalse($source);
        $this->assertStringContainsString("order.status === 'Delivered' && !order.replacement_in_progress", $source);
        $this->assertStringContainsString('Waiting for Buyer Confirmation', $source);
    }
}

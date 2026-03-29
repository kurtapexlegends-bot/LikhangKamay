<?php

namespace Tests\Unit;

use Tests\TestCase;

class BuyerNotificationNavbarSourceTest extends TestCase
{
    public function test_buyer_navbar_includes_notification_access_near_cart_area(): void
    {
        $source = file_get_contents(base_path('resources/js/Components/BuyerNavbar.jsx'));

        $this->assertNotFalse($source);
        $this->assertStringContainsString("import NotificationDropdown from '@/Components/NotificationDropdown';", $source);
        $this->assertStringContainsString('<ShoppingCart size={20}', $source);
        $this->assertStringContainsString('<NotificationDropdown />', $source);
    }

    public function test_notification_dropdown_supports_replacement_resolution_type(): void
    {
        $source = file_get_contents(base_path('resources/js/Components/NotificationDropdown.jsx'));

        $this->assertNotFalse($source);
        $this->assertStringContainsString("case 'replacement_resolution':", $source);
        $this->assertStringContainsString('<PackageCheck size={16} className="text-teal-500" />', $source);
    }
}

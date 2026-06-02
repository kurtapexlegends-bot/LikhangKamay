<?php

namespace Tests\Unit;

use Tests\TestCase;

class BuyerNotificationNavbarSourceTest extends TestCase
{
    public function test_buyer_navbar_includes_notification_access_near_cart_area(): void
    {
        $source = file_get_contents(base_path('resources/js/Layouts/BuyerNavbar.jsx'));

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

    public function test_layouts_enable_realtime_synchronization(): void
    {
        $buyerNavbarSource = file_get_contents(base_path('resources/js/Layouts/BuyerNavbar.jsx'));
        $this->assertNotFalse($buyerNavbarSource);
        $this->assertStringContainsString("import { useRealtime } from '@/hooks/useRealtime';", $buyerNavbarSource);
        $this->assertStringContainsString("useRealtime();", $buyerNavbarSource);

        $adminLayoutSource = file_get_contents(base_path('resources/js/Layouts/AdminLayout.jsx'));
        $this->assertNotFalse($adminLayoutSource);
        $this->assertStringContainsString("import { useRealtime } from '@/hooks/useRealtime';", $adminLayoutSource);
        $this->assertStringContainsString("useRealtime();", $adminLayoutSource);
    }

    public function test_notification_dropdown_supports_extended_types_and_responsive_width(): void
    {
        $source = file_get_contents(base_path('resources/js/Components/NotificationDropdown.jsx'));
        $this->assertNotFalse($source);
        
        $this->assertStringContainsString("'low_stock_warning'", $source);
        $this->assertStringContainsString("'accounting_request'", $source);
        $this->assertStringContainsString("'new_review'", $source);
        $this->assertStringContainsString("case 'low_stock_warning':", $source);
        $this->assertStringContainsString("w-[calc(100vw-2rem)]", $source);
    }
}

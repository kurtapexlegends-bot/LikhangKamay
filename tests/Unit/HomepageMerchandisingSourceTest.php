<?php

namespace Tests\Unit;

use Tests\TestCase;

class HomepageMerchandisingSourceTest extends TestCase
{
    public function test_homepage_sections_use_the_required_source_order(): void
    {
        $source = file_get_contents(base_path('resources/js/Pages/Welcome.jsx'));

        $this->assertNotFalse($source);

        $sponsoredPos = strpos($source, '{/* SPONSORED PRODUCTS SECTION */}');
        $categoriesPos = strpos($source, '{/* CATEGORIES */}');
        $featuredPos = strpos($source, '{/* FEATURED PRODUCTS */}');
        $topSellersPos = strpos($source, '{/* TOP STORES - DSS Dashboard */}');

        $this->assertNotFalse($sponsoredPos);
        $this->assertNotFalse($categoriesPos);
        $this->assertNotFalse($featuredPos);
        $this->assertNotFalse($topSellersPos);

        $this->assertTrue($sponsoredPos < $categoriesPos);
        $this->assertTrue($categoriesPos < $featuredPos);
        $this->assertTrue($featuredPos < $topSellersPos);
    }

    public function test_homepage_gives_sponsored_products_visual_priority(): void
    {
        $source = file_get_contents(base_path('resources/js/Pages/Welcome.jsx'));

        $this->assertNotFalse($source);
        $this->assertStringContainsString('Sponsored Collection', $source);
        $this->assertStringContainsString('order-1 relative overflow-hidden rounded-2xl', $source);
        $this->assertStringContainsString('bg-gradient-to-r from-amber-50/60 via-white to-clay-50/30', $source);
        $this->assertStringContainsString("data-sponsored-placement={sponsoredPlacement}", $source);
    }
}

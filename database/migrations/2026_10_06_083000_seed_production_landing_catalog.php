<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use App\Models\User;
use App\Models\Category;
use App\Models\Product;
use App\Models\SellerComplianceAgreement;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (app()->environment('testing')) {
            return;
        }

        // 1. Ensure Standard Marketplace Categories exist
        $categories = [
            ['name' => 'Tableware', 'slug' => 'tableware', 'icon' => 'Utensils'],
            ['name' => 'Drinkware', 'slug' => 'drinkware', 'icon' => 'Coffee'],
            ['name' => 'Vases & Jars', 'slug' => 'vases-jars', 'icon' => 'Flower2'],
            ['name' => 'Planters & Pots', 'slug' => 'planters-pots', 'icon' => 'Sprout'],
            ['name' => 'Home Decor', 'slug' => 'home-decor', 'icon' => 'Home'],
            ['name' => 'Kitchenware', 'slug' => 'kitchenware', 'icon' => 'ChefHat'],
            ['name' => 'Artisan Sets', 'slug' => 'artisan-sets', 'icon' => 'Gift'],
        ];

        foreach ($categories as $cat) {
            Category::withTrashed()->updateOrCreate(
                ['slug' => $cat['slug']],
                [
                    'name' => $cat['name'],
                    'icon' => $cat['icon'],
                    'deleted_at' => null,
                ]
            );
        }

        // 2. Seed / Update Verified Cavite Artisan Seller
        $artisan = User::updateOrCreate(
            ['email' => 'artisan@likhangkamay.com'],
            [
                'name' => 'Maria Santos',
                'first_name' => 'Maria',
                'last_name' => 'Santos',
                'shop_name' => 'Kapwa Ceramics',
                'role' => 'artisan',
                'artisan_status' => 'approved',
                'city' => 'Dasmariñas',
                'province' => 'Cavite',
                'street_address' => 'Blk 12 Lot 8 Aguinaldo Highway',
                'barangay' => 'Burol',
                'zip_code' => '4114',
                'phone_number' => '09701640999',
                'bio' => 'Authentic handcrafted pottery studio in Dasmariñas, Cavite. Specializing in wheel-thrown stoneware mugs, tableware bowls, and glazed ceramic art.',
                'avatar' => '/images/demo/shop/avatar.png',
                'shop_banner' => '/images/demo/shop/banner.jpg',
                'base_funds' => 50000.00,
                'email_verified_at' => now(),
                'password' => Hash::make('LikhangKamay2026!'),
            ]
        );

        // 3. Ensure Seller Compliance Agreement (Mandatory for catalog queries)
        SellerComplianceAgreement::updateOrCreate(
            [
                'user_id' => $artisan->id,
                'document_type' => 'seller_terms',
            ],
            [
                'accepted_at' => now(),
                'ip_address' => '127.0.0.1',
                'user_agent' => 'LikhangKamay Seed Engine',
            ]
        );

        // 4. Seed / Update 3 Authentic Products (from DEFENSE IMAGES)
        Product::$bypassReview = true;

        // Product 1: Speckled Ceramic Studio Mug (with 3D model)
        Product::updateOrCreate(
            [
                'user_id' => $artisan->id,
                'sku' => 'KAPWA-MUG-001',
            ],
            [
                'name' => 'Speckled Ceramic Studio Mug',
                'category' => 'Drinkware',
                'price' => 340.00,
                'cost_price' => 130.00,
                'stock' => 45,
                'sold' => 58,
                'lead_time' => 2,
                'status' => 'Active',
                'is_b2b_supply' => false,
                'cover_photo_path' => '/images/demo/products/mug-cover.png',
                'gallery_paths' => [
                    '/images/demo/products/mug-1.png',
                    '/images/demo/products/mug-2.png',
                    '/images/demo/products/mug-3.png',
                ],
                'model_3d_path' => '/models/demo/drinkware-mug.glb',
                'description' => 'Handcrafted stoneware coffee mug featuring a reactive speckled glaze and comfortable ergonomic pull handle. Wheel-thrown in Cavite with natural minerals and fired at high stoneware temperatures for durability and everyday use.',
                'clay_type' => 'Stoneware Clay',
                'glaze_type' => 'Speckled Matte Glaze',
                'firing_method' => 'Electric Kiln Cone 6',
                'food_safe' => true,
                'is_sponsored' => true,
                'sponsored_until' => now()->addDays(30),
            ]
        );

        // Product 2: Earthenware Dining & Ramen Bowl (with 3D model)
        Product::updateOrCreate(
            [
                'user_id' => $artisan->id,
                'sku' => 'KAPWA-BOWL-002',
            ],
            [
                'name' => 'Earthenware Dining & Ramen Bowl',
                'category' => 'Tableware',
                'price' => 420.00,
                'cost_price' => 160.00,
                'stock' => 40,
                'sold' => 76,
                'lead_time' => 3,
                'status' => 'Active',
                'is_b2b_supply' => false,
                'cover_photo_path' => '/images/demo/products/bowl-cover.png',
                'gallery_paths' => [
                    '/images/demo/products/bowl-1.png',
                    '/images/demo/products/bowl-2.png',
                    '/images/demo/products/bowl-3.png',
                ],
                'model_3d_path' => '/models/demo/tableware-bowl.glb',
                'description' => 'Deep earthenware artisanal dining bowl, wheel-thrown in Cavite with natural iron-rich clay. Ideal for ramen, hearty soups, and family dining. Coated in food-safe smooth satin glaze.',
                'clay_type' => 'Terracotta & Earthenware Blend',
                'glaze_type' => 'Rustic Food-Safe Glaze',
                'firing_method' => 'Gas Kiln Reduction',
                'food_safe' => true,
                'is_sponsored' => false,
            ]
        );

        // Product 3: Artisan Hand-Painted Floral Ceramic Vase
        Product::updateOrCreate(
            [
                'user_id' => $artisan->id,
                'sku' => 'KAPWA-VASE-003',
            ],
            [
                'name' => 'Artisan Hand-Painted Floral Ceramic Vase',
                'category' => 'Vases & Jars',
                'price' => 780.00,
                'cost_price' => 310.00,
                'stock' => 15,
                'sold' => 29,
                'lead_time' => 5,
                'status' => 'Active',
                'is_b2b_supply' => false,
                'cover_photo_path' => '/images/demo/products/vase-cover.png',
                'gallery_paths' => [
                    '/images/demo/products/vase-1.png',
                    '/images/demo/products/vase-2.png',
                    '/images/demo/products/vase-3.png',
                ],
                'model_3d_path' => null,
                'description' => 'Vibrant centerpiece ceramic vase with hand-painted botanical motifs and smooth high-gloss glaze finish. Crafted in small batches by Cavite artisans using locally sourced clay.',
                'clay_type' => 'Fine White Stoneware',
                'glaze_type' => 'Multi-Color Gloss Glaze',
                'firing_method' => 'Oxidation Firing',
                'food_safe' => false,
                'is_sponsored' => true,
                'sponsored_until' => now()->addDays(30),
            ]
        );

        // 5. Invalidate Platform & Catalog Caches
        Cache::forget('home_sponsored_products');
        Cache::forget('home_featured_products_pool');
        Cache::forget('home_top_sellers');
        Cache::forget('home_categories');
        Cache::forget('shop_catalog_default_page_1');
        Cache::forget('catalog_categories');
        Cache::forget('catalog_category_counts');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op for additive data seeding
    }
};

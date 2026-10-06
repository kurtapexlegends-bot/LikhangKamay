<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Category;
use App\Models\Product;
use App\Models\SellerComplianceAgreement;

return new class extends Migration
{
    /**
     * Disable transaction wrapper so PostgreSQL does not abort on soft-handled DML.
     */
    public $withinTransaction = false;

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (app()->environment('testing')) {
            return;
        }

        // 1. Cleanly remove demo account 'kurtapexlegends@gmail.com' for live demo defense registration
        $kurt = User::withTrashed()->where('email', 'kurtapexlegends@gmail.com')->first();
        if ($kurt) {
            $cleanup = function ($table, $column) use ($kurt) {
                if (\Illuminate\Support\Facades\Schema::hasTable($table) && \Illuminate\Support\Facades\Schema::hasColumn($table, $column)) {
                    DB::table($table)->where($column, $kurt->id)->delete();
                }
            };

            $cleanup('messages', 'receiver_id');
            $cleanup('messages', 'sender_id');
            $cleanup('conversations', 'user_one_id');
            $cleanup('conversations', 'user_two_id');
            $cleanup('order_items', 'seller_id');
            $cleanup('orders', 'user_id');
            $cleanup('orders', 'artisan_id');
            $cleanup('disputes', 'user_id');
            $cleanup('attendances', 'user_id');
            $cleanup('seller_locations', 'user_id');
            $cleanup('wishlists', 'user_id');
            $cleanup('reviews', 'user_id');
            $cleanup('seller_compliance_agreements', 'user_id');
            $cleanup('payouts', 'user_id');
            $cleanup('addresses', 'user_id');
            $cleanup('notifications', 'notifiable_id');
            $cleanup('products', 'user_id');

            $driver = DB::connection()->getDriverName();
            if ($driver === 'mysql') {
                DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            }
            $kurt->forceDelete();
            if ($driver === 'mysql') {
                DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            }
        }

        // 2. Fetch or guarantee Artisan 1 (Kapwa Ceramics - Maria Santos / Dasmariñas, Cavite)
        $artisan1 = User::where('email', 'artisan@likhangkamay.com')->first();

        // 3. Seed / Update Artisan 2: Elena Bautista (Silang Terracotta Works / Silang, Cavite)
        $artisan2 = User::updateOrCreate(
            ['email' => 'artisan.silang@likhangkamay.com'],
            [
                'name' => 'Elena Bautista',
                'first_name' => 'Elena',
                'last_name' => 'Bautista',
                'shop_name' => 'Silang Terracotta Works',
                'role' => 'artisan',
                'artisan_status' => 'approved',
                'city' => 'Silang',
                'province' => 'Cavite',
                'street_address' => 'Bypass Road, Brgy. San Vicente 2',
                'barangay' => 'San Vicente 2',
                'zip_code' => '4118',
                'phone_number' => '09171234567',
                'bio' => 'Heritage terracotta pottery crafted with ancestral Cavite clay traditions. Specializing in durable outdoor planters, earthen jars, and dining ware.',
                'avatar' => '/images/demo/shop/avatar-silang.jpg',
                'shop_banner' => '/images/demo/shop/banner-silang.jpg',
                'base_funds' => 35000.00,
                'email_verified_at' => now(),
                'password' => Hash::make('LikhangKamay2026!'),
            ]
        );

        SellerComplianceAgreement::updateOrCreate(
            [
                'user_id' => $artisan2->id,
                'document_type' => 'seller_terms',
            ],
            [
                'accepted_at' => now(),
                'ip_address' => '127.0.0.1',
                'user_agent' => 'LikhangKamay Seed Engine',
            ]
        );

        // 4. Seed / Update Artisan 3: Mateo Reyes (Amadeo Stoneware Studio / Amadeo, Cavite)
        $artisan3 = User::updateOrCreate(
            ['email' => 'artisan.amadeo@likhangkamay.com'],
            [
                'name' => 'Mateo Reyes',
                'first_name' => 'Mateo',
                'last_name' => 'Reyes',
                'shop_name' => 'Amadeo Stoneware Studio',
                'role' => 'artisan',
                'artisan_status' => 'approved',
                'city' => 'Amadeo',
                'province' => 'Cavite',
                'street_address' => 'Crisanto M. De Los Reyes Ave, Brgy. Dagatan',
                'barangay' => 'Dagatan',
                'zip_code' => '4119',
                'phone_number' => '09289876543',
                'bio' => 'High-fired stoneware ceramics inspired by coffee blossoms and mountain winds of Amadeo, Cavite. Crafted for modern kitchens and serene rituals.',
                'avatar' => '/images/demo/shop/avatar-amadeo.jpg',
                'shop_banner' => '/images/demo/shop/banner-amadeo.jpg',
                'base_funds' => 42000.00,
                'email_verified_at' => now(),
                'password' => Hash::make('LikhangKamay2026!'),
            ]
        );

        SellerComplianceAgreement::updateOrCreate(
            [
                'user_id' => $artisan3->id,
                'document_type' => 'seller_terms',
            ],
            [
                'accepted_at' => now(),
                'ip_address' => '127.0.0.1',
                'user_agent' => 'LikhangKamay Seed Engine',
            ]
        );

        // 5. Seed 10 Additional Authentic Products
        Product::$bypassReview = true;

        $newProducts = [
            // Artisan 1 (Kapwa Ceramics - Dasmariñas, Cavite)
            [
                'user_id' => $artisan1 ? $artisan1->id : $artisan2->id,
                'sku' => 'KAPWA-MUG-004',
                'name' => 'Rustic Stoneware Espresso Cup',
                'category' => 'Drinkware',
                'price' => 260.00,
                'cost_price' => 95.00,
                'stock' => 35,
                'sold' => 42,
                'lead_time' => 2,
                'status' => 'Active',
                'is_b2b_supply' => false,
                'cover_photo_path' => '/images/demo/products/espresso-cup-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/espresso-cup-cover.jpg',
                    '/images/demo/products/espresso-cup-cover.jpg',
                    '/images/demo/products/espresso-cup-cover.jpg',
                    '/images/demo/products/espresso-cup-cover.jpg',
                ],
                'model_3d_path' => '/models/demo/drinkware-mug.glb',
                'description' => 'A compact, tactile espresso cup handcrafted in Dasmariñas, Cavite with dark stoneware clay. Features an unglazed earthy foot ring and a comfortable single-finger loop.',
                'clay_type' => 'Dark Stoneware Clay',
                'glaze_type' => 'Cream Satin Glaze',
                'firing_method' => 'Electric Kiln Cone 6',
                'food_safe' => true,
                'is_sponsored' => true,
                'sponsored_until' => now()->addDays(30),
            ],
            [
                'user_id' => $artisan1 ? $artisan1->id : $artisan2->id,
                'sku' => 'KAPWA-PLANTER-005',
                'name' => 'Hand-Thrown Terracotta Succulent Pot',
                'category' => 'Planters & Pots',
                'price' => 320.00,
                'cost_price' => 110.00,
                'stock' => 50,
                'sold' => 64,
                'lead_time' => 2,
                'status' => 'Active',
                'is_b2b_supply' => false,
                'cover_photo_path' => '/images/demo/products/succulent-pot-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/succulent-pot-cover.jpg',
                    '/images/demo/products/succulent-pot-cover.jpg',
                    '/images/demo/products/succulent-pot-cover.jpg',
                    '/images/demo/products/succulent-pot-cover.jpg',
                ],
                'model_3d_path' => null,
                'description' => 'Breathable natural terracotta succulent and cactus planter with built-in drainage hole. Wheel-thrown by hand in Cavite to provide optimal root aeration for indoor botanicals.',
                'clay_type' => 'Natural Terracotta',
                'glaze_type' => 'Raw Matte Clay',
                'firing_method' => 'Low Fire Oxidation',
                'food_safe' => false,
                'is_sponsored' => false,
            ],
            [
                'user_id' => $artisan1 ? $artisan1->id : $artisan2->id,
                'sku' => 'KAPWA-BOWL-006',
                'name' => 'Glazed Ceramic Matcha Whisking Bowl',
                'category' => 'Tableware',
                'price' => 480.00,
                'cost_price' => 170.00,
                'stock' => 25,
                'sold' => 38,
                'lead_time' => 3,
                'status' => 'Active',
                'is_b2b_supply' => false,
                'cover_photo_path' => '/images/demo/products/matcha-bowl-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/matcha-bowl-cover.jpg',
                    '/images/demo/products/matcha-bowl-cover.jpg',
                    '/images/demo/products/matcha-bowl-cover.jpg',
                    '/images/demo/products/matcha-bowl-cover.jpg',
                ],
                'model_3d_path' => '/models/demo/tableware-bowl.glb',
                'description' => 'A ceremonial-grade ceramic chawan matcha bowl featuring textured walls for smooth tea frothing and a pour-friendly sculpted spout.',
                'clay_type' => 'White Kaolin Stoneware',
                'glaze_type' => 'Celadon Green Satin',
                'firing_method' => 'Gas Kiln Reduction',
                'food_safe' => true,
                'is_sponsored' => false,
            ],

            // Artisan 2 (Silang Terracotta Works - Silang, Cavite)
            [
                'user_id' => $artisan2->id,
                'sku' => 'SILANG-POT-007',
                'name' => 'Traditional Terracotta Garden Planter',
                'category' => 'Planters & Pots',
                'price' => 550.00,
                'cost_price' => 200.00,
                'stock' => 30,
                'sold' => 53,
                'lead_time' => 4,
                'status' => 'Active',
                'is_b2b_supply' => false,
                'cover_photo_path' => '/images/demo/products/garden-planter-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/garden-planter-cover.jpg',
                    '/images/demo/products/garden-planter-cover.jpg',
                    '/images/demo/products/garden-planter-cover.jpg',
                    '/images/demo/products/garden-planter-cover.jpg',
                ],
                'model_3d_path' => null,
                'description' => 'Heavyweight garden planter crafted with deep-red Silang terracotta clay. Sturdy rim and porous earthen walls make it ideal for patio plants, ferns, and garden greens.',
                'clay_type' => 'Cavite Red Clay',
                'glaze_type' => 'Unglazed Terracotta',
                'firing_method' => 'Wood-Fired Kiln',
                'food_safe' => false,
                'is_sponsored' => true,
                'sponsored_until' => now()->addDays(30),
            ],
            [
                'user_id' => $artisan2->id,
                'sku' => 'SILANG-JAR-008',
                'name' => 'Burnished Clay Water Pitcher & Jar',
                'category' => 'Vases & Jars',
                'price' => 890.00,
                'cost_price' => 340.00,
                'stock' => 18,
                'sold' => 27,
                'lead_time' => 5,
                'status' => 'Active',
                'is_b2b_supply' => false,
                'cover_photo_path' => '/images/demo/products/clay-pitcher-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/clay-pitcher-cover.jpg',
                    '/images/demo/products/clay-pitcher-cover.jpg',
                    '/images/demo/products/clay-pitcher-cover.jpg',
                    '/images/demo/products/clay-pitcher-cover.jpg',
                ],
                'model_3d_path' => null,
                'description' => 'Artisanal earthen pitcher handcrafted in Silang, Cavite. Burnished with river stones before firing to yield a natural silk sheen and rustic heirloom character.',
                'clay_type' => 'Silang Red Earthenware',
                'glaze_type' => 'Stone Burnished Finish',
                'firing_method' => 'Pit Firing',
                'food_safe' => true,
                'is_sponsored' => false,
            ],
            [
                'user_id' => $artisan2->id,
                'sku' => 'SILANG-PLATE-009',
                'name' => 'Handcrafted Stoneware Dinner Plate',
                'category' => 'Tableware',
                'price' => 380.00,
                'cost_price' => 140.00,
                'stock' => 40,
                'sold' => 61,
                'lead_time' => 3,
                'status' => 'Active',
                'is_b2b_supply' => false,
                'cover_photo_path' => '/images/demo/products/dinner-plate-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/dinner-plate-cover.jpg',
                    '/images/demo/products/dinner-plate-cover.jpg',
                    '/images/demo/products/dinner-plate-cover.jpg',
                    '/images/demo/products/dinner-plate-cover.jpg',
                ],
                'model_3d_path' => '/models/demo/tableware-bowl.glb',
                'description' => 'A versatile 10-inch artisan dinner plate featuring organic wabi-sabi rim contours and a durable scratch-resistant food-safe glaze.',
                'clay_type' => 'Stoneware Clay',
                'glaze_type' => 'Cream White Satin Glaze',
                'firing_method' => 'Electric Kiln Cone 6',
                'food_safe' => true,
                'is_sponsored' => false,
            ],
            [
                'user_id' => $artisan2->id,
                'sku' => 'SILANG-VASE-010',
                'name' => 'Minimalist Fluted Ceramic Bud Vase',
                'category' => 'Vases & Jars',
                'price' => 420.00,
                'cost_price' => 150.00,
                'stock' => 22,
                'sold' => 45,
                'lead_time' => 3,
                'status' => 'Active',
                'is_b2b_supply' => false,
                'cover_photo_path' => '/images/demo/products/bud-vase-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/bud-vase-cover.jpg',
                    '/images/demo/products/bud-vase-cover.jpg',
                    '/images/demo/products/bud-vase-cover.jpg',
                    '/images/demo/products/bud-vase-cover.jpg',
                ],
                'model_3d_path' => null,
                'description' => 'A slender tabletop bud vase with vertical fluted ribbing. Perfect for single botanical stems or dried floral accents in modern dining rooms.',
                'clay_type' => 'Fine White Stoneware',
                'glaze_type' => 'Matte Chalk Finish',
                'firing_method' => 'Oxidation Firing',
                'food_safe' => false,
                'is_sponsored' => true,
                'sponsored_until' => now()->addDays(30),
            ],

            // Artisan 3 (Amadeo Stoneware Studio - Amadeo, Cavite)
            [
                'user_id' => $artisan3->id,
                'sku' => 'AMADEO-MUG-011',
                'name' => 'Coffee Blossom Ceramic Drip Mug',
                'category' => 'Drinkware',
                'price' => 390.00,
                'cost_price' => 140.00,
                'stock' => 35,
                'sold' => 82,
                'lead_time' => 2,
                'status' => 'Active',
                'is_b2b_supply' => false,
                'cover_photo_path' => '/images/demo/products/drip-mug-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/drip-mug-cover.jpg',
                    '/images/demo/products/drip-mug-cover.jpg',
                    '/images/demo/products/drip-mug-cover.jpg',
                    '/images/demo/products/drip-mug-cover.jpg',
                ],
                'model_3d_path' => '/models/demo/drinkware-mug.glb',
                'description' => 'Specially weighted pour-over coffee mug crafted in the coffee capital of Cavite. Designed with thick ceramic insulation to preserve beverage heat and aroma.',
                'clay_type' => 'Amadeo Stoneware Blend',
                'glaze_type' => 'Warm Coffee Drip Glaze',
                'firing_method' => 'Electric Kiln Cone 6',
                'food_safe' => true,
                'is_sponsored' => false,
            ],
            [
                'user_id' => $artisan3->id,
                'sku' => 'AMADEO-SET-012',
                'name' => 'Artisan Ceramic Tea & Brew Set',
                'category' => 'Artisan Sets',
                'price' => 1150.00,
                'cost_price' => 450.00,
                'stock' => 12,
                'sold' => 19,
                'lead_time' => 5,
                'status' => 'Active',
                'is_b2b_supply' => false,
                'cover_photo_path' => '/images/demo/products/tea-set-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/tea-set-cover.jpg',
                    '/images/demo/products/tea-set-cover.jpg',
                    '/images/demo/products/tea-set-cover.jpg',
                    '/images/demo/products/tea-set-cover.jpg',
                ],
                'model_3d_path' => null,
                'description' => 'Complete handcrafted tea set comprising a wheel-thrown teapot with bamboo handle and two matching stoneware cups. Packaged in local abaca gift wrapping.',
                'clay_type' => 'High-Fire Stoneware',
                'glaze_type' => 'Reactive Iron Wash',
                'firing_method' => 'Gas Reduction Firing',
                'food_safe' => true,
                'is_sponsored' => true,
                'sponsored_until' => now()->addDays(30),
            ],
            [
                'user_id' => $artisan3->id,
                'sku' => 'AMADEO-DECOR-013',
                'name' => 'Hand-Carved Clay Incense & Candle Holder',
                'category' => 'Home Decor',
                'price' => 290.00,
                'cost_price' => 100.00,
                'stock' => 45,
                'sold' => 37,
                'lead_time' => 2,
                'status' => 'Active',
                'is_b2b_supply' => false,
                'cover_photo_path' => '/images/demo/products/incense-holder-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/incense-holder-cover.jpg',
                    '/images/demo/products/incense-holder-cover.jpg',
                    '/images/demo/products/incense-holder-cover.jpg',
                    '/images/demo/products/incense-holder-cover.jpg',
                ],
                'model_3d_path' => null,
                'description' => 'A sculpted clay holder suited for both incense sticks and tealight candles. Features hand-cut geometric vents that cast soothing amber light silhouettes.',
                'clay_type' => 'Cavite Earthenware',
                'glaze_type' => 'Matte Terracotta Slip',
                'firing_method' => 'Electric Kiln Cone 04',
                'food_safe' => false,
                'is_sponsored' => false,
            ],
        ];

        foreach ($newProducts as $data) {
            Product::updateOrCreate(
                [
                    'sku' => $data['sku'],
                ],
                $data
            );
        }

        // 6. Invalidate Platform & Catalog Caches
        Cache::forget('home_sponsored_products');
        Cache::forget('home_featured_products_pool');
        Cache::forget('home_top_sellers');
        Cache::forget('home_categories');
        Cache::forget('shop_catalog_default_page_1');
        Cache::forget('catalog_categories');
        Cache::forget('catalog_category_counts');
        Cache::forget('catalog_material_counts');
        Cache::forget('catalog_location_counts');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op for additive data seeding
    }
};

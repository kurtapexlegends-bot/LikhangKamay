<?php

use App\Casts\PostgresCompatibleBoolean;
use App\Models\Category;
use App\Models\Product;
use App\Models\SellerComplianceAgreement;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $connectionName = $this->getConnection() ?: DB::getDefaultConnection();
        $isPretending = rescue(fn () => DB::connection($connectionName)->pretending(), false);

        if (app()->environment('testing') || $isPretending || $connectionName === 'verify_pgsql') {
            return;
        }

        // 1. Ensure approved artisans have active subscription and compliance agreement
        $artisanEmails = [
            'artisan.silang@likhangkamay.com',
            'artisan.amadeo@likhangkamay.com',
            'artisan@likhangkamay.com',
            'kurtapexlegends@gmail.com',
            'kurtgpro2@gmail.com',
            'test.artisan@likhangkamay.local',
        ];

        $approvedArtisans = User::where('role', 'artisan')
            ->where(function ($q) use ($artisanEmails) {
                $q->whereIn('email', $artisanEmails)
                  ->orWhere('artisan_status', 'approved');
            })
            ->get();

        foreach ($approvedArtisans as $artisan) {
            $artisan->update([
                'artisan_status' => 'approved',
                'subscription_status' => 'active',
                'subscription_tier' => $artisan->subscription_tier ?: 'elite',
                'trial_ends_at' => now()->addYear(),
            ]);

            SellerComplianceAgreement::firstOrCreate(
                ['user_id' => $artisan->id, 'document_type' => 'seller_terms'],
                [
                    'accepted_at' => now(),
                    'ip_address' => '127.0.0.1',
                    'user_agent' => 'ProductionCatalogSeeder',
                ]
            );
        }

        $primaryArtisan = $approvedArtisans->firstWhere('email', 'artisan.silang@likhangkamay.com')
            ?? $approvedArtisans->firstWhere('email', 'artisan@likhangkamay.com')
            ?? $approvedArtisans->first();

        if (!$primaryArtisan) {
            return;
        }

        // 2. Ensure categories exist
        $categoriesMap = [
            'Tableware' => Category::firstOrCreate(['slug' => 'tableware'], ['name' => 'Tableware', 'icon' => 'Utensils']),
            'Drinkware' => Category::firstOrCreate(['slug' => 'drinkware'], ['name' => 'Drinkware', 'icon' => 'Coffee']),
            'Vases & Jars' => Category::firstOrCreate(['slug' => 'vases-jars'], ['name' => 'Vases & Jars', 'icon' => 'Flower2']),
            'Planters & Pots' => Category::firstOrCreate(['slug' => 'planters-pots'], ['name' => 'Planters & Pots', 'icon' => 'Sprout']),
            'Home Decor' => Category::firstOrCreate(['slug' => 'home-decor'], ['name' => 'Home Decor', 'icon' => 'Home']),
            'Kitchenware' => Category::firstOrCreate(['slug' => 'kitchenware'], ['name' => 'Kitchenware', 'icon' => 'ChefHat']),
            'Artisan Sets' => Category::firstOrCreate(['slug' => 'artisan-sets'], ['name' => 'Artisan Sets', 'icon' => 'Gift']),
        ];

        // 3. Define 24 authentic, realistic Cavite artisan products
        $realisticProducts = [
            // --- TABLEWARE ---
            [
                'sku' => 'TAB-PLATE-01',
                'name' => 'Silang Handcrafted Stoneware Dinner Plate',
                'category' => 'Tableware',
                'price' => 480.00,
                'cost_price' => 220.00,
                'stock' => 24,
                'lead_time' => 2,
                'sold' => 28,
                'cover_photo_path' => '/images/demo/products/dinner-plate-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/dinner-plate-cover.jpg',
                    '/images/demo/products/bowl-1.png',
                    '/images/demo/products/bowl-2.png',
                ],
                'model_3d_path' => null,
                'clay_type' => 'Silang Terracotta & Stoneware Blend',
                'glaze_type' => 'Matte Stone Speckled Glaze',
                'firing_method' => 'Cone 6 Electric Kiln',
                'food_safe' => true,
                'colors' => ['Earthy Beige', 'Stone Gray'],
                'height' => 2.5,
                'width' => 26.0,
                'weight' => 650,
                'description' => 'Wheel-thrown dinner plate crafted with locally harvested Silang clay. Features a tactile raw clay rim and a durable food-safe satin matte glaze perfect for everyday dining.',
            ],
            [
                'sku' => 'TAB-BOWL-02',
                'name' => 'Tagaytay Wood-Fired Ceramic Ramen Bowl',
                'category' => 'Tableware',
                'price' => 590.00,
                'cost_price' => 260.00,
                'stock' => 18,
                'lead_time' => 3,
                'sold' => 42,
                'cover_photo_path' => '/images/demo/products/bowl-cover.png',
                'gallery_paths' => [
                    '/images/demo/products/bowl-1.png',
                    '/images/demo/products/bowl-2.png',
                    '/images/demo/products/bowl-3.png',
                ],
                'model_3d_path' => '/models/demo/tableware-bowl.glb',
                'clay_type' => 'High-Fire Dark Stoneware',
                'glaze_type' => 'Iron Oxide & Matte Black',
                'firing_method' => 'Wood-fired Kiln (Cone 10)',
                'food_safe' => true,
                'colors' => ['Charcoal Black', 'Earthy Brown'],
                'height' => 9.0,
                'width' => 18.5,
                'weight' => 580,
                'description' => 'Deep ceramic noodle bowl shaped on the potter\'s wheel in Tagaytay. The wood-firing process creates organic ash speckling and unique thermal color variations on every single piece.',
            ],
            [
                'sku' => 'TAB-BOWL-03',
                'name' => 'Amadeo Hand-Carved Matcha Ceremonial Bowl',
                'category' => 'Tableware',
                'price' => 680.00,
                'cost_price' => 300.00,
                'stock' => 12,
                'lead_time' => 2,
                'sold' => 19,
                'cover_photo_path' => '/images/demo/products/matcha-bowl-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/matcha-bowl-cover.jpg',
                    '/images/demo/products/bowl-1.png',
                    '/images/demo/products/bowl-3.png',
                ],
                'model_3d_path' => null,
                'clay_type' => 'Amadeo Kaolin White Clay',
                'glaze_type' => 'Celadon Green Glaze',
                'firing_method' => 'Reduction Gas Firing',
                'food_safe' => true,
                'colors' => ['Celadon Green', 'Warm White'],
                'height' => 7.5,
                'width' => 12.0,
                'weight' => 380,
                'description' => 'Traditional wide-mouth matcha bowl (chawan) crafted for tea ceremonies. Contoured base allows seamless whisking, finished with a subtle crackle celadon glaze.',
            ],
            [
                'sku' => 'TAB-BOWL-04',
                'name' => 'Rustic Terracotta Serving Tapas Bowl',
                'category' => 'Tableware',
                'price' => 350.00,
                'cost_price' => 150.00,
                'stock' => 30,
                'lead_time' => 2,
                'sold' => 35,
                'cover_photo_path' => '/images/demo/products/bowl-1.png',
                'gallery_paths' => [
                    '/images/demo/products/bowl-1.png',
                    '/images/demo/products/bowl-2.png',
                    '/images/demo/products/bowl-cover.png',
                ],
                'model_3d_path' => null,
                'clay_type' => 'Red Terracotta River Clay',
                'glaze_type' => 'Gloss Clear Food-Safe Inner',
                'firing_method' => 'Low-fire Earthenware',
                'food_safe' => true,
                'colors' => ['Terracotta Red', 'Natural Ochre'],
                'height' => 5.0,
                'width' => 14.0,
                'weight' => 320,
                'description' => 'Charming shallow serving dish for appetizers, dips, and table centerpieces. Retains the natural warm terracotta exterior with a glossy easy-to-clean inner surface.',
            ],

            // --- DRINKWARE ---
            [
                'sku' => 'DRK-MUG-01',
                'name' => 'Cavite Coastal Speckled Drip Coffee Mug',
                'category' => 'Drinkware',
                'price' => 420.00,
                'cost_price' => 180.00,
                'stock' => 25,
                'lead_time' => 2,
                'sold' => 56,
                'cover_photo_path' => '/images/demo/products/drip-mug-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/mug-1.png',
                    '/images/demo/products/mug-2.png',
                    '/images/demo/products/mug-3.png',
                ],
                'model_3d_path' => '/models/demo/drinkware-mug.glb',
                'clay_type' => 'Silang Buff Stoneware',
                'glaze_type' => 'Speckled Oatmeal Glaze',
                'firing_method' => 'Cone 6 Oxidation',
                'food_safe' => true,
                'colors' => ['Speckled Cream', 'Warm Sand'],
                'height' => 9.5,
                'width' => 8.5,
                'weight' => 340,
                'description' => 'Generously sized 350ml morning coffee mug with an ergonomic pulled handle. Hand-dipped in speckled oatmeal glaze that celebrates natural mineral impurities in Cavite clay.',
            ],
            [
                'sku' => 'DRK-CUP-02',
                'name' => 'Amadeo Coffee Farm Espresso Demitasse Cup',
                'category' => 'Drinkware',
                'price' => 280.00,
                'cost_price' => 110.00,
                'stock' => 40,
                'lead_time' => 1,
                'sold' => 64,
                'cover_photo_path' => '/images/demo/products/espresso-cup-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/espresso-cup-cover.jpg',
                    '/images/demo/products/mug-1.png',
                    '/images/demo/products/mug-2.png',
                ],
                'model_3d_path' => null,
                'clay_type' => 'Dark Chocolate Stoneware',
                'glaze_type' => 'Matte White Dip Glaze',
                'firing_method' => 'Cone 6 Electric',
                'food_safe' => true,
                'colors' => ['Raw Chocolate', 'Matte White'],
                'height' => 6.0,
                'width' => 6.5,
                'weight' => 180,
                'description' => 'Single/double espresso cup inspired by Amadeo\'s rich coffee heritage. Features a thick thermal wall that retains crema temperature and an unglazed bottom foot ring.',
            ],
            [
                'sku' => 'DRK-MUG-03',
                'name' => 'Artisan Studio Ribbed Ceramic Latte Mug',
                'category' => 'Drinkware',
                'price' => 460.00,
                'cost_price' => 190.00,
                'stock' => 22,
                'lead_time' => 2,
                'sold' => 31,
                'cover_photo_path' => '/images/demo/products/mug-cover.png',
                'gallery_paths' => [
                    '/images/demo/products/mug-1.png',
                    '/images/demo/products/mug-2.png',
                    '/images/demo/products/mug-3.png',
                ],
                'model_3d_path' => null,
                'clay_type' => 'Warm Buff Stoneware',
                'glaze_type' => 'Two-Tone Forest Green & Ash',
                'firing_method' => 'Cone 6 Electric',
                'food_safe' => true,
                'colors' => ['Forest Green', 'Sand Beige'],
                'height' => 10.0,
                'width' => 9.0,
                'weight' => 360,
                'description' => 'Tactile throwing rings accent the body of this sturdy 380ml latte mug. Smooth glaze inside and top rim ensures a pleasant drinking experience while keeping a hand-crafted grip.',
            ],
            [
                'sku' => 'DRK-CUP-04',
                'name' => 'Handcrafted Double-Walled Clay Teacup',
                'category' => 'Drinkware',
                'price' => 320.00,
                'cost_price' => 130.00,
                'stock' => 35,
                'lead_time' => 2,
                'sold' => 22,
                'cover_photo_path' => '/images/demo/products/mug-2.png',
                'gallery_paths' => [
                    '/images/demo/products/mug-2.png',
                    '/images/demo/products/mug-3.png',
                    '/images/demo/products/drip-mug-cover.jpg',
                ],
                'model_3d_path' => null,
                'clay_type' => 'White Kaolin Clay',
                'glaze_type' => 'Satin Amber Glaze',
                'firing_method' => 'Cone 8 Gas Firing',
                'food_safe' => true,
                'colors' => ['Warm Amber', 'Ivory'],
                'height' => 7.0,
                'width' => 7.5,
                'weight' => 220,
                'description' => 'Handle-less Japanese-style Yunomi teacup hand-turned in Silang. Insulating clay body keeps hot steeped green tea warm while staying comfortable to hold.',
            ],

            // --- VASES & JARS ---
            [
                'sku' => 'VAS-BLUE-01',
                'name' => 'Hand-Painted Blue Feather Heritage Vase',
                'category' => 'Vases & Jars',
                'price' => 1150.00,
                'cost_price' => 480.00,
                'stock' => 10,
                'lead_time' => 4,
                'sold' => 18,
                'cover_photo_path' => '/images/demo/products/blue-feather-vase-cover.png',
                'gallery_paths' => [
                    '/images/demo/products/blue-feather-vase-1.jpg',
                    '/images/demo/products/blue-feather-vase-2.jpg',
                    '/images/demo/products/blue-feather-vase-3.jpg',
                ],
                'model_3d_path' => '/models/demo/blue-feather-vase.glb',
                'clay_type' => 'Porcelain & Stoneware Composite',
                'glaze_type' => 'Cobalt Blue Brushwork with Clear Gloss',
                'firing_method' => 'Cone 10 Reduction',
                'food_safe' => false,
                'colors' => ['Cobalt Blue', 'Crisp White'],
                'height' => 24.0,
                'width' => 13.0,
                'weight' => 1150,
                'description' => 'Signature artisan heirloom vase adorned with flowing brushstroke feather motifs in vibrant cobalt oxide. Includes interactive 3D model viewing in the storefront.',
            ],
            [
                'sku' => 'VAS-PITCH-02',
                'name' => 'Burnished Terracotta Water Pitcher & Jar',
                'category' => 'Vases & Jars',
                'price' => 890.00,
                'cost_price' => 360.00,
                'stock' => 15,
                'lead_time' => 3,
                'sold' => 25,
                'cover_photo_path' => '/images/demo/products/clay-pitcher-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/clay-pitcher-cover.jpg',
                    '/images/demo/products/vase-1.png',
                    '/images/demo/products/vase-2.png',
                ],
                'model_3d_path' => null,
                'clay_type' => 'Native Cavite Terracotta',
                'glaze_type' => 'Smooth Riverstone Burnished (Unglazed)',
                'firing_method' => 'Traditional Wood Open Pit',
                'food_safe' => false,
                'colors' => ['Burnished Ochre', 'Brick Red'],
                'height' => 22.0,
                'width' => 15.0,
                'weight' => 1300,
                'description' => 'Inspired by ancestral Filipino \'banga\' water jars. Burnished by hand with river pebbles to achieve a smooth natural sheen without synthetic glass glazes.',
            ],
            [
                'sku' => 'VAS-BUD-03',
                'name' => 'Fluted Minimalist Ceramic Bud Vase',
                'category' => 'Vases & Jars',
                'price' => 450.00,
                'cost_price' => 180.00,
                'stock' => 28,
                'lead_time' => 2,
                'sold' => 45,
                'cover_photo_path' => '/images/demo/products/bud-vase-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/bud-vase-cover.jpg',
                    '/images/demo/products/vase-2.png',
                    '/images/demo/products/vase-3.png',
                ],
                'model_3d_path' => null,
                'clay_type' => 'Silang Buff Stoneware',
                'glaze_type' => 'Chalk White Matte Glaze',
                'firing_method' => 'Cone 6 Oxidation',
                'food_safe' => false,
                'colors' => ['Chalk White', 'Warm Stone'],
                'height' => 14.5,
                'width' => 7.5,
                'weight' => 420,
                'description' => 'Petite desktop bud vase with vertical fluting for a single dried flower stem or fresh botanical sprig. Weighted bottom ensures stability.',
            ],
            [
                'sku' => 'VAS-FLORAL-04',
                'name' => 'Botanical Floral Decorative Amphora Vase',
                'category' => 'Vases & Jars',
                'price' => 1350.00,
                'cost_price' => 550.00,
                'stock' => 8,
                'lead_time' => 5,
                'sold' => 12,
                'cover_photo_path' => '/images/demo/products/colorful-vase-cover.png',
                'gallery_paths' => [
                    '/images/demo/products/colorful-vase-1.png',
                    '/images/demo/products/colorful-vase-2.png',
                    '/images/demo/products/colorful-vase-3.png',
                ],
                'model_3d_path' => null,
                'clay_type' => 'Fine Stoneware',
                'glaze_type' => 'Multi-Color Enamel Slip Glaze',
                'firing_method' => 'Cone 8 Electric',
                'food_safe' => false,
                'colors' => ['Multicolor', 'Terracotta Gold'],
                'height' => 26.0,
                'width' => 14.0,
                'weight' => 1450,
                'description' => 'Ornate Mediterranean-inspired amphora vase with hand-pinched side handles and colorful floral underglazes fired onto warm earthenware.',
            ],

            // --- PLANTERS & POTS ---
            [
                'sku' => 'PLT-SUCC-01',
                'name' => 'Silang Ribbed Terracotta Succulent Planter',
                'category' => 'Planters & Pots',
                'price' => 320.00,
                'cost_price' => 120.00,
                'stock' => 35,
                'lead_time' => 1,
                'sold' => 52,
                'cover_photo_path' => '/images/demo/products/succulent-pot-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/succulent-pot-cover.jpg',
                    '/images/demo/products/garden-planter-cover.jpg',
                ],
                'model_3d_path' => null,
                'clay_type' => 'Silang Native Terracotta',
                'glaze_type' => 'Porous Unglazed Natural',
                'firing_method' => 'Cone 04 Low-fire',
                'food_safe' => false,
                'colors' => ['Earthy Terracotta'],
                'height' => 8.0,
                'width' => 10.0,
                'weight' => 350,
                'description' => 'Porous natural clay pot designed specifically for cacti and succulents. Breathable terracotta walls prevent root rot, complete with centered drainage hole.',
            ],
            [
                'sku' => 'PLT-GARD-02',
                'name' => 'Hand-Turned Stoneware Garden Cylinder Planter',
                'category' => 'Planters & Pots',
                'price' => 780.00,
                'cost_price' => 320.00,
                'stock' => 16,
                'lead_time' => 3,
                'sold' => 21,
                'cover_photo_path' => '/images/demo/products/garden-planter-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/garden-planter-cover.jpg',
                    '/images/demo/products/succulent-pot-cover.jpg',
                ],
                'model_3d_path' => null,
                'clay_type' => 'Weather-Resistant Stoneware',
                'glaze_type' => 'Speckled Sand Semi-Matte',
                'firing_method' => 'Cone 6 Electric',
                'food_safe' => false,
                'colors' => ['Speckled Sand', 'Oatmeal'],
                'height' => 16.0,
                'width' => 17.0,
                'weight' => 1200,
                'description' => 'Substantial indoor/outdoor plant pot for monsteras, fiddle leaf figs, or tabletop palms. Fired to vitrification so it will never crack or flake in tropical humidity.',
            ],
            [
                'sku' => 'PLT-HANG-03',
                'name' => 'Hanging Ceramic Orchid Pod with Cavite Abaca Cord',
                'category' => 'Planters & Pots',
                'price' => 550.00,
                'cost_price' => 220.00,
                'stock' => 20,
                'lead_time' => 2,
                'sold' => 17,
                'cover_photo_path' => '/images/demo/products/vase-1.png',
                'gallery_paths' => [
                    '/images/demo/products/vase-1.png',
                    '/images/demo/products/succulent-pot-cover.jpg',
                ],
                'model_3d_path' => null,
                'clay_type' => 'White Stoneware',
                'glaze_type' => 'Matte Chalk Dip Glaze',
                'firing_method' => 'Cone 6 Oxidation',
                'food_safe' => false,
                'colors' => ['Matte White', 'Natural Abaca'],
                'height' => 11.0,
                'width' => 13.0,
                'weight' => 550,
                'description' => 'Spherical hanging planter cradled in three-strand Cavite abaca rope. Slotted aeration cutouts allow healthy air circulation for tropical epiphytes.',
            ],
            [
                'sku' => 'PLT-BONS-04',
                'name' => 'Bonsai & Rock Garden Shallow Clay Dish',
                'category' => 'Planters & Pots',
                'price' => 640.00,
                'cost_price' => 260.00,
                'stock' => 14,
                'lead_time' => 3,
                'sold' => 14,
                'cover_photo_path' => '/images/demo/products/bowl-3.png',
                'gallery_paths' => [
                    '/images/demo/products/bowl-3.png',
                    '/images/demo/products/bowl-cover.png',
                ],
                'model_3d_path' => null,
                'clay_type' => 'Dark Iron Mountain Stoneware',
                'glaze_type' => 'Raw Burnished Rim with Matt Slate Base',
                'firing_method' => 'Wood Kiln',
                'food_safe' => false,
                'colors' => ['Deep Slate', 'Earthy Umber'],
                'height' => 5.5,
                'width' => 22.0,
                'weight' => 850,
                'description' => 'Low-profile oval ceramic dish crafted for miniature bonsai trees and tabletop zen rock arrangements. Fitted with twin drainage ports and wiring holes.',
            ],

            // --- HOME DECOR ---
            [
                'sku' => 'DEC-INCN-01',
                'name' => 'Silang Terracotta Lotus Incense Burner & Dish',
                'category' => 'Home Decor',
                'price' => 340.00,
                'cost_price' => 130.00,
                'stock' => 30,
                'lead_time' => 1,
                'sold' => 49,
                'cover_photo_path' => '/images/demo/products/incense-holder-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/incense-holder-cover.jpg',
                    '/images/demo/products/bud-vase-cover.jpg',
                ],
                'model_3d_path' => null,
                'clay_type' => 'Silang Red Clay',
                'glaze_type' => 'Natural Matte with Polished Center',
                'firing_method' => 'Cone 04 Earthenware',
                'food_safe' => false,
                'colors' => ['Terracotta Red', 'Charcoal Gray'],
                'height' => 3.0,
                'width' => 11.5,
                'weight' => 250,
                'description' => 'Hand-sculpted dish with brass insert sized for both stick and cone incense. Wide rim catches ash neatly to keep desks, altars, and coffee tables pristine.',
            ],
            [
                'sku' => 'DEC-CNDL-02',
                'name' => 'Hand-Pinched Ceramic Pillar Candle Stand',
                'category' => 'Home Decor',
                'price' => 480.00,
                'cost_price' => 190.00,
                'stock' => 22,
                'lead_time' => 2,
                'sold' => 26,
                'cover_photo_path' => '/images/demo/products/vase-3.png',
                'gallery_paths' => [
                    '/images/demo/products/vase-3.png',
                    '/images/demo/products/bud-vase-cover.jpg',
                ],
                'model_3d_path' => null,
                'clay_type' => 'Stoneware',
                'glaze_type' => 'Bone White Satin Glaze',
                'firing_method' => 'Cone 6 Oxidation',
                'food_safe' => false,
                'colors' => ['Bone White', 'Warm Cream'],
                'height' => 12.0,
                'width' => 10.0,
                'weight' => 400,
                'description' => 'Sculptural organic candle holder with flared wax catch plate. Every curve bears subtle thumbprints of the Silang artisan who shaped it.',
            ],
            [
                'sku' => 'DEC-TRAY-03',
                'name' => 'Artisan Studio Ceramic Catchall Tray',
                'category' => 'Home Decor',
                'price' => 390.00,
                'cost_price' => 150.00,
                'stock' => 28,
                'lead_time' => 2,
                'sold' => 33,
                'cover_photo_path' => '/images/demo/products/dinner-plate-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/dinner-plate-cover.jpg',
                    '/images/demo/products/bowl-2.png',
                ],
                'model_3d_path' => null,
                'clay_type' => 'Buff Stoneware',
                'glaze_type' => 'Reactive Seafoam Glaze',
                'firing_method' => 'Cone 6 Electric',
                'food_safe' => false,
                'colors' => ['Seafoam Green', 'Sandy Gray'],
                'height' => 2.0,
                'width' => 18.0,
                'weight' => 380,
                'description' => 'Sleek organic valet tray for keys, jewelry, watches, or desk stationary. The reactive seafoam glaze pools beautifully in the tray\'s gentle depression.',
            ],
            [
                'sku' => 'DEC-DIFF-04',
                'name' => 'Aromatherapy Essential Oil Ceramic Diffuser',
                'category' => 'Home Decor',
                'price' => 580.00,
                'cost_price' => 240.00,
                'stock' => 19,
                'lead_time' => 2,
                'sold' => 20,
                'cover_photo_path' => '/images/demo/products/bud-vase-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/bud-vase-cover.jpg',
                    '/images/demo/products/incense-holder-cover.jpg',
                ],
                'model_3d_path' => null,
                'clay_type' => 'Porous Terracotta Composite',
                'glaze_type' => 'Glazed Water Basin with Raw Clay Base',
                'firing_method' => 'Cone 2 Electric',
                'food_safe' => false,
                'colors' => ['Muted Sage', 'Raw Terracotta'],
                'height' => 11.0,
                'width' => 9.0,
                'weight' => 450,
                'description' => 'Tealight-powered ceramic oil warmer. Deep reservoir holds water and botanical essential oils (such as lemongrass or ylang-ylang) for hours of steady fragrance diffusion.',
            ],

            // --- KITCHENWARE ---
            [
                'sku' => 'KIT-ALMI-01',
                'name' => 'Traditional Cavite Ceramic Mortar & Pestle (Almires)',
                'category' => 'Kitchenware',
                'price' => 750.00,
                'cost_price' => 310.00,
                'stock' => 15,
                'lead_time' => 3,
                'sold' => 37,
                'cover_photo_path' => '/images/demo/products/bowl-cover.png',
                'gallery_paths' => [
                    '/images/demo/products/bowl-cover.png',
                    '/images/demo/products/bowl-2.png',
                ],
                'model_3d_path' => null,
                'clay_type' => 'Heavy Dense Vitrified Stoneware',
                'glaze_type' => 'Unglazed Textured Interior, Satin Exterior',
                'firing_method' => 'Cone 9 Kiln',
                'food_safe' => true,
                'colors' => ['Granite Charcoal', 'Natural Ash'],
                'height' => 10.0,
                'width' => 13.5,
                'weight' => 1250,
                'description' => 'Heavyweight ceramic mortar and pestle crafted for crushing peppercorns, garlic, fresh herbs, and grinding tabletop dipping sauces (sawsawan).',
            ],
            [
                'sku' => 'KIT-SPON-02',
                'name' => 'Handcrafted Stoneware Spoon Rest',
                'category' => 'Kitchenware',
                'price' => 260.00,
                'cost_price' => 95.00,
                'stock' => 40,
                'lead_time' => 1,
                'sold' => 58,
                'cover_photo_path' => '/images/demo/products/bowl-2.png',
                'gallery_paths' => [
                    '/images/demo/products/bowl-2.png',
                    '/images/demo/products/dinner-plate-cover.jpg',
                ],
                'model_3d_path' => null,
                'clay_type' => 'Silang Buff Stoneware',
                'glaze_type' => 'High-Gloss Cream White Food-Safe Glaze',
                'firing_method' => 'Cone 6 Electric',
                'food_safe' => true,
                'colors' => ['Cream White', 'Speckled Beige'],
                'height' => 2.5,
                'width' => 12.0,
                'weight' => 200,
                'description' => 'Indispensable countertop accessory to keep stovetops clean while cooking adobo or sinigang. Contoured to cradle spatulas, ladles, and tasting spoons.',
            ],

            // --- ARTISAN SETS ---
            [
                'sku' => 'SET-TEAS-01',
                'name' => '4-Piece Heirloom Ceramic Teapot & Cup Set',
                'category' => 'Artisan Sets',
                'price' => 1950.00,
                'cost_price' => 820.00,
                'stock' => 10,
                'lead_time' => 4,
                'sold' => 23,
                'cover_photo_path' => '/images/demo/products/tea-set-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/tea-set-cover.jpg',
                    '/images/demo/products/espresso-cup-cover.jpg',
                    '/images/demo/products/drip-mug-cover.jpg',
                ],
                'model_3d_path' => null,
                'clay_type' => 'Fine Stoneware',
                'glaze_type' => 'Rustic Tenmoku Brown & Cream Dip',
                'firing_method' => 'Cone 8 Reduction',
                'food_safe' => true,
                'colors' => ['Tenmoku Rust', 'Cream White'],
                'height' => 18.0,
                'width' => 20.0,
                'weight' => 1800,
                'description' => 'Complete hand-thrown tea service featuring a 650ml teapot with cane handle, matching infuser insert, and three stackable ceramic teacups. Packaged in a native woven box.',
            ],
            [
                'sku' => 'SET-BRKF-02',
                'name' => 'Artisan Breakfast Duo (Stoneware Bowl & Latte Mug Pair)',
                'category' => 'Artisan Sets',
                'price' => 850.00,
                'cost_price' => 360.00,
                'stock' => 18,
                'lead_time' => 2,
                'sold' => 40,
                'cover_photo_path' => '/images/demo/products/drip-mug-cover.jpg',
                'gallery_paths' => [
                    '/images/demo/products/drip-mug-cover.jpg',
                    '/images/demo/products/bowl-cover.png',
                    '/images/demo/products/mug-cover.png',
                ],
                'model_3d_path' => null,
                'clay_type' => 'Silang Buff Stoneware',
                'glaze_type' => 'Two-Tone Oatmeal & Warm Terracotta',
                'firing_method' => 'Cone 6 Oxidation',
                'food_safe' => true,
                'colors' => ['Oatmeal Cream', 'Terracotta'],
                'height' => 12.0,
                'width' => 16.0,
                'weight' => 950,
                'description' => 'Coordinated morning pair including one wide cereal/granola bowl and a matching 350ml morning mug. Designed for daily use and microwave/dishwasher safe.',
            ],
        ];

        // 4. Distribute realistic products evenly across approved active artisans
        $artisanCount = $approvedArtisans->count();

        foreach ($realisticProducts as $index => $pData) {
            $assignedArtisan = $approvedArtisans[$index % $artisanCount] ?? $primaryArtisan;
            $slugBase = Str::slug($pData['name']);

            Product::withTrashed()->updateOrCreate(
                ['sku' => $pData['sku']],
                [
                    'user_id' => $assignedArtisan->id,
                    'name' => $pData['name'],
                    'slug' => $slugBase . '-' . strtolower(substr($pData['sku'], -4)),
                    'category' => $pData['category'],
                    'price' => $pData['price'],
                    'cost_price' => $pData['cost_price'],
                    'stock' => $pData['stock'],
                    'status' => 'Active',
                    'is_b2b_supply' => PostgresCompatibleBoolean::dbVal(false),
                    'lead_time' => $pData['lead_time'],
                    'sold' => $pData['sold'],
                    'description' => $pData['description'],
                    'cover_photo_path' => $pData['cover_photo_path'],
                    'gallery_paths' => $pData['gallery_paths'],
                    'model_3d_path' => $pData['model_3d_path'],
                    'clay_type' => $pData['clay_type'],
                    'glaze_type' => $pData['glaze_type'],
                    'firing_method' => $pData['firing_method'],
                    'food_safe' => PostgresCompatibleBoolean::dbVal($pData['food_safe']),
                    'colors' => $pData['colors'],
                    'height' => $pData['height'],
                    'width' => $pData['width'],
                    'weight' => (int) ($pData['weight'] ?? 500),
                    'production_method' => 'Handcrafted',
                    'track_as_supply' => PostgresCompatibleBoolean::dbVal(false),
                    'deleted_at' => null,
                ]
            );
        }

        // 5. Invalidate catalog and homepage caches so the fresh catalog appears instantly
        Cache::forget('shop_catalog_default_page_1');
        Cache::forget('shop_catalog_default_page_1_12');
        Cache::forget('shop_catalog_default_page_1_24');
        Cache::forget('home_sponsored_products');
        Cache::forget('home_featured_products_pool');
        Cache::forget('home_top_sellers');
        Cache::forget('home_categories');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Safe additive migration; no data destruction
    }
};

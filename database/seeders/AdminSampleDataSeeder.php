<?php

namespace Database\Seeders;

use App\Models\Dispute;
use App\Models\FlaggedContent;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Review;
use App\Models\ReviewDispute;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminSampleDataSeeder extends Seeder
{
    public function run(): void
    {
        $buyer = User::where('role', 'buyer')->first() ?? User::create([
            'name' => 'Maria Clara',
            'email' => 'maria.customer@example.com',
            'password' => Hash::make('Password123!'),
            'role' => 'buyer',
            'email_verified_at' => now(),
        ]);

        $artisan = User::where('role', 'artisan')->where('artisan_status', 'approved')->first();

        // -------------------------------------------------------------
        // 1. ARTISAN APPLICATIONS (Cavite Artisan Applicants)
        // -------------------------------------------------------------
        $pendingArtisans = [
            [
                'name' => 'Mateo Baguilat',
                'email' => 'tagaytay.crafts@example.com',
                'shop_name' => 'Tagaytay Woodcraft & Bamboo Guild',
                'phone_number' => '09205551234',
                'street_address' => '78 Tagaytay-Nasugbu Highway',
                'barangay' => 'Kaybagal South',
                'city' => 'Tagaytay City',
                'region' => 'Cavite',
                'zip_code' => '4120',
                'business_permit' => 'documents/sample_business_permit.pdf',
                'dti_registration' => 'documents/sample_dti.pdf',
                'valid_id' => 'documents/sample_valid_id.jpg',
                'tin_id' => 'documents/sample_tin.jpg',
                'payout_method' => 'gcash',
                'payout_account_name' => 'Mateo Baguilat',
                'payout_account_number' => '09205551234',
                'submitted_days_ago' => 1,
            ],
            [
                'name' => 'Ligaya Ramos',
                'email' => 'silang.pottery@example.com',
                'shop_name' => 'Silang Organic Terracotta Studio',
                'phone_number' => '09189876543',
                'street_address' => '12 Bypass Road',
                'barangay' => 'Biga I',
                'city' => 'Silang',
                'region' => 'Cavite',
                'zip_code' => '4118',
                'business_permit' => 'documents/sample_business_permit.pdf',
                'dti_registration' => 'documents/sample_dti.pdf',
                'valid_id' => 'documents/sample_valid_id.jpg',
                'tin_id' => 'documents/sample_tin.jpg',
                'payout_method' => 'bdo',
                'payout_account_name' => 'Ligaya Ramos',
                'payout_account_number' => '001234567890',
                'submitted_days_ago' => 3,
            ],
            [
                'name' => 'Juan Del Mundo',
                'email' => 'maragondon.weaves@example.com',
                'shop_name' => 'Maragondon Heritage Handweavers',
                'phone_number' => '09171234567',
                'street_address' => '45 Poblacion Riverside',
                'barangay' => 'Poblacion I-A',
                'city' => 'Maragondon',
                'region' => 'Cavite',
                'zip_code' => '4127',
                'business_permit' => 'documents/sample_business_permit.pdf',
                'dti_registration' => 'documents/sample_dti.pdf',
                'valid_id' => 'documents/sample_valid_id.jpg',
                'tin_id' => 'documents/sample_tin.jpg',
                'payout_method' => 'maya',
                'payout_account_name' => 'Juan Del Mundo',
                'payout_account_number' => '09171234567',
                'submitted_days_ago' => 5,
            ]
        ];

        foreach ($pendingArtisans as $p) {
            User::updateOrCreate(
                ['email' => $p['email']],
                [
                    'name' => $p['name'],
                    'password' => Hash::make('Password123!'),
                    'role' => 'artisan',
                    'artisan_status' => 'pending',
                    'shop_name' => $p['shop_name'],
                    'shop_slug' => Str::slug($p['shop_name']),
                    'phone_number' => $p['phone_number'],
                    'street_address' => $p['street_address'],
                    'barangay' => $p['barangay'],
                    'city' => $p['city'],
                    'region' => $p['region'],
                    'zip_code' => $p['zip_code'],
                    'business_permit' => $p['business_permit'],
                    'dti_registration' => $p['dti_registration'],
                    'valid_id' => $p['valid_id'],
                    'tin_id' => $p['tin_id'],
                    'payout_method' => $p['payout_method'],
                    'payout_account_name' => $p['payout_account_name'],
                    'payout_account_number' => $p['payout_account_number'],
                    'setup_completed_at' => now()->subDays($p['submitted_days_ago']),
                    'email_verified_at' => now(),
                ]
            );
        }

        // -------------------------------------------------------------
        // 2. PRODUCT APPROVALS & MODERATION
        // -------------------------------------------------------------
        $activeArtisan = User::where('role', 'artisan')->where('artisan_status', 'approved')->first() ?? $artisan;

        if ($activeArtisan) {
            $sampleProducts = [
                [
                    'name' => 'Hand-Carved Acacia Salad Bowl Set',
                    'status' => 'pending_review',
                    'price' => 1450.00,
                    'stock' => 12,
                    'sku' => 'ACACIA-BOWL-01',
                    'category' => 'Kitchenware',
                    'description' => 'Solid acacia wood hand-carved with food-safe beeswax finish.',
                ],
                [
                    'name' => 'Abaca Fiber Geometric Floor Planter',
                    'status' => 'pending_review',
                    'price' => 890.00,
                    'stock' => 20,
                    'sku' => 'ABACA-PLANT-02',
                    'category' => 'Home Living',
                    'description' => 'Woven Bicolano abaca fiber designed for indoor botanicals.',
                ],
                [
                    'name' => 'Traditional T\'boli Brass Bell Pendant',
                    'status' => 'flagged',
                    'price' => 620.00,
                    'stock' => 5,
                    'sku' => 'TBOLI-BELL-03',
                    'category' => 'Jewelry',
                    'description' => 'Authentic lost-wax cast brass heirloom piece.',
                ],
                [
                    'name' => 'Replica Antique Moriones Wooden Mask',
                    'status' => 'rejected',
                    'rejection_reason' => 'Cultural sensitivity guidelines require verified artisan accreditation.',
                    'price' => 2800.00,
                    'stock' => 2,
                    'sku' => 'MASK-MARIN-04',
                    'category' => 'Art & Collectibles',
                    'description' => 'Hand-painted ceremonial mask with Dap-dap wood.',
                ],
            ];

            foreach ($sampleProducts as $sp) {
                Product::updateOrCreate(
                    ['sku' => $sp['sku']],
                    [
                        'name' => $sp['name'],
                        'slug' => Str::slug($sp['name']) . '-' . Str::random(4),
                        'user_id' => $activeArtisan->id,
                        'category' => $sp['category'],
                        'price' => $sp['price'],
                        'stock' => $sp['stock'],
                        'status' => $sp['status'],
                        'rejection_reason' => $sp['rejection_reason'] ?? null,
                        'description' => $sp['description'],
                    ]
                );
            }
        }

        // -------------------------------------------------------------
        // 3. CONTENT SAFETY (Flags & Review Disputes)
        // -------------------------------------------------------------
        $flagProduct = Product::where('status', 'flagged')->first() ?? Product::first();
        if ($flagProduct && $buyer) {
            FlaggedContent::updateOrCreate(
                [
                    'reporter_id' => $buyer->id,
                    'reportable_type' => Product::class,
                    'reportable_id' => $flagProduct->id,
                ],
                [
                    'reason' => 'Suspicious indigenous heritage authenticity claim without proper accreditation.',
                    'status' => 'pending',
                    'created_at' => now()->subHours(6),
                ]
            );

            $review = Review::firstOrCreate(
                ['product_id' => $flagProduct->id, 'user_id' => $buyer->id],
                [
                    'rating' => 1,
                    'comment' => 'Received a damaged package with missing attachments. Very disappointed with response.',
                    'created_at' => now()->subDays(2),
                ]
            );

            ReviewDispute::updateOrCreate(
                ['review_id' => $review->id],
                [
                    'seller_owner_id' => $flagProduct->user_id,
                    'reported_by_user_id' => $flagProduct->user_id,
                    'status' => 'pending',
                    'reason' => 'Defamation & Untrue Claim',
                    'details' => 'Customer confirmed via direct messages that all attachments were received intact later on, but refused to update the review.',
                    'created_at' => now()->subDay(),
                ]
            );
        }

        // -------------------------------------------------------------
        // 4. ORDER DISPUTES (Escalated Claims)
        // -------------------------------------------------------------
        if ($activeArtisan && $buyer) {
            $sampleOrder = Order::updateOrCreate(
                ['order_number' => 'ORD-2026-DISPUTE-01'],
                [
                    'user_id' => $buyer->id,
                    'artisan_id' => $activeArtisan->id,
                    'status' => 'delivered',
                    'merchandise_subtotal' => 3000.00,
                    'shipping_fee_amount' => 200.00,
                    'total_amount' => 3200.00,
                    'customer_name' => $buyer->name,
                    'shipping_street_address' => 'Unit 1204, Tower B, Ayala Ave',
                    'shipping_barangay' => 'San Lorenzo',
                    'shipping_city' => 'Makati City',
                    'shipping_region' => 'Metro Manila',
                    'shipping_postal_code' => '1223',
                    'shipping_address' => 'Unit 1204, Tower B, Makati City, Metro Manila',
                    'created_at' => now()->subDays(8),
                    'delivered_at' => now()->subDays(4),
                ]
            );

            $disputeProduct = Product::first();
            if ($disputeProduct) {
                OrderItem::firstOrCreate(
                    ['order_id' => $sampleOrder->id, 'product_id' => $disputeProduct->id],
                    [
                        'product_name' => $disputeProduct->name,
                        'quantity' => 1,
                        'price' => 3000.00,
                    ]
                );
            }

            Dispute::updateOrCreate(
                ['order_id' => $sampleOrder->id],
                [
                    'status' => 'escalated',
                    'reason' => 'Ceramic vessel arrived with hairline cracks and broken spout due to courier mishandling.',
                    'proof_photos' => ['/images/placeholder.svg'],
                    'seller_response_type' => 'reject',
                    'seller_explanation' => 'Item was packed with three layers of bubble wrap and fragile tags. Seller claims parcel was dropped by 3rd party rider.',
                    'escalation_reason' => 'Seller refused refund or courier claims cooperation after 4 days of deadlock.',
                    'created_at' => now()->subDays(3),
                    'updated_at' => now()->subHours(4),
                ]
            );
        }
    }
}

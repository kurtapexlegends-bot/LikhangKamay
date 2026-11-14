<?php

namespace Database\Seeders;

use App\Models\Discount;
use App\Models\Employee;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OwnerApproval;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\Product;
use App\Models\StockRequest;
use App\Models\Supply;
use App\Models\User;
use App\Models\Voucher;
use App\Services\OwnerApprovalService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TeamApprovalMockSeeder extends Seeder
{
    /**
     * Local-only comprehensive mock data seeder for Team Approvals.
     * Seeds realistic pending, approved, and declined requests across every domain.
     */
    public function run(): void
    {
        if (!app()->isLocal()) {
            $this->command?->warn('Skipped TeamApprovalMockSeeder: this seeder only runs in the local environment.');
            return;
        }

        $targetEmails = array_filter([
            env('APPROVAL_MOCK_SELLER_EMAIL'),
            'kurtapexlegends@gmail.com',
            'artisan@likhangkamay.com',
            'test.artisan@likhangkamay.local',
        ]);

        $sellers = User::query()
            ->where('role', 'artisan')
            ->where('artisan_status', 'approved')
            ->whereIn('email', $targetEmails)
            ->get();

        if ($sellers->isEmpty()) {
            $fallback = User::query()
                ->where('role', 'artisan')
                ->where('artisan_status', 'approved')
                ->whereIn('premium_tier', ['premium', 'super_premium'])
                ->first();

            if ($fallback) {
                $sellers = collect([$fallback]);
            }
        }

        if ($sellers->isEmpty()) {
            $this->command?->warn('No approved local artisan shops found for TeamApprovalMockSeeder.');
            return;
        }

        $approvalService = app(OwnerApprovalService::class);
        $buyer = User::withTrashed()->updateOrCreate(
            ['email' => 'mock.buyer.approvals@likhangkamay.local'],
            [
                'name' => 'Clarissa Dizon',
                'first_name' => 'Clarissa',
                'last_name' => 'Dizon',
                'password' => Hash::make('MockBuyer@2026!'),
                'role' => 'buyer',
                'phone_number' => '09175550199',
                'email_verified_at' => now(),
                'is_test' => true,
                'deleted_at' => null,
            ]
        );

        foreach ($sellers as $seller) {
            $this->seedShopApprovals($seller, $buyer, $approvalService);
            $this->command?->info("Seeded Team Approval mock queue for [{$seller->id}] {$seller->name} ({$seller->email})");
        }
    }

    protected function seedShopApprovals(User $seller, User $buyer, OwnerApprovalService $approvalService): void
    {
        // Clean legacy E2E / mock records scoped to this seeder prefix isn't destructive; we match by seller+domain+title.
        $password = Hash::make('MockStaff@2026!');

        $managerEmp = $this->upsertEmployee($seller, "EMP-MGR-{$seller->id}", [
            'name' => 'Liza Mendoza',
            'role' => 'Shop Manager',
            'salary' => 26000.00,
        ]);
        $hrEmp = $this->upsertEmployee($seller, "EMP-HR-{$seller->id}", [
            'name' => 'Marco Villanueva',
            'role' => 'HR & Payroll Coordinator',
            'salary' => 21000.00,
        ]);
        $clerkEmp = $this->upsertEmployee($seller, "EMP-CLK-{$seller->id}", [
            'name' => 'Carlo Reyes',
            'role' => 'Studio Stock Clerk',
            'salary' => 16500.00,
        ]);
        $promoEmp = $this->upsertEmployee($seller, "EMP-PRM-{$seller->id}", [
            'name' => 'Bea Santos',
            'role' => 'Promo & Customer Care Lead',
            'salary' => 18000.00,
        ]);

        $managerUser = $this->upsertStaffUser($seller, $managerEmp, "mock.manager.s{$seller->id}@likhangkamay.local", $password, true);
        $hrUser = $this->upsertStaffUser($seller, $hrEmp, "mock.hr.s{$seller->id}@likhangkamay.local", $password, false);
        $clerkUser = $this->upsertStaffUser($seller, $clerkEmp, "mock.clerk.s{$seller->id}@likhangkamay.local", $password, false);
        $promoUser = $this->upsertStaffUser($seller, $promoEmp, "mock.promo.s{$seller->id}@likhangkamay.local", $password, false);

        // 1. Products (wrapped with $bypassReview = true so Active mock items stay Active)
        Product::$bypassReview = true;
        try {
            $vaseProduct = Product::withTrashed()->updateOrCreate(
                ['sku' => "MOCK-S{$seller->id}-VASE"],
                [
                    'user_id' => $seller->id,
                    'name' => 'Imus Heritage Terracotta Pitcher',
                    'slug' => "imus-heritage-terracotta-pitcher-s{$seller->id}",
                    'category' => 'Pottery & Ceramics',
                    'price' => 1250.00,
                    'cost_price' => 540.00,
                    'stock' => 24,
                    'status' => 'Active',
                    'is_b2b_supply' => false,
                    'lead_time' => 2,
                    'description' => 'Hand-thrown stoneware pitcher finished with warm clay slip.',
                    'cover_photo_path' => '/images/placeholder.svg',
                    'deleted_at' => null,
                ]
            );

            $mugProduct = Product::withTrashed()->updateOrCreate(
                ['sku' => "MOCK-S{$seller->id}-MUG"],
                [
                    'user_id' => $seller->id,
                    'name' => 'Silang Matte Espresso Ceramic Mug',
                    'slug' => "silang-matte-espresso-ceramic-mug-s{$seller->id}",
                    'category' => 'Pottery & Ceramics',
                    'price' => 480.00,
                    'cost_price' => 195.00,
                    'stock' => 45,
                    'status' => 'Active',
                    'is_b2b_supply' => false,
                    'lead_time' => 1,
                    'description' => 'Wheel-thrown 220ml espresso mug in warm stone glaze.',
                    'cover_photo_path' => '/images/placeholder.svg',
                    'deleted_at' => null,
                ]
            );

            $draftTrayProduct = Product::withTrashed()->updateOrCreate(
                ['sku' => "MOCK-S{$seller->id}-TRAY"],
                [
                    'user_id' => $seller->id,
                    'name' => 'Hand-Carved Indang Kamagong Serving Tray',
                    'slug' => "hand-carved-indang-kamagong-tray-s{$seller->id}",
                    'category' => 'Woodcraft & Bamboo',
                    'price' => 1450.00,
                    'cost_price' => 720.00,
                    'stock' => 12,
                    'status' => 'Draft',
                    'is_b2b_supply' => false,
                    'lead_time' => 3,
                    'description' => 'Food-safe beeswax polished hardwood serving tray crafted in Indang, Cavite.',
                    'cover_photo_path' => '/images/placeholder.svg',
                    'deleted_at' => null,
                ]
            );

            $runnerProduct = Product::withTrashed()->updateOrCreate(
                ['sku' => "MOCK-S{$seller->id}-RUNNER"],
                [
                    'user_id' => $seller->id,
                    'name' => 'Woven Burias Loom Table Runner',
                    'slug' => "woven-burias-loom-table-runner-s{$seller->id}",
                    'category' => 'Textiles & Weaving',
                    'price' => 890.00,
                    'cost_price' => 410.00,
                    'stock' => 18,
                    'status' => 'Active',
                    'is_b2b_supply' => false,
                    'lead_time' => 2,
                    'description' => 'Handwoven abaca-cotton blend runner (180cm).',
                    'cover_photo_path' => '/images/placeholder.svg',
                    'deleted_at' => null,
                ]
            );

            $approvedProduct = Product::withTrashed()->updateOrCreate(
                ['sku' => "MOCK-S{$seller->id}-INFUSER"],
                [
                    'user_id' => $seller->id,
                    'name' => 'Amadeo Bamboo Tea Infuser Set',
                    'slug' => "amadeo-bamboo-tea-infuser-set-s{$seller->id}",
                    'category' => 'Woodcraft & Bamboo',
                    'price' => 620.00,
                    'cost_price' => 270.00,
                    'stock' => 30,
                    'status' => 'Active',
                    'is_b2b_supply' => false,
                    'lead_time' => 1,
                    'description' => 'Cured Cavite bamboo infuser with woven coaster.',
                    'cover_photo_path' => '/images/placeholder.svg',
                    'deleted_at' => null,
                ]
            );
        } finally {
            Product::$bypassReview = false;
        }

        // 2. Supplies & Stock Requests (Procurement)
        $claySupply = Supply::withTrashed()->updateOrCreate(
            ['user_id' => $seller->id, 'sku' => "SUP-MOCK-S{$seller->id}-CLAY"],
            [
                'name' => 'Silang Red Terracotta Clay (25kg Bags)',
                'category' => 'Raw Clay & Slips',
                'quantity' => 4,
                'unit' => 'bags',
                'min_stock' => 10,
                'max_stock' => 60,
                'unit_cost' => 320.00,
                'supplier' => 'Cavite Ceramic Quarry Co.',
                'notes' => 'Primary throwing body for pitchers and planters.',
                'deleted_at' => null,
            ]
        );

        $glazeSupply = Supply::withTrashed()->updateOrCreate(
            ['user_id' => $seller->id, 'sku' => "SUP-MOCK-S{$seller->id}-GLAZE"],
            [
                'name' => 'Food-Safe Stoneware Matte Clear Glaze',
                'category' => 'Glazes & Oxides',
                'quantity' => 14,
                'unit' => 'liters',
                'min_stock' => 8,
                'max_stock' => 40,
                'unit_cost' => 540.00,
                'supplier' => 'Manila Kiln & Pigments Supply',
                'notes' => 'Lead-free cone 6 dipping glaze.',
                'deleted_at' => null,
            ]
        );

        $cobaltSupply = Supply::withTrashed()->updateOrCreate(
            ['user_id' => $seller->id, 'sku' => "SUP-MOCK-S{$seller->id}-COBALT"],
            [
                'name' => 'Imported Cobalt Carbonate Oxide',
                'category' => 'Glazes & Oxides',
                'quantity' => 5,
                'unit' => 'kg',
                'min_stock' => 2,
                'max_stock' => 12,
                'unit_cost' => 2400.00,
                'supplier' => 'Pacific Glaze Imports',
                'notes' => 'Specialty blue underglaze pigment.',
                'deleted_at' => null,
            ]
        );

        $pendingStockReq = $this->upsertStockRequest($seller, $clerkUser, $claySupply, StockRequest::STATUS_PENDING, 40, StockRequest::URGENCY_IMMEDIATE, 'Kiln firing batch starts Wednesday — down to last 4 bags.');
        $approvedStockReq = $this->upsertStockRequest($seller, $clerkUser, $glazeSupply, StockRequest::STATUS_ACCOUNTING_APPROVED, 20, StockRequest::URGENCY_SOON, 'Regular monthly stoneware dip batch.');
        $rejectedStockReq = $this->upsertStockRequest($seller, $clerkUser, $cobaltSupply, StockRequest::STATUS_REJECTED, 15, StockRequest::URGENCY_ROUTINE, 'Stocking cobalt pigment for holiday line.', 'Quantity is 3x above 6-month usage. Reduce order to 4kg first.');

        // 3. Payroll Runs (HR Payroll)
        $pendingPayroll = $this->upsertPayrollRun($seller, $hrUser, 'Nov 2026 (Mock 1st Half)', 'pending', null, [
            ['employee' => $hrEmp, 'base_salary' => 21000, 'days_worked' => 11, 'overtime_pay' => 680, 'bonus' => 0, 'sss_ee' => 525, 'philhealth_ee' => 262.50, 'pagibig_ee' => 100, 'withholding_tax' => 310, 'sss_er' => 945, 'philhealth_er' => 262.50, 'pagibig_er' => 100],
            ['employee' => $clerkEmp, 'base_salary' => 16500, 'days_worked' => 11, 'overtime_pay' => 420, 'bonus' => 500, 'sss_ee' => 412.50, 'philhealth_ee' => 206.25, 'pagibig_ee' => 100, 'withholding_tax' => 0, 'sss_er' => 742.50, 'philhealth_er' => 206.25, 'pagibig_er' => 100],
            ['employee' => $promoEmp, 'base_salary' => 18000, 'days_worked' => 11, 'overtime_pay' => 0, 'bonus' => 750, 'sss_ee' => 450, 'philhealth_ee' => 225, 'pagibig_ee' => 100, 'withholding_tax' => 140, 'sss_er' => 810, 'philhealth_er' => 225, 'pagibig_er' => 100],
        ]);

        $approvedPayroll = $this->upsertPayrollRun($seller, $hrUser, 'Oct 2026 (Mock 2nd Half)', 'approved', null, [
            ['employee' => $managerEmp, 'base_salary' => 26000, 'days_worked' => 12, 'overtime_pay' => 0, 'bonus' => 1000, 'sss_ee' => 650, 'philhealth_ee' => 325, 'pagibig_ee' => 100, 'withholding_tax' => 640, 'sss_er' => 1170, 'philhealth_er' => 325, 'pagibig_er' => 100],
            ['employee' => $clerkEmp, 'base_salary' => 16500, 'days_worked' => 12, 'overtime_pay' => 350, 'bonus' => 0, 'sss_ee' => 412.50, 'philhealth_ee' => 206.25, 'pagibig_ee' => 100, 'withholding_tax' => 0, 'sss_er' => 742.50, 'philhealth_er' => 206.25, 'pagibig_er' => 100],
        ]);

        // 4. Orders (Cash Refunds)
        $refundGcashOrder = $this->upsertMockOrder($seller, $buyer, $vaseProduct, "ORD-MOCK-{$seller->id}-901", 'Refund Requested', 'gcash', 'paid', 1350.00, 'Ceramic pitcher spout arrived hairline-chipped despite outer box remaining intact.');
        $refundCodOrder = $this->upsertMockOrder($seller, $buyer, $runnerProduct, "ORD-MOCK-{$seller->id}-902", 'Refund Requested', 'cod', 'paid', 990.00, 'Received 120cm runner instead of ordered 180cm size. Buyer prefers cash refund.');
        $declinedRefundOrder = $this->upsertMockOrder($seller, $buyer, $mugProduct, "ORD-MOCK-{$seller->id}-899", 'Completed', 'gcash', 'paid', 540.00, 'Glaze color looks slightly warmer under indoor lamp than studio sunlight photo.');

        // 5. Discounts & Vouchers
        $pendingDiscount = Discount::updateOrCreate(
            ['user_id' => $seller->id, 'name' => 'Ber-Months Pottery Showcase'],
            [
                'type' => 'percentage',
                'value' => 15,
                'promo_stock' => 25,
                'promo_sold' => 0,
                'max_purchase_limit' => 3,
                'start_at' => now()->addDay(),
                'end_at' => now()->addDays(14),
                'is_active' => false,
                'is_followers_only' => false,
            ]
        );
        $pendingDiscount->products()->syncWithoutDetaching([$vaseProduct->id, $mugProduct->id]);

        $approvedDiscount = Discount::updateOrCreate(
            ['user_id' => $seller->id, 'name' => 'Weekend Clay Mug Bundle'],
            [
                'type' => 'percentage',
                'value' => 10,
                'promo_stock' => 30,
                'promo_sold' => 4,
                'max_purchase_limit' => 5,
                'start_at' => now()->subDays(3),
                'end_at' => now()->addDays(7),
                'is_active' => true,
                'is_followers_only' => false,
            ]
        );
        $approvedDiscount->products()->syncWithoutDetaching([$mugProduct->id]);

        $pendingVoucher = Voucher::withTrashed()->updateOrCreate(
            ['shop_id' => $seller->id, 'code' => "KAMAYVIP{$seller->id}"],
            [
                'name' => 'Repeat Craft Collector Reward',
                'description' => 'PHP 150 off on orders PHP 1,500 and above.',
                'discount_type' => Voucher::TYPE_FIXED_AMOUNT,
                'scope_type' => Voucher::SCOPE_ALL,
                'discount_value' => 150.00,
                'min_spend' => 1500.00,
                'min_requirement_type' => Voucher::REQ_SPEND,
                'usage_limit_total' => 50,
                'usage_limit_per_user' => 1,
                'target_audience' => Voucher::AUDIENCE_REPEAT_CUSTOMERS,
                'is_public' => true,
                'is_active' => false,
                'starts_at' => now(),
                'expires_at' => now()->addDays(30),
                'deleted_at' => null,
            ]
        );

        // --- SEED ALL OWNER APPROVAL RECORDS ---
        // A. PENDING QUEUE (9 requests across all 6 domains)
        $this->upsertApproval($seller, $hrUser, OwnerApproval::DOMAIN_HR_PAYROLL, Payroll::class, $pendingPayroll->id,
            "Payroll Run: {$pendingPayroll->month}",
            "3 staff • Net Payout PHP " . number_format((float) $pendingPayroll->total_amount, 2),
            $approvalService->buildPayrollPayload($pendingPayroll, $seller),
            OwnerApproval::STATUS_PENDING, null, null, null, now()->subHours(2)
        );

        $this->upsertApproval($seller, $hrUser, OwnerApproval::DOMAIN_STAFF_RATE, Employee::class, $clerkEmp->id,
            "Monthly Salary Update: {$clerkEmp->name}",
            "Regularization increase from PHP 16,500.00 to PHP 19,500.00 monthly.",
            $approvalService->buildStaffRatePayload(
                $clerkEmp,
                19500.00,
                'Passed 6-month kiln inventory & quality control evaluation with zero stock variance.',
                now()->addMonth()->startOfMonth()->toDateString()
            ),
            OwnerApproval::STATUS_PENDING, null, null, null, now()->subHours(5)
        );

        $this->upsertApproval($seller, $clerkUser, OwnerApproval::DOMAIN_PROCUREMENT, StockRequest::class, $pendingStockReq->id,
            "Materials Restock: {$claySupply->name}",
            "40 bags • Est. PHP 12,800.00 (Immediate)",
            $approvalService->buildProcurementPayload($claySupply, 40, $pendingStockReq->notes),
            OwnerApproval::STATUS_PENDING, null, null, null, now()->subHours(6)
        );

        $this->upsertApproval($seller, $promoUser, OwnerApproval::DOMAIN_REFUND, Order::class, $refundGcashOrder->id,
            "Cash Refund: Order #{$refundGcashOrder->order_number}",
            "PayMongo GCash refund of PHP 1,350.00 for damaged spout.",
            $approvalService->buildRefundPayload($refundGcashOrder, 'refund'),
            OwnerApproval::STATUS_PENDING, null, null, null, now()->subHours(9)
        );

        $this->upsertApproval($seller, $promoUser, OwnerApproval::DOMAIN_REFUND, Order::class, $refundCodOrder->id,
            "Cash Refund: Order #{$refundCodOrder->order_number}",
            "Manual COD refund of PHP 990.00 due to wrong table runner length.",
            $approvalService->buildRefundPayload($refundCodOrder, 'refund'),
            OwnerApproval::STATUS_PENDING, null, null, null, now()->subHours(14)
        );

        $discountPayload = $approvalService->buildDiscountPayload($pendingDiscount, [$vaseProduct->id, $mugProduct->id]);
        $discountPayload['mode'] = 'create';
        $this->upsertApproval($seller, $promoUser, OwnerApproval::DOMAIN_DISCOUNT, Discount::class, $pendingDiscount->id,
            "Promo Campaign: {$pendingDiscount->name}",
            "15% OFF across 2 pottery SKUs • 25 promo units",
            $discountPayload,
            OwnerApproval::STATUS_PENDING, null, null, null, now()->subHours(16)
        );

        $voucherPayload = $approvalService->buildVoucherPayload($pendingVoucher);
        $voucherPayload['mode'] = 'create';
        $this->upsertApproval($seller, $promoUser, OwnerApproval::DOMAIN_DISCOUNT, Voucher::class, $pendingVoucher->id,
            "Shop Voucher: {$pendingVoucher->code}",
            "PHP 150 OFF on min. spend PHP 1,500 • Repeat collectors",
            $voucherPayload,
            OwnerApproval::STATUS_PENDING, null, null, null, now()->subHours(19)
        );

        $this->upsertApproval($seller, $clerkUser, OwnerApproval::DOMAIN_PRODUCT_DRAFT, Product::class, $draftTrayProduct->id,
            "Publish Product: {$draftTrayProduct->name}",
            "Move Draft to Active catalog at PHP 1,450.00.",
            $approvalService->buildProductDraftPayload(
                $draftTrayProduct,
                ['status' => 'Active', 'price' => 1450.00, 'cost_price' => 720.00],
                'publish',
                'Studio studio photos uploaded and kiln-cured moisture check passed.'
            ),
            OwnerApproval::STATUS_PENDING, null, null, null, now()->subDays(1)
        );

        $this->upsertApproval($seller, $clerkUser, OwnerApproval::DOMAIN_PRODUCT_DRAFT, Product::class, $runnerProduct->id,
            "Price Update: {$runnerProduct->name}",
            "Old Price: PHP 890.00 -> Proposed: PHP 980.00",
            $approvalService->buildProductDraftPayload(
                $runnerProduct,
                ['status' => 'Active', 'price' => 980.00, 'cost_price' => 430.00],
                'price_change',
                'Updated abaca yarn supplier cost added PHP 20/unit.'
            ),
            OwnerApproval::STATUS_PENDING, null, null, null, now()->subDays(1)->subHours(3)
        );

        // B. APPROVED HISTORY (4 requests across Owner + Shop Manager review)
        $this->upsertApproval($seller, $hrUser, OwnerApproval::DOMAIN_HR_PAYROLL, Payroll::class, $approvedPayroll->id,
            "Payroll Run: {$approvedPayroll->month}",
            "2 staff • Released PHP " . number_format((float) $approvedPayroll->total_amount, 2),
            $approvalService->buildPayrollPayload($approvedPayroll, $seller),
            OwnerApproval::STATUS_APPROVED, $seller->id, null, now()->subDays(3), now()->subDays(4)
        );

        $this->upsertApproval($seller, $clerkUser, OwnerApproval::DOMAIN_PROCUREMENT, StockRequest::class, $approvedStockReq->id,
            "Materials Restock: {$glazeSupply->name}",
            "20 liters • PHP 10,800.00 approved for PO release.",
            $approvalService->buildProcurementPayload($glazeSupply, 20, $approvedStockReq->notes),
            OwnerApproval::STATUS_APPROVED, $seller->id, null, now()->subDays(2), now()->subDays(3)
        );

        $approvedDiscountPayload = $approvalService->buildDiscountPayload($approvedDiscount, [$mugProduct->id]);
        $approvedDiscountPayload['mode'] = 'create';
        $this->upsertApproval($seller, $promoUser, OwnerApproval::DOMAIN_DISCOUNT, Discount::class, $approvedDiscount->id,
            "Promo Campaign: {$approvedDiscount->name}",
            "10% OFF ceramic espresso mugs — approved by Shop Manager.",
            $approvedDiscountPayload,
            OwnerApproval::STATUS_APPROVED, $managerUser->id, null, now()->subDays(2), now()->subDays(2)->subHours(4)
        );

        $this->upsertApproval($seller, $clerkUser, OwnerApproval::DOMAIN_PRODUCT_DRAFT, Product::class, $approvedProduct->id,
            "Publish Product: {$approvedProduct->name}",
            "Published to Active catalog by Shop Manager.",
            $approvalService->buildProductDraftPayload(
                $approvedProduct,
                ['status' => 'Active', 'price' => 620.00, 'cost_price' => 270.00],
                'publish',
                'Ready for weekend pop-up inventory.'
            ),
            OwnerApproval::STATUS_APPROVED, $managerUser->id, null, now()->subDays(4), now()->subDays(5)
        );

        // C. DECLINED HISTORY (3 requests with structured revision checklists)
        $declinedProc = $this->upsertApproval($seller, $clerkUser, OwnerApproval::DOMAIN_PROCUREMENT, StockRequest::class, $rejectedStockReq->id,
            "Materials Restock: {$cobaltSupply->name}",
            "15 kg • Est. PHP 36,000.00",
            $approvalService->buildProcurementPayload($cobaltSupply, 15, $rejectedStockReq->notes),
            OwnerApproval::STATUS_REJECTED, $seller->id, 'Order quantity exceeds quarterly kiln consumption. Reduce to 4kg.', now()->subDays(2), now()->subDays(3)
        );
        $declinedProc->recordRevision('stock_request', [
            ['key' => 'quantity', 'note' => 'Trim from 15 kg down to 4 kg for Q4 batch only.'],
        ], 'Please revise quantity before resubmitting.', $seller->id);

        $declinedRate = $this->upsertApproval($seller, $hrUser, OwnerApproval::DOMAIN_STAFF_RATE, Employee::class, $promoEmp->id,
            "Monthly Salary Update: {$promoEmp->name}",
            "Proposed raise from PHP 18,000.00 to PHP 28,000.00.",
            $approvalService->buildStaffRatePayload(
                $promoEmp,
                28000.00,
                'Annual market adjustment request.',
                now()->addMonth()->startOfMonth()->toDateString()
            ),
            OwnerApproval::STATUS_REJECTED, $seller->id, 'Resubmit within the standard PHP 20,500–21,500 mid-level band.', now()->subDays(5), now()->subDays(6)
        );
        $declinedRate->recordRevision('owner_approval', [
            ['key' => 'amount_budget', 'label' => 'Proposed Monthly Salary', 'note' => 'Keep adjustment within approved 15% annual band.'],
        ], 'Out of quarterly payroll budget.', $seller->id);

        $this->upsertApproval($seller, $promoUser, OwnerApproval::DOMAIN_REFUND, Order::class, $declinedRefundOrder->id,
            "Cash Refund: Order #{$declinedRefundOrder->order_number}",
            "Customer requested refund of PHP 540.00 for glaze tone difference.",
            $approvalService->buildRefundPayload($declinedRefundOrder, 'refund'),
            OwnerApproval::STATUS_REJECTED, $seller->id, 'Natural wood-ash kiln glaze variation is documented in the listing description.', now()->subDays(4), now()->subDays(5)
        );

        $approvalService->forgetPendingCountCache($seller->id);
    }

    protected function upsertEmployee(User $seller, string $code, array $attributes): Employee
    {
        return Employee::withTrashed()->updateOrCreate(
            ['user_id' => $seller->id, 'employee_id' => $code],
            array_merge([
                'status' => 'active',
                'join_date' => now()->subMonths(8)->toDateString(),
                'deleted_at' => null,
            ], $attributes)
        );
    }

    protected function upsertStaffUser(User $seller, Employee $employee, string $email, string $password, bool $isManager): User
    {
        $permissions = $isManager
            ? User::withWorkspaceAccessFlag(User::withStaffUserLevelFlag([
                'products' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
                'orders' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
                'hr' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
                'procurement' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
                'marketing' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
            ], User::STAFF_MANAGER_USER_LEVEL), true)
            : User::withWorkspaceAccessFlag(User::withStaffUserLevelFlag([
                'products' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
                'orders' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
                'hr' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
                'procurement' => User::STAFF_ACCESS_PERMISSION_CAN_EDIT,
            ], 'standard_staff'), true);

        return User::withTrashed()->updateOrCreate(
            ['email' => $email],
            [
                'name' => $employee->name,
                'password' => $password,
                'role' => 'staff',
                'seller_owner_id' => $seller->id,
                'employee_id' => $employee->id,
                'staff_role_preset_key' => $isManager ? 'shop_manager' : 'hr_payroll',
                'staff_module_permissions' => $permissions,
                'email_verified_at' => now(),
                'must_change_password' => false,
                'suspended_at' => null,
                'is_test' => true,
                'deleted_at' => null,
            ]
        );
    }

    protected function upsertStockRequest(
        User $seller,
        User $requester,
        Supply $supply,
        string $status,
        int $qty,
        string $urgency,
        string $notes,
        ?string $rejectionReason = null
    ): StockRequest {
        return StockRequest::updateOrCreate(
            ['user_id' => $seller->id, 'supply_id' => $supply->id, 'status' => $status],
            [
                'requested_by_user_id' => $requester->id,
                'quantity' => $qty,
                'total_cost' => round($qty * (float) $supply->unit_cost, 2),
                'needed_by_date' => now()->addDays(4)->toDateString(),
                'urgency_level' => $urgency,
                'notes' => $notes,
                'rejection_reason' => $rejectionReason,
            ]
        );
    }

    protected function upsertPayrollRun(
        User $seller,
        User $requester,
        string $month,
        string $status,
        ?string $rejectionReason,
        array $rows
    ): Payroll {
        $totalNet = 0.0;
        $computed = [];

        foreach ($rows as $row) {
            $gross = (float) $row['base_salary'] + (float) $row['overtime_pay'] + (float) $row['bonus'];
            $statEe = (float) $row['sss_ee'] + (float) $row['philhealth_ee'] + (float) $row['pagibig_ee'];
            $taxable = max(0.0, $gross - $statEe);
            $deductions = $statEe + (float) $row['withholding_tax'];
            $net = max(0.0, $gross - $deductions);
            $totalNet += $net;

            $computed[] = array_merge($row, [
                'gross_pay' => $gross,
                'taxable_income' => $taxable,
                'deductions' => $deductions,
                'net_pay' => $net,
            ]);
        }

        $payroll = Payroll::withTrashed()->updateOrCreate(
            ['user_id' => $seller->id, 'month' => $month],
            [
                'requested_by_user_id' => $requester->id,
                'total_amount' => round($totalNet, 2),
                'employee_count' => count($computed),
                'status' => $status,
                'rejection_reason' => $rejectionReason,
                'is_test' => true,
                'deleted_at' => null,
            ]
        );

        foreach ($computed as $item) {
            PayrollItem::withTrashed()->updateOrCreate(
                ['payroll_id' => $payroll->id, 'employee_id' => $item['employee']->id],
                [
                    'base_salary' => $item['base_salary'],
                    'days_worked' => $item['days_worked'],
                    'absences_days' => 0,
                    'undertime_hours' => 0,
                    'overtime_hours' => $item['overtime_pay'] > 0 ? 4 : 0,
                    'overtime_pay' => $item['overtime_pay'],
                    'rest_day_ot_hours' => 0,
                    'rest_day_ot_pay' => 0,
                    'holiday_ot_hours' => 0,
                    'holiday_ot_pay' => 0,
                    'paid_leave_days' => 0,
                    'gross_pay' => $item['gross_pay'],
                    'taxable_income' => $item['taxable_income'],
                    'sss_ee' => $item['sss_ee'],
                    'sss_er' => $item['sss_er'],
                    'philhealth_ee' => $item['philhealth_ee'],
                    'philhealth_er' => $item['philhealth_er'],
                    'pagibig_ee' => $item['pagibig_ee'],
                    'pagibig_er' => $item['pagibig_er'],
                    'withholding_tax' => $item['withholding_tax'],
                    'deductions' => $item['deductions'],
                    'bonus' => $item['bonus'],
                    'net_pay' => $item['net_pay'],
                    'deleted_at' => null,
                ]
            );
        }

        return $payroll;
    }

    protected function upsertMockOrder(
        User $seller,
        User $buyer,
        Product $product,
        string $orderNumber,
        string $status,
        string $paymentMethod,
        string $paymentStatus,
        float $totalAmount,
        string $returnReason
    ): Order {
        $order = Order::withTrashed()->updateOrCreate(
            ['order_number' => $orderNumber],
            [
                'artisan_id' => $seller->id,
                'user_id' => $buyer->id,
                'customer_name' => $buyer->name,
                'merchandise_subtotal' => max(0, $totalAmount - 100),
                'convenience_fee_amount' => 0,
                'shipping_fee_amount' => 100,
                'platform_commission_amount' => round($totalAmount * 0.05, 2),
                'seller_net_amount' => round($totalAmount * 0.95, 2),
                'total_amount' => $totalAmount,
                'status' => $status,
                'payment_method' => $paymentMethod,
                'payment_status' => $paymentStatus,
                'shipping_address' => '24 Aguinaldo Highway, Imus, Cavite 4103',
                'return_reason' => $returnReason,
                'return_proof_image' => '/images/placeholder.svg',
                'delivered_at' => now()->subDays(2),
                'is_test' => true,
                'deleted_at' => null,
            ]
        );

        OrderItem::updateOrCreate(
            ['order_id' => $order->id, 'product_id' => $product->id],
            [
                'product_name' => $product->name,
                'price' => $product->price,
                'cost' => $product->cost_price ?? 0,
                'quantity' => 1,
                'product_img' => $product->cover_photo_path,
            ]
        );

        return $order;
    }

    protected function upsertApproval(
        User $seller,
        User $requester,
        string $domain,
        string $approvableType,
        int $approvableId,
        string $title,
        string $summary,
        array $payload,
        string $status,
        ?int $reviewerId,
        ?string $rejectionReason,
        ?\Illuminate\Support\Carbon $reviewedAt,
        \Illuminate\Support\Carbon $createdAt
    ): OwnerApproval {
        $approval = OwnerApproval::updateOrCreate(
            [
                'seller_id' => $seller->id,
                'domain' => $domain,
                'title' => $title,
            ],
            [
                'requester_id' => $requester->id,
                'reviewer_id' => $reviewerId,
                'approvable_type' => $approvableType,
                'approvable_id' => $approvableId,
                'summary' => $summary,
                'changes_payload' => $payload,
                'status' => $status,
                'rejection_reason' => $rejectionReason,
                'reviewed_at' => $reviewedAt,
            ]
        );

        $approval->forceFill(['created_at' => $createdAt])->saveQuietly();

        return $approval;
    }
}

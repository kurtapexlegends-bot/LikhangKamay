<?php

namespace Tests\Feature\Admin;

use App\Models\Category;
use App\Models\Employee;
use App\Models\OwnerApproval;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\Product;
use App\Models\RevisionRequest;
use App\Models\SponsorshipRequest;
use App\Models\StockRequest;
use App\Models\Supply;
use App\Models\User;
use App\Services\OwnerApprovalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TargetedRevisionTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_request_targeted_artisan_kyc_revisions_and_resubmission_resolves_them(): void
    {
        Mail::fake();
        Notification::fake();

        $admin = User::factory()->superAdmin()->create();
        $artisan = User::factory()->artisanPending()->create([
            'shop_name' => 'Silang Pottery Studio',
            'street_address' => '123 Aguinaldo Hwy',
            'city' => 'Silang',
            'barangay' => 'Biga I',
            'region' => 'Cavite',
            'zip_code' => '4118',
            'phone_number' => '09171234567',
            'business_permit' => 'legal_docs/permit.jpg',
            'dti_registration' => 'legal_docs/dti.jpg',
            'valid_id' => 'legal_docs/id.jpg',
            'tin_id' => 'legal_docs/tin.jpg',
            'setup_completed_at' => now()->subHour(),
        ]);

        $response = $this->actingAs($admin)->post(route('admin.artisan.reject', $artisan->id), [
            'reason' => 'Please clarify your shop documents.',
            'revision_items' => [
                ['key' => 'business_permit', 'label' => "Business / Mayor's Permit", 'note' => 'Permit year is cut off on edge.'],
                ['key' => 'custom_signature', 'label' => 'Owner Signature', 'note' => 'Ensure bottom corner signature is legible.'],
            ],
        ]);

        $response->assertSessionHasNoErrors();

        $artisan->refresh();
        $this->assertSame('rejected', $artisan->artisan_status);
        $this->assertStringContainsString("Business / Mayor's Permit", $artisan->artisan_rejection_reason);

        $revision = RevisionRequest::where('revisable_type', User::class)
            ->where('revisable_id', $artisan->id)
            ->first();

        $this->assertNotNull($revision);
        $this->assertNull($revision->resolved_at);
        $this->assertCount(2, $revision->revision_items);

        $this->actingAs($artisan)
            ->get(route('artisan.setup'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/ArtisanSetup')
                ->where('activeRevision.summary_note', 'Please clarify your shop documents.')
                ->has('activeRevision.items', 2)
            );

        // Unflagged already-approved documents (e.g. dti_registration) are locked against deletion or overwrite
        $this->actingAs($artisan)
            ->delete(route('artisan.setup.delete-document', ['type' => 'dti_registration']))
            ->assertSessionHasErrors('dti_registration');
        $this->assertSame('legal_docs/dti.jpg', $artisan->fresh()->dti_registration);

        // Resubmitting Step 3 marks active revision resolved
        $this->actingAs($artisan)->post(route('artisan.setup.store'), [
            'current_step' => 3,
            'payout_method' => 'GCash',
            'payout_account_name' => 'Elena Weaver',
            'payout_account_number' => '09179876543',
        ])->assertRedirect(route('artisan.pending'));

        $this->assertNotNull($revision->fresh()->resolved_at);
    }

    public function test_admin_can_send_targeted_product_revisions_and_approval_resolves_them(): void
    {
        Mail::fake();
        Notification::fake();
        Product::$bypassReview = true;
        Category::create(['name' => 'Vases', 'slug' => 'vases']);

        $admin = User::factory()->superAdmin()->create();
        $seller = User::factory()->artisanApproved()->create();
        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'REV-PROD-01',
            'name' => 'Terracotta Planter',
            'description' => 'Wheel-thrown planter',
            'category' => 'Vases',
            'price' => 450,
            'cost_price' => 200,
            'stock' => 10,
            'status' => 'pending_review',
        ]);

        $this->actingAs($admin)->post(route('admin.catalog.moderate'), [
            'ids' => [$product->id],
            'action' => 'reject',
            'feedback' => 'Photo and dimensions need adjustments.',
            'revision_items' => [
                ['key' => 'cover_media', 'label' => 'Cover Photo & Product Gallery', 'note' => 'Use neutral studio lighting.'],
                ['key' => 'pricing_stock', 'label' => 'Pricing, Weight & Stock Units', 'note' => 'Add item weight for shipping quote.'],
            ],
        ])->assertSessionHasNoErrors();

        $product->refresh();
        $this->assertSame('rejected', $product->status);

        $revision = RevisionRequest::where('revisable_type', Product::class)
            ->where('revisable_id', $product->id)
            ->first();

        $this->assertNotNull($revision);
        $this->assertCount(2, $revision->revision_items);

        $this->actingAs($admin)->post(route('admin.catalog.moderate'), [
            'ids' => [$product->id],
            'action' => 'approve',
        ])->assertSessionHasNoErrors();

        $this->assertNotNull($revision->fresh()->resolved_at);
    }

    public function test_admin_can_send_targeted_sponsorship_revisions_and_approve_resolves_them(): void
    {
        Mail::fake();
        Notification::fake();
        Product::$bypassReview = true;

        $admin = User::factory()->superAdmin()->create();
        $seller = User::factory()->artisanApproved()->create(['premium_tier' => 'super_premium']);
        $product = Product::create([
            'user_id' => $seller->id,
            'sku' => 'REV-SPON-01',
            'name' => 'Glazed Amphora',
            'description' => 'Hand-glazed pottery',
            'category' => 'Vases & Jars',
            'price' => 980,
            'cost_price' => 450,
            'stock' => 12,
            'status' => 'Active',
        ]);

        $sponsorship = SponsorshipRequest::create([
            'user_id' => $seller->id,
            'product_id' => $product->id,
            'status' => 'pending',
        ]);

        $this->actingAs($admin)->post(route('admin.sponsorships.reject', $sponsorship), [
            'rejection_reason' => 'Main hero photo needs clean crop.',
            'revision_items' => [
                ['key' => 'product_media', 'label' => 'Product Cover Photo Quality & Presentation', 'note' => 'Remove text overlay from photo.'],
            ],
        ])->assertSessionHasNoErrors();

        $sponsorship->refresh();
        $this->assertSame('rejected', $sponsorship->status);
        $this->assertDatabaseHas('revision_requests', [
            'revisable_type' => SponsorshipRequest::class,
            'revisable_id' => $sponsorship->id,
            'resolved_at' => null,
        ]);

        $sponsorship->update(['status' => 'pending']);

        $this->actingAs($admin)->post(route('admin.sponsorships.approve', $sponsorship))
            ->assertSessionHasNoErrors();

        $revision = RevisionRequest::where('revisable_type', SponsorshipRequest::class)
            ->where('revisable_id', $sponsorship->id)
            ->first();

        $this->assertNotNull($revision->resolved_at);
    }

    public function test_accounting_rejections_record_targeted_revisions_for_stock_requests_and_payroll(): void
    {
        Mail::fake();
        Notification::fake();

        $owner = User::factory()->artisanApproved()->create([
            'base_funds' => 50000,
            'premium_tier' => 'super_premium',
        ]);
        $owner->modules_enabled = ['hr' => true, 'accounting' => true, 'procurement' => true];
        $owner->save();

        $staff = User::factory()->staff($owner)->create([
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['hr' => true, 'stock_requests' => true], true),
        ]);

        $supply = Supply::create([
            'user_id' => $owner->id,
            'name' => 'Stoneware Clay',
            'category' => 'Raw Materials',
            'quantity' => 5,
            'unit' => 'kg',
            'min_stock' => 2,
            'unit_cost' => 150,
        ]);

        $stockRequest = StockRequest::create([
            'user_id' => $owner->id,
            'requested_by_user_id' => $staff->id,
            'supply_id' => $supply->id,
            'quantity' => 20,
            'total_cost' => 3000,
            'status' => StockRequest::STATUS_PENDING,
        ]);

        $this->actingAs($owner)->post(route('accounting.reject', $stockRequest->id), [
            'reason' => 'Reduce quantity to match weekly budget.',
            'revision_items' => [
                ['key' => 'quantity_requested', 'label' => 'Requested Quantity / Units', 'note' => 'Order 10 kg max for this cycle.'],
            ],
        ])->assertSessionHasNoErrors();

        $this->assertSame(StockRequest::STATUS_REJECTED, $stockRequest->fresh()->status);
        $this->assertDatabaseHas('revision_requests', [
            'revisable_type' => StockRequest::class,
            'revisable_id' => $stockRequest->id,
        ]);

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Mario Potter',
            'role' => 'Potter',
            'salary' => 5000,
            'status' => 'Active',
            'join_date' => now()->toDateString(),
        ]);

        $payroll = Payroll::create([
            'user_id' => $owner->id,
            'requested_by_user_id' => $staff->id,
            'month' => 'May 2026',
            'total_amount' => 5000,
            'employee_count' => 1,
            'status' => 'Pending',
        ]);

        PayrollItem::create([
            'payroll_id' => $payroll->id,
            'employee_id' => $employee->id,
            'base_salary' => 5000,
            'days_worked' => 20,
            'absences_days' => 0,
            'undertime_hours' => 0,
            'overtime_hours' => 0,
            'overtime_pay' => 0,
            'net_pay' => 5000,
        ]);

        $this->actingAs($owner)->post(route('accounting.rejectPayroll', $payroll->id), [
            'reason' => 'Verify statutory deductions before release.',
            'revision_items' => [
                ['key' => 'statutory_deductions', 'label' => 'SSS, PhilHealth, Pag-IBIG & Tax Breakdown', 'note' => 'Recalculate Pag-IBIG contribution.'],
            ],
        ])->assertSessionHasNoErrors();

        $this->assertSame('Rejected', $payroll->fresh()->status);
        $this->assertDatabaseHas('revision_requests', [
            'revisable_type' => Payroll::class,
            'revisable_id' => $payroll->id,
        ]);

        $this->actingAs($owner)
            ->get(route('hr.payroll.show', $payroll->id))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/HR/PayrollRunShow')
                ->where('payroll.active_revision.summary_note', 'Verify statutory deductions before release.')
                ->has('payroll.active_revision.items', 1)
            );
    }

    public function test_owner_approval_decline_records_targeted_revisions(): void
    {
        Notification::fake();

        $owner = User::factory()->artisanApproved()->create(['premium_tier' => 'super_premium']);
        $staff = User::factory()->staff($owner)->create();
        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Ana Glazer',
            'role' => 'Glazer',
            'salary' => 450,
            'status' => 'active',
            'join_date' => now()->toDateString(),
        ]);

        $approval = app(OwnerApprovalService::class)->submitRequest(
            seller: $owner,
            requester: $staff,
            domain: OwnerApproval::DOMAIN_STAFF_RATE,
            title: 'Rate Increase Request',
            summary: 'Increase daily rate by 50 PHP',
            approvable: $employee
        );

        $this->actingAs($owner)->post(route('seller.approvals.reject', $approval->id), [
            'reason' => 'Include attendance performance notes.',
            'revision_items' => [
                ['key' => 'supporting_details', 'label' => 'Supporting Evidence or Justification', 'note' => 'Attach last month attendance summary.'],
            ],
        ])->assertSessionHasNoErrors();

        $this->assertSame(OwnerApproval::STATUS_REJECTED, $approval->fresh()->status);
        $this->assertDatabaseHas('revision_requests', [
            'revisable_type' => OwnerApproval::class,
            'revisable_id' => $approval->id,
        ]);
    }

    public function test_super_admin_receives_revision_feedback_for_resubmitted_artisan_kyc(): void
    {
        Mail::fake();
        Notification::fake();

        $admin = User::factory()->superAdmin()->create();
        $artisan = User::factory()->artisanPending()->create([
            'shop_name' => 'Original Pottery Shop',
            'phone_number' => '09171112222',
            'business_permit' => 'legal_docs/permit_v1.jpg',
            'valid_id' => 'legal_docs/id_v1.jpg',
            'setup_completed_at' => now()->subHours(2),
        ]);

        // Super Admin requests revisions on valid_id and shop_details
        $this->actingAs($admin)->post(route('admin.artisan.reject', $artisan->id), [
            'reason' => 'Fix ID photo and update shop name.',
            'revision_items' => [
                ['key' => 'valid_id', 'label' => 'Valid Government ID (Front)', 'note' => 'Blurry photo.'],
                ['key' => 'shop_details', 'label' => 'Shop Name & Contact Info', 'note' => 'Needs to match DTI.'],
            ],
        ])->assertSessionHasNoErrors();

        $artisan->refresh();
        $this->assertSame('rejected', $artisan->artisan_status);

        // Artisan fulfills the revisions and resubmits
        $artisan->update([
            'valid_id' => 'legal_docs/id_v2_crystal_clear.jpg',
            'shop_name' => 'Renamed Pottery Studio',
            'setup_completed_at' => now(),
            'artisan_status' => 'pending',
            'artisan_rejection_reason' => null,
        ]);
        $artisan->resolveActiveRevisions();

        // Admin inspects the resubmitted artisan
        $reviewData = $artisan->fresh()->formatRevisionReviewForAdmin('artisan_kyc');

        $this->assertNotNull($reviewData);
        $this->assertTrue($reviewData['has_resubmitted_revision']);
        $this->assertSame(2, $reviewData['total_items_count']);
        $this->assertContains('valid_id', $reviewData['revised_keys']);
        $this->assertContains('shop_details', $reviewData['revised_keys']);

        // Check evaluated items
        $validIdItem = collect($reviewData['items'])->firstWhere('key', 'valid_id');
        $this->assertTrue($validIdItem['is_changed']);
        $this->assertSame('New document uploaded', $validIdItem['change_summary']);

        $shopDetailsItem = collect($reviewData['items'])->firstWhere('key', 'shop_details');
        $this->assertTrue($shopDetailsItem['is_changed']);
        $this->assertSame('Shop details updated', $shopDetailsItem['change_summary']);
    }

    public function test_super_admin_receives_revision_feedback_for_resubmitted_product(): void
    {
        Mail::fake();
        Notification::fake();
        Product::$bypassReview = true;
        Category::create(['name' => 'Vases', 'slug' => 'vases']);

        $admin = User::factory()->superAdmin()->create();
        $seller = User::factory()->artisanApproved()->create();
        $product = Product::create([
            'user_id' => $seller->id,
            'name' => 'Blue Ming Vase',
            'slug' => 'blue-ming-vase',
            'sku' => 'VASE-123',
            'category' => 'Vases',
            'description' => 'Original description for craft piece.',
            'price' => 1500,
            'cost_price' => 800,
            'stock' => 10,
            'weight' => 500,
            'cover_photo_path' => 'products/cover_v1.jpg',
            'gallery_paths' => ['products/g1.jpg'],
            'status' => 'pending_review',
        ]);
        Product::$bypassReview = false;

        // Super Admin requests revisions on pricing_stock and description
        $this->actingAs($admin)->post(route('admin.catalog.moderate'), [
            'ids' => [$product->id],
            'action' => 'reject',
            'rejection_reason' => 'Lower price and improve description.',
            'revision_items' => [
                ['key' => 'pricing_stock', 'label' => 'Pricing, Weight & Stock Units', 'note' => 'Please lower price.'],
                ['key' => 'description', 'label' => 'Description & Craft Story', 'note' => 'Provide more craft story details.'],
            ],
        ])->assertSessionHasNoErrors();

        $product->refresh();
        $this->assertSame('rejected', $product->status);

        // Seller updates the requested fields and resubmits
        $product->update([
            'price' => 1200,
            'description' => 'Updated artisanal craft story highlighting Cavite clay heritage.',
            'status' => 'pending_review',
            'rejection_reason' => null,
        ]);
        $product->resolveActiveRevisions();

        $reviewData = $product->fresh()->formatRevisionReviewForAdmin('product');
        $this->assertNotNull($reviewData);
        $this->assertTrue($reviewData['has_resubmitted_revision']);
        $this->assertSame(2, $reviewData['total_items_count']);
        $this->assertContains('pricing_stock', $reviewData['revised_keys']);
        $this->assertContains('description', $reviewData['revised_keys']);

        $pricingItem = collect($reviewData['items'])->firstWhere('key', 'pricing_stock');
        $this->assertTrue($pricingItem['is_changed']);
        $this->assertSame('Price / inventory updated', $pricingItem['change_summary']);

        $descItem = collect($reviewData['items'])->firstWhere('key', 'description');
        $this->assertTrue($descItem['is_changed']);
        $this->assertSame('Description updated', $descItem['change_summary']);
    }
}

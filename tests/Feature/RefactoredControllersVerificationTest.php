<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Actions\Seller\HR\ApproveAttendanceSession;
use App\Actions\Seller\HR\RejectAttendanceSession;
use App\Actions\Seller\HR\SubmitPayrollRun;
use App\Events\ProductWholesaleSettingsUpdated;
use App\Events\ShopSettingsUpdated;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\Product;
use App\Models\SellerActivityLog;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class RefactoredControllersVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_unlinked_staff_member_can_use_global_search_without_type_error(): void
    {
        // Unlinked staff has null seller_owner_id and custom permissions
        $staff = User::factory()->create([
            'role' => 'staff',
            'seller_owner_id' => null,
            'staff_module_permissions' => [
                'products' => 'view',
                'orders' => 'view',
            ],
        ]);

        $response = $this->actingAs($staff)->getJson(route('api.global-search', ['query' => 'testing']));
        $response->assertOk();
        $response->assertJsonStructure(['results']);
    }

    public function test_artisan_can_search_scoped_seller_resources(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        $product = Product::create([
            'user_id' => $artisan->id,
            'name' => 'Terracotta Planter Mug',
            'sku' => 'TPM-991',
            'category' => 'Pottery',
            'price' => 350.00,
            'stock' => 20,
            'status' => 'Active',
        ]);

        $response = $this->actingAs($artisan)->getJson(route('api.global-search', ['query' => 'Terracotta']));
        $response->assertOk();
        $results = $response->json('results');
        $this->assertNotEmpty($results);
        $this->assertContains('Terracotta Planter Mug', array_column($results, 'title'));
    }

    public function test_shop_settings_update_dispatches_event_and_logs_activity(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'bio' => 'Original bio text',
        ]);

        $response = $this->actingAs($artisan)->post(route('shop.settings.update'), [
            'bio' => 'Updated artisan workshop bio',
        ]);

        $response->assertSessionHas('success', 'Shop settings updated successfully.');

        $artisan->refresh();
        $this->assertSame('Updated artisan workshop bio', $artisan->bio);

        // Verify decoupled activity log was persisted via event listener
        $this->assertDatabaseHas('seller_activity_logs', [
            'seller_owner_id' => $artisan->id,
            'actor_user_id' => $artisan->id,
            'module' => 'shop_settings',
            'event_type' => 'settings_updated',
        ]);
    }

    public function test_wholesale_toggle_uses_form_request_and_logs_activity(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        $product = Product::create([
            'user_id' => $artisan->id,
            'name' => 'Raw Clay 25kg Sack',
            'sku' => 'RC-25KG-01',
            'category' => 'Raw Materials',
            'price' => 500.00,
            'stock' => 50,
            'status' => 'Active',
            'is_b2b_supply' => false,
        ]);

        $response = $this->actingAs($artisan)->post(route('seller.supply-hub.toggle', $product->slug), [
            'is_b2b_supply' => true,
            'moq' => 5,
            'wholesale_price' => 450.00,
            'wholesale_min_qty' => 10,
            'supply_unit' => 'bag',
        ]);

        $response->assertSessionHas('success');

        $product->refresh();
        $this->assertTrue((bool) $product->is_b2b_supply);
        $this->assertSame(5, (int) $product->moq);
        $this->assertSame('450.00', (string) $product->wholesale_price);

        // Verify activity log was recorded via ProductWholesaleSettingsUpdated listener
        $this->assertDatabaseHas('seller_activity_logs', [
            'seller_owner_id' => $artisan->id,
            'subject_id' => $product->id,
            'module' => 'supply_hub',
            'event_type' => 'supply_listed',
        ]);
    }

    public function test_non_elite_artisan_cannot_toggle_wholesale_supplies(): void
    {
        $freeArtisan = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        $product = Product::create([
            'user_id' => $freeArtisan->id,
            'name' => 'Standard Mug',
            'sku' => 'MUG-001',
            'category' => 'Pottery',
            'price' => 200.00,
            'stock' => 10,
            'status' => 'Active',
            'is_b2b_supply' => false,
        ]);

        $response = $this->actingAs($freeArtisan)->post(route('seller.supply-hub.toggle', $product->slug), [
            'is_b2b_supply' => true,
            'moq' => 5,
            'wholesale_price' => 450.00,
        ]);

        $response->assertForbidden();
    }

    public function test_artisan_can_approve_attendance_session_via_extracted_action(): void
    {
        $owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@example.com',
            'employee_id' => 'EMP-001',
            'role' => 'Artisan Assistant',
            'salary' => 18000,
            'status' => 'Active',
            'join_date' => now()->subMonths(6),
        ]);

        $staff = User::factory()->create([
            'role' => 'staff',
            'seller_owner_id' => $owner->id,
        ]);

        $session = StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'employee_id' => $employee->id,
            'attendance_date' => now()->toDateString(),
            'clock_in_at' => now()->subHours(4),
            'worked_minutes' => 240,
            'verification_status' => 'pending',
        ]);

        $response = $this->actingAs($owner)->postJson(route('hr.attendance-sessions.approve', $session));
        $response->assertOk();
        $response->assertJsonPath('message', 'Attendance session approved successfully.');

        $session->refresh();
        $this->assertSame('approved', $session->approval_status);
        $this->assertSame($owner->id, $session->approved_by_user_id);
    }

    public function test_artisan_can_reject_attendance_session_via_extracted_action_and_form_request(): void
    {
        $owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@example.com',
            'employee_id' => 'EMP-001',
            'role' => 'Artisan Assistant',
            'salary' => 18000,
            'status' => 'Active',
            'join_date' => now()->subMonths(6),
        ]);

        $staff = User::factory()->create([
            'role' => 'staff',
            'seller_owner_id' => $owner->id,
        ]);

        $session = StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'employee_id' => $employee->id,
            'attendance_date' => now()->toDateString(),
            'clock_in_at' => now()->subHours(4),
            'worked_minutes' => 240,
            'verification_status' => 'pending',
        ]);

        $response = $this->actingAs($owner)->postJson(route('hr.attendance-sessions.reject', $session), [
            'reason' => 'Photo does not match assigned staff profile.',
        ]);

        $response->assertOk();
        $response->assertJsonPath('message', 'Attendance session declined.');

        $session->refresh();
        $this->assertSame('rejected', $session->approval_status);
        $this->assertSame('Photo does not match assigned staff profile.', $session->rejection_reason);
    }

    public function test_artisan_can_submit_payroll_run_via_extracted_action(): void
    {
        $owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        $payroll = Payroll::create([
            'user_id' => $owner->id,
            'month' => 'September 2026',
            'period_start' => '2026-09-01',
            'period_end' => '2026-09-15',
            'total_amount' => 15000.00,
            'employee_count' => 3,
            'status' => 'Draft',
        ]);

        $response = $this->actingAs($owner)->post(route('hr.payroll.submit', $payroll));
        $response->assertRedirect(route('hr.payroll.show', $payroll));
        $response->assertSessionHas('success', 'Payroll request sent to Accounting.');

        $payroll->refresh();
        $this->assertSame('Pending', $payroll->status);
    }

    public function test_super_admin_can_export_insights_report_via_service_orchestrator(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $response = $this->actingAs($admin)->get(route('admin.insights.export'));
        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=utf-8');
        $this->assertStringContainsString('PLATFORM OVERVIEW METRICS', $response->streamedContent());
    }

    public function test_super_admin_can_load_system_settings_dashboard(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $response = $this->actingAs($admin)->get(route('admin.settings.index'));
        $response->assertOk();
    }

    public function test_admin_can_moderate_catalog_items_with_moderate_request(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $artisan = User::factory()->artisanApproved()->create();

        $product = Product::create([
            'user_id' => $artisan->id,
            'name' => 'Handwoven Banig Mat',
            'sku' => 'BANIG-001',
            'category' => 'Home & Living',
            'price' => 800.00,
            'stock' => 10,
            'status' => 'pending_review',
        ]);

        // 1. Rejection requires non-empty feedback
        $failResponse = $this->actingAs($admin)->post(route('admin.catalog.moderate'), [
            'ids' => [$product->id],
            'action' => 'reject',
            'feedback' => '   ',
        ]);
        $failResponse->assertSessionHasErrors('feedback');

        // 2. Successful approval
        $successResponse = $this->actingAs($admin)->post(route('admin.catalog.moderate'), [
            'ids' => [$product->id],
            'action' => 'approve',
        ]);
        $successResponse->assertSessionHas('success');
        $this->assertSame('Active', $product->fresh()->status);
    }

    public function test_admin_can_store_and_update_email_templates_with_form_requests(): void
    {
        $admin = User::factory()->superAdmin()->create();

        // 1. Store
        $storeResponse = $this->actingAs($admin)->post(route('admin.email-templates.store'), [
            'name' => 'Artisan Welcome Email',
            'subject' => 'Welcome to LikhangKamay!',
            'headline' => 'Your artisan shop is ready',
            'body' => '<p>Welcome aboard our artisan cooperative!</p>',
            'category' => 'custom',
        ]);
        $storeResponse->assertSessionHas('success');

        $template = \App\Models\EmailTemplate::where('name', 'Artisan Welcome Email')->firstOrFail();
        $this->assertSame('Welcome to LikhangKamay!', $template->subject);

        // 2. Update via extracted UpdateEmailTemplateRequest
        $updateResponse = $this->actingAs($admin)->put(route('admin.email-templates.update', $template), [
            'name' => 'Artisan Welcome Email Updated',
            'subject' => 'Welcome to LikhangKamay Cooperative!',
            'body' => '<p>Updated content</p>',
            'category' => 'custom',
        ]);
        $updateResponse->assertSessionHas('success');
        $template->refresh();
        $this->assertSame('Artisan Welcome Email Updated', $template->name);
        $this->assertSame('Welcome to LikhangKamay Cooperative!', $template->subject);
    }

    public function test_artisan_can_presign_and_upload_shop_media_direct_to_storage(): void
    {
        $artisan = User::factory()->artisanApproved()->create();

        // 1. Presign endpoint
        $response = $this->actingAs($artisan)->postJson(route('shop.settings.presign'), [
            'filename' => 'banner_photo.webp',
            'contentType' => 'image/webp',
            'type' => 'banner',
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['url', 'key']);
        $key = $response->json('key');
        $this->assertStringStartsWith('shop_banners/', $key);

        // 2. Direct upload simulation
        $uploadResponse = $this->actingAs($artisan)
            ->call('PUT', route('shop.settings.local-upload') . '?key=' . urlencode($key), [], [], [], [], 'fake-image-bytes');
        $uploadResponse->assertOk();
        \Illuminate\Support\Facades\Storage::disk('public')->assertExists($key);

        // 3. Save shop settings with presigned key
        $updateResponse = $this->actingAs($artisan)->post(route('shop.settings.update'), [
            'banner_key' => $key,
        ]);
        $updateResponse->assertSessionHas('success');
        $this->assertSame($key, $artisan->fresh()->banner_image);
    }

    public function test_wholesale_controller_update_status_executes_with_form_request(): void
    {
        $supplier = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);
        $buyer = User::factory()->create();

        $order = \App\Models\Order::create([
            'order_number' => 'ORD-WS-TEST-999',
            'user_id' => $buyer->id,
            'artisan_id' => $supplier->id,
            'customer_name' => $buyer->name,
            'shipping_address' => 'Silang, Cavite',
            'merchandise_subtotal' => 2500.00,
            'total_amount' => 2500.00,
            'status' => 'Pending',
            'payment_status' => 'paid',
            'payment_method' => 'paymongo',
            'shipping_method' => 'Delivery',
        ]);

        $this->actingAs($supplier);
        $request = \App\Http\Requests\Seller\UpdateWholesaleOrderStatusRequest::create(
            '/seller/wholesale/status',
            'POST',
            ['status' => 'Accepted']
        );
        $request->setUserResolver(fn() => $supplier);

        $controller = new \App\Http\Controllers\Seller\WholesaleController();
        $action = app(\App\Actions\Seller\Orders\UpdateOrderStatus::class);

        $response = $controller->updateStatus($request, (string) $order->id, $action);
        $this->assertTrue($response->isRedirection());
        $this->assertSame('Accepted', $order->fresh()->status);
    }

    public function test_global_search_service_caches_queries_for_sixty_seconds(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        Product::create([
            'user_id' => $artisan->id,
            'name' => 'Cache Test Ceramic Mug',
            'sku' => 'CACHE-MUG-01',
            'category' => 'Pottery',
            'price' => 450.00,
            'stock' => 15,
            'status' => 'Active',
        ]);

        $service = app(\App\Services\Search\GlobalSearchService::class);
        $cacheKey = sprintf('global_search:%d:seller:%s', $artisan->id, md5('cache test'));

        \Illuminate\Support\Facades\Cache::forget($cacheKey);
        $this->assertFalse(\Illuminate\Support\Facades\Cache::has($cacheKey));

        $results = $service->search($artisan, 'Cache Test', 'seller');
        $this->assertNotEmpty($results);
        $this->assertTrue(\Illuminate\Support\Facades\Cache::has($cacheKey));
    }
}

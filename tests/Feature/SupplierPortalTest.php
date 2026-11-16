<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Services\B2BSupplyHubService;
use App\Support\SupplierAddress;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SupplierPortalTest extends TestCase
{
    use RefreshDatabase;

    public function test_supplier_registration_creates_account_and_redirects_to_setup(): void
    {
        $payload = [
            'first_name' => 'Eduardo',
            'last_name' => 'Santos',
            'company_name' => 'Luzon Clay & Minerals Inc',
            'email' => 'eduardo.santos@luzonclay.ph',
            'password' => 'WholesalePassword123!',
            'password_confirmation' => 'WholesalePassword123!',
            'terms' => true,
        ];

        $response = $this->post(route('supplier.register.store'), $payload);

        $response->assertRedirect(route('verification.notice'));

        $this->assertDatabaseHas('users', [
            'email' => 'eduardo.santos@luzonclay.ph',
            'role' => 'supplier',
            'shop_name' => 'Luzon Clay & Minerals Inc',
            'artisan_status' => 'pending',
            'setup_completed_at' => null,
        ]);

        $supplier = User::where('email', 'eduardo.santos@luzonclay.ph')->first();
        $this->assertNotNull($supplier);
        $this->assertTrue($supplier->isSupplier());
        $this->assertFalse($supplier->isArtisan());
        $this->assertAuthenticatedAs($supplier);

        // Verify email redirects to setup for uncompleted supplier
        $authRedirect = app(\App\Services\AuthRedirectService::class);
        $this->assertSame(route('supplier.setup', absolute: false), $authRedirect->pathForVerifiedUser($supplier));
    }

    public function test_uncompleted_supplier_is_redirected_to_setup(): void
    {
        $supplier = User::factory()->create([
            'role' => 'supplier',
            'artisan_status' => 'pending',
            'setup_completed_at' => null,
        ]);

        $response = $this->actingAs($supplier)->get(route('supplier.dashboard'));
        $response->assertRedirect(route('supplier.setup'));

        $setupResponse = $this->actingAs($supplier)->get(route('supplier.setup'));
        $setupResponse->assertStatus(200);
    }

    public function test_supplier_setup_saves_warehouse_and_permit_and_redirects_to_pending(): void
    {
        Storage::fake('public');

        $supplier = User::factory()->create([
            'role' => 'supplier',
            'artisan_status' => 'pending',
            'setup_completed_at' => null,
        ]);

        $payload = [
            'phone_number' => '09171234567',
            'province' => 'Cavite',
            'city' => 'Dasmariñas City',
            'barangay' => 'Salitran II',
            'street_address' => 'Lot 4 Industrial Estate',
            'postal_code' => '4114',
            'latitude' => 14.3294,
            'longitude' => 120.9367,
            'business_permit' => UploadedFile::fake()->create('business_permit.pdf', 500, 'application/pdf'),
            'tin_number' => '123-456-789-000',
        ];

        $response = $this->actingAs($supplier)->post(route('supplier.setup.store'), $payload);

        $response->assertRedirect(route('supplier.pending'));

        $supplier->refresh();
        $this->assertNotNull($supplier->setup_completed_at);
        $this->assertNotNull($supplier->business_permit);

        $this->assertDatabaseHas('user_addresses', [
            'user_id' => $supplier->id,
            'city' => 'Dasmariñas City',
            'region' => 'Cavite',
            'label' => 'Warehouse',
        ]);
    }

    public function test_supplier_setup_accepts_all_four_documents_with_presigned_cloud_keys(): void
    {
        $supplier = User::factory()->create([
            'role' => 'supplier',
            'artisan_status' => 'pending',
            'setup_completed_at' => null,
        ]);

        $payload = [
            'phone_number' => '09181234567',
            'province' => 'Laguna',
            'city' => 'Santa Rosa City',
            'barangay' => 'Don Jose',
            'street_address' => 'Phase 2 Laguna Technopark',
            'postal_code' => '4026',
            'business_permit' => 'legal_docs/suppliers/permit_123.pdf',
            'dti_registration' => 'legal_docs/suppliers/dti_123.jpg',
            'valid_id' => 'legal_docs/suppliers/valid_id_123.jpg',
            'tin_id' => 'legal_docs/suppliers/tin_id_123.png',
            'tin_number' => '987-654-321-000',
        ];

        $response = $this->actingAs($supplier)->post(route('supplier.setup.store'), $payload);

        $response->assertRedirect(route('supplier.pending'));

        $supplier->refresh();
        $this->assertNotNull($supplier->setup_completed_at);
        $this->assertSame('legal_docs/suppliers/permit_123.pdf', $supplier->business_permit);
        $this->assertSame('legal_docs/suppliers/dti_123.jpg', $supplier->dti_registration);
        $this->assertSame('legal_docs/suppliers/valid_id_123.jpg', $supplier->valid_id);
        $this->assertSame('legal_docs/suppliers/tin_id_123.png', $supplier->tin_id);
    }

    public function test_supplier_setup_rejects_invalid_numbers_and_symbols_in_phone_and_postal_code(): void
    {
        Storage::fake('public');

        $supplier = User::factory()->create([
            'role' => 'supplier',
            'artisan_status' => 'pending',
            'setup_completed_at' => null,
        ]);

        // Attempt submission with invalid phone containing letters/symbols and bad postal code
        $invalidPayload = [
            'phone_number' => '0917-ABC-1234',
            'province' => 'Cavite',
            'city' => 'Dasmariñas City',
            'barangay' => 'Salitran II',
            'street_address' => 'Lot 4 Industrial Estate',
            'postal_code' => '4114A',
            'business_permit' => UploadedFile::fake()->create('business_permit.pdf', 500, 'application/pdf'),
            'tin_number' => '123-INVALID-TIN',
        ];

        $response = $this->actingAs($supplier)->post(route('supplier.setup.store'), $invalidPayload);

        $response->assertSessionHasErrors(['phone_number', 'postal_code', 'tin_number']);
        $this->assertNull($supplier->fresh()->setup_completed_at);
    }

    public function test_supplier_setup_processes_and_stores_live_face_verification(): void
    {
        Storage::fake('public');

        $supplier = User::factory()->create([
            'role' => 'supplier',
            'artisan_status' => 'pending',
            'setup_completed_at' => null,
        ]);

        $dummySelfieDataUrl = 'data:image/jpeg;base64,' . base64_encode(str_repeat('A', 2048));
        $dummyDescriptor = array_fill(0, 128, 0.123456);

        $payload = [
            'phone_number' => '09171234567',
            'province' => 'Cavite',
            'city' => 'Dasmariñas City',
            'barangay' => 'Salitran II',
            'street_address' => 'Lot 4 Industrial Estate',
            'postal_code' => '4114',
            'business_permit' => 'legal_docs/suppliers/permit_123.pdf',
            'valid_id' => 'legal_docs/suppliers/valid_id_123.jpg',
            'selfie_data_url' => $dummySelfieDataUrl,
            'face_descriptor' => $dummyDescriptor,
            'id_face_descriptor' => $dummyDescriptor,
            'face_match_score' => 95,
            'id_face_detected' => true,
        ];

        $response = $this->actingAs($supplier)->post(route('supplier.setup.store'), $payload);

        $response->assertRedirect(route('supplier.pending'));

        $supplier->refresh();
        $this->assertNotNull($supplier->setup_completed_at);
        $this->assertNotNull($supplier->kyc_selfie_path);
        $this->assertStringStartsWith('kyc_selfies/', $supplier->kyc_selfie_path);
        $this->assertNotNull($supplier->kyc_liveness_verified_at);
        $this->assertIsArray($supplier->face_descriptor);
        $this->assertCount(128, $supplier->face_descriptor);
        $this->assertIsArray($supplier->kyc_verification_meta);
        $this->assertTrue($supplier->kyc_verification_meta['liveness_passed']);
        $this->assertTrue($supplier->kyc_verification_meta['id_face_detected']);
        $this->assertEquals(100, $supplier->kyc_verification_meta['match_score']);
        Storage::disk('public')->assertExists($supplier->kyc_selfie_path);
    }

    public function test_pending_supplier_is_gated_to_pending_screen(): void
    {
        $supplier = User::factory()->create([
            'role' => 'supplier',
            'artisan_status' => 'pending',
            'setup_completed_at' => now(),
        ]);

        $response = $this->actingAs($supplier)->get(route('supplier.dashboard'));
        $response->assertRedirect(route('supplier.pending'));

        $pendingResponse = $this->actingAs($supplier)->get(route('supplier.pending'));
        $pendingResponse->assertStatus(200);
    }

    public function test_super_admin_can_approve_supplier(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $supplier = User::factory()->create([
            'role' => 'supplier',
            'artisan_status' => 'pending',
            'setup_completed_at' => now(),
            'business_permit' => 'legal_docs/dummy_permit.pdf',
        ]);

        // Mark document viewed in session as required by ApproveArtisan
        $response = $this->actingAs($admin)
            ->withSession(["artisan_review_docs_{$supplier->id}" => ['business_permit']])
            ->post(route('admin.artisan.approve', $supplier->id));

        $response->assertRedirect();

        $supplier->refresh();
        $this->assertEquals('approved', $supplier->artisan_status);
        $this->assertTrue($supplier->isApproved());
    }

    public function test_approved_supplier_can_list_bulk_materials_with_industrial_units(): void
    {
        Storage::fake('public');

        $supplier = User::factory()->create([
            'role' => 'supplier',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
        ]);

        $materialPayload = [
            'name' => 'Industrial Stoneware Clay',
            'category' => 'Raw Clay & Slips',
            'description' => 'Fine screened 200 mesh stoneware clay for ceramic studios.',
            'price' => 550.00,
            'stock' => 100,
            'moq' => 5,
            'wholesale_price' => 480.00,
            'wholesale_min_qty' => 20,
            'supply_unit' => 'sack',
            'weight' => 50.0,
        ];

        $response = $this->actingAs($supplier)->post(route('supplier.materials.store'), $materialPayload);
        $response->assertRedirect(route('supplier.materials.index'));

        $this->assertDatabaseHas('products', [
            'user_id' => $supplier->id,
            'name' => 'Industrial Stoneware Clay',
            'is_b2b_supply' => true,
            'supply_unit' => 'sack',
            'moq' => 5,
            'wholesale_price' => 480.00,
        ]);
    }

    public function test_supplier_materials_are_strictly_isolated_from_retail_catalog(): void
    {
        $supplier = User::factory()->create([
            'role' => 'supplier',
            'artisan_status' => 'approved',
        ]);

        $supplierProduct = Product::create([
            'user_id' => $supplier->id,
            'sku' => 'B2B-SUP-TEST01',
            'name' => 'Bulk Silica Sand 50kg Drum',
            'category' => 'Glazes & Oxides',
            'price' => 800,
            'cost_price' => 800,
            'stock' => 50,
            'is_b2b_supply' => true,
            'supply_unit' => 'drum',
            'status' => 'Active',
        ]);

        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
        ]);

        $retailProduct = Product::create([
            'user_id' => $artisan->id,
            'sku' => 'ART-RETAIL-01',
            'name' => 'Handmade Artisan Vase',
            'category' => 'Home Decor',
            'price' => 1200,
            'cost_price' => 600,
            'stock' => 5,
            'is_b2b_supply' => false,
            'status' => 'Active',
        ]);

        // Retail scope must NOT include supplier products
        $retailIds = Product::retailOnly()->pluck('id')->toArray();
        $this->assertContains($retailProduct->id, $retailIds);
        $this->assertNotContains($supplierProduct->id, $retailIds);

        // B2B supply scope MUST include supplier product
        $b2bIds = Product::b2bSupplies()->pluck('id')->toArray();
        $this->assertContains($supplierProduct->id, $b2bIds);
    }

    public function test_premium_artisan_monthly_sourcing_quota_enforced(): void
    {
        $premiumArtisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'premium_tier' => 'premium',
            'setup_completed_at' => now(),
        ]);

        $supplier = User::factory()->create([
            'role' => 'supplier',
            'artisan_status' => 'approved',
        ]);

        $material = Product::create([
            'user_id' => $supplier->id,
            'sku' => 'B2B-QUOTA-TEST',
            'name' => 'Testing Clay Batch',
            'category' => 'Raw Clay & Slips',
            'price' => 300,
            'cost_price' => 300,
            'stock' => 500,
            'is_b2b_supply' => true,
            'moq' => 1,
            'status' => 'Active',
        ]);

        $hubService = app(B2BSupplyHubService::class);

        // Initially 0 used
        $usage = $hubService->getMonthlySourcingUsage($premiumArtisan);
        $this->assertEquals(0, $usage['used']);
        $this->assertEquals(10, $usage['limit']);
        $this->assertTrue($usage['can_order']);

        // Create 10 B2B orders for this month
        for ($i = 0; $i < 10; $i++) {
            $order = Order::create([
                'user_id' => $premiumArtisan->id,
                'artisan_id' => $supplier->id,
                'order_number' => 'B2B-TEST-' . ($i + 1),
                'customer_name' => $premiumArtisan->name,
                'customer_email' => $premiumArtisan->email,
                'customer_phone' => '09170000000',
                'shipping_address' => 'Cavite Workshop Address',
                'total_amount' => 300,
                'status' => 'Processing',
                'shipping_method' => 'Delivery',
                'payment_method' => 'GCash',
            ]);

            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $material->id,
                'product_name' => $material->name,
                'quantity' => 1,
                'price' => 300,
                'is_b2b_supply' => true,
            ]);
        }

        // Usage now reflects 10 orders used
        $usageAfter = $hubService->getMonthlySourcingUsage($premiumArtisan);
        $this->assertEquals(10, $usageAfter['used']);
        $this->assertFalse($usageAfter['can_order']);

        // Attempting to place 11th order via storeOrder should throw validation exception
        $this->actingAs($premiumArtisan);

        $response = $this->post(route('seller.supply-hub.checkout.store'), [
            'shipping_method' => 'Delivery',
            'payment_method' => 'GCash',
        ]);

        $response->assertSessionHasErrors('items');
    }

    public function test_elite_artisan_has_unlimited_sourcing_quota(): void
    {
        $eliteArtisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'premium_tier' => 'super_premium',
            'setup_completed_at' => now(),
        ]);

        $hubService = app(B2BSupplyHubService::class);
        $usage = $hubService->getMonthlySourcingUsage($eliteArtisan);

        $this->assertNull($usage['limit']);
        $this->assertTrue($usage['is_unlimited']);
        $this->assertTrue($usage['can_order']);
    }

    public function test_supplier_order_status_update_populates_lifecycle_timestamps(): void
    {
        $supplier = User::factory()->create([
            'role' => 'supplier',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
        ]);

        $order = Order::create([
            'user_id' => $supplier->id,
            'artisan_id' => $supplier->id,
            'order_number' => 'B2B-ORD-LIFECYCLE',
            'customer_name' => 'Buyer Name',
            'customer_email' => 'buyer@example.com',
            'customer_phone' => '09170000000',
            'shipping_address' => 'Cavite',
            'total_amount' => 500,
            'status' => 'Pending',
            'shipping_method' => 'Delivery',
            'payment_method' => 'GCash',
        ]);

        // 1. Accepted -> accepted_at
        $this->actingAs($supplier)->post(route('supplier.orders.status', $order->id), [
            'status' => 'Accepted',
        ]);
        $order->refresh();
        $this->assertSame('Accepted', $order->status);
        $this->assertNotNull($order->accepted_at);

        // 2. Shipped -> shipped_at
        $this->actingAs($supplier)->post(route('supplier.orders.status', $order->id), [
            'status' => 'Shipped',
        ]);
        $order->refresh();
        $this->assertSame('Shipped', $order->status);
        $this->assertNotNull($order->shipped_at);

        // 3. Delivered -> delivered_at, auto_complete_at, warranty_expires_at
        $this->actingAs($supplier)->post(route('supplier.orders.status', $order->id), [
            'status' => 'Delivered',
        ]);
        $order->refresh();
        $this->assertSame('Delivered', $order->status);
        $this->assertNotNull($order->delivered_at);
        $this->assertNotNull($order->auto_complete_at);
        $this->assertNotNull($order->warranty_expires_at);

        // 4. Cancelled -> cancelled_at
        $order2 = Order::create([
            'user_id' => $supplier->id,
            'artisan_id' => $supplier->id,
            'order_number' => 'B2B-ORD-CANCEL',
            'customer_name' => 'Buyer Name',
            'customer_email' => 'buyer@example.com',
            'customer_phone' => '09170000000',
            'shipping_address' => 'Cavite',
            'total_amount' => 500,
            'status' => 'Pending',
            'shipping_method' => 'Delivery',
            'payment_method' => 'GCash',
        ]);

        $this->actingAs($supplier)->post(route('supplier.orders.status', $order2->id), [
            'status' => 'Cancelled',
        ]);
        $order2->refresh();
        $this->assertSame('Cancelled', $order2->status);
        $this->assertNotNull($order2->cancelled_at);
    }

    public function test_buyer_cannot_access_supplier_routes(): void
    {
        $buyer = User::factory()->create([
            'role' => 'buyer',
        ]);

        $response = $this->actingAs($buyer)->get(route('supplier.setup'));
        $response->assertStatus(403);

        $response = $this->actingAs($buyer)->get(route('supplier.pending'));
        $response->assertStatus(403);
    }

    public function test_bulk_approve_artisans_supports_suppliers(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $supplier = User::factory()->create([
            'role' => 'supplier',
            'artisan_status' => 'pending',
        ]);

        $this->actingAs($admin);
        $count = app(\App\Actions\Admin\Users\BulkApproveArtisans::class)->execute([$supplier->id], $admin->id);

        $this->assertEquals(1, $count);
        $supplier->refresh();
        $this->assertSame('approved', $supplier->artisan_status);
        $this->assertNotNull($supplier->approved_at);
    }

    public function test_seller_dashboard_redirects_supplier_to_supplier_portal(): void
    {
        $unapprovedSupplier = User::factory()->create([
            'role' => 'supplier',
            'artisan_status' => 'pending',
            'setup_completed_at' => null,
        ]);

        $response = $this->actingAs($unapprovedSupplier)->get(route('dashboard'));
        $response->assertRedirect(route('supplier.setup'));

        $approvedSupplier = User::factory()->create([
            'role' => 'supplier',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
        ]);

        $response = $this->actingAs($approvedSupplier)->get(route('dashboard'));
        $response->assertRedirect(route('supplier.dashboard'));
    }

    public function test_approved_supplier_can_update_and_delete_material_listing(): void
    {
        $supplier = User::factory()->create([
            'role' => 'supplier',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
        ]);

        $product = Product::create([
            'user_id' => $supplier->id,
            'sku' => 'B2B-SUP-EDIT01',
            'name' => 'Original Kaolin Clay',
            'category' => 'Raw Clay & Slips',
            'price' => 200.00,
            'cost_price' => 200.00,
            'stock' => 50,
            'is_b2b_supply' => true,
            'supply_unit' => 'kg',
            'moq' => 5,
            'status' => 'Active',
        ]);

        $updatePayload = [
            'name' => 'Premium Kaolin White Clay',
            'category' => 'Raw Clay & Slips',
            'price' => 250.00,
            'stock' => 80,
            'moq' => 10,
            'wholesale_price' => 220.00,
            'wholesale_min_qty' => 30,
            'supply_unit' => 'kg',
            'weight' => 25.0,
        ];

        $response = $this->actingAs($supplier)->post(route('supplier.materials.update', $product->slug), $updatePayload);
        $response->assertRedirect();

        $product->refresh();
        $this->assertSame('Premium Kaolin White Clay', $product->name);
        $this->assertEquals(250.00, $product->price);
        $this->assertEquals(80, $product->stock);

        // Test deletion
        $delResponse = $this->actingAs($supplier)->delete(route('supplier.materials.destroy', $product->slug));
        $delResponse->assertRedirect();
        $this->assertSoftDeleted('products', ['id' => $product->id]);
    }

    public function test_unauthorized_supplier_cannot_modify_other_suppliers_material(): void
    {
        $supplierA = User::factory()->create([
            'role' => 'supplier',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
        ]);

        $supplierB = User::factory()->create([
            'role' => 'supplier',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
        ]);

        $product = Product::create([
            'user_id' => $supplierA->id,
            'sku' => 'B2B-SUP-OTHER',
            'name' => 'Supplier A Glaze',
            'category' => 'Glazes & Oxides',
            'price' => 400.00,
            'stock' => 20,
            'is_b2b_supply' => true,
            'supply_unit' => 'kg',
            'status' => 'Active',
        ]);

        $response = $this->actingAs($supplierB)->post(route('supplier.materials.update', $product->slug), [
            'name' => 'Hacked Name',
            'category' => 'Glazes & Oxides',
            'price' => 100.00,
            'stock' => 10,
            'moq' => 1,
            'supply_unit' => 'kg',
        ]);
        $response->assertStatus(403);

        $delResponse = $this->actingAs($supplierB)->delete(route('supplier.materials.destroy', $product->slug));
        $delResponse->assertStatus(403);
    }

    public function test_supplier_order_cancellation_restores_stock_and_saves_notes(): void
    {
        $supplier = User::factory()->create([
            'role' => 'supplier',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
        ]);

        $material = Product::create([
            'user_id' => $supplier->id,
            'sku' => 'B2B-STOCK-RESTORE',
            'name' => 'Restorable Clay',
            'category' => 'Raw Clay & Slips',
            'price' => 500.00,
            'stock' => 90, // decremented from 100 when order was placed for 10
            'is_b2b_supply' => true,
            'supply_unit' => 'kg',
            'status' => 'Active',
        ]);

        $order = Order::create([
            'user_id' => $supplier->id,
            'artisan_id' => $supplier->id,
            'order_number' => 'B2B-ORD-STOCK-TEST',
            'customer_name' => 'Buyer Workshop',
            'customer_email' => 'artisan@studio.ph',
            'customer_phone' => '09171112233',
            'shipping_address' => 'Silang, Cavite',
            'total_amount' => 5000,
            'status' => 'Processing',
            'shipping_method' => 'Delivery',
            'payment_method' => 'GCash',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $material->id,
            'product_name' => $material->name,
            'quantity' => 10,
            'price' => 500,
            'is_b2b_supply' => true,
        ]);

        $response = $this->actingAs($supplier)->post(route('supplier.orders.status', $order->id), [
            'status' => 'Cancelled',
            'notes' => 'Supplier out of raw pigment; restoring stock.',
        ]);

        $response->assertRedirect();
        $order->refresh();
        $this->assertSame('Cancelled', $order->status);
        $this->assertNotNull($order->cancelled_at);
        $this->assertSame('Supplier out of raw pigment; restoring stock.', $order->shipping_notes);

        // Stock restored from 90 back to 100
        $material->refresh();
        $this->assertEquals(100, $material->stock);

        // Attempting to modify an already cancelled order should fail
        $reopenResponse = $this->actingAs($supplier)->post(route('supplier.orders.status', $order->id), [
            'status' => 'Accepted',
        ]);
        $reopenResponse->assertSessionHasErrors('status');
    }
}

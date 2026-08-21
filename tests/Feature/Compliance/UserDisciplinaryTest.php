<?php

namespace Tests\Feature\Compliance;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\UserDisciplinaryLog;
use App\Services\Compliance\UserDisciplinaryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class UserDisciplinaryTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $artisan;
    protected User $buyer;
    protected UserDisciplinaryService $service;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->service = app(UserDisciplinaryService::class);

        $this->admin = User::factory()->create([
            'role' => 'super_admin',
            'email' => 'admin_test_' . uniqid() . '@likhangkamay.app',
        ]);

        $this->artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'shop_name' => 'Test Studio',
            'email' => 'artisan_test_' . uniqid() . '@likhangkamay.app',
        ]);

        $this->buyer = User::factory()->create([
            'role' => 'buyer',
            'email' => 'buyer_test_' . uniqid() . '@likhangkamay.app',
        ]);
    }

    public function test_issue_warning_increments_count_and_logs_action(): void
    {
        $log = $this->service->issueWarning($this->admin, $this->buyer, 'Unsportsmanlike chat behavior');

        $this->buyer->refresh();

        $this->assertEquals(1, $this->buyer->warning_count);
        $this->assertEquals('Unsportsmanlike chat behavior', $this->buyer->warning_reason);
        $this->assertNotNull($this->buyer->warned_at);
        $this->assertTrue($this->buyer->isWarned());
        $this->assertFalse($this->buyer->isSuspended());
        $this->assertFalse($this->buyer->isBanned());

        $this->assertDatabaseHas('user_disciplinary_logs', [
            'id' => $log->id,
            'user_id' => $this->buyer->id,
            'admin_id' => $this->admin->id,
            'action_type' => 'warning',
            'reason' => 'Unsportsmanlike chat behavior',
        ]);
    }

    public function test_apply_suspension_sets_future_timestamp_and_days_remaining(): void
    {
        $log = $this->service->applySuspension($this->admin, $this->artisan, 7, 'Repeated policy violation');

        $this->artisan->refresh();

        $this->assertTrue($this->artisan->isSuspended());
        $this->assertGreaterThan(0, $this->artisan->daysRemainingSuspension());
        $this->assertNotNull($this->artisan->suspended_at);
        $this->assertEquals('Repeated policy violation', $this->artisan->suspension_reason);

        $this->assertDatabaseHas('user_disciplinary_logs', [
            'id' => $log->id,
            'user_id' => $this->artisan->id,
            'action_type' => 'suspension',
            'duration_days' => 7,
        ]);
    }

    public function test_apply_ban_sets_banned_at(): void
    {
        $log = $this->service->applyBan($this->admin, $this->buyer, 'Fraudulent payment activity');

        $this->buyer->refresh();

        $this->assertTrue($this->buyer->isBanned());
        $this->assertEquals('Fraudulent payment activity', $this->buyer->ban_reason);

        $this->assertDatabaseHas('user_disciplinary_logs', [
            'id' => $log->id,
            'user_id' => $this->buyer->id,
            'action_type' => 'ban',
        ]);
    }

    public function test_lift_suspension_clears_suspended_state(): void
    {
        $this->service->applySuspension($this->admin, $this->artisan, 14, 'Pending review');
        $this->assertTrue($this->artisan->fresh()->isSuspended());

        $this->service->liftSuspension($this->admin, $this->artisan, 'Artisan submitted compliance appeal');

        $this->artisan->refresh();
        $this->assertFalse($this->artisan->isSuspended());
        $this->assertNull($this->artisan->suspended_until);
    }

    public function test_suspended_artisan_products_are_excluded_from_scope_approved(): void
    {
        $product = Product::factory()->create([
            'user_id' => $this->artisan->id,
            'status' => 'Active',
            'sku' => 'SKU-TEST-DISC-001',
            'name' => 'Handmade Clay Pot',
            'category' => 'Pottery',
            'price' => 500,
            'stock' => 10,
        ]);

        $this->assertTrue(Product::approved()->where('products.id', $product->id)->exists());

        // Suspend artisan
        $this->service->applySuspension($this->admin, $this->artisan, 7, 'Suspended');

        $this->assertFalse(Product::approved()->where('products.id', $product->id)->exists());
    }

    public function test_suspended_buyer_is_blocked_from_checkout(): void
    {
        $this->service->applySuspension($this->admin, $this->buyer, 7, 'Suspended for return abuse');

        $response = $this->actingAs($this->buyer)->get(route('checkout.create'));
        $response->assertStatus(403);
    }

    public function test_admin_discipline_endpoint_requires_admin_authorization(): void
    {
        $response = $this->actingAs($this->buyer)->post(route('admin.users.discipline', $this->artisan->id), [
            'action' => 'warning',
            'reason' => 'Unauthorized attempt',
        ]);

        $response->assertStatus(403);

        $adminResponse = $this->actingAs($this->admin)->post(route('admin.users.discipline', $this->buyer->id), [
            'action' => 'warning',
            'reason' => 'Spam comment on product page',
        ]);

        $adminResponse->assertSessionHas('success');
        $this->assertEquals(1, $this->buyer->fresh()->warning_count);
    }
}

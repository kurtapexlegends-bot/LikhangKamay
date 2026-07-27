<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TestMailDispatchTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_access_test_mail_dispatch(): void
    {
        $response = $this->postJson(route('admin.settings.mail.test'), [
            'email' => 'test@example.com',
            'template' => 'verify_email',
        ]);

        $response->assertUnauthorized();
    }

    public function test_non_admin_user_cannot_access_test_mail_dispatch(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);

        $response = $this->actingAs($buyer)->postJson(route('admin.settings.mail.test'), [
            'email' => 'test@example.com',
            'template' => 'verify_email',
        ]);

        $response->assertForbidden();
    }

    public function test_super_admin_can_dispatch_verify_email_test_template(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);

        $response = $this->actingAs($admin)->postJson(route('admin.settings.mail.test'), [
            'email' => 'admin-tester@likhangkamay.app',
            'template' => 'verify_email',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'template' => 'verify_email',
                'target' => 'admin-tester@likhangkamay.app',
            ]);
    }

    public function test_super_admin_can_dispatch_order_receipt_test_template(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);

        $response = $this->actingAs($admin)->postJson(route('admin.settings.mail.test'), [
            'email' => 'buyer-receipt@likhangkamay.app',
            'template' => 'order_receipt',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'template' => 'order_receipt',
                'target' => 'buyer-receipt@likhangkamay.app',
            ]);
    }
}

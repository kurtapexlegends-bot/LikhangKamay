<?php

namespace Tests\Feature\Security;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class WebhookSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_migrate_webhook_rejects_unauthorized_guests_without_secret(): void
    {
        $response = $this->getJson('/webhooks/migrate');
        $response->assertStatus(401)
            ->assertJson(['error' => 'Unauthorized. Please provide a valid secret or log in as an administrator.']);
    }

    public function test_migrate_webhook_rejects_legacy_hardcoded_secret(): void
    {
        config(['app.cron_secret' => 'configured_secret_token_12345']);

        $response = $this->getJson('/webhooks/migrate?secret=likhangkamay_migrate_2026');
        $response->assertStatus(401);
    }

    public function test_migrate_webhook_rejects_artisan_role_without_admin_or_secret(): void
    {
        $artisan = User::factory()->artisanApproved()->create();

        $response = $this->actingAs($artisan)->getJson('/webhooks/migrate');
        $response->assertStatus(401);
    }

    public function test_migrate_webhook_accepts_valid_cron_secret_query_and_header(): void
    {
        config(['app.cron_secret' => 'valid_secret_998877']);
        Artisan::shouldReceive('call')->with('migrate', ['--force' => true])->twice();
        Artisan::shouldReceive('output')->andReturn('Nothing to migrate.');

        // Query param
        $queryResponse = $this->getJson('/webhooks/migrate?secret=valid_secret_998877');
        $queryResponse->assertStatus(200)
            ->assertJson(['status' => 'success']);

        // Header
        $headerResponse = $this->getJson('/webhooks/migrate', [
            'X-Vercel-Cron-Secret' => 'valid_secret_998877',
        ]);
        $headerResponse->assertStatus(200)
            ->assertJson(['status' => 'success']);
    }

    public function test_migrate_webhook_accepts_authenticated_admin_and_super_admin(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $superAdmin = User::factory()->superAdmin()->create();

        Artisan::shouldReceive('call')->with('migrate', ['--force' => true])->twice();
        Artisan::shouldReceive('output')->andReturn('Nothing to migrate.');

        $this->actingAs($admin)->getJson('/webhooks/migrate')
            ->assertStatus(200)
            ->assertJson(['status' => 'success']);

        $this->actingAs($superAdmin)->getJson('/webhooks/migrate')
            ->assertStatus(200)
            ->assertJson(['status' => 'success']);
    }

    public function test_cron_webhooks_reject_unauthorized_and_accept_valid_secret(): void
    {
        config(['app.cron_secret' => 'cron_token_alpha']);

        $this->getJson('/webhooks/cron')->assertStatus(401);
        $this->getJson('/webhooks/cron/queue')->assertStatus(401);

        Artisan::shouldReceive('call')->with('schedule:run')->once();
        Artisan::shouldReceive('call')->with('queue:work', [
            '--stop-when-empty' => true,
            '--max-time' => 50,
        ])->once();
        Artisan::shouldReceive('output')->andReturn('Ran scheduled tasks.');

        $this->getJson('/webhooks/cron', ['X-Vercel-Cron-Secret' => 'cron_token_alpha'])
            ->assertStatus(200)
            ->assertJson(['status' => 'success']);

        $this->getJson('/webhooks/cron/queue', ['X-Vercel-Cron-Secret' => 'cron_token_alpha'])
            ->assertStatus(200)
            ->assertJson(['status' => 'success']);
    }

    public function test_lalamove_webhook_authentication_modes_and_rejections(): void
    {
        config(['services.lalamove.webhook_secret' => 'secure_lalamove_token_7788']);

        $payload = [
            'meta' => ['requestId' => 'req-auth-test'],
            'eventType' => 'DRIVER_ASSIGNED',
            'data' => [
                'orderId' => 'llm_test_nonexistent',
                'status' => 'ON_GOING',
            ],
        ];

        // 1. Missing token
        $this->postJson('/webhooks/lalamove', $payload)
            ->assertStatus(401);

        // 2. Invalid token query param
        $this->postJson('/webhooks/lalamove?token=wrong_token', $payload)
            ->assertStatus(401);

        // 3. Invalid header
        $this->postJson('/webhooks/lalamove', $payload, ['X-Webhook-Token' => 'wrong_token'])
            ->assertStatus(401);

        // 4. Misconfigured empty secret rejects even if blank token provided
        config(['services.lalamove.webhook_secret' => '']);
        $this->postJson('/webhooks/lalamove?token=', $payload)
            ->assertStatus(401);

        // Restore valid secret
        config(['services.lalamove.webhook_secret' => 'secure_lalamove_token_7788']);

        // 5. Valid query param
        $this->postJson('/webhooks/lalamove?token=secure_lalamove_token_7788', $payload)
            ->assertStatus(200);

        // 6. Valid X-Webhook-Token header
        $this->postJson('/webhooks/lalamove', $payload, [
            'X-Webhook-Token' => 'secure_lalamove_token_7788',
        ])->assertStatus(200);

        // 7. Valid Bearer Token header
        $this->postJson('/webhooks/lalamove', $payload, [
            'Authorization' => 'Bearer secure_lalamove_token_7788',
        ])->assertStatus(200);
    }
}

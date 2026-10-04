<?php

namespace Tests\Feature\Admin;

use App\Models\EmailTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailStudioTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_access_email_studio_routes(): void
    {
        $response = $this->getJson(route('admin.email-templates.index'));
        $response->assertUnauthorized();
    }

    public function test_non_admin_cannot_access_email_studio_routes(): void
    {
        /** @var User $buyer */
        $buyer = User::factory()->create(['role' => 'buyer']);

        $response = $this->actingAs($buyer)->getJson(route('admin.email-templates.index'));
        $response->assertForbidden();
    }

    public function test_super_admin_can_list_email_templates(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'super_admin']);

        $response = $this->actingAs($admin)->getJson(route('admin.email-templates.index'));

        $response->assertOk()
            ->assertJsonStructure(['templates', 'users']);
    }

    public function test_super_admin_can_create_custom_email_template(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'super_admin']);

        $response = $this->actingAs($admin)->post(route('admin.email-templates.store'), [
            'name' => 'Test Announcement Template',
            'subject' => 'Test Announcement Subject',
            'headline' => 'Test Headline',
            'body' => 'Hello {user_name}, this is a test template.',
            'button_label' => 'Click Here',
            'button_url' => 'https://likhangkamay.app',
            'category' => 'custom',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('email_templates', [
            'name' => 'Test Announcement Template',
            'subject' => 'Test Announcement Subject',
            'category' => 'custom',
        ]);
    }

    public function test_super_admin_can_dispatch_email_to_specific_user(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'super_admin']);
        /** @var User $recipient */
        $recipient = User::factory()->create(['name' => 'Maria Santos', 'email' => 'maria@example.com']);

        $response = $this->actingAs($admin)->postJson(route('admin.email-templates.dispatch'), [
            'target_type' => 'user',
            'target_user_id' => $recipient->id,
            'subject' => 'Direct Message to Maria',
            'headline' => 'Important Notice',
            'body' => 'Hello {user_name}, welcome to LikhangKamay!',
            'button_label' => 'View Profile',
            'button_url' => 'https://likhangkamay.app',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'dispatched_count' => 1,
            ]);
    }

    public function test_super_admin_can_dispatch_email_to_role_group(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'super_admin']);
        User::factory()->count(3)->create(['role' => 'artisan', 'artisan_status' => 'approved']);

        $response = $this->actingAs($admin)->postJson(route('admin.email-templates.dispatch'), [
            'target_type' => 'role',
            'target_role' => 'approved_artisans',
            'subject' => 'Artisan Community Announcement',
            'headline' => 'Monthly Digest',
            'body' => 'Hello {user_name}, here is your monthly artisan digest.',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
            ]);
    }

    public function test_email_studio_routes_redirect_when_requested_via_inertia(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'super_admin']);

        $version = app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request());
        $inertiaHeaders = [
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => (string) $version,
        ];

        // 1. Index visited via Inertia - redirects to Settings with email tab
        $indexResponse = $this->actingAs($admin)->get(route('admin.email-templates.index'), $inertiaHeaders);
        $indexResponse->assertRedirect(route('admin.settings.index', ['tab' => 'email']));
        $this->assertFalse($indexResponse->headers->contains('content-type', 'application/json'));

        // 2. Dispatch via Inertia - redirects back with session flash
        $recipient = User::factory()->create(['name' => 'Test Inertia Buyer', 'email' => 'inertia-buyer@example.com']);
        $dispatchResponse = $this->actingAs($admin)->post(route('admin.email-templates.dispatch'), [
            'target_type' => 'user',
            'target_user_id' => $recipient->id,
            'subject' => 'Inertia Broadcast Test',
            'body' => 'Inertia test body',
        ], $inertiaHeaders);

        $dispatchResponse->assertRedirect();
        $dispatchResponse->assertSessionHas('success');
        $this->assertFalse($dispatchResponse->headers->contains('content-type', 'application/json'));
    }
}

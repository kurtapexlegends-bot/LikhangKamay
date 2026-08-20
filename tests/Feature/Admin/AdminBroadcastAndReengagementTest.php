<?php

namespace Tests\Feature\Admin;

use App\Mail\CustomDynamicMail;
use App\Models\User;
use App\Notifications\ArtisanReengagementNotification;
use App\Notifications\SystemBroadcastNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AdminBroadcastAndReengagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_reengage_inactive_artisan_via_one_click(): void
    {
        Mail::fake();
        Notification::fake();

        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'super_admin']);
        /** @var User $artisan */
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'shop_name' => 'Vigan Heritage Clay',
            'last_seen_at' => now()->subDays(75),
        ]);

        $response = $this->actingAs($admin)->postJson(route('admin.insights.reengage-artisan', $artisan->id));

        $response->assertOk()
            ->assertJson([
                'success' => true,
            ]);

        Mail::assertSent(CustomDynamicMail::class, function ($mail) use ($artisan) {
            return $mail->hasTo($artisan->email);
        });

        Notification::assertSentTo($artisan, ArtisanReengagementNotification::class);
    }

    public function test_non_artisan_cannot_be_reengaged(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'super_admin']);
        /** @var User $buyer */
        $buyer = User::factory()->create(['role' => 'buyer']);

        $response = $this->actingAs($admin)->postJson(route('admin.insights.reengage-artisan', $buyer->id));

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Target user is not an artisan.',
            ]);
    }

    public function test_audience_broadcast_delivers_both_email_and_database_notification(): void
    {
        Mail::fake();
        Notification::fake();

        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'super_admin']);
        /** @var User $recipient */
        $recipient = User::factory()->create([
            'name' => 'Maria Santos',
            'email' => 'maria.artisan@example.com',
            'role' => 'artisan',
            'shop_name' => 'Santos Weaving',
        ]);

        $response = $this->actingAs($admin)->postJson(route('admin.email-templates.dispatch'), [
            'target_type' => 'user',
            'target_user_id' => $recipient->id,
            'subject' => 'Important Studio Announcement',
            'headline' => 'Platform Update',
            'body' => 'Hello {user_name}, here is an update regarding your shop {shop_name}.',
            'button_label' => 'Check Dashboard',
            'button_url' => 'https://likhangkamay.app/dashboard',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'dispatched_count' => 1,
            ]);

        Mail::assertSent(CustomDynamicMail::class, function ($mail) use ($recipient) {
            return $mail->hasTo($recipient->email);
        });

        Notification::assertSentTo($recipient, SystemBroadcastNotification::class, function ($notification) {
            $data = $notification->toArray((object)['name' => 'Maria', 'shop_name' => 'Santos Weaving']);
            return $data['type'] === 'system_broadcast' && $data['subject'] === 'Important Studio Announcement';
        });
    }

    public function test_audience_broadcast_to_role_group_sends_database_notifications_to_all_members(): void
    {
        Mail::fake();
        Notification::fake();

        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'super_admin']);
        $artisans = User::factory()->count(3)->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
        ]);

        $response = $this->actingAs($admin)->postJson(route('admin.email-templates.dispatch'), [
            'target_type' => 'role',
            'target_role' => 'approved_artisans',
            'subject' => 'Artisan Policy Update',
            'headline' => 'Policy Refresh',
            'body' => 'Hello {user_name}, please review the new policy.',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'dispatched_count' => 3,
            ]);

        foreach ($artisans as $artisan) {
            Notification::assertSentTo($artisan, SystemBroadcastNotification::class);
        }
    }
}

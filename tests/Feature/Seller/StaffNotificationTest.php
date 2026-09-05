<?php

namespace Tests\Feature\Seller;

use App\Models\User;
use App\Support\NotificationPresenter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class StaffNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_view_seller_notifications(): void
    {
        $owner = User::factory()->artisanApproved()->create();
        $staff = User::factory()->staff($owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['orders' => true], true),
        ]);

        // Create a notification for the owner (shop/seller level notification)
        $owner->notifications()->create([
            'id' => Str::uuid(),
            'type' => 'App\Notifications\GenericNotification',
            'data' => [
                'type' => 'new_order',
                'title' => 'New Order #1001',
                'message' => 'An order has been placed.',
            ],
        ]);

        $this->assertEquals(1, $staff->getNotificationsQuery()->count());
        $this->assertEquals(1, $staff->getUnreadNotificationsQuery()->count());

        $response = $this->actingAs($staff)->get(route('notifications.index'));
        $response->assertOk();

        // Also check wantsJson endpoint response format
        $jsonResponse = $this->actingAs($staff)->getJson(route('notifications.index'));
        $jsonResponse->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonCount(1, 'notifications');
    }

    public function test_staff_can_mark_seller_notifications_as_read_and_unread(): void
    {
        $owner = User::factory()->artisanApproved()->create();
        $staff = User::factory()->staff($owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['products' => true], true),
        ]);

        $notification = $owner->notifications()->create([
            'id' => Str::uuid(),
            'type' => 'App\Notifications\GenericNotification',
            'data' => [
                'type' => 'low_stock',
                'title' => 'Low Stock Warning',
                'message' => 'Stock is low.',
            ],
        ]);

        $this->assertNull($notification->read_at);

        // Mark as read acting as staff
        $response = $this->actingAs($staff)->post(route('notifications.read', $notification->id));
        $response->assertRedirect();
        
        // Assert staff account sees notification as read (unread count = 0) while owner account remains unread (unread count = 1)
        $this->assertEquals(0, $staff->getUnreadNotificationsQuery()->count());
        $this->assertEquals(1, $owner->getUnreadNotificationsQuery()->count());
        $this->assertNotNull(NotificationPresenter::present($notification, $staff)['read_at']);
        $this->assertNull(NotificationPresenter::present($notification, $owner)['read_at']);

        // Mark as unread acting as staff
        $response = $this->actingAs($staff)->post(route('notifications.unread', $notification->id));
        $response->assertRedirect();

        $this->assertEquals(1, $staff->getUnreadNotificationsQuery()->count());
    }

    public function test_staff_can_delete_seller_notifications(): void
    {
        $owner = User::factory()->artisanApproved()->create();
        $staff = User::factory()->staff($owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['products' => true], true),
        ]);

        $notification = $owner->notifications()->create([
            'id' => Str::uuid(),
            'type' => 'App\Notifications\GenericNotification',
            'data' => [
                'type' => 'low_stock',
                'title' => 'Low Stock Warning',
                'message' => 'Stock is low.',
            ],
        ]);

        $this->assertEquals(1, $staff->getNotificationsQuery()->count());

        // Delete acting as staff
        $response = $this->actingAs($staff)->delete(route('notifications.destroy', $notification->id));
        $response->assertRedirect();

        $this->assertEquals(0, $staff->getNotificationsQuery()->count());
    }

    public function test_staff_message_notification_routes_to_seller_chat(): void
    {
        $owner = User::factory()->artisanApproved()->create();
        $staff = User::factory()->staff($owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
        ]);

        $notification = $owner->notifications()->create([
            'id' => Str::uuid(),
            'type' => 'App\Notifications\NewMessageNotification',
            'data' => [
                'type' => 'new_message',
                'title' => 'New Message',
                'message' => 'Hello',
                'sender_id' => 999,
            ],
        ]);

        $presented = NotificationPresenter::present($notification, $staff);
        $this->assertEquals(route('chat.index', ['user_id' => 999]), $presented['url']);
    }

    public function test_notify_seller_workspace_does_not_duplicate_notifications(): void
    {
        $owner = User::factory()->artisanApproved()->create();
        $staff1 = User::factory()->staff($owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['orders' => true], true),
        ]);
        $staff2 = User::factory()->staff($owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['orders' => true], true),
        ]);

        $notification = new class extends \Illuminate\Notifications\Notification {
            public function via($notifiable) { return ['database']; }
            public function toArray($notifiable) {
                return ['type' => 'new_order', 'title' => 'New Order #123', 'message' => 'New order created.'];
            }
        };

        $owner->notifySellerWorkspace($notification, 'orders');

        // Only 1 row created in database notifications (for the owner)
        $this->assertEquals(1, \Illuminate\Notifications\DatabaseNotification::count());
        $this->assertEquals(1, $owner->notifications()->count());
        $this->assertEquals(0, $staff1->notifications()->count());
        $this->assertEquals(0, $staff2->notifications()->count());

        // Both staff members can view it via getNotificationsQuery()
        $this->assertEquals(1, $staff1->getNotificationsQuery()->count());
        $this->assertEquals(1, $staff2->getNotificationsQuery()->count());
    }

    public function test_user_disciplinary_notification_populates_title_message_and_url(): void
    {
        $user = User::factory()->create();
        $notification = new \App\Notifications\UserDisciplinaryNotification(
            'suspension',
            'Violation of terms',
            7,
            now()->addDays(7)
        );

        $payload = $notification->toArray($user);

        $this->assertEquals('disciplinary_action', $payload['type']);
        $this->assertStringContainsString('Suspension', $payload['title']);
        $this->assertStringContainsString('Violation of terms', $payload['message']);
        $this->assertNotEmpty($payload['url']);
    }

    public function test_notification_presenter_present_collection_bulk_fetches_states(): void
    {
        $user = User::factory()->create();
        $n1 = $user->notifications()->create([
            'id' => Str::uuid(),
            'type' => 'App\Notifications\GenericNotification',
            'data' => ['type' => 'general', 'title' => 'T1', 'message' => 'M1'],
        ]);
        $n2 = $user->notifications()->create([
            'id' => Str::uuid(),
            'type' => 'App\Notifications\GenericNotification',
            'data' => ['type' => 'general', 'title' => 'T2', 'message' => 'M2'],
        ]);

        \App\Models\UserNotificationState::create([
            'user_id' => $user->id,
            'notification_id' => $n1->id,
            'read_at' => now(),
        ]);

        $presented = NotificationPresenter::presentCollection([$n1, $n2], $user);
        $this->assertCount(2, $presented);
        $this->assertNotNull($presented->firstWhere('id', $n1->id)['read_at']);
        $this->assertNull($presented->firstWhere('id', $n2->id)['read_at']);
    }

    public function test_team_channel_message_and_mention_notifications_route_to_channel_url(): void
    {
        $user = User::factory()->create(['role' => 'artisan']);

        $channelNotification = $user->notifications()->create([
            'id' => Str::uuid(),
            'type' => 'App\Notifications\NewTeamChannelMessageNotification',
            'data' => [
                'type' => 'team_channel_message',
                'title' => 'New message in #general',
                'message' => 'Alice posted in #general.',
                'team_channel_id' => 42,
                'sender_id' => 99,
                'url' => route('team-messages.index', ['channel_id' => 42]),
            ],
        ]);

        $mentionNotification = $user->notifications()->create([
            'id' => Str::uuid(),
            'type' => 'App\Notifications\TeamMessageMentionedNotification',
            'data' => [
                'type' => 'team_mention',
                'title' => 'Mentioned in Chat',
                'message' => 'Alice mentioned you in #general.',
                'team_channel_id' => 42,
                'sender_id' => 99,
                'url' => route('team-messages.index', ['channel_id' => 42]),
            ],
        ]);

        $presentedChannel = NotificationPresenter::present($channelNotification, $user);
        $this->assertEquals(route('team-messages.index', ['channel_id' => 42]), $presentedChannel['url']);
        $this->assertStringNotContainsString('user_id=99', $presentedChannel['url']);

        $presentedMention = NotificationPresenter::present($mentionNotification, $user);
        $this->assertEquals(route('team-messages.index', ['channel_id' => 42]), $presentedMention['url']);
        $this->assertStringNotContainsString('user_id=99', $presentedMention['url']);
    }

    public function test_staff_with_reviews_and_hr_modules_can_view_workspace_notifications(): void
    {
        $owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);
        $staffReviews = User::factory()->staff($owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['reviews' => true], true),
        ]);
        $staffHR = User::factory()->staff($owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['hr' => true], true),
        ]);

        $reviewNotification = $owner->notifications()->create([
            'id' => Str::uuid(),
            'type' => 'App\Notifications\NewReviewNotification',
            'data' => [
                'type' => 'new_review',
                'title' => '5-Star Review',
                'message' => 'Great product!',
            ],
        ]);

        $clockInNotification = $owner->notifications()->create([
            'id' => Str::uuid(),
            'type' => 'App\Notifications\OffSiteClockInNotification',
            'data' => [
                'type' => 'off_site_clock_in',
                'title' => 'Off-Site Clock-In Flagged',
                'message' => 'Staff clocked in outside store location boundary.',
            ],
        ]);

        // Staff with reviews permission sees review notification but not off-site clock-in
        $this->assertTrue($staffReviews->getNotificationsQuery()->where('id', $reviewNotification->id)->exists());
        $this->assertFalse($staffReviews->getNotificationsQuery()->where('id', $clockInNotification->id)->exists());

        // Staff with HR permission sees off-site clock-in notification but not review
        $this->assertTrue($staffHR->getNotificationsQuery()->where('id', $clockInNotification->id)->exists());
        $this->assertFalse($staffHR->getNotificationsQuery()->where('id', $reviewNotification->id)->exists());
    }

    public function test_notify_seller_workspace_called_on_staff_targets_seller_owner(): void
    {
        $owner = User::factory()->artisanApproved()->create();
        $staff = User::factory()->staff($owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['orders' => true], true),
        ]);

        $notification = new class extends \Illuminate\Notifications\Notification {
            public function via($notifiable) { return ['database']; }
            public function toArray($notifiable) {
                return ['type' => 'new_order', 'title' => 'Order from Staff Action', 'message' => 'Created.'];
            }
        };

        // Call on staff
        $staff->notifySellerWorkspace($notification, 'orders');

        // Stored under owner
        $this->assertEquals(1, $owner->notifications()->count());
        $this->assertEquals(0, $staff->notifications()->count());

        // Accessible to staff through workspace query
        $this->assertEquals(1, $staff->getNotificationsQuery()->count());
    }
}

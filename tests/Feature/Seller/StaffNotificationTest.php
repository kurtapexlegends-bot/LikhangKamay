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
        
        $notification->refresh();
        $this->assertNotNull($notification->read_at);
        $this->assertEquals(0, $staff->getUnreadNotificationsQuery()->count());

        // Mark as unread acting as staff
        $response = $this->actingAs($staff)->post(route('notifications.unread', $notification->id));
        $response->assertRedirect();

        $notification->refresh();
        $this->assertNull($notification->read_at);
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
}

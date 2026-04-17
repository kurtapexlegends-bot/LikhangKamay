<?php

namespace Tests\Feature\Staff;

use App\Models\Message;
use App\Models\Order;
use App\Models\TeamMessage;
use App\Models\User;
use App\Models\StaffAttendanceSession;
use App\Notifications\NewTeamMessageNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TeamMessagingTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_owner_can_message_staff_in_same_organization(): void
    {
        Notification::fake();

        $owner = $this->createPremiumOwner();
        $staff = $this->createStaff($owner, 'hr');

        $this->actingAs($owner)
            ->post(route('team-messages.store'), [
                'receiver_id' => $staff->id,
                'message' => 'Please review the new HR entries today.',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('team_messages', [
            'seller_owner_id' => $owner->id,
            'sender_id' => $owner->id,
            'receiver_id' => $staff->id,
            'message' => 'Please review the new HR entries today.',
        ]);

        Notification::assertSentTo(
            $staff,
            NewTeamMessageNotification::class,
            function (NewTeamMessageNotification $notification, array $channels) use ($staff) {
                $payload = $notification->toArray($staff);

                return $payload['type'] === 'team_message'
                    && str_contains($payload['url'], route('team-messages.index', absolute: false));
            }
        );
    }

    public function test_staff_can_message_other_staff_in_same_seller_organization(): void
    {
        $owner = $this->createPremiumOwner();
        $hrStaff = $this->createStaff($owner, 'hr');
        $accountingStaff = $this->createStaff($owner, 'accounting');

        $this->actingAs($hrStaff)
            ->post(route('team-messages.store'), [
                'receiver_id' => $accountingStaff->id,
                'message' => 'Payroll draft is ready for your review.',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('team_messages', [
            'seller_owner_id' => $owner->id,
            'sender_id' => $hrStaff->id,
            'receiver_id' => $accountingStaff->id,
            'message' => 'Payroll draft is ready for your review.',
        ]);
    }

    public function test_team_inbox_supports_attachment_messages(): void
    {
        Storage::fake('public');

        $owner = $this->createPremiumOwner();
        $staff = $this->createStaff($owner, 'hr');

        $this->actingAs($owner)
            ->post(route('team-messages.store'), [
                'receiver_id' => $staff->id,
                'message' => '',
                'attachment' => UploadedFile::fake()->image('proof.png'),
            ])
            ->assertRedirect();

        $message = TeamMessage::query()->latest()->firstOrFail();

        $this->assertSame('image', $message->attachment_type);
        $this->assertNotNull($message->attachment_path);
        Storage::disk('public')->assertExists($message->attachment_path);
    }

    public function test_cross_shop_team_messages_are_blocked(): void
    {
        $firstOwner = $this->createPremiumOwner();
        $secondOwner = $this->createPremiumOwner();
        $firstStaff = $this->createStaff($firstOwner, 'hr');
        $secondStaff = $this->createStaff($secondOwner, 'hr');

        $this->actingAs($firstStaff)
            ->post(route('team-messages.store'), [
                'receiver_id' => $secondStaff->id,
                'message' => 'This should never cross organizations.',
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('team_messages', [
            'sender_id' => $firstStaff->id,
            'receiver_id' => $secondStaff->id,
            'message' => 'This should never cross organizations.',
        ]);
    }

    public function test_team_inbox_renders_for_staff_and_marks_messages_seen(): void
    {
        $owner = $this->createPremiumOwner();
        $staff = $this->createStaff($owner, 'custom', []);
        $message = TeamMessage::create([
            'seller_owner_id' => $owner->id,
            'sender_id' => $owner->id,
            'receiver_id' => $staff->id,
            'message' => 'Welcome to the internal inbox.',
        ]);

        $this->actingAs($staff)
            ->get(route('team-messages.index', ['user_id' => $owner->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/TeamMessages')
                ->where('currentChatUser.id', $owner->id)
                ->where('activeMessages.0.text', 'Welcome to the internal inbox.')
            );

        $this->actingAs($staff)
            ->post(route('team-messages.seen'), ['sender_id' => $owner->id])
            ->assertOk();

        $this->assertTrue($message->fresh()->is_read);
    }

    public function test_staff_with_messages_access_can_open_the_seller_chat_workspace(): void
    {
        $owner = $this->createPremiumOwner();
        $staff = $this->createStaff($owner, 'customer_support');
        $buyer = User::factory()->create();

        Order::create([
            'order_number' => 'ORD-TEAMMSG-001',
            'user_id' => $buyer->id,
            'artisan_id' => $owner->id,
            'customer_name' => $buyer->name,
            'shipping_address' => 'Buyer Address',
            'shipping_method' => 'Delivery',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'total_amount' => 100,
            'status' => 'Pending',
        ]);

        Message::create([
            'sender_id' => $owner->id,
            'receiver_id' => $buyer->id,
            'message' => 'Hello from the shop.',
        ]);

        $this->actingAs($staff)
            ->get(route('chat.index', ['user_id' => $buyer->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Chat')
                ->where('currentChatUser.id', $buyer->id)
                ->where('activeMessages.0.text', 'Hello from the shop.')
            );
    }

    public function test_read_only_messages_staff_can_view_seller_chat_but_cannot_send_messages(): void
    {
        $owner = $this->createPremiumOwner();
        $staff = $this->createStaff($owner, 'custom', [
            'messages' => User::STAFF_ACCESS_PERMISSION_READ_ONLY,
        ]);
        $buyer = User::factory()->create();

        Order::create([
            'order_number' => 'ORD-READONLY-MSG-001',
            'user_id' => $buyer->id,
            'artisan_id' => $owner->id,
            'customer_name' => $buyer->name,
            'shipping_address' => 'Buyer Address',
            'shipping_method' => 'Delivery',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'total_amount' => 100,
            'status' => 'Pending',
        ]);

        Message::create([
            'sender_id' => $owner->id,
            'receiver_id' => $buyer->id,
            'message' => 'Hello from the shop.',
        ]);

        $this->actingAs($staff)
            ->get(route('chat.index', ['user_id' => $buyer->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/Chat')
                ->where('currentChatUser.id', $buyer->id)
                ->where('activeMessages.0.text', 'Hello from the shop.')
                ->where('sellerSidebar.canEditModules.messages', false)
            );

        $this->actingAs($staff)
            ->post(route('chat.store'), [
                'receiver_id' => $buyer->id,
                'message' => 'This should be blocked for read-only staff.',
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('messages', [
            'receiver_id' => $buyer->id,
            'message' => 'This should be blocked for read-only staff.',
        ]);
    }

    public function test_staff_cannot_access_buyer_chat_and_buyers_cannot_access_team_inbox(): void
    {
        $owner = $this->createPremiumOwner();
        $staff = $this->createStaff($owner, 'customer_support');
        $buyer = User::factory()->create();

        $this->actingAs($staff)
            ->get(route('buyer.chat'))
            ->assertRedirect(route('staff.home', absolute: false));

        $this->actingAs($buyer)
            ->get(route('team-messages.index'))
            ->assertForbidden();
    }

    private function createPremiumOwner(): User
    {
        $owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);

        $owner->modules_enabled = [
            'hr' => true,
            'accounting' => true,
            'procurement' => true,
        ];
        $owner->save();

        return $owner;
    }

    private function createStaff(User $owner, string $presetKey, array $permissions = []): User
    {
        $staff = User::factory()->staff($owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => $presetKey,
            'staff_module_permissions' => User::withWorkspaceAccessFlag($permissions, true),
        ]);

        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHour(),
            'last_heartbeat_at' => now(config('app.timezone')),
            'worked_minutes' => 60,
        ]);

        return $staff;
    }
}

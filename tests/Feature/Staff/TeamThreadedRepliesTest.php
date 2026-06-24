<?php

namespace Tests\Feature\Staff;

use App\Models\TeamChannel;
use App\Models\TeamMessage;
use App\Models\User;
use App\Models\StaffAttendanceSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeamThreadedRepliesTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthorized_actor_cannot_fetch_thread_replies(): void
    {
        $owner1 = $this->createPremiumOwner();
        $owner2 = $this->createPremiumOwner();
        $staffOfOwner2 = $this->createStaff($owner2, 'hr');

        $message = TeamMessage::create([
            'seller_owner_id' => $owner1->id,
            'sender_id' => $owner1->id,
            'receiver_id' => null,
            'message' => 'Parent message'
        ]);

        $this->actingAs($staffOfOwner2)
            ->get(route('team-messages.threads.show', $message->id))
            ->assertForbidden();
    }

    public function test_eligible_actor_can_send_threaded_reply_in_channel(): void
    {
        $owner = $this->createPremiumOwner();
        $staff = $this->createStaff($owner, 'hr');

        $channel = TeamChannel::create([
            'seller_owner_id' => $owner->id,
            'name' => 'general',
            'created_by_id' => $owner->id,
        ]);
        $channel->members()->attach([$owner->id, $staff->id]);

        $parentMessage = TeamMessage::create([
            'seller_owner_id' => $owner->id,
            'sender_id' => $owner->id,
            'team_channel_id' => $channel->id,
            'message' => 'First message in general',
        ]);

        $this->actingAs($staff)
            ->post(route('team-messages.store'), [
                'parent_id' => $parentMessage->id,
                'message' => 'Replying to first message',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('team_messages', [
            'seller_owner_id' => $owner->id,
            'sender_id' => $staff->id,
            'parent_id' => $parentMessage->id,
            'team_channel_id' => $channel->id,
            'message' => 'Replying to first message',
        ]);
    }

    public function test_sending_threaded_reply_resolves_receiver_automatically_in_direct_message(): void
    {
        $owner = $this->createPremiumOwner();
        $staff = $this->createStaff($owner, 'hr');

        $parentMessage = TeamMessage::create([
            'seller_owner_id' => $owner->id,
            'sender_id' => $owner->id,
            'receiver_id' => $staff->id,
            'message' => 'Direct parent message',
        ]);

        // Staff replies to Owner's message -> should set receiver_id to owner->id automatically
        $this->actingAs($staff)
            ->post(route('team-messages.store'), [
                'parent_id' => $parentMessage->id,
                'message' => 'Direct thread reply',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('team_messages', [
            'seller_owner_id' => $owner->id,
            'sender_id' => $staff->id,
            'parent_id' => $parentMessage->id,
            'receiver_id' => $owner->id,
            'team_channel_id' => null,
            'message' => 'Direct thread reply',
        ]);
    }

    public function test_show_thread_returns_parent_and_replies(): void
    {
        $owner = $this->createPremiumOwner();
        $staff = $this->createStaff($owner, 'hr');

        $parentMessage = TeamMessage::create([
            'seller_owner_id' => $owner->id,
            'sender_id' => $owner->id,
            'receiver_id' => $staff->id,
            'message' => 'Parent message',
        ]);

        $reply = TeamMessage::create([
            'seller_owner_id' => $owner->id,
            'sender_id' => $staff->id,
            'receiver_id' => $owner->id,
            'parent_id' => $parentMessage->id,
            'message' => 'Reply message',
        ]);

        $this->actingAs($owner)
            ->get(route('team-messages.threads.show', $parentMessage->id))
            ->assertOk()
            ->assertJson([
                'success' => true,
                'parent' => [
                    'id' => $parentMessage->id,
                    'text' => 'Parent message',
                ],
                'replies' => [
                    [
                        'id' => $reply->id,
                        'text' => 'Reply message',
                    ]
                ]
            ]);
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
            'team_messages' => true,
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

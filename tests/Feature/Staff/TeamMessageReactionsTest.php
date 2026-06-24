<?php

namespace Tests\Feature\Staff;

use App\Models\TeamChannel;
use App\Models\TeamMessage;
use App\Models\User;
use App\Models\StaffAttendanceSession;
use App\Models\TeamMessageReaction;
use App\Events\TeamMessageReactionUpdated;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class TeamMessageReactionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthorized_actor_cannot_toggle_message_reaction(): void
    {
        $owner1 = $this->createPremiumOwner();
        $owner2 = $this->createPremiumOwner();
        $staffOfOwner2 = $this->createStaff($owner2, 'hr');

        $message = TeamMessage::create([
            'seller_owner_id' => $owner1->id,
            'sender_id' => $owner1->id,
            'receiver_id' => null,
            'message' => 'Hello team'
        ]);

        $this->actingAs($staffOfOwner2)
            ->post(route('team-messages.react'), [
                'team_message_id' => $message->id,
                'emoji' => '👍',
            ])
            ->assertForbidden();
    }

    public function test_eligible_actor_can_toggle_reaction_on_message(): void
    {
        $owner = $this->createPremiumOwner();
        $staff = $this->createStaff($owner, 'hr');

        $message = TeamMessage::create([
            'seller_owner_id' => $owner->id,
            'sender_id' => $owner->id,
            'receiver_id' => $staff->id,
            'message' => 'Hello staff'
        ]);

        // 1. React with emoji
        $this->actingAs($staff)
            ->post(route('team-messages.react'), [
                'team_message_id' => $message->id,
                'emoji' => '👍',
            ])
            ->assertOk()
            ->assertJson([
                'success' => true,
                'reactions' => [
                    [
                        'emoji' => '👍',
                        'count' => 1,
                        'reacted_by_me' => true,
                        'users_list' => [$staff->name],
                    ]
                ]
            ]);

        $this->assertDatabaseHas('team_message_reactions', [
            'team_message_id' => $message->id,
            'user_id' => $staff->id,
            'emoji' => '👍',
        ]);

        // 2. Toggle reaction off
        $this->actingAs($staff)
            ->post(route('team-messages.react'), [
                'team_message_id' => $message->id,
                'emoji' => '👍',
            ])
            ->assertOk()
            ->assertJson([
                'success' => true,
                'reactions' => []
            ]);

        $this->assertDatabaseMissing('team_message_reactions', [
            'team_message_id' => $message->id,
            'user_id' => $staff->id,
            'emoji' => '👍',
        ]);
    }

    public function test_toggling_reaction_triggers_websocket_event(): void
    {
        Event::fake();

        $owner = $this->createPremiumOwner();
        $staff = $this->createStaff($owner, 'hr');

        $message = TeamMessage::create([
            'seller_owner_id' => $owner->id,
            'sender_id' => $owner->id,
            'receiver_id' => $staff->id,
            'message' => 'Real-time reaction test'
        ]);

        $this->actingAs($staff)
            ->post(route('team-messages.react'), [
                'team_message_id' => $message->id,
                'emoji' => '❤️',
            ])
            ->assertOk();

        Event::assertDispatched(TeamMessageReactionUpdated::class, function ($event) use ($message, $staff) {
            return $event->messageId === $message->id &&
                $event->reactions[0]['emoji'] === '❤️' &&
                $event->reactions[0]['count'] === 1 &&
                $event->reactions[0]['reacted_by_me'] === true;
        });
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

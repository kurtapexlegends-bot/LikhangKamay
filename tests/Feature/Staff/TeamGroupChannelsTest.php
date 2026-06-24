<?php

namespace Tests\Feature\Staff;

use App\Models\TeamChannel;
use App\Models\TeamChannelMember;
use App\Models\TeamMessage;
use App\Models\User;
use App\Models\StaffAttendanceSession;
use App\Notifications\NewTeamChannelMessageNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TeamGroupChannelsTest extends TestCase
{
    use RefreshDatabase;

    public function test_eligible_actor_can_create_channel_and_sync_members(): void
    {
        $owner = $this->createPremiumOwner();
        $staff1 = $this->createStaff($owner, 'hr');
        $staff2 = $this->createStaff($owner, 'accounting');

        $this->actingAs($owner)
            ->post(route('team-messages.channels.store'), [
                'name' => 'marketing-dept',
                'description' => 'Marketing department announcements.',
                'member_ids' => [$staff1->id, $staff2->id]
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('team_channels', [
            'seller_owner_id' => $owner->id,
            'name' => 'marketing-dept',
            'description' => 'Marketing department announcements.',
            'created_by_id' => $owner->id,
        ]);

        $channel = TeamChannel::where('name', 'marketing-dept')->firstOrFail();

        $this->assertDatabaseHas('team_channel_members', [
            'team_channel_id' => $channel->id,
            'user_id' => $owner->id,
        ]);

        $this->assertDatabaseHas('team_channel_members', [
            'team_channel_id' => $channel->id,
            'user_id' => $staff1->id,
        ]);

        $this->assertDatabaseHas('team_channel_members', [
            'team_channel_id' => $channel->id,
            'user_id' => $staff2->id,
        ]);
    }

    public function test_cannot_create_channel_with_invalid_member(): void
    {
        $owner1 = $this->createPremiumOwner();
        $owner2 = $this->createPremiumOwner();
        $staffOfOwner2 = $this->createStaff($owner2, 'hr');

        $this->actingAs($owner1)
            ->post(route('team-messages.channels.store'), [
                'name' => 'bad-channel',
                'member_ids' => [$staffOfOwner2->id]
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('team_channels', [
            'name' => 'bad-channel',
        ]);
    }

    public function test_can_message_in_channel_and_notifies_members(): void
    {
        Notification::fake();

        $owner = $this->createPremiumOwner();
        $staff = $this->createStaff($owner, 'hr');

        $channel = TeamChannel::create([
            'seller_owner_id' => $owner->id,
            'name' => 'dev-ops',
            'created_by_id' => $owner->id,
        ]);

        $channel->members()->attach([$owner->id, $staff->id]);

        $this->actingAs($owner)
            ->post(route('team-messages.store'), [
                'team_channel_id' => $channel->id,
                'message' => 'Deploying to staging now.',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('team_messages', [
            'seller_owner_id' => $owner->id,
            'sender_id' => $owner->id,
            'team_channel_id' => $channel->id,
            'message' => 'Deploying to staging now.',
        ]);

        Notification::assertSentTo(
            $staff,
            NewTeamChannelMessageNotification::class,
            function (NewTeamChannelMessageNotification $notification, array $channels) use ($staff, $channel) {
                $payload = $notification->toArray($staff);
                return $payload['type'] === 'team_channel_message'
                    && $payload['team_channel_id'] === $channel->id
                    && str_contains($payload['url'], route('team-messages.index', absolute: false));
            }
        );
    }

    public function test_cannot_message_in_non_member_channel(): void
    {
        $owner = $this->createPremiumOwner();
        $staff = $this->createStaff($owner, 'hr');

        $channel = TeamChannel::create([
            'seller_owner_id' => $owner->id,
            'name' => 'secure-chat',
            'created_by_id' => $owner->id,
        ]);

        $channel->members()->attach([$owner->id]); // staff is NOT a member

        $this->actingAs($staff)
            ->post(route('team-messages.store'), [
                'team_channel_id' => $channel->id,
                'message' => 'Sneaking in.',
            ])
            ->assertForbidden();
    }

    public function test_can_mark_channel_as_seen(): void
    {
        $owner = $this->createPremiumOwner();
        $staff = $this->createStaff($owner, 'hr');

        $channel = TeamChannel::create([
            'seller_owner_id' => $owner->id,
            'name' => 'watercooler',
            'created_by_id' => $owner->id,
        ]);

        $channel->members()->attach([
            $owner->id => ['last_read_at' => now()->subDay()],
            $staff->id => ['last_read_at' => now()->subDay()]
        ]);

        $membership = TeamChannelMember::where('team_channel_id', $channel->id)
            ->where('user_id', $staff->id)
            ->firstOrFail();

        $originalReadAt = $membership->last_read_at;

        $this->actingAs($staff)
            ->post(route('team-messages.channels.seen'), [
                'team_channel_id' => $channel->id,
            ])
            ->assertOk()
            ->assertJson(['success' => true]);

        $this->assertTrue(
            $membership->fresh()->last_read_at->isAfter($originalReadAt)
        );
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

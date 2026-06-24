<?php

namespace Tests\Feature\Staff;

use App\Models\TeamChannel;
use App\Models\TeamMessage;
use App\Models\User;
use App\Models\StaffAttendanceSession;
use App\Notifications\TeamMessageMentionedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class TeamMessageMentionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_sending_message_with_valid_mention_notifies_user(): void
    {
        Notification::fake();

        $owner = $this->createPremiumOwner();
        $staff1 = $this->createStaff($owner, 'hr');
        $staff2 = $this->createStaff($owner, 'accounting');

        // Staff1 sends direct message mentioning Staff2
        $this->actingAs($staff1)
            ->post(route('team-messages.store'), [
                'receiver_id' => $staff2->id,
                'message' => "Hey @[{$staff2->name}], can you check the payroll?",
            ])
            ->assertRedirect();

        Notification::assertSentTo(
            $staff2,
            TeamMessageMentionedNotification::class,
            function ($notification) use ($staff1) {
                return $notification->toArray($staff1)['sender_name'] === $staff1->name;
            }
        );
    }

    public function test_user_cannot_notify_themselves_via_mention(): void
    {
        Notification::fake();

        $owner = $this->createPremiumOwner();
        $staff = $this->createStaff($owner, 'hr');

        // Staff sends message mentioning themselves
        $this->actingAs($staff)
            ->post(route('team-messages.store'), [
                'receiver_id' => $owner->id,
                'message' => "Working on this myself @[{$staff->name}]",
            ])
            ->assertRedirect();

        Notification::assertNotSentTo($staff, TeamMessageMentionedNotification::class);
    }

    public function test_unauthorized_mention_does_not_notify(): void
    {
        Notification::fake();

        $owner1 = $this->createPremiumOwner();
        $owner2 = $this->createPremiumOwner();
        $staffOfOwner2 = $this->createStaff($owner2, 'hr');

        // Staff of Owner2 mentions Owner1 (different shop organization)
        $this->actingAs($staffOfOwner2)
            ->post(route('team-messages.store'), [
                'receiver_id' => $owner2->id,
                'message' => "Hey @[{$owner1->name}]!",
            ])
            ->assertRedirect();

        Notification::assertNotSentTo($owner1, TeamMessageMentionedNotification::class);
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

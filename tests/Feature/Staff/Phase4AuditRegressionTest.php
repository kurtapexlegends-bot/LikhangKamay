<?php

namespace Tests\Feature\Staff;

use App\Models\TeamMessage;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class Phase4AuditRegressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_team_inbox_hard_scopes_messages_to_the_actor_seller_organization(): void
    {
        $owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);
        $owner->modules_enabled = [
            'hr' => true,
            'accounting' => false,
            'procurement' => false,
        ];
        $owner->save();
        $staff = $this->createStaff($owner, 'hr');

        $otherOwner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);

        TeamMessage::create([
            'seller_owner_id' => $owner->id,
            'sender_id' => $owner->id,
            'receiver_id' => $staff->id,
            'message' => 'Visible internal message.',
            'is_read' => false,
        ]);

        TeamMessage::create([
            'seller_owner_id' => $otherOwner->id,
            'sender_id' => $staff->id,
            'receiver_id' => $owner->id,
            'message' => 'Leaked rogue message.',
            'is_read' => false,
        ]);

        $this->actingAs($staff)
            ->get(route('team-messages.index', ['user_id' => $owner->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/TeamMessages')
                ->where('activeMessages', function ($messages) {
                    $texts = collect($messages)->pluck('text');

                    return $texts->contains('Visible internal message.')
                        && !$texts->contains('Leaked rogue message.');
                })
                ->where('conversations', function ($conversations) {
                    $lastMessages = collect($conversations)->pluck('lastMessage');

                    return $lastMessages->contains('Visible internal message.')
                        && !$lastMessages->contains('Leaked rogue message.');
                })
            );
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

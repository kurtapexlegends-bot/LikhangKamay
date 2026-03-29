<?php

namespace Tests\Feature\Staff;

use App\Models\TeamMessage;
use App\Models\User;
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

        $owner = User::factory()->artisanApproved()->create();
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
        $owner = User::factory()->artisanApproved()->create();
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

        $owner = User::factory()->artisanApproved()->create();
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
        $firstOwner = User::factory()->artisanApproved()->create();
        $secondOwner = User::factory()->artisanApproved()->create();
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
        $owner = User::factory()->artisanApproved()->create();
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

    public function test_staff_cannot_access_buyer_seller_chat_and_buyers_cannot_access_team_inbox(): void
    {
        $owner = User::factory()->artisanApproved()->create();
        $staff = $this->createStaff($owner, 'customer_support');
        $buyer = User::factory()->create();

        $this->actingAs($staff)
            ->get(route('chat.index'))
            ->assertForbidden();

        $this->actingAs($buyer)
            ->get(route('team-messages.index'))
            ->assertForbidden();
    }

    private function createStaff(User $owner, string $presetKey, array $permissions = []): User
    {
        return User::factory()->staff($owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => $presetKey,
            'staff_module_permissions' => $permissions,
        ]);
    }
}

<?php

namespace Tests\Feature\Chat;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use ReflectionClass;
use Tests\TestCase;

class BroadcastChannelAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private function getChannelCallback(string $channelPattern): callable
    {
        $driver = Broadcast::driver();
        $reflector = new ReflectionClass($driver);
        $property = $reflector->getProperty('channels');
        $property->setAccessible(true);
        $channels = $property->getValue($driver);

        $this->assertArrayHasKey($channelPattern, $channels, "Channel [{$channelPattern}] not registered.");
        return $channels[$channelPattern];
    }

    public function test_user_authorizes_their_own_chat_channel(): void
    {
        $user = User::factory()->create();
        $callback = $this->getChannelCallback('chat.{userId}');

        $this->assertTrue((bool) $callback($user, $user->id));
    }

    public function test_staff_authorizes_their_artisan_owner_chat_channel(): void
    {
        $owner = User::factory()->artisanApproved()->create();
        $staff = User::factory()->staff($owner)->create();
        $callback = $this->getChannelCallback('chat.{userId}');

        $this->assertTrue((bool) $callback($staff, $owner->id));
    }

    public function test_unrelated_user_cannot_authorize_another_users_chat_channel(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $callback = $this->getChannelCallback('chat.{userId}');

        $this->assertFalse((bool) $callback($userA, $userB->id));
    }

    public function test_staff_authorizes_their_artisan_owner_team_chat_channel(): void
    {
        $owner = User::factory()->artisanApproved()->create();
        $staff = User::factory()->staff($owner)->create();
        $callback = $this->getChannelCallback('team-chat.{userId}');

        $this->assertTrue((bool) $callback($staff, $owner->id));
    }

    public function test_unrelated_user_cannot_authorize_another_users_team_chat_channel(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $callback = $this->getChannelCallback('team-chat.{userId}');

        $this->assertFalse((bool) $callback($userA, $userB->id));
    }
}

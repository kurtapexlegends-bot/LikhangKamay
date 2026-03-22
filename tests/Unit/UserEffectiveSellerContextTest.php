<?php

namespace Tests\Unit;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserEffectiveSellerContextTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_owner_resolves_itself_as_the_effective_seller(): void
    {
        $owner = User::factory()->artisanApproved()->create();

        $this->assertTrue($owner->isSellerOwner());
        $this->assertTrue($owner->getEffectiveSeller()->is($owner));
        $this->assertSame($owner->id, $owner->getEffectiveSellerId());
        $this->assertTrue($owner->hasCompletedStaffSecurityGate());
    }

    public function test_staff_resolves_its_linked_seller_owner_as_the_effective_seller(): void
    {
        $owner = User::factory()->artisanApproved()->create();
        $staff = User::factory()->staff($owner)->create([
            'must_change_password' => true,
        ]);

        $this->assertTrue($staff->isStaff());
        $this->assertTrue($staff->getEffectiveSeller()->is($owner));
        $this->assertSame($owner->id, $staff->getEffectiveSellerId());
        $this->assertFalse($staff->hasCompletedStaffSecurityGate());
    }

    public function test_buyers_and_super_admins_do_not_resolve_an_effective_seller(): void
    {
        $buyer = User::factory()->create();
        $admin = User::factory()->superAdmin()->create();

        $this->assertNull($buyer->getEffectiveSeller());
        $this->assertNull($buyer->getEffectiveSellerId());
        $this->assertNull($admin->getEffectiveSeller());
        $this->assertNull($admin->getEffectiveSellerId());
    }
}

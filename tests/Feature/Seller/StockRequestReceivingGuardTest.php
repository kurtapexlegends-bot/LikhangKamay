<?php

namespace Tests\Feature\Seller;

use App\Models\StockRequest;
use App\Models\Supply;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockRequestReceivingGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_receiving_unapproved_stock_request_is_rejected_gracefully(): void
    {
        $owner = User::factory()->artisanApproved()->create([
            'role' => 'artisan',
            'premium_tier' => 'super_premium',
        ]);

        $supply = Supply::create([
            'user_id' => $owner->id,
            'name' => 'Stoneware Clay',
            'category' => 'Raw Materials',
            'unit' => 'kg',
            'quantity' => 10,
            'unit_cost' => 50,
        ]);

        $pendingRequest = StockRequest::create([
            'user_id' => $owner->id,
            'supply_id' => $supply->id,
            'quantity' => 10,
            'status' => StockRequest::STATUS_PENDING,
            'received_quantity' => 0,
            'transferred_quantity' => 0,
            'unit_cost' => 50,
            'total_cost' => 500,
        ]);

        $response = $this->actingAs($owner)
            ->post(route('stock-requests.receive', $pendingRequest), [
                'quantity' => 5,
                'sync_inventory' => true,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('error', 'Only approved or dispatched stock requests can be received.');

        $this->assertEquals(0, $pendingRequest->fresh()->received_quantity);
        $this->assertEquals(10, $supply->fresh()->quantity);
    }

    public function test_receiving_approved_stock_request_increments_inventory(): void
    {
        $owner = User::factory()->artisanApproved()->create([
            'role' => 'artisan',
            'premium_tier' => 'super_premium',
        ]);

        $supply = Supply::create([
            'user_id' => $owner->id,
            'name' => 'Stoneware Clay',
            'category' => 'Raw Materials',
            'unit' => 'kg',
            'quantity' => 10,
            'unit_cost' => 50,
        ]);

        $approvedRequest = StockRequest::create([
            'user_id' => $owner->id,
            'supply_id' => $supply->id,
            'quantity' => 10,
            'status' => StockRequest::STATUS_ACCOUNTING_APPROVED,
            'received_quantity' => 0,
            'transferred_quantity' => 0,
            'unit_cost' => 50,
            'total_cost' => 500,
        ]);

        $response = $this->actingAs($owner)
            ->post(route('stock-requests.receive', $approvedRequest), [
                'quantity' => 8,
                'sync_inventory' => true,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertEquals(8, $approvedRequest->fresh()->received_quantity);
        $this->assertEquals(18, $supply->fresh()->quantity);
    }
}

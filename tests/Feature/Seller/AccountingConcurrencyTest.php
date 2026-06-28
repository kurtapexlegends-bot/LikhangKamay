<?php

namespace Tests\Feature\Seller;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\StaffAttendanceSession;
use App\Models\StockRequest;
use App\Models\Supply;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AccountingConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        // Register custom sqlite connection resolver to intercept and strip 'for update' for SQLite execution
        \Illuminate\Database\Connection::resolverFor('sqlite', function ($connection, $database, $prefix, $config) {
            $conn = new class($connection, $database, $prefix, $config) extends \Illuminate\Database\SQLiteConnection {
                protected function runQueryCallback($query, $bindings, \Closure $callback)
                {
                    $sqliteQuery = str_replace(' for update', '', $query);
                    return parent::runQueryCallback($sqliteQuery, $bindings, $callback);
                }
            };
            
            // Swap SQLite grammar to compile lockForUpdate as 'for update'
            $conn->setQueryGrammar(new class($conn) extends \Illuminate\Database\Query\Grammars\SQLiteGrammar {
                protected function compileLock(\Illuminate\Database\Query\Builder $query, $value)
                {
                    return is_string($value) ? $value : 'for update';
                }
            });

            return $conn;
        });

        parent::setUp();
    }

    protected function tearDown(): void
    {
        parent::tearDown();

        // Clear the resolver using reflection
        $ref = new \ReflectionClass(\Illuminate\Database\Connection::class);
        $prop = $ref->getProperty('resolvers');
        $prop->setAccessible(true);
        $resolvers = $prop->getValue();
        unset($resolvers['sqlite']);
        $prop->setValue(null, $resolvers);
    }

    /**
     * Verify lockForUpdate is used during accounting actions.
     */
    public function test_lock_for_update_is_used_across_accounting_actions(): void
    {
        $owner = $this->createSellerOwner();

        // 1. Verify lockForUpdate in approveRelease (StockRequest)
        $stockRequest = $this->createPendingStockRequest($owner, null, 600);
        
        DB::flushQueryLog();
        DB::enableQueryLog();
        
        $this->actingAs($owner)
            ->post(route('accounting.approve', $stockRequest))
            ->assertRedirect()
            ->assertSessionHas('success');

        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $this->assertHasUserLockForUpdateQuery($queries, 'approveRelease');

        // Reset user balance to allow payroll approval to succeed
        $owner->update(['base_funds' => 25000]);

        // 2. Verify lockForUpdate in approvePayroll (Payroll)
        $payroll = $this->createPendingPayroll($owner, null, 500);

        DB::flushQueryLog();
        DB::enableQueryLog();

        $this->actingAs($owner)
            ->post(route('accounting.approvePayroll', $payroll))
            ->assertRedirect()
            ->assertSessionHas('success');

        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $this->assertHasUserLockForUpdateQuery($queries, 'approvePayroll');

        // 3. Verify lockForUpdate in updateBaseFunds
        DB::flushQueryLog();
        DB::enableQueryLog();

        $this->actingAs($owner)
            ->post(route('accounting.update-funds'), [
                'base_funds' => 30000,
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $this->assertHasUserLockForUpdateQuery($queries, 'updateBaseFunds');
    }

    /**
     * Verify sequential balance checks block negative balances for StockRequests.
     */
    public function test_sequential_stock_request_approvals_block_negative_balances(): void
    {
        $owner = $this->createSellerOwner();
        $owner->update(['base_funds' => 1000]);

        $stockRequestA = $this->createPendingStockRequest($owner, null, 600);
        $stockRequestB = $this->createPendingStockRequest($owner, null, 500);

        // Approve A (600 PHP) - succeeds
        $this->actingAs($owner)
            ->post(route('accounting.approve', $stockRequestA))
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame(StockRequest::STATUS_ACCOUNTING_APPROVED, $stockRequestA->fresh()->status);

        // Approve B (500 PHP) - fails (insufficient funds, only 400 PHP left)
        $this->actingAs($owner)
            ->post(route('accounting.approve', $stockRequestB))
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertSame(StockRequest::STATUS_PENDING, $stockRequestB->fresh()->status);
    }

    /**
     * Verify sequential balance checks block negative balances for Payrolls.
     */
    public function test_sequential_payroll_approvals_block_negative_balances(): void
    {
        $owner = $this->createSellerOwner();
        $owner->update(['base_funds' => 1000]);

        $payrollA = $this->createPendingPayroll($owner, null, 600);
        $payrollB = $this->createPendingPayroll($owner, null, 500);

        // Approve A (600 PHP) - succeeds
        $this->actingAs($owner)
            ->post(route('accounting.approvePayroll', $payrollA))
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame('Paid', $payrollA->fresh()->status);

        // Approve B (500 PHP) - fails (insufficient funds, only 400 PHP left)
        $this->actingAs($owner)
            ->post(route('accounting.approvePayroll', $payrollB))
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertSame('Pending', $payrollB->fresh()->status);
    }

    /**
     * Assert that DB Query Log contains a select query on users with for update.
     */
    private function assertHasUserLockForUpdateQuery(array $queries, string $action): void
    {
        $found = false;
        foreach ($queries as $query) {
            $sql = strtolower($query['query']);
            if ((str_contains($sql, 'users') || str_contains($sql, '"users"')) && str_contains($sql, 'for update')) {
                $found = true;
                break;
            }
        }
        if (!$found) {
            print_r($queries);
        }
        $this->assertTrue($found, "Expected to find lockForUpdate query on users for action: {$action}");
    }

    private function createSellerOwner(): User
    {
        $owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'base_funds' => 25000,
            'payroll_working_days' => 22,
            'overtime_rate' => 50,
        ]);

        $owner->modules_enabled = [
            'hr' => true,
            'accounting' => true,
            'procurement' => true,
        ];
        $owner->save();

        return $owner;
    }

    private function createSupply(User $owner, array $overrides = []): Supply
    {
        return Supply::create(array_merge([
            'user_id' => $owner->id,
            'name' => 'White Clay',
            'category' => 'Other',
            'quantity' => 20,
            'unit' => 'kg',
            'min_stock' => 5,
            'unit_cost' => 120,
            'supplier' => 'Laguna Ceramics',
        ], $overrides));
    }

    private function createPendingStockRequest(User $owner, ?User $requester, float $totalCost): StockRequest
    {
        $supply = $this->createSupply($owner);

        return StockRequest::create([
            'user_id' => $owner->id,
            'requested_by_user_id' => $requester?->id,
            'supply_id' => $supply->id,
            'quantity' => 1,
            'total_cost' => $totalCost,
            'status' => StockRequest::STATUS_PENDING,
        ]);
    }

    private function createPendingPayroll(User $owner, ?User $requester, float $totalAmount): Payroll
    {
        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Ben Weaver',
            'role' => 'Assistant',
            'salary' => $totalAmount,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $payroll = Payroll::create([
            'user_id' => $owner->id,
            'requested_by_user_id' => $requester?->id,
            'month' => 'April 2026',
            'total_amount' => $totalAmount,
            'employee_count' => 1,
            'status' => 'Pending',
        ]);

        PayrollItem::create([
            'payroll_id' => $payroll->id,
            'employee_id' => $employee->id,
            'base_salary' => $totalAmount,
            'days_worked' => 21,
            'absences_days' => 0,
            'undertime_hours' => 0,
            'overtime_hours' => 0,
            'overtime_pay' => 0,
            'net_pay' => $totalAmount,
        ]);

        return $payroll;
    }
}

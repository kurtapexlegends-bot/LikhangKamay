<?php

namespace Tests\Feature\Subscription;

use App\Actions\Seller\Subscription\VerifySubscriptionPayment;
use App\Models\SubscriptionTransaction;
use App\Models\User;
use App\Services\PayMongoService;
use App\Services\SubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class VerifySubscriptionPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    public function test_verify_success_activates_subscription_when_payment_is_valid(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        $transaction = SubscriptionTransaction::create([
            'user_id' => $artisan->id,
            'reference_number' => 'SUB-REF-12345',
            'from_plan' => 'free',
            'to_plan' => 'premium',
            'amount' => 199.00,
            'currency' => 'PHP',
            'status' => SubscriptionTransaction::STATUS_PENDING,
            'paymongo_session_id' => 'cs_valid_session_123',
        ]);

        $payMongoMock = $this->createMock(PayMongoService::class);
        $payMongoMock->expects($this->once())
            ->method('retrieveCheckoutSession')
            ->with('cs_valid_session_123')
            ->willReturn([
                'attributes' => [
                    'reference_number' => 'SUB-REF-12345',
                    'payment_status' => 'paid',
                    'status' => 'active',
                ],
            ]);

        $action = new VerifySubscriptionPayment();
        $result = $action->verifySuccess($transaction, $payMongoMock, app(SubscriptionService::class));

        $this->assertSame('applied', $result);
        $this->assertSame(SubscriptionTransaction::STATUS_PAID, $transaction->fresh()->status);
        $this->assertSame('premium', $artisan->fresh()->premium_tier);
        $this->assertNotNull($artisan->fresh()->subscription_expires_at);
    }

    public function test_verify_success_rejects_on_reference_mismatch(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        $transaction = SubscriptionTransaction::create([
            'user_id' => $artisan->id,
            'reference_number' => 'SUB-EXPECTED-999',
            'from_plan' => 'free',
            'to_plan' => 'premium',
            'amount' => 199.00,
            'currency' => 'PHP',
            'status' => SubscriptionTransaction::STATUS_PENDING,
            'paymongo_session_id' => 'cs_mismatch_session_456',
        ]);

        $payMongoMock = $this->createMock(PayMongoService::class);
        $payMongoMock->expects($this->once())
            ->method('retrieveCheckoutSession')
            ->with('cs_mismatch_session_456')
            ->willReturn([
                'attributes' => [
                    'reference_number' => 'SUB-DIFFERENT-000',
                    'payment_status' => 'paid',
                ],
            ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('reference_mismatch');

        $action = new VerifySubscriptionPayment();
        $action->verifySuccess($transaction, $payMongoMock, app(SubscriptionService::class));

        $this->assertSame(SubscriptionTransaction::STATUS_PENDING, $transaction->fresh()->status);
        $this->assertSame('free', $artisan->fresh()->premium_tier);
    }

    public function test_verify_success_rejects_when_session_is_not_paid(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        $transaction = SubscriptionTransaction::create([
            'user_id' => $artisan->id,
            'reference_number' => 'SUB-UNPAID-111',
            'from_plan' => 'free',
            'to_plan' => 'premium',
            'amount' => 199.00,
            'currency' => 'PHP',
            'status' => SubscriptionTransaction::STATUS_PENDING,
            'paymongo_session_id' => 'cs_unpaid_session_789',
        ]);

        $payMongoMock = $this->createMock(PayMongoService::class);
        $payMongoMock->expects($this->once())
            ->method('retrieveCheckoutSession')
            ->with('cs_unpaid_session_789')
            ->willReturn([
                'attributes' => [
                    'reference_number' => 'SUB-UNPAID-111',
                    'payment_status' => 'unpaid',
                ],
            ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('not_paid');

        $action = new VerifySubscriptionPayment();
        $action->verifySuccess($transaction, $payMongoMock, app(SubscriptionService::class));

        $this->assertSame(SubscriptionTransaction::STATUS_PENDING, $transaction->fresh()->status);
        $this->assertSame('free', $artisan->fresh()->premium_tier);
    }

    public function test_verify_success_returns_already_paid_without_calling_paymongo(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);

        $transaction = SubscriptionTransaction::create([
            'user_id' => $artisan->id,
            'reference_number' => 'SUB-PAID-222',
            'from_plan' => 'free',
            'to_plan' => 'premium',
            'amount' => 199.00,
            'currency' => 'PHP',
            'status' => SubscriptionTransaction::STATUS_PAID,
            'paymongo_session_id' => 'cs_paid_session_222',
        ]);

        $payMongoMock = $this->createMock(PayMongoService::class);
        $payMongoMock->expects($this->never())
            ->method('retrieveCheckoutSession');

        $action = new VerifySubscriptionPayment();
        $result = $action->verifySuccess($transaction, $payMongoMock, app(SubscriptionService::class));

        $this->assertSame('already_paid', $result);
    }

    public function test_verify_success_throws_when_session_id_missing(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        $transaction = SubscriptionTransaction::create([
            'user_id' => $artisan->id,
            'reference_number' => 'SUB-NO-SESSION-333',
            'from_plan' => 'free',
            'to_plan' => 'premium',
            'amount' => 199.00,
            'currency' => 'PHP',
            'status' => SubscriptionTransaction::STATUS_PENDING,
            'paymongo_session_id' => null,
        ]);

        $payMongoMock = $this->createMock(PayMongoService::class);
        $payMongoMock->expects($this->never())
            ->method('retrieveCheckoutSession');

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('missing_session_id');

        $action = new VerifySubscriptionPayment();
        $action->verifySuccess($transaction, $payMongoMock, app(SubscriptionService::class));
    }
}

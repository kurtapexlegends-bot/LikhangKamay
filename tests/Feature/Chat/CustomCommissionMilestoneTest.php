<?php

declare(strict_types=1);

namespace Tests\Feature\Chat;

use App\Models\CustomCommission;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomCommissionMilestoneTest extends TestCase
{
    use RefreshDatabase;

    private User $artisan;
    private User $buyer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->artisan = User::factory()->artisanApproved()->create([
            'name' => 'Cavite Potter',
            'shop_name' => 'Terra Cavite Workshop',
        ]);

        $this->buyer = User::factory()->create([
            'name' => 'Juan Dela Cruz',
            'role' => 'buyer',
        ]);

        \App\Models\Message::create([
            'sender_id' => $this->buyer->id,
            'receiver_id' => $this->artisan->id,
            'message' => 'Hello artisan, can I request a custom commissioned set?',
            'is_read' => false,
        ]);
    }

    public function test_artisan_can_create_commission_with_percentage_downpayment(): void
    {
        $response = $this->actingAs($this->artisan)->postJson(route('chat.commissions.store'), [
            'receiver_id' => $this->buyer->id,
            'title' => 'Custom Monogrammed Planter Set',
            'description' => '3-piece stoneware set with custom family initials',
            'total_amount' => 3000.00,
            'deposit_type' => 'percentage',
            'deposit_value' => 50,
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $this->assertDatabaseHas('custom_commissions', [
            'artisan_id' => $this->artisan->id,
            'buyer_id' => $this->buyer->id,
            'title' => 'Custom Monogrammed Planter Set',
            'total_amount' => 3000.00,
            'deposit_amount' => 1500.00,
            'balance_amount' => 1500.00,
            'deposit_percentage' => 50.00,
            'status' => CustomCommission::STATUS_AWAITING_DEPOSIT,
        ]);

        // Message should be logged in chat
        $this->assertDatabaseHas('messages', [
            'sender_id' => $this->artisan->id,
            'receiver_id' => $this->buyer->id,
            'attachment_type' => 'commission_milestone',
        ]);
    }

    public function test_artisan_can_create_commission_with_fixed_amount_downpayment(): void
    {
        $response = $this->actingAs($this->artisan)->postJson(route('chat.commissions.store'), [
            'receiver_id' => $this->buyer->id,
            'title' => 'Hand-Carved Wooden Tabletop',
            'description' => 'Solid acacia wood slab with chamfered edges',
            'total_amount' => 5000.00,
            'deposit_type' => 'fixed',
            'deposit_value' => 2000.00,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('custom_commissions', [
            'artisan_id' => $this->artisan->id,
            'buyer_id' => $this->buyer->id,
            'total_amount' => 5000.00,
            'deposit_amount' => 2000.00,
            'balance_amount' => 3000.00,
            'deposit_percentage' => 40.00,
            'status' => CustomCommission::STATUS_AWAITING_DEPOSIT,
        ]);
    }

    public function test_validation_rejects_negative_and_invalid_amounts(): void
    {
        // 1. Negative total amount
        $res1 = $this->actingAs($this->artisan)->postJson(route('chat.commissions.store'), [
            'receiver_id' => $this->buyer->id,
            'title' => 'Invalid Test',
            'total_amount' => -500,
            'deposit_type' => 'percentage',
            'deposit_value' => 50,
        ]);
        $res1->assertStatus(422);

        // 2. Fixed downpayment >= total amount
        $res2 = $this->actingAs($this->artisan)->postJson(route('chat.commissions.store'), [
            'receiver_id' => $this->buyer->id,
            'title' => 'Invalid Test 2',
            'total_amount' => 1000,
            'deposit_type' => 'fixed',
            'deposit_value' => 1500,
        ]);
        $res2->assertStatus(422);
        $res2->assertJsonValidationErrors(['deposit_value']);

        // 3. Percentage > 90%
        $res3 = $this->actingAs($this->artisan)->postJson(route('chat.commissions.store'), [
            'receiver_id' => $this->buyer->id,
            'title' => 'Invalid Test 3',
            'total_amount' => 1000,
            'deposit_type' => 'percentage',
            'deposit_value' => 95,
        ]);
        $res3->assertStatus(422);
        $res3->assertJsonValidationErrors(['deposit_value']);
    }

    public function test_full_two_phase_payment_lifecycle(): void
    {
        $commission = CustomCommission::create([
            'artisan_id' => $this->artisan->id,
            'buyer_id' => $this->buyer->id,
            'commission_number' => CustomCommission::generateCommissionNumber(),
            'title' => 'Custom Ceramic Urn',
            'total_amount' => 4000.00,
            'deposit_amount' => 2000.00,
            'balance_amount' => 2000.00,
            'deposit_percentage' => 50.00,
            'status' => CustomCommission::STATUS_AWAITING_DEPOSIT,
        ]);

        // Phase 1: Buyer pays initial downpayment
        $payDepositRes = $this->actingAs($this->buyer)->postJson(
            route('chat.commissions.checkout-deposit', $commission),
            ['test_mode' => true]
        );

        $payDepositRes->assertStatus(200);
        $commission->refresh();
        $this->assertSame(CustomCommission::STATUS_IN_PROGRESS, $commission->status);
        $this->assertNotNull($commission->deposit_paid_at);

        // Artisan finishes piece and requests final balance
        $readyRes = $this->actingAs($this->artisan)->postJson(
            route('chat.commissions.mark-ready', $commission)
        );
        $readyRes->assertStatus(200);
        $commission->refresh();
        $this->assertSame(CustomCommission::STATUS_READY_FOR_BALANCE, $commission->status);

        // Phase 2: Buyer pays final balance
        $payBalanceRes = $this->actingAs($this->buyer)->postJson(
            route('chat.commissions.checkout-balance', $commission),
            ['test_mode' => true]
        );
        $payBalanceRes->assertStatus(200);
        $commission->refresh();
        $this->assertSame(CustomCommission::STATUS_COMPLETED, $commission->status);
        $this->assertNotNull($commission->balance_paid_at);
        $this->assertNotNull($commission->order_id);

        // Official Order is generated
        $order = Order::find($commission->order_id);
        $this->assertNotNull($order);
        $this->assertSame('paid', $order->payment_status);
        $this->assertSame(Order::STATUS_PROCESSING, $order->status);
        $this->assertEquals(4000.00, (float) $order->total_amount);
        $this->assertEquals(4000.00, (float) $order->seller_net_amount);
        $this->assertEquals('Custom Bespoke Commission', $order->items->first()?->variant);
    }

    public function test_unauthorized_user_cannot_pay_commission(): void
    {
        $intruder = User::factory()->create(['role' => 'buyer']);

        $commission = CustomCommission::create([
            'artisan_id' => $this->artisan->id,
            'buyer_id' => $this->buyer->id,
            'commission_number' => CustomCommission::generateCommissionNumber(),
            'title' => 'Custom Mug',
            'total_amount' => 500.00,
            'deposit_amount' => 250.00,
            'balance_amount' => 250.00,
            'status' => CustomCommission::STATUS_AWAITING_DEPOSIT,
        ]);

        $response = $this->actingAs($intruder)->postJson(
            route('chat.commissions.checkout-deposit', $commission)
        );

        $response->assertStatus(403);
    }

    public function test_buyer_cannot_create_commission_proposal(): void
    {
        $response = $this->actingAs($this->buyer)->postJson(route('chat.commissions.store'), [
            'receiver_id' => $this->artisan->id,
            'title' => 'Sneaky Buyer Proposal',
            'total_amount' => 1000.00,
            'deposit_type' => 'percentage',
            'deposit_value' => 50,
        ]);

        $response->assertStatus(403);
    }

    public function test_cannot_cancel_commission_once_deposit_is_paid(): void
    {
        $commission = CustomCommission::create([
            'artisan_id' => $this->artisan->id,
            'buyer_id' => $this->buyer->id,
            'commission_number' => CustomCommission::generateCommissionNumber(),
            'title' => 'Custom Sculpture',
            'total_amount' => 5000.00,
            'deposit_amount' => 2500.00,
            'balance_amount' => 2500.00,
            'status' => CustomCommission::STATUS_IN_PROGRESS,
            'deposit_paid_at' => now(),
        ]);

        $response = $this->actingAs($this->buyer)->postJson(
            route('chat.commissions.cancel', $commission)
        );

        $response->assertStatus(422);
        $commission->refresh();
        $this->assertSame(CustomCommission::STATUS_IN_PROGRESS, $commission->status);
    }

    public function test_validation_rejects_sub_twenty_peso_deposit_or_balance(): void
    {
        // Total ₱50 with 10% = ₱5 deposit (below ₱20)
        $response1 = $this->actingAs($this->artisan)->postJson(route('chat.commissions.store'), [
            'receiver_id' => $this->buyer->id,
            'title' => 'Too Cheap Deposit',
            'total_amount' => 50.00,
            'deposit_type' => 'percentage',
            'deposit_value' => 10,
        ]);
        $response1->assertStatus(422);
        $response1->assertJsonValidationErrors(['deposit_value']);

        // Total ₱50 with ₱40 fixed deposit = ₱10 balance (below ₱20)
        $response2 = $this->actingAs($this->artisan)->postJson(route('chat.commissions.store'), [
            'receiver_id' => $this->buyer->id,
            'title' => 'Too Cheap Balance',
            'total_amount' => 50.00,
            'deposit_type' => 'fixed',
            'deposit_value' => 40.00,
        ]);
        $response2->assertStatus(422);
        $response2->assertJsonValidationErrors(['deposit_value']);
    }

    public function test_paymongo_webhook_reconciles_deposit_and_balance_payments(): void
    {
        config(['services.paymongo.webhook_secret' => 'whsk_test_commission_secret']);

        $commission = CustomCommission::create([
            'artisan_id' => $this->artisan->id,
            'buyer_id' => $this->buyer->id,
            'commission_number' => CustomCommission::generateCommissionNumber(),
            'title' => 'Stoneware Vase',
            'total_amount' => 2000.00,
            'deposit_amount' => 1000.00,
            'balance_amount' => 1000.00,
            'deposit_percentage' => 50.00,
            'status' => CustomCommission::STATUS_AWAITING_DEPOSIT,
        ]);

        // 1. Webhook for deposit paid
        $timestamp = time();
        $depositPayload = [
            'data' => [
                'attributes' => [
                    'type' => 'checkout_session.payment.paid',
                    'data' => [
                        'id' => 'cs_comm_deposit_123',
                        'attributes' => [
                            'payment_status' => 'paid',
                            'payment_method_used' => 'gcash',
                            'payments' => [
                                ['id' => 'pay_dep_001', 'attributes' => ['status' => 'paid']],
                            ],
                            'metadata' => [
                                'type' => 'commission_deposit',
                                'commission_id' => (string) $commission->id,
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $payloadJson = json_encode($depositPayload);
        $signature = hash_hmac('sha256', "{$timestamp}.{$payloadJson}", 'whsk_test_commission_secret');

        $depRes = $this->call(
            'POST',
            route('webhooks.paymongo'),
            [],
            [],
            [],
            [
                'HTTP_Paymongo-Signature' => "t={$timestamp},v1={$signature}",
                'CONTENT_TYPE' => 'application/json',
            ],
            $payloadJson
        );

        $depRes->assertStatus(200);
        $commission->refresh();
        $this->assertSame(CustomCommission::STATUS_IN_PROGRESS, $commission->status);
        $this->assertSame('pay_dep_001', $commission->deposit_payment_id);

        // Mark ready for balance
        $commission->update(['status' => CustomCommission::STATUS_READY_FOR_BALANCE]);

        // 2. Webhook for balance paid
        $balancePayload = [
            'data' => [
                'attributes' => [
                    'type' => 'checkout_session.payment.paid',
                    'data' => [
                        'id' => 'cs_comm_balance_456',
                        'attributes' => [
                            'payment_status' => 'paid',
                            'payment_method_used' => 'card',
                            'payments' => [
                                ['id' => 'pay_bal_002', 'attributes' => ['status' => 'paid']],
                            ],
                            'metadata' => [
                                'type' => 'commission_balance',
                                'commission_id' => (string) $commission->id,
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $payloadJson2 = json_encode($balancePayload);
        $signature2 = hash_hmac('sha256', "{$timestamp}.{$payloadJson2}", 'whsk_test_commission_secret');

        $balRes = $this->call(
            'POST',
            route('webhooks.paymongo'),
            [],
            [],
            [],
            [
                'HTTP_Paymongo-Signature' => "t={$timestamp},v1={$signature2}",
                'CONTENT_TYPE' => 'application/json',
            ],
            $payloadJson2
        );

        $balRes->assertStatus(200);
        $commission->refresh();
        $this->assertSame(CustomCommission::STATUS_COMPLETED, $commission->status);
        $this->assertNotNull($commission->order_id);
    }

    public function test_buyer_chat_return_redirect_reconciles_commission_payment(): void
    {
        $commission = CustomCommission::create([
            'artisan_id' => $this->artisan->id,
            'buyer_id' => $this->buyer->id,
            'commission_number' => CustomCommission::generateCommissionNumber(),
            'title' => 'Custom Pendant',
            'total_amount' => 1200.00,
            'deposit_amount' => 600.00,
            'balance_amount' => 600.00,
            'deposit_percentage' => 50.00,
            'status' => CustomCommission::STATUS_AWAITING_DEPOSIT,
        ]);

        // Buyer hits chat return URL with deposit paid step
        $response = $this->actingAs($this->buyer)->get(route('buyer.chat', [
            'user_id' => $this->artisan->id,
            'commission_id' => $commission->id,
            'paid_step' => 'deposit',
            'session_id' => 'cs_test_return_dep',
        ]));

        $response->assertStatus(200);
        $commission->refresh();
        $this->assertSame(CustomCommission::STATUS_IN_PROGRESS, $commission->status);
        $this->assertSame('cs_test_return_dep', $commission->deposit_payment_id);
    }

    public function test_record_balance_paid_is_guarded_against_cancelled_or_unready_commissions(): void
    {
        $service = app(\App\Services\CustomCommissionService::class);

        // 1. Commission is cancelled
        $cancelledCommission = CustomCommission::create([
            'artisan_id' => $this->artisan->id,
            'buyer_id' => $this->buyer->id,
            'commission_number' => CustomCommission::generateCommissionNumber(),
            'title' => 'Cancelled Custom Vase',
            'total_amount' => 2000.00,
            'deposit_amount' => 1000.00,
            'balance_amount' => 1000.00,
            'deposit_percentage' => 50.00,
            'status' => CustomCommission::STATUS_CANCELLED,
            'cancelled_at' => now(),
        ]);

        $ordersBefore = Order::count();
        $result = $service->recordBalancePaid($cancelledCommission, 'GCash', 'PAY-CANCELLED-TEST');

        $this->assertSame(CustomCommission::STATUS_CANCELLED, $result->status);
        $this->assertSame($ordersBefore, Order::count());
        $this->assertNull($result->order_id);

        // 2. Commission is awaiting deposit
        $awaitingCommission = CustomCommission::create([
            'artisan_id' => $this->artisan->id,
            'buyer_id' => $this->buyer->id,
            'commission_number' => CustomCommission::generateCommissionNumber(),
            'title' => 'Awaiting Deposit Bowl',
            'total_amount' => 1500.00,
            'deposit_amount' => 500.00,
            'balance_amount' => 1000.00,
            'deposit_percentage' => 33.33,
            'status' => CustomCommission::STATUS_AWAITING_DEPOSIT,
        ]);

        $resultAwaiting = $service->recordBalancePaid($awaitingCommission, 'GCash', 'PAY-AWAITING-TEST');
        $this->assertSame(CustomCommission::STATUS_AWAITING_DEPOSIT, $resultAwaiting->status);
        $this->assertSame($ordersBefore, Order::count());
        $this->assertNull($resultAwaiting->order_id);
    }

    public function test_reconcile_payment_session_rejects_mismatched_session_id(): void
    {
        $service = app(\App\Services\CustomCommissionService::class);

        $commission = CustomCommission::create([
            'artisan_id' => $this->artisan->id,
            'buyer_id' => $this->buyer->id,
            'commission_number' => CustomCommission::generateCommissionNumber(),
            'title' => 'Custom Mug Set',
            'total_amount' => 1000.00,
            'deposit_amount' => 500.00,
            'balance_amount' => 500.00,
            'deposit_percentage' => 50.00,
            'status' => CustomCommission::STATUS_AWAITING_DEPOSIT,
            'paymongo_deposit_session_id' => 'cs_legit_expected_deposit_123',
        ]);

        // Attempt reconciliation with a mismatched session ID
        $reconciled = $service->reconcilePaymentSession($commission, 'deposit', 'cs_attacker_forged_session_999');

        $this->assertFalse($reconciled);
        $commission->refresh();
        $this->assertSame(CustomCommission::STATUS_AWAITING_DEPOSIT, $commission->status);
        $this->assertNull($commission->deposit_paid_at);
    }

    public function test_paymongo_webhook_reconciles_by_session_id_when_metadata_is_omitted(): void
    {
        config(['services.paymongo.webhook_secret' => 'whsk_test_commission_secret']);
        $timestamp = time();

        $commission = CustomCommission::create([
            'artisan_id' => $this->artisan->id,
            'buyer_id' => $this->buyer->id,
            'commission_number' => CustomCommission::generateCommissionNumber(),
            'title' => 'Custom Terracotta Planter',
            'total_amount' => 2500.00,
            'deposit_amount' => 1250.00,
            'balance_amount' => 1250.00,
            'deposit_percentage' => 50.00,
            'status' => CustomCommission::STATUS_AWAITING_DEPOSIT,
            'paymongo_deposit_session_id' => 'cs_fallback_match_789',
        ]);

        // Webhook with NO metadata['commission_id'], only session ID
        $depositPayload = [
            'data' => [
                'attributes' => [
                    'type' => 'checkout_session.payment.paid',
                    'data' => [
                        'id' => 'cs_fallback_match_789',
                        'attributes' => [
                            'payment_status' => 'paid',
                            'payment_method_used' => 'gcash',
                            'payments' => [
                                ['id' => 'pay_fb_001', 'attributes' => ['status' => 'paid']],
                            ],
                            'metadata' => [],
                        ],
                    ],
                ],
            ],
        ];

        $payloadJson = json_encode($depositPayload);
        $signature = hash_hmac('sha256', "{$timestamp}.{$payloadJson}", 'whsk_test_commission_secret');

        $res = $this->call(
            'POST',
            route('webhooks.paymongo'),
            [],
            [],
            [],
            [
                'HTTP_Paymongo-Signature' => "t={$timestamp},v1={$signature}",
                'CONTENT_TYPE' => 'application/json',
            ],
            $payloadJson
        );

        $res->assertStatus(200);
        $res->assertJson(['status' => 'success']);

        $commission->refresh();
        $this->assertSame(CustomCommission::STATUS_IN_PROGRESS, $commission->status);
        $this->assertSame('pay_fb_001', $commission->deposit_payment_id);
    }

    public function test_paymongo_webhook_safely_ignores_cancelled_commission_and_logs(): void
    {
        config(['services.paymongo.webhook_secret' => 'whsk_test_commission_secret']);
        $timestamp = time();

        $commission = CustomCommission::create([
            'artisan_id' => $this->artisan->id,
            'buyer_id' => $this->buyer->id,
            'commission_number' => CustomCommission::generateCommissionNumber(),
            'title' => 'Cancelled Plate',
            'total_amount' => 800.00,
            'deposit_amount' => 400.00,
            'balance_amount' => 400.00,
            'deposit_percentage' => 50.00,
            'status' => CustomCommission::STATUS_CANCELLED,
            'paymongo_deposit_session_id' => 'cs_cancelled_session_111',
            'cancelled_at' => now(),
        ]);

        $depositPayload = [
            'data' => [
                'attributes' => [
                    'type' => 'checkout_session.payment.paid',
                    'data' => [
                        'id' => 'cs_cancelled_session_111',
                        'attributes' => [
                            'payment_status' => 'paid',
                            'payment_method_used' => 'gcash',
                            'payments' => [
                                ['id' => 'pay_cnc_001', 'attributes' => ['status' => 'paid']],
                            ],
                            'metadata' => [
                                'type' => 'commission_deposit',
                                'commission_id' => (string) $commission->id,
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $payloadJson = json_encode($depositPayload);
        $signature = hash_hmac('sha256', "{$timestamp}.{$payloadJson}", 'whsk_test_commission_secret');

        $res = $this->call(
            'POST',
            route('webhooks.paymongo'),
            [],
            [],
            [],
            [
                'HTTP_Paymongo-Signature' => "t={$timestamp},v1={$signature}",
                'CONTENT_TYPE' => 'application/json',
            ],
            $payloadJson
        );

        $res->assertStatus(200);
        $res->assertJson(['status' => 'ignored']);

        $commission->refresh();
        $this->assertSame(CustomCommission::STATUS_CANCELLED, $commission->status);
    }

    public function test_commission_and_message_resolve_soft_deleted_relationships(): void
    {
        $commission = CustomCommission::create([
            'artisan_id' => $this->artisan->id,
            'buyer_id' => $this->buyer->id,
            'commission_number' => CustomCommission::generateCommissionNumber(),
            'title' => 'Archived Sculpture',
            'total_amount' => 5000.00,
            'deposit_amount' => 2500.00,
            'balance_amount' => 2500.00,
            'deposit_percentage' => 50.00,
            'status' => CustomCommission::STATUS_READY_FOR_BALANCE,
        ]);

        // Complete it to create an Order
        $service = app(\App\Services\CustomCommissionService::class);
        $completedCommission = $service->recordBalancePaid($commission, 'GCash', 'PAY-COMPLETED-001');

        $orderId = $completedCommission->order_id;
        $this->assertNotNull($orderId);

        $order = Order::findOrFail($orderId);
        $order->delete(); // Soft delete order

        $completedCommission->refresh();
        $this->assertNotNull($completedCommission->order);
        $this->assertSame($orderId, $completedCommission->order->id);

        // Soft delete commission and verify message relation
        $message = \App\Models\Message::where('commission_id', $commission->id)->first();
        $this->assertNotNull($message);

        $completedCommission->delete(); // Soft delete commission
        $message->refresh();
        $this->assertNotNull($message->commission);
        $this->assertSame($completedCommission->id, $message->commission->id);
    }
}

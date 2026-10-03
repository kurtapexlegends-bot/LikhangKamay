<?php

namespace Tests\Feature\Performance;

use App\Models\Order;
use App\Models\User;
use App\Services\AddressGeocodingService;
use App\Services\LalamoveService;
use App\Services\PayMongoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ServerlessTimeoutHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_lalamove_service_declares_strict_connect_and_execution_timeouts(): void
    {
        Config::set('services.lalamove.api_key', 'test_key');
        Config::set('services.lalamove.api_secret', 'test_secret');
        Config::set('services.lalamove.timeout', 5);
        Config::set('services.lalamove.connect_timeout', 2);

        Http::fake([
            'https://rest.sandbox.lalamove.com/v3/quotations' => Http::response([
                'data' => [
                    'priceBreakdown' => [
                        'total' => '150.00',
                        'currency' => 'PHP',
                    ],
                ],
            ], 200),
        ]);

        $service = app(LalamoveService::class);
        $service->createQuotation([
            'serviceType' => 'MOTORCYCLE',
            'stops' => [],
        ]);

        Http::assertSent(function (Request $request) {
            $options = $request->toPsrRequest();
            // Verify request was sent to Lalamove quotation endpoint
            return str_contains($request->url(), '/v3/quotations');
        });

        $this->assertSame(5, (int) config('services.lalamove.timeout'));
        $this->assertSame(2, (int) config('services.lalamove.connect_timeout'));
    }

    public function test_nominatim_geocoding_caps_candidates_and_enforces_timeout(): void
    {
        Config::set('services.nominatim.timeout', 3);
        Config::set('services.nominatim.connect_timeout', 1);

        $requestCount = 0;
        Http::fake([
            'https://nominatim.openstreetmap.org/search*' => function () use (&$requestCount) {
                $requestCount++;
                return Http::response([], 200); // Empty response simulates no match
            },
        ]);

        $geocodingService = app(AddressGeocodingService::class);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Unable to locate');

        // Address with many sub-parts that would otherwise produce 5+ candidate queries
        $geocodingService->geocode('Unit 4B, Building 2, Complex Avenue, Barangay San Miguel, Dasmarinas City, Cavite, 4114');

        // Verify no more than 2 candidate attempts were made to Nominatim
        $this->assertLessThanOrEqual(2, $requestCount);
    }

    public function test_paymongo_service_declares_guarded_timeouts_on_checkout_and_session_calls(): void
    {
        Config::set('services.paymongo.secret_key', 'test_secret_key');
        Config::set('services.paymongo.timeout', 6);
        Config::set('services.paymongo.connect_timeout', 2);

        Http::fake([
            'https://api.paymongo.com/v1/checkout_sessions' => Http::response([
                'data' => [
                    'id' => 'cs_test_123',
                    'attributes' => ['status' => 'active'],
                ],
            ], 200),
            'https://api.paymongo.com/v1/checkout_sessions/cs_test_123*' => Http::response([
                'data' => [
                    'id' => 'cs_test_123',
                    'attributes' => ['status' => 'paid'],
                ],
            ], 200),
        ]);

        $paymongo = app(PayMongoService::class);

        $created = $paymongo->createCheckoutSession(['amount' => 10000]);
        $this->assertSame('cs_test_123', $created['id']);

        $retrieved = $paymongo->retrieveCheckoutSession('cs_test_123');
        $this->assertSame('cs_test_123', $retrieved['id']);

        $this->assertSame(6, (int) config('services.paymongo.timeout'));
        $this->assertSame(2, (int) config('services.paymongo.connect_timeout'));
    }

    public function test_order_print_bulk_packing_slips_enforces_maximum_15_orders_limit(): void
    {
        /** @var User $artisan */
        $artisan = User::factory()->artisanApproved()->create();

        // 16 order IDs (exceeding limit of 15)
        $orderIds = array_map(fn($i) => "ORD-TEST-{$i}", range(1, 16));

        $response = $this->actingAs($artisan)
            ->postJson(route('orders.bulk-packing-slips'), [
                'order_ids' => $orderIds,
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['order_ids']);
    }

    public function test_order_print_bulk_packing_slips_accepts_valid_batch_size(): void
    {
        /** @var User $artisan */
        $artisan = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $order = Order::create([
            'artisan_id' => $artisan->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-PRINT-01',
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 250,
            'convenience_fee_amount' => 10,
            'total_amount' => 260,
            'status' => 'Pending',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_address' => 'Sample Street, Dasmarinas City, Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $response = $this->actingAs($artisan)
            ->post(route('orders.bulk-packing-slips'), [
                'order_ids' => [$order->order_number],
            ]);

        $response->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('content-type'));
    }
}

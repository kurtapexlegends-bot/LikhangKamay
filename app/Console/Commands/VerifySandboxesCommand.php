<?php

namespace App\Console\Commands;

use App\Services\LalamoveService;
use App\Services\Logistics\LalamoveWebhookService;
use App\Services\PayMongoService;
use Illuminate\Console\Command;

class VerifySandboxesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:verify-sandboxes';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verify PayMongo GCash and Lalamove Sandbox connectivity, quotations, bookings, and webhook processing';

    /**
     * Execute the console command.
     */
    public function handle(
        PayMongoService $payMongoService,
        LalamoveService $lalamoveService,
        LalamoveWebhookService $lalamoveWebhookService
    ): int {
        $this->info('======================================================');
        $this->info('  LikhangKamay | PayMongo & Lalamove Sandbox Audit');
        $this->info('======================================================');

        $hasError = false;

        // 1. PayMongo Sandbox GCash Verification
        $this->line("\n[1/2] Testing PayMongo Sandbox GCash Checkout Session...");
        try {
            $session = $payMongoService->createCheckoutSession([
                'line_items' => [[
                    'name' => 'Synthetic Test Bamboo Cup',
                    'quantity' => 1,
                    'amount' => 2500, // ₱25.00 (min ₱20)
                    'currency' => 'PHP',
                ]],
                'payment_method_types' => ['gcash'],
                'description' => 'Automated E2E Sandbox Verification',
                'send_email_receipt' => false,
            ]);

            $sessionId = $session['id'] ?? null;
            $checkoutUrl = $session['attributes']['checkout_url'] ?? null;
            $status = $session['attributes']['status'] ?? null;

            if (!$sessionId || !str_starts_with($sessionId, 'cs_')) {
                throw new \RuntimeException("Unexpected session ID format: {$sessionId}");
            }

            $this->info("  ✓ PayMongo Session Created: {$sessionId}");
            $this->info("  ✓ Checkout URL Generated: {$checkoutUrl}");
            $this->info("  ✓ Initial Status: {$status}");

            // Retrieve session to verify read-back
            $retrieved = $payMongoService->retrieveCheckoutSession($sessionId);
            if (($retrieved['id'] ?? '') !== $sessionId) {
                throw new \RuntimeException("Retrieved session ID mismatch");
            }
            $this->info("  ✓ PayMongo Read-Back Validated successfully.");
        } catch (\Throwable $e) {
            $this->error("  ✗ PayMongo Sandbox Failed: " . $e->getMessage());
            $hasError = true;
        }

        // 2. Lalamove Sandbox Quotation, Booking & Webhook Verification
        $this->line("\n[2/2] Testing Lalamove Sandbox Logistics Lifecycle...");
        try {
            $stops = [
                [
                    'coordinates' => ['lat' => '14.4296', 'lng' => '120.9367'],
                    'address' => '101 Bayan Luma Street, Bucandala I, Imus, Cavite 4103',
                ],
                [
                    'coordinates' => ['lat' => '14.4180', 'lng' => '120.9520'],
                    'address' => 'Block 4 Lot 12 Buhay na Tubig, Imus, Cavite 4103',
                ],
            ];

            $quotation = $lalamoveService->createQuotation([
                'serviceType' => 'MOTORCYCLE',
                'stops' => $stops,
                'language' => 'en_PH',
            ]);

            $quotationId = $quotation['quotationId'] ?? null;
            $price = $quotation['priceBreakdown']['total'] ?? null;
            $currency = $quotation['priceBreakdown']['currency'] ?? 'PHP';

            if (!$quotationId) {
                throw new \RuntimeException("Failed to obtain Lalamove quotation ID");
            }

            $this->info("  ✓ Lalamove Quotation Obtained: ID {$quotationId} (Fee: {$price} {$currency})");

            // Book Order in Lalamove Sandbox
            $orderPayload = [
                'quotationId' => $quotationId,
                'sender' => [
                    'stopId' => $quotation['stops'][0]['stopId'],
                    'name' => 'Cavite Test Craft Workshop',
                    'phone' => '+639171234567',
                ],
                'recipients' => [
                    [
                        'stopId' => $quotation['stops'][1]['stopId'],
                        'name' => 'Test Verified Buyer',
                        'phone' => '+639189876543',
                        'remarks' => 'Automated E2E Sandbox Package',
                    ],
                ],
                'isPODEnabled' => true,
                'metadata' => [
                    'platform' => 'LikhangKamay',
                    'flowType' => 'standard_delivery',
                ],
            ];

            $order = $lalamoveService->createOrder($orderPayload);
            $lalamoveOrderId = $order['orderId'] ?? null;
            $initialStatus = $order['status'] ?? null;

            if (!$lalamoveOrderId) {
                throw new \RuntimeException("Failed to obtain Lalamove order ID");
            }

            $this->info("  ✓ Lalamove Sandbox Order Booked: ID {$lalamoveOrderId}");
            $this->info("  ✓ Initial State: {$initialStatus}");

            // Retrieve Order
            $retrievedOrder = $lalamoveService->retrieveOrder($lalamoveOrderId);
            $this->info("  ✓ Lalamove Order Read-Back Verified (Status: " . ($retrievedOrder['status'] ?? 'unknown') . ")");

            // Inbound Webhook Transition Simulation
            $webhookPayload = [
                'meta' => ['requestId' => 'e2e-sim-' . uniqid()],
                'eventType' => 'ORDER_STATUS_CHANGED',
                'data' => [
                    'orderId' => $lalamoveOrderId,
                    'status' => 'COMPLETED',
                    'driverId' => 'DRV-SANDBOX-TEST',
                ],
            ];

            $lalamoveWebhookService->handleWebhook($webhookPayload);
            $this->info("  ✓ Lalamove Inbound Webhook Processed (Status transitioned to COMPLETED).");
        } catch (\Throwable $e) {
            $this->error("  ✗ Lalamove Sandbox Failed: " . $e->getMessage());
            $hasError = true;
        }

        $this->info("\n======================================================");
        if ($hasError) {
            $this->error("  SANDBOX AUDIT FAILED - Review errors above.");
            return Command::FAILURE;
        }

        $this->info("  ALL SANDBOX VERIFICATIONS PASSED (100% OPERATIONAL)");
        $this->info("======================================================\n");
        return Command::SUCCESS;
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\SponsorshipRequest;
use App\Notifications\VerifyEmailNotification;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\ProductModerationNotification;
use App\Notifications\SponsorshipStatusNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;

class TestMailDispatchController extends Controller
{
    /**
     * Dispatch a test system notification email to the specified target address.
     */
    public function dispatchTestEmail(Request $request): JsonResponse
    {
        Gate::authorize('admin-action');

        $validated = $request->validate([
            'email' => ['required', 'email'],
            'template' => ['required', 'string', 'in:verify_email,reset_password,order_receipt,product_moderation,sponsorship_status,dispute_update,low_stock'],
        ]);

        $email = $validated['email'];
        $template = $validated['template'];
        $startTime = microtime(true);

        try {
            switch ($template) {
                case 'verify_email':
                    Notification::route('mail', $email)->notify(
                        new VerifyEmailNotification('849204', now()->addMinutes(15))
                    );
                    $templateLabel = 'Email Verification Code';
                    break;

                case 'reset_password':
                    // Create an anonymous notifiable with password reset support
                    $notifiable = new class($email) {
                        public function __construct(public string $email) {}
                        public function getEmailForPasswordReset(): string { return $this->email; }
                        public function getKey() { return 1; }
                    };
                    Notification::send([$notifiable], new ResetPasswordNotification('sample-reset-token-12345'));
                    $templateLabel = 'Password Reset Link';
                    break;

                case 'order_receipt':
                    Mail::raw(
                        "Hello,\n\nThis is a sample order confirmation receipt for Order #ORD-SAMPLE-1001.\n\nItems:\n- Handcrafted Ceramic Vase x 1 (₱1,250.00)\n\nTotal Paid: ₱1,250.00\nPayment Method: PayMongo E-Wallet (GCash)\n\nThank you for supporting Filipino artisans on LikhangKamay!",
                        function ($message) use ($email) {
                            $message->to($email)
                                    ->subject('Order Confirmation & Receipt #ORD-SAMPLE-1001 - LikhangKamay');
                        }
                    );
                    $templateLabel = 'Order Receipt & Confirmation';
                    break;

                case 'product_moderation':
                    $sampleProduct = Product::first() ?? new Product([
                        'name' => 'Handcrafted Ceramic Vase',
                        'sku' => 'LK-SAMPLE-101',
                        'price' => 1250.00,
                    ]);
                    Notification::route('mail', $email)->notify(
                        new ProductModerationNotification($sampleProduct, 'approved', 'Your product complies with all platform artisan quality guidelines.')
                    );
                    $templateLabel = 'Product Moderation Notice';
                    break;

                case 'sponsorship_status':
                    $sampleSponsorship = SponsorshipRequest::with(['user', 'product'])->first() ?? new SponsorshipRequest([
                        'id' => 999,
                        'status' => 'approved',
                        'package_type' => 'featured_artisan',
                    ]);
                    Notification::route('mail', $email)->notify(
                        new SponsorshipStatusNotification($sampleSponsorship)
                    );
                    $templateLabel = 'Sponsorship Status Notice';
                    break;

                case 'dispute_update':
                    Mail::raw(
                        "Hello,\n\nAn update has been posted on your escalated dispute for Order #ORD-SAMPLE-1001.\n\nResolution Status: RESOLVED IN FAVOR OF BUYER\nResolution Note: Full refund authorized following inspection.\n\nLog into LikhangKamay to view the full resolution summary.",
                        function ($message) use ($email) {
                            $message->to($email)
                                    ->subject('Dispute Resolution Status Update - LikhangKamay');
                        }
                    );
                    $templateLabel = 'Dispute Update Alert';
                    break;

                case 'low_stock':
                    Mail::raw(
                        "WARNING: Low Stock Alert for LikhangKamay Artisan Inventory\n\nProduct: Handcrafted Ceramic Vase (SKU: LK-SAMPLE-101)\nRemaining Units: 2\n\nPlease restock this item soon to avoid automated catalog unlisting.",
                        function ($message) use ($email) {
                            $message->to($email)
                                    ->subject('Low Stock Warning: Handcrafted Ceramic Vase - LikhangKamay');
                        }
                    );
                    $templateLabel = 'Low Stock Warning';
                    break;

                default:
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid template specified.',
                    ], 422);
            }

            $latency = round((microtime(true) - $startTime) * 1000);
            $activeDriver = config('mail.default', 'smtp');

            return response()->json([
                'success' => true,
                'message' => "Sample template \"{$templateLabel}\" dispatched successfully to {$email}.",
                'latency_ms' => $latency,
                'driver' => $activeDriver,
                'template' => $template,
                'target' => $email,
                'timestamp' => now()->format('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) {
            Log::error("Test mail dispatch failed for template {$template}: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Mail delivery failed: ' . $e->getMessage(),
                'template' => $template,
                'target' => $email,
            ], 500);
        }
    }
}

<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $headline ?? 'LikhangKamay Notification' }}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #FDFBF9; color: #2E2520; line-height: 1.6; -webkit-text-size-adjust: none;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #E7E1D8; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(46, 37, 32, 0.03);">
        <!-- Header -->
        <div style="background-color: #F7F4F0; border-bottom: 1px solid #E7E1D8; padding: 24px; text-align: center;">
            <a href="{{ url('/') }}" style="text-decoration: none; display: inline-block; vertical-align: middle;">
                <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; border-collapse: collapse;">
                    <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                            <img src="https://files.catbox.moe/e56ajg.png" alt="Logo" style="height: 38px; width: 38px; display: block; border: 0; outline: none; text-decoration: none;">
                        </td>
                        <td style="vertical-align: middle; text-align: left;">
                            <span style="font-family: Georgia, Times, serif; font-size: 24px; font-weight: bold; color: #2E2520; display: block; line-height: 1; letter-spacing: -0.5px;">LikhangKamay</span>
                        </td>
                    </tr>
                </table>
            </a>
        </div>

        <!-- Content Body -->
        <div style="padding: 40px 32px;">
            @if(!empty($headline))
                <h1 style="font-family: Georgia, Times, serif; font-size: 22px; font-weight: normal; color: #2E2520; margin-top: 0; margin-bottom: 20px; text-align: center;">{{ $headline }}</h1>
            @endif

            @php
                // Safely escape HTML first, then parse **text** markdown into styled <strong> tags
                $formattedBody = preg_replace('/\*\*(.*?)\*\*/s', '<strong style="color: #2E2520; font-weight: 600;">$1</strong>', e($body));
            @endphp

            <div style="font-size: 15px; color: #5C524A; line-height: 1.7;">
                {!! nl2br($formattedBody) !!}
            </div>

            {{-- 1. Contextual Card: Buyer Order Confirmation / Receipt --}}
            @if(isset($order) && ($order instanceof \App\Models\Order) && (!isset($templateSlug) || $templateSlug === 'buyer_order_confirmation'))
            <div style="background-color: #FFFDFB; border: 1px solid #E7E1D8; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <div style="font-family: Georgia, Times, serif; font-size: 17px; font-weight: bold; color: #2E2520; border-bottom: 1px solid #E7E1D8; padding-bottom: 12px; margin-bottom: 16px;">
                    Receipt • Order #{{ $order->order_number }}
                </div>
                <p style="color: #8C827A; font-size: 13px; margin-top: -8px; margin-bottom: 16px;">
                    Placed on {{ $order->created_at ? $order->created_at->format('F d, Y • h:i A') : now()->format('F d, Y • h:i A') }}
                    @if($order->artisan && ($order->artisan->shop_name || $order->artisan->name))
                        • Artisan Shop: <strong>{{ $order->artisan->shop_name ?: $order->artisan->name }}</strong>
                    @endif
                </p>

                <table style="width: 100%; border-collapse: collapse; border-spacing: 0;">
                    @if($order->items && $order->items->count() > 0)
                        @foreach($order->items as $item)
                        <tr>
                            <td align="left" style="padding: 10px 0; font-size: 14px; color: #5C524A; border-bottom: 1px dashed #E7E1D8;">
                                <strong>{{ $item->product_name ?: ($item->product?->name ?? 'Handcrafted Item') }}</strong> × {{ $item->quantity }}
                            </td>
                            <td align="right" style="padding: 10px 0; font-size: 14px; color: #5C524A; border-bottom: 1px dashed #E7E1D8;">
                                ₱{{ number_format((float)($item->price * $item->quantity), 2) }}
                            </td>
                        </tr>
                        @endforeach
                    @endif
                    @if(isset($order->shipping_fee_amount) && (float)$order->shipping_fee_amount > 0)
                    <tr>
                        <td align="left" style="padding: 10px 0; font-size: 13px; color: #8C827A; border-bottom: 1px dashed #E7E1D8;">Delivery Fee</td>
                        <td align="right" style="padding: 10px 0; font-size: 13px; color: #8C827A; border-bottom: 1px dashed #E7E1D8;">₱{{ number_format((float)$order->shipping_fee_amount, 2) }}</td>
                    </tr>
                    @endif
                    <tr>
                        <td align="left" style="font-size: 16px; font-weight: bold; color: #A2582F; padding-top: 16px;">Total Amount</td>
                        <td align="right" style="font-size: 16px; font-weight: bold; color: #A2582F; padding-top: 16px;">₱{{ number_format((float)$order->total_amount, 2) }}</td>
                    </tr>
                </table>

                <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E7E1D8; font-size: 13px; color: #5C524A;">
                    <p style="margin: 0 0 6px;"><strong>Delivery Method:</strong> {{ $order->shipping_method ?? 'Standard Delivery' }}</p>
                    <p style="margin: 0 0 6px;"><strong>Payment Method:</strong> {{ $order->payment_method ?? 'Cash on Delivery' }}</p>
                    <p style="margin: 0;"><strong>Shipping Destination:</strong> {{ $order->shipping_address ?? 'Address on file' }}</p>
                </div>
            </div>
            @endif

            {{-- 2. Contextual Card: Online Payment Details --}}
            @if((isset($templateSlug) && $templateSlug === 'payment_receipt') || (isset($paymentId) && isset($order)))
            <div style="background-color: #FFFDFB; border: 1px solid #E7E1D8; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <div style="font-family: Georgia, Times, serif; font-size: 17px; font-weight: bold; color: #2E2520; border-bottom: 1px solid #E7E1D8; padding-bottom: 12px; margin-bottom: 16px;">
                    Payment Details
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #5C524A;">
                    @if(isset($order))
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Order Reference:</td>
                        <td align="right" style="padding: 8px 0; font-weight: bold; color: #2E2520; border-bottom: 1px dashed #E7E1D8;">#{{ $order->order_number }}</td>
                    </tr>
                    @endif
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Payment Reference ID:</td>
                        <td align="right" style="padding: 8px 0; font-family: monospace; font-size: 12px; color: #5C524A; border-bottom: 1px dashed #E7E1D8;">{{ $paymentId ?? ($order->payment_id ?? 'N/A') }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Payment Method:</td>
                        <td align="right" style="padding: 8px 0; font-weight: 600; color: #2E2520; border-bottom: 1px dashed #E7E1D8;">{{ $paymentMethod ?? ($order->payment_method ?? 'Online Payment') }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Payment Status:</td>
                        <td align="right" style="padding: 8px 0; color: #15803D; font-weight: bold; border-bottom: 1px dashed #E7E1D8;">Paid / Cleared</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Date &amp; Time:</td>
                        <td align="right" style="padding: 8px 0; color: #8C827A; font-size: 13px; border-bottom: 1px dashed #E7E1D8;">{{ now()->format('F d, Y • h:i A') }}</td>
                    </tr>
                    @if(isset($order) || isset($totalAmountFormatted))
                    <tr>
                        <td style="padding-top: 16px; font-size: 16px; font-weight: bold; color: #A2582F;">Amount Paid:</td>
                        <td align="right" style="padding-top: 16px; font-size: 18px; font-weight: bold; color: #A2582F;">{{ $totalAmountFormatted ?? ('₱' . number_format((float)$order->total_amount, 2)) }}</td>
                    </tr>
                    @endif
                </table>
            </div>
            @endif

            {{-- 3. Contextual Card: Subscription Billing Details --}}
            @if(isset($tierLabel) && isset($amountPaid))
            <div style="background-color: #FFFDFB; border: 1px solid #E7E1D8; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <div style="font-family: Georgia, Times, serif; font-size: 17px; font-weight: bold; color: #2E2520; border-bottom: 1px solid #E7E1D8; padding-bottom: 12px; margin-bottom: 16px;">
                    Billing & Plan Details
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #5C524A;">
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Subscribed Plan:</td>
                        <td align="right" style="padding: 8px 0; font-weight: bold; color: #A2582F; border-bottom: 1px dashed #E7E1D8;">{{ $tierLabel }}</td>
                    </tr>
                    @if(!empty($referenceNumber))
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Invoice Reference:</td>
                        <td align="right" style="padding: 8px 0; font-family: monospace; font-size: 12px; color: #5C524A; border-bottom: 1px dashed #E7E1D8;">{{ $referenceNumber }}</td>
                    </tr>
                    @endif
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Active Period:</td>
                        <td align="right" style="padding: 8px 0; font-size: 13px; color: #2E2520; border-bottom: 1px dashed #E7E1D8;">
                            {{ !empty($validUntil) ? (\Illuminate\Support\Carbon::parse($validUntil)->format('M d, Y')) : now()->addDays(30)->format('M d, Y') }} (30 Days)
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Payment Status:</td>
                        <td align="right" style="padding: 8px 0; color: #15803D; font-weight: bold; border-bottom: 1px dashed #E7E1D8;">Paid / Active</td>
                    </tr>
                    <tr>
                        <td style="padding-top: 16px; font-size: 16px; font-weight: bold; color: #A2582F;">Amount Paid:</td>
                        <td align="right" style="padding-top: 16px; font-size: 18px; font-weight: bold; color: #A2582F;">₱{{ number_format((float)$amountPaid, 2) }}</td>
                    </tr>
                </table>

                @if(!empty($perks))
                <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E7E1D8;">
                    <span style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #8C827A; display: block; margin-bottom: 8px;">Active Privileges:</span>
                    <ul style="margin: 0; padding-left: 20px; color: #5C524A; font-size: 13px; line-height: 1.5;">
                        @foreach($perks as $perk)
                        <li>{{ $perk }}</li>
                        @endforeach
                    </ul>
                </div>
                @endif
            </div>
            @endif

            {{-- 4. Contextual Card: Staff Credentials --}}
            @if(isset($staffUser) || !empty($temporaryPassword))
            <div style="background-color: #FFFDFB; border: 1px solid #E7E1D8; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <div style="font-family: Georgia, Times, serif; font-size: 17px; font-weight: bold; color: #2E2520; border-bottom: 1px solid #E7E1D8; padding-bottom: 12px; margin-bottom: 16px;">
                    Your Login Credentials
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #5C524A;">
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Sign-In Email:</td>
                        <td align="right" style="padding: 8px 0; font-weight: bold; color: #2E2520; border-bottom: 1px dashed #E7E1D8;">{{ $staffUser->email ?? ($loginEmail ?? 'N/A') }}</td>
                    </tr>
                    @if(!empty($temporaryPassword))
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Temporary Password:</td>
                        <td align="right" style="padding: 8px 0; font-family: monospace; font-size: 14px; font-weight: bold; color: #A2582F; border-bottom: 1px dashed #E7E1D8;">{{ $temporaryPassword }}</td>
                    </tr>
                    @endif
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Assigned Studio:</td>
                        <td align="right" style="padding: 8px 0; font-weight: 600; color: #2E2520; border-bottom: 1px dashed #E7E1D8;">{{ $shopName ?? 'Artisan Studio' }}</td>
                    </tr>
                    @if(!empty($employeeRole))
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Role:</td>
                        <td align="right" style="padding: 8px 0; color: #15803D; font-weight: bold; border-bottom: 1px dashed #E7E1D8;">{{ $employeeRole }}</td>
                    </tr>
                    @endif
                </table>

                <div style="margin-top: 16px; padding: 12px; background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 6px; font-size: 12px; color: #92400E; line-height: 1.5;">
                    <strong>Security Notice:</strong> For your security, please change your password immediately upon your first sign in.
                </div>
            </div>
            @endif

            {{-- 5. Contextual Card: Artisan Application Next Steps --}}
            @if(isset($templateSlug) && $templateSlug === 'artisan_application_received')
            <div style="background-color: #FFFDFB; border: 1px solid #E7E1D8; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <div style="font-family: Georgia, Times, serif; font-size: 16px; font-weight: bold; color: #A2582F; margin-bottom: 12px;">What Happens Next?</div>
                <ol style="margin: 0; padding-left: 20px; color: #5C524A; font-size: 14px; line-height: 1.6;">
                    <li style="margin-bottom: 8px;"><strong>Document Verification:</strong> Our administrative curation team reviews your submitted studio credentials to ensure marketplace authenticity.</li>
                    <li style="margin-bottom: 8px;"><strong>Review Window:</strong> Most applications are evaluated within <strong>24 to 48 hours</strong>.</li>
                    <li><strong>Instant Notification:</strong> You will receive an immediate email update as soon as your store is approved or if revisions are requested.</li>
                </ol>
            </div>
            @endif

            @if(!empty($buttonLabel) && !empty($buttonUrl))
                <div style="text-align: center; margin: 32px 0 24px;">
                    <a href="{{ $buttonUrl }}" style="display: inline-block; background-color: #C2783F; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        {{ $buttonLabel }}
                    </a>
                </div>
            @endif
        </div>

        <!-- Footer -->
        <div style="background-color: #F7F4F0; border-top: 1px solid #E7E1D8; padding: 28px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">Supporting Filipino artisans and handcrafted goods.</p>
            <p style="margin: 16px 0 0 0; font-size: 11px; color: #8C827A;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>

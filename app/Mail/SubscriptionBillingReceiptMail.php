<?php

namespace App\Mail;

use App\Models\SubscriptionTransaction;
use App\Models\User;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

class SubscriptionBillingReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public ?SubscriptionTransaction $transaction = null,
        public ?string $tierLabel = null,
        public ?float $amountPaid = null
    ) {
        $this->tierLabel = $tierLabel ?? (method_exists($user, 'getSellerTierLabel') ? $user->getSellerTierLabel() : 'Premium');
        $this->amountPaid = $amountPaid ?? (float) ($transaction?->amount ?? 0);
    }

    public function build()
    {
        $userName = !empty($this->user->name) ? $this->user->name : 'Artisan Partner';
        $shopName = !empty($this->user->shop_name) ? $this->user->shop_name : 'Your Artisan Studio';
        $referenceNumber = $this->transaction?->reference_number ?: 'SUB-' . strtoupper(uniqid());
        $tierLabel = $this->tierLabel ?: (method_exists($this->user, 'getSellerTierLabel') ? $this->user->getSellerTierLabel() : 'Premium');
        $amountPaid = $this->amountPaid ?? (float) ($this->transaction?->amount ?? 0);

        $validUntilDate = !empty($this->user->subscription_expires_at)
            ? Carbon::parse($this->user->subscription_expires_at)
            : now()->addDays(30);

        $perks = match (strtolower($this->user->premium_tier ?? 'free')) {
            'super_premium', 'elite' => [
                'Unlimited Active Product Listings',
                'Up to 15 Studio Staff Seats',
                'Discounts & Flash Promotions Module',
                'In-House Studio Fleet Dispatch',
                'Wholesale Materials & B2B Hub Access',
                'Priority Homepage Curation Placement',
            ],
            'premium' => [
                'Up to 50 Active Product Listings',
                'Up to 5 Studio Staff Seats',
                'In-House Studio Fleet Dispatch',
                'Comprehensive Financial & HR Tools',
            ],
            default => [
                'Up to 10 Active Product Listings',
                'Essential Sales Dashboard',
            ]
        };

        return EmailTemplateService::apply(
            mailable: $this,
            slug: 'subscription_billing_receipt',
            replacements: [
                '{user_name}' => $userName,
                '{shop_name}' => $shopName,
                '{tier_label}' => $tierLabel,
                '{amount_paid}' => '₱' . number_format($amountPaid, 2),
                '{reference_number}' => $referenceNumber,
                '{action_url}' => route('seller.subscription'),
            ],
            fallbackSubject: "Subscription Activated: {$tierLabel} Plan - LikhangKamay",
            fallbackView: 'emails.sellers.subscription-receipt',
            fallbackData: [
                'user' => $this->user,
                'userName' => $userName,
                'shopName' => $shopName,
                'tierLabel' => $tierLabel,
                'amountPaid' => $amountPaid,
                'referenceNumber' => $referenceNumber,
                'validUntil' => $validUntilDate,
                'perks' => $perks,
            ]
        );
    }
}

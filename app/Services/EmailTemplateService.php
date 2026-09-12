<?php

namespace App\Services;

use App\Models\EmailTemplate;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class EmailTemplateService
{
    /**
     * Apply dynamic database template customization to a Mailable instance.
     */
    public static function apply(
        Mailable $mailable,
        string $slug,
        array $replacements,
        string $fallbackSubject,
        string $fallbackView,
        array $fallbackData = []
    ): Mailable {
        try {
            $template = Cache::remember("email_template_{$slug}", 3600, function () use ($slug) {
                return EmailTemplate::where('slug', $slug)->first();
            });

            if ($template && $template->is_active) {
                // Ensure default fallback replacements are set if missing
                $defaults = [
                    '{site_name}' => 'LikhangKamay',
                    '{action_url}' => url('/'),
                    '{user_name}' => 'Valued Member',
                    '{shop_name}' => 'LikhangKamay Shop',
                    '{order_number}' => 'ORD-N/A',
                    '{tracking_number}' => 'N/A',
                    '{verification_code}' => 'N/A',
                    '{product_name}' => 'Handcrafted Item',
                    '{rejection_reason}' => 'N/A',
                    '{refund_amount}' => 'N/A',
                    '{total_amount}' => '₱0.00',
                    '{payment_id}' => 'N/A',
                    '{payment_method}' => 'Online Payment',
                    '{tier_label}' => 'Premium',
                    '{amount_paid}' => '₱0.00',
                    '{reference_number}' => 'N/A',
                    '{login_email}' => 'N/A',
                    '{temporary_password}' => 'N/A',
                    '{role_name}' => 'Staff Member',
                ];
                $mergedReplacements = array_merge($defaults, $replacements);

                $viewData = array_merge($fallbackData, [
                    'headline' => !empty($template->headline) ? strtr($template->headline, $mergedReplacements) : null,
                    'body' => strtr($template->body, $mergedReplacements),
                    'buttonLabel' => !empty($template->button_label) ? strtr($template->button_label, $mergedReplacements) : null,
                    'buttonUrl' => !empty($template->button_url) ? strtr($template->button_url, $mergedReplacements) : null,
                    'templateSlug' => $slug,
                ]);

                return $mailable
                    ->subject(strtr($template->subject, $mergedReplacements))
                    ->view('emails.custom-dynamic', $viewData);
            }
        } catch (\Throwable $e) {
            Log::error("EmailTemplateService resolution error for template '{$slug}': " . $e->getMessage());
        }

        return $mailable
            ->subject(strtr($fallbackSubject, $replacements))
            ->view($fallbackView, $fallbackData);
    }
}

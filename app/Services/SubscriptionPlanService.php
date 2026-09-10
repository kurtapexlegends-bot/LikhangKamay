<?php

namespace App\Services;

use App\Facades\Settings;
use App\Models\User;

class SubscriptionPlanService
{
    /**
     * Canonical list of available system modules and capabilities.
     *
     * @return array<string, array{
     *     id: string,
     *     category: string,
     *     default_name: string,
     *     description: string,
     *     defaults: array<string, bool>
     * }>
     */
    public function getAvailableModules(): array
    {
        return [
            'b2b_supply_hub' => [
                'id' => 'b2b_supply_hub',
                'category' => 'Wholesale & B2B',
                'default_name' => 'B2B Supply Hub & Wholesale Ordering',
                'description' => 'Source raw crafting materials and list wholesale product tiers with minimum order quantities.',
                'defaults' => [
                    'free' => false,
                    'premium' => false,
                    'super_premium' => true,
                ],
            ],
            'in_house_dispatch' => [
                'id' => 'in_house_dispatch',
                'category' => 'Orders & Deliveries',
                'default_name' => 'In-House Driver Fleet Dispatch',
                'description' => 'Dispatch internal studio delivery drivers with live assignment and mobile proof-of-delivery.',
                'defaults' => [
                    'free' => false,
                    'premium' => true,
                    'super_premium' => true,
                ],
            ],
            'discounts' => [
                'id' => 'discounts',
                'category' => 'Marketing & Pricing',
                'default_name' => 'Discounts & Promo Coupons',
                'description' => 'Create coupon promo codes, percentage or fixed discounts, and promotional sale pricing.',
                'defaults' => [
                    'free' => false,
                    'premium' => false,
                    'super_premium' => true,
                ],
            ],
            'material_recipes' => [
                'id' => 'material_recipes',
                'category' => 'Materials & Inventory',
                'default_name' => 'Materials & Craft Recipes',
                'description' => 'Track raw crafting materials used in each item and deduct inventory automatically upon production.',
                'defaults' => [
                    'free' => false,
                    'premium' => true,
                    'super_premium' => true,
                ],
            ],
            'staff_management' => [
                'id' => 'staff_management',
                'category' => 'Team & Business Operations',
                'default_name' => 'Staff Attendance & Payroll Tools',
                'description' => 'Employee login accounts, quick face photo clock-ins, work shift tracking, and payroll generation.',
                'defaults' => [
                    'free' => false,
                    'premium' => true,
                    'super_premium' => true,
                ],
            ],
            'analytics_export' => [
                'id' => 'analytics_export',
                'category' => 'Team & Business Operations',
                'default_name' => 'Analytics Report Export',
                'description' => 'Download sales performance, visitor stats, and inventory analytics in CSV/spreadsheet format.',
                'defaults' => [
                    'free' => false,
                    'premium' => true,
                    'super_premium' => true,
                ],
            ],
            'sponsorships' => [
                'id' => 'sponsorships',
                'category' => 'Marketing & Pricing',
                'default_name' => 'Sponsored Catalog Spotlight',
                'description' => 'Request featured placement banners on the marketplace homepage and priority category ranking.',
                'defaults' => [
                    'free' => false,
                    'premium' => false,
                    'super_premium' => true,
                ],
            ],
            'custom_modules' => [
                'id' => 'custom_modules',
                'category' => 'Team & Business Operations',
                'default_name' => 'Workspace Module Customization',
                'description' => 'Allows artisan to selectively enable or disable operational modules (HR, Accounting) in their workspace.',
                'defaults' => [
                    'free' => false,
                    'premium' => true,
                    'super_premium' => true,
                ],
            ],
            'viewer_3d' => [
                'id' => 'viewer_3d',
                'category' => 'Shop Catalog & Listings',
                'default_name' => '3D Interactive Model Viewer',
                'description' => 'Interactive 3D viewport on product pages letting shoppers inspect handcrafted ceramics and pottery in 360°.',
                'defaults' => [
                    'free' => true,
                    'premium' => true,
                    'super_premium' => true,
                ],
            ],
            'courier_booking' => [
                'id' => 'courier_booking',
                'category' => 'Orders & Deliveries',
                'default_name' => 'Courier Booking (Lalamove)',
                'description' => 'On-demand courier dispatch with automated doorstep pickup and live parcel tracking.',
                'defaults' => [
                    'free' => true,
                    'premium' => true,
                    'super_premium' => true,
                ],
            ],
            'customer_reviews' => [
                'id' => 'customer_reviews',
                'category' => 'Sales & Support',
                'default_name' => 'Customer Reviews & Dispute Resolution',
                'description' => 'Customer reviews, ratings, verified buyer badges, seller replies, and review dispute handling.',
                'defaults' => [
                    'free' => true,
                    'premium' => true,
                    'super_premium' => true,
                ],
            ],
            'printable_documents' => [
                'id' => 'printable_documents',
                'category' => 'Orders & Deliveries',
                'default_name' => 'Printable Invoices & Thermal Receipts',
                'description' => 'Generate printable PDF tax invoices, packaging slips, and 58mm thermal receipts for box packaging.',
                'defaults' => [
                    'free' => true,
                    'premium' => true,
                    'super_premium' => true,
                ],
            ],
            'chat_auto_reply' => [
                'id' => 'chat_auto_reply',
                'category' => 'Sales & Support',
                'default_name' => 'Automated Thank-You Messages',
                'description' => 'Automatically dispatch personalized thank-you and order completion chat replies to customers.',
                'defaults' => [
                    'free' => false,
                    'premium' => true,
                    'super_premium' => true,
                ],
            ],
        ];
    }

    /**
     * Normalize internal tier key.
     */
    public function normalizeTierKey(?string $tier): string
    {
        return match ($tier) {
            'super_premium', 'elite' => 'super_premium',
            'premium' => 'premium',
            default => 'free',
        };
    }

    /**
     * Get the active modules map for a given tier.
     *
     * @return array<string, bool>
     */
    public function getTierModules(string $tier): array
    {
        $normalized = $this->normalizeTierKey($tier);
        $saved = Settings::get("tier_{$normalized}_modules");

        if (is_string($saved)) {
            $decoded = json_decode($saved, true);
            if (is_array($decoded)) {
                $saved = $decoded;
            }
        }

        $modules = $this->getAvailableModules();
        $result = [];

        foreach ($modules as $key => $meta) {
            if (is_array($saved) && array_key_exists($key, $saved)) {
                $result[$key] = filter_var($saved[$key], FILTER_VALIDATE_BOOLEAN);
            } else {
                $result[$key] = (bool) ($meta['defaults'][$normalized] ?? false);
            }
        }

        return $result;
    }

    /**
     * Get the custom display labels for a given tier.
     *
     * @return array<string, string>
     */
    public function getTierFeatureLabels(string $tier): array
    {
        $normalized = $this->normalizeTierKey($tier);
        $saved = Settings::get("tier_{$normalized}_feature_labels");

        if (is_string($saved)) {
            $decoded = json_decode($saved, true);
            if (is_array($decoded)) {
                $saved = $decoded;
            }
        }

        $modules = $this->getAvailableModules();
        $result = [];

        foreach ($modules as $key => $meta) {
            if (is_array($saved) && !empty($saved[$key]) && is_string($saved[$key])) {
                $result[$key] = trim($saved[$key]);
            } else {
                $result[$key] = $meta['default_name'];
            }
        }

        return $result;
    }

    /**
     * Get any additional custom perk bullet strings for a given tier.
     *
     * @return array<int, string>
     */
    public function getTierCustomFeatures(string $tier): array
    {
        $normalized = $this->normalizeTierKey($tier);
        $saved = Settings::get("tier_{$normalized}_custom_features", []);

        if (is_string($saved)) {
            $decoded = json_decode($saved, true);
            if (is_array($decoded)) {
                $saved = $decoded;
            }
        }

        if (!is_array($saved)) {
            return [];
        }

        return array_values(array_filter(array_map('trim', $saved)));
    }

    /**
     * Assembles the compiled features list for a tier (enabled modules + custom perks).
     *
     * @return array<int, string>
     */
    public function getTierFeaturesList(string $tier): array
    {
        $normalized = $this->normalizeTierKey($tier);
        $modulesState = $this->getTierModules($normalized);
        $labels = $this->getTierFeatureLabels($normalized);
        $custom = $this->getTierCustomFeatures($normalized);

        $features = [];
        foreach ($this->getAvailableModules() as $key => $meta) {
            if (!empty($modulesState[$key])) {
                $features[] = $labels[$key] ?? $meta['default_name'];
            }
        }

        foreach ($custom as $extra) {
            if (!empty($extra)) {
                $features[] = $extra;
            }
        }

        return array_values(array_unique($features));
    }

    /**
     * Determine if a given feature module is enabled for a tier.
     */
    public function isFeatureEnabledForTier(string $tier, string $moduleKey): bool
    {
        $modules = $this->getTierModules($tier);

        return (bool) ($modules[$moduleKey] ?? false);
    }

    /**
     * Determine if a feature module is enabled for a specific user.
     */
    public function isFeatureEnabledForUser(?User $user, string $moduleKey): bool
    {
        if (!$user) {
            return false;
        }

        $effectiveSeller = $user->getEffectiveSeller() ?? $user;
        $tier = $effectiveSeller->getEffectivePremiumTier();

        return $this->isFeatureEnabledForTier($tier, $moduleKey);
    }

    /**
     * Persist tier modules, custom labels, and custom bullets.
     *
     * @param  array<string, bool>  $modules
     * @param  array<string, string>  $labels
     * @param  array<int, string>  $customFeatures
     */
    public function saveTierConfiguration(string $tier, array $modules, array $labels = [], array $customFeatures = []): void
    {
        $normalized = $this->normalizeTierKey($tier);

        // Clean modules
        $cleanModules = [];
        foreach ($this->getAvailableModules() as $key => $meta) {
            if (array_key_exists($key, $modules)) {
                $cleanModules[$key] = filter_var($modules[$key], FILTER_VALIDATE_BOOLEAN);
            } else {
                $cleanModules[$key] = (bool) ($meta['defaults'][$normalized] ?? false);
            }
        }
        Settings::set("tier_{$normalized}_modules", $cleanModules, 'json');

        // Clean labels
        $cleanLabels = [];
        foreach ($labels as $key => $label) {
            if (is_string($label) && trim($label) !== '') {
                $cleanLabels[$key] = trim($label);
            }
        }
        Settings::set("tier_{$normalized}_feature_labels", $cleanLabels, 'json');

        // Clean custom features
        $cleanCustom = array_values(array_filter(array_map('trim', $customFeatures)));
        Settings::set("tier_{$normalized}_custom_features", $cleanCustom, 'json');

        // Automatically update compiled tier_{tier}_features for backward compatibility
        $compiled = $this->getTierFeaturesList($normalized);
        Settings::set("tier_{$normalized}_features", $compiled, 'json');
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class UpdateSystemSettingsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Gate::allows('admin-action');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'platform_name' => 'sometimes|required|string|max:255',
            'platform_logo' => 'nullable|image|max:2048',
            'favicon' => 'nullable|file|mimes:ico,png|max:512',
            'primary_color' => ['sometimes', 'required', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'seo_metadata' => 'sometimes|required|array',
            'seo_metadata.title' => 'sometimes|required|string|max:255',
            'seo_metadata.description' => 'sometimes|required|string|max:500',
            'seo_metadata.keywords' => 'nullable|string|max:255',
            'contact_info' => 'required|array',
            'contact_info.email' => 'required|email|max:255',
            'contact_info.phone' => 'nullable|string|max:50',
            'contact_info.address' => 'nullable|string|max:500',
            'social_links' => 'required|array',
            'social_links.facebook' => 'nullable|url|max:255',
            'social_links.instagram' => 'nullable|url|max:255',
            'social_links.twitter' => 'nullable|url|max:255',
            // Operational Validation
            'convenience_fee' => 'required|numeric|min:0|max:100',
            'maintenance_mode' => 'required|boolean',
            'paymongo_enabled' => 'required|boolean',

            // Subscription Tier Validation
            'tier_free_limit' => 'sometimes|required|integer|min:1',
            'tier_free_staff_limit' => 'sometimes|required|integer|min:0',
            'tier_free_badge' => 'nullable|string|max:50',
            'tier_free_description' => 'nullable|string|max:255',
            'tier_free_features' => 'nullable|array',
            'tier_free_features.*' => 'nullable|string|max:255',
            'tier_free_modules' => 'nullable|array',
            'tier_free_feature_labels' => 'nullable|array',
            'tier_free_feature_labels.*' => 'nullable|string|max:255',
            'tier_free_custom_features' => 'nullable|array',
            'tier_free_custom_features.*' => 'nullable|string|max:255',

            'tier_premium_price' => 'sometimes|required|numeric|min:0',
            'tier_premium_limit' => 'sometimes|required|integer|min:1',
            'tier_premium_staff_limit' => 'sometimes|required|integer|min:1',
            'tier_premium_badge' => 'nullable|string|max:50',
            'tier_premium_description' => 'nullable|string|max:255',
            'tier_premium_features' => 'nullable|array',
            'tier_premium_features.*' => 'nullable|string|max:255',
            'tier_premium_modules' => 'nullable|array',
            'tier_premium_feature_labels' => 'nullable|array',
            'tier_premium_feature_labels.*' => 'nullable|string|max:255',
            'tier_premium_custom_features' => 'nullable|array',
            'tier_premium_custom_features.*' => 'nullable|string|max:255',

            'tier_super_premium_price' => 'sometimes|required|numeric|min:0',
            'tier_super_premium_limit' => 'sometimes|required|integer|min:1',
            'tier_super_premium_staff_limit' => 'sometimes|required|integer|min:1',
            'tier_super_premium_badge' => 'nullable|string|max:50',
            'tier_super_premium_description' => 'nullable|string|max:255',
            'tier_super_premium_features' => 'nullable|array',
            'tier_super_premium_features.*' => 'nullable|string|max:255',
            'tier_super_premium_modules' => 'nullable|array',
            'tier_super_premium_feature_labels' => 'nullable|array',
            'tier_super_premium_feature_labels.*' => 'nullable|string|max:255',
            'tier_super_premium_custom_features' => 'nullable|array',
            'tier_super_premium_custom_features.*' => 'nullable|string|max:255',

            // Mail Engine Validation
            'mail_driver' => 'nullable|string|in:resend,smtp,log',
            'resend_api_key' => 'nullable|string|max:255',
            'mail_from_address' => 'nullable|email|max:255',
            'mail_from_name' => 'nullable|string|max:255',
        ];
    }
}

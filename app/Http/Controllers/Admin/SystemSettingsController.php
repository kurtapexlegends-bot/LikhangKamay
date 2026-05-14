<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\SystemSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class SystemSettingsController extends Controller
{
    protected SystemSettingsService $settings;

    public function __construct(SystemSettingsService $settings)
    {
        $this->settings = $settings;
    }

    public function index()
    {
        return Inertia::render('Admin/SystemSettings', [
            'settings' => [
                'platform_name' => $this->settings->get('platform_name', 'Likhang Kamay'),
                'platform_logo' => $this->settings->get('platform_logo'),
                'favicon' => $this->settings->get('favicon'),
                'primary_color' => $this->settings->get('primary_color', '#8B4513'),
                'seo_metadata' => $this->settings->get('seo_metadata', [
                    'title' => 'Likhang Kamay | Artisan Marketplace',
                    'description' => 'A premium marketplace for Filipino artisans and handmade crafts.',
                    'keywords' => 'artisan, handmade, crafts, philippines, marketplace',
                ]),
                'contact_info' => $this->settings->get('contact_info', [
                    'email' => 'support@likhangkamay.app',
                    'phone' => '',
                    'address' => '',
                ]),
                'social_links' => $this->settings->get('social_links', [
                    'facebook' => '',
                    'instagram' => '',
                    'twitter' => '',
                ]),
                // Operational Settings
                'commission_rate' => $this->settings->get('commission_rate', 5.0),
                'convenience_fee' => $this->settings->get('convenience_fee', 15.0),
                'withdrawal_min' => $this->settings->get('withdrawal_min', 500.0),
                'maintenance_mode' => $this->settings->get('maintenance_mode', false),
                'paymongo_enabled' => $this->settings->get('paymongo_enabled', true),
            ]
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'platform_name' => 'required|string|max:255',
            'platform_logo' => 'nullable|image|max:2048',
            'favicon' => 'nullable|file|mimes:ico,png|max:512',
            'primary_color' => ['required', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'seo_metadata' => 'required|array',
            'seo_metadata.title' => 'required|string|max:255',
            'seo_metadata.description' => 'required|string|max:500',
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
            'commission_rate' => 'required|numeric|min:0|max:100',
            'convenience_fee' => 'required|numeric|min:0',
            'withdrawal_min' => 'required|numeric|min:0',
            'maintenance_mode' => 'required|boolean',
            'paymongo_enabled' => 'required|boolean',
        ]);

        // Audit Logging for critical changes
        if ($this->settings->get('primary_color') !== $validated['primary_color']) {
            \App\Models\PlatformActivity::log(
                'BRANDING_UPDATE',
                "Updated primary brand color from " . $this->settings->get('primary_color') . " to " . $validated['primary_color']
            );
        }

        if ((float)$this->settings->get('commission_rate') !== (float)$validated['commission_rate']) {
            \App\Models\PlatformActivity::log(
                'COMMISSION_UPDATE',
                "Changed site-wide commission from " . $this->settings->get('commission_rate') . "% to " . $validated['commission_rate'] . "%"
            );
        }

        $this->settings->set('platform_name', $validated['platform_name']);
        $this->settings->set('primary_color', $validated['primary_color']);
        $this->settings->set('seo_metadata', $validated['seo_metadata'], 'json');
        $this->settings->set('contact_info', $validated['contact_info'], 'json');
        $this->settings->set('social_links', $validated['social_links'], 'json');
        
        // Save Operational Settings
        $this->settings->set('commission_rate', $validated['commission_rate'], 'float');
        $this->settings->set('convenience_fee', $validated['convenience_fee'], 'float');
        $this->settings->set('withdrawal_min', $validated['withdrawal_min'], 'float');
        $this->settings->set('maintenance_mode', $validated['maintenance_mode'] ? 'true' : 'false', 'boolean');
        $this->settings->set('paymongo_enabled', $validated['paymongo_enabled'] ? 'true' : 'false', 'boolean');

        if ($request->hasFile('platform_logo')) {
            $path = $request->file('platform_logo')->store('platform', 'public');
            $this->settings->set('platform_logo', Storage::url($path));
        }

        if ($request->hasFile('favicon')) {
            $path = $request->file('favicon')->store('platform', 'public');
            $this->settings->set('favicon', Storage::url($path));
        }

        return back()->with('success', 'System settings synchronized successfully.');
    }
}

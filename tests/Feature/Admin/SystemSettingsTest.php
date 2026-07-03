<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Services\SystemSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SystemSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected SystemSettingsService $settings;

    protected function setUp(): void
    {
        parent::setUp();
        $this->settings = app(SystemSettingsService::class);
    }

    public function test_super_admin_can_update_system_settings_successfully(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $payload = [
            'platform_name' => 'LikhangKamay Test',
            'primary_color' => '#123456',
            'seo_metadata' => [
                'title' => 'Handcrafted Items PH',
                'description' => 'The best marketplace for Filipino artisans.',
                'keywords' => 'handicraft, local, artisan',
            ],
            'contact_info' => [
                'email' => 'contact-test@likhangkamay.app',
                'phone' => '09171234567',
                'address' => '123 Clay St, Cavite',
            ],
            'social_links' => [
                'facebook' => 'https://facebook.com/likhangkamaytest',
                'instagram' => 'https://instagram.com/likhangkamaytest',
                'twitter' => 'https://twitter.com/likhangkamaytest',
            ],
            'commission_rate' => 6.5,
            'convenience_fee' => 20.0,
            'maintenance_mode' => false,
            'paymongo_enabled' => true,
            'mail_host' => 'smtp.mailtrap.io',
            'mail_port' => '2525',
            'mail_encryption' => 'tls',
            'mail_username' => 'test-user',
            'mail_password' => 'test-password',
            'mail_from_address' => 'noreply-test@likhangkamay.app',
            'mail_from_name' => 'LikhangKamay Mailer',
            'tier_free_limit' => 5,
            'tier_premium_price' => 249.00,
            'tier_premium_limit' => 15,
            'tier_super_premium_price' => 499.00,
            'tier_super_premium_limit' => 60,
        ];

        $response = $this->actingAs($admin)
            ->post(route('admin.settings.update'), $payload);

        $response->assertRedirect();
        
        // Assert updated values in Settings Service
        $this->assertEquals('LikhangKamay Test', $this->settings->get('platform_name'));
        $this->assertEquals('#123456', $this->settings->get('primary_color'));
        
        $seo = $this->settings->get('seo_metadata');
        $this->assertIsArray($seo);
        $this->assertEquals('Handcrafted Items PH', $seo['title']);
        $this->assertEquals('The best marketplace for Filipino artisans.', $seo['description']);
        $this->assertEquals('handicraft, local, artisan', $seo['keywords']);

        $contact = $this->settings->get('contact_info');
        $this->assertIsArray($contact);
        $this->assertEquals('contact-test@likhangkamay.app', $contact['email']);
        $this->assertEquals('09171234567', $contact['phone']);
        $this->assertEquals('123 Clay St, Cavite', $contact['address']);

        $social = $this->settings->get('social_links');
        $this->assertIsArray($social);
        $this->assertEquals('https://facebook.com/likhangkamaytest', $social['facebook']);

        $this->assertEquals(6.5, $this->settings->get('commission_rate'));
        $this->assertEquals(20.0, $this->settings->get('convenience_fee'));
        $this->assertFalse($this->settings->get('maintenance_mode'));
        $this->assertTrue($this->settings->get('paymongo_enabled'));
        
        $this->assertEquals('smtp.mailtrap.io', $this->settings->get('mail_host'));
        $this->assertEquals('2525', $this->settings->get('mail_port'));
        $this->assertEquals('tls', $this->settings->get('mail_encryption'));
        $this->assertEquals('test-user', $this->settings->get('mail_username'));
        $this->assertEquals('test-password', $this->settings->get('mail_password'));
        $this->assertEquals('noreply-test@likhangkamay.app', $this->settings->get('mail_from_address'));
        $this->assertEquals('LikhangKamay Mailer', $this->settings->get('mail_from_name'));

        // Assert Subscription Tier Settings
        $this->assertEquals(5, $this->settings->get('tier_free_limit'));
        $this->assertEquals(249.00, $this->settings->get('tier_premium_price'));
        $this->assertEquals(15, $this->settings->get('tier_premium_limit'));
        $this->assertEquals(499.00, $this->settings->get('tier_super_premium_price'));
        $this->assertEquals(60, $this->settings->get('tier_super_premium_limit'));
    }

    public function test_non_admin_cannot_update_system_settings(): void
    {
        $nonAdmin = User::factory()->artisanApproved()->create();

        $response = $this->actingAs($nonAdmin)
            ->post(route('admin.settings.update'), [
                'platform_name' => 'Hack Platform',
                'primary_color' => '#ff0000',
            ]);

        $response->assertForbidden();
    }
}

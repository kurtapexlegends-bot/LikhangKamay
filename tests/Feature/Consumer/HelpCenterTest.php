<?php

declare(strict_types=1);

namespace Tests\Feature\Consumer;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Inertia\Testing\AssertableInertia as Assert;

class HelpCenterTest extends TestCase
{
    public function test_guest_and_user_can_access_help_center_page(): void
    {
        $response = $this->get(route('help.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Consumer/Help/HelpCenter')
            ->has('buyerFaqs')
            ->has('artisanFaqs')
            ->where('initialTab', 'buyer')
            ->where('allowedPersona', 'buyer')
            ->where('initialSearch', '')
        );
    }

    public function test_help_center_accepts_query_parameters_for_tab_and_search_for_guest(): void
    {
        $response = $this->get(route('help.index', [
            'tab' => 'artisan',
            'search' => 'payout',
        ]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Consumer/Help/HelpCenter')
            ->where('initialTab', 'artisan')
            ->where('allowedPersona', 'artisan')
            ->where('initialSearch', 'payout')
        );
    }

    public function test_help_center_faqs_contain_domain_cavite_and_pottery_answers(): void
    {
        $response = $this->get(route('help.index'));

        $response->assertOk();
        $response->assertInertia(function (Assert $page) {
            $page->component('Consumer/Help/HelpCenter');
            
            $buyerFaqs = $page->toArray()['props']['buyerFaqs'];
            $this->assertNotEmpty($buyerFaqs);

            $ids = array_column($buyerFaqs, 'id');
            $this->assertContains('cavite-shipping-logistics', $ids);
            $this->assertContains('fragile-pottery-packaging', $ids);
            $this->assertContains('return-window-broken-items', $ids);
            $this->assertContains('quick-face-check-verification', $ids);

            $artisanFaqs = $page->toArray()['props']['artisanFaqs'];
            $this->assertNotEmpty($artisanFaqs);

            $artisanIds = array_column($artisanFaqs, 'id');
            $this->assertContains('artisan-registration-cavite', $artisanIds);
            $this->assertContains('walkin-pos-and-receipts', $artisanIds);
            $this->assertContains('payout-withdrawal-schedules', $artisanIds);
        });
    }

    public function test_buyer_is_strictly_locked_to_buyer_persona(): void
    {
        $buyer = User::factory()->make([
            'role' => 'buyer',
        ]);

        $response = $this->actingAs($buyer)->get(route('help.index', [
            'tab' => 'artisan', // Attempt to access artisan guide
        ]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Consumer/Help/HelpCenter')
            ->where('initialTab', 'buyer')
            ->where('allowedPersona', 'buyer')
        );
    }

    public function test_artisan_is_strictly_locked_to_artisan_persona(): void
    {
        $artisan = User::factory()->make([
            'role' => 'artisan',
            'is_workspace_owner' => true,
        ]);

        $response = $this->actingAs($artisan)->get(route('help.index', [
            'tab' => 'buyer', // Attempt to access buyer guide
        ]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Consumer/Help/HelpCenter')
            ->where('initialTab', 'artisan')
            ->where('allowedPersona', 'artisan')
        );
    }
}

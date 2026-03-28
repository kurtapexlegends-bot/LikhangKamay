<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'terms' => true,
        ]);

        $this->assertGuest();
        $response->assertRedirect(route('login', absolute: false));
    }

    public function test_new_artisans_can_register_before_completing_shop_setup(): void
    {
        $response = $this->post('/register', [
            'name' => 'Clay Seller',
            'shop_name' => 'Clay Seller Studio',
            'email' => 'artisan@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'terms' => true,
        ]);

        $this->assertGuest();
        $response->assertRedirect(route('login', absolute: false));

        $this->assertDatabaseHas('users', [
            'email' => 'artisan@example.com',
            'role' => 'artisan',
            'shop_name' => 'Clay Seller Studio',
        ]);
    }
}

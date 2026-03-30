<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'phone_number' => '09' . fake()->numerify('#########'),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function superAdmin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'super_admin',
        ]);
    }

    public function artisanApproved(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'artisan',
            'shop_name' => fake()->company().' Pottery',
            'setup_completed_at' => now(),
            'artisan_status' => 'approved',
            'approved_at' => now(),
        ]);
    }

    public function artisanPending(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'artisan',
            'shop_name' => fake()->company().' Pottery',
            'setup_completed_at' => now(),
            'artisan_status' => 'pending',
        ]);
    }

    public function artisanWithoutSetup(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'artisan',
            'shop_name' => fake()->company().' Pottery',
            'setup_completed_at' => null,
            'artisan_status' => 'pending',
        ]);
    }

    public function staff(?User $sellerOwner = null): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'staff',
            'seller_owner_id' => $sellerOwner?->id,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => ['overview' => true],
            'must_change_password' => false,
            'created_by_user_id' => $sellerOwner?->id,
        ]);
    }
}

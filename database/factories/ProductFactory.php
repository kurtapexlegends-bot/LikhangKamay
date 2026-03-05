<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => \App\Models\User::factory(),
            'sku' => fake()->unique()->numerify('SKU-#####'),
            'name' => fake()->words(3, true),
            'description' => fake()->paragraph(),
            'category' => 'Mugs',
            'status' => 'active',
            'price' => fake()->randomFloat(2, 10, 100),
            'cost_price' => fake()->randomFloat(2, 5, 50),
            'stock' => fake()->numberBetween(1, 100),
        ];
    }
}

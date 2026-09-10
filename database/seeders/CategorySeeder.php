<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Standard marketplace categories for LikhangKamay.
     */
    public const STANDARD_CATEGORIES = [
        ['name' => 'Tableware', 'slug' => 'tableware', 'icon' => 'Utensils'],
        ['name' => 'Drinkware', 'slug' => 'drinkware', 'icon' => 'Coffee'],
        ['name' => 'Vases & Jars', 'slug' => 'vases-jars', 'icon' => 'Flower2'],
        ['name' => 'Planters & Pots', 'slug' => 'planters-pots', 'icon' => 'Sprout'],
        ['name' => 'Home Decor', 'slug' => 'home-decor', 'icon' => 'Home'],
        ['name' => 'Kitchenware', 'slug' => 'kitchenware', 'icon' => 'ChefHat'],
        ['name' => 'Artisan Sets', 'slug' => 'artisan-sets', 'icon' => 'Gift'],
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach (self::STANDARD_CATEGORIES as $data) {
            Category::withTrashed()->updateOrCreate(
                ['slug' => $data['slug']],
                [
                    'name' => $data['name'],
                    'icon' => $data['icon'],
                    'deleted_at' => null,
                ]
            );
        }
    }
}

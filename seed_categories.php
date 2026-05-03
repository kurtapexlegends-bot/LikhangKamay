<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$categories = [
    'Tableware', 
    'Drinkware', 
    'Vases & Jars', 
    'Planters & Pots', 
    'Home Decor', 
    'Kitchenware', 
    'Artisan Sets'
];

foreach ($categories as $cat) {
    \App\Models\Category::firstOrCreate([
        'name' => $cat,
        'slug' => \Illuminate\Support\Str::slug($cat)
    ]);
}

echo "Seeded " . \App\Models\Category::count() . " categories.\n";

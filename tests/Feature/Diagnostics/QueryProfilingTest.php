<?php

namespace Tests\Feature\Diagnostics;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class QueryProfilingTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_shop_catalog_query_count(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'shop_name' => 'Artisan Shop 1',
            'city' => 'Cavite',
        ]);

        // Create 15 products to populate catalog
        for ($i = 0; $i < 15; $i++) {
            Product::create([
                'user_id' => $seller->id,
                'sku' => 'SKU-' . $i . '-' . rand(100, 999),
                'name' => 'Product ' . $i,
                'category' => 'Vases',
                'status' => 'Active',
                'price' => 100 + ($i * 10),
                'stock' => 10,
                'sold' => $i,
                'cover_photo_path' => "products/p{$i}.jpg",
            ]);
        }

        $queries = [];
        DB::listen(function ($query) use (&$queries) {
            $queries[] = [
                'sql' => $query->sql,
                'time' => $query->time,
            ];
        });

        $response = $this->get(route('shop.index'));
        $response->assertOk();

        echo "\n=== SHOP CATALOG QUERIES PROFILE - COLD HIT (Total: " . count($queries) . ") ===\n";
        foreach ($queries as $idx => $q) {
            echo ($idx + 1) . ". " . $q['sql'] . " (" . $q['time'] . "ms)\n";
        }

        // Reset query log and hit route a second time
        $queries = [];
        $response2 = $this->get(route('shop.index'));
        $response2->assertOk();

        echo "\n=== SHOP CATALOG QUERIES PROFILE - WARM HIT (Total: " . count($queries) . ") ===\n";
        foreach ($queries as $idx => $q) {
            echo ($idx + 1) . ". " . $q['sql'] . " (" . $q['time'] . "ms)\n";
        }
    }

    public function test_profile_notifications_query_count(): void
    {
        /** @var \App\Models\User $user */
        $user = User::factory()->create();
        
        // Add 5 database notifications
        for ($i = 0; $i < 5; $i++) {
            $user->notifications()->create([
                'id' => \Illuminate\Support\Str::uuid(),
                'type' => 'App\Notifications\GenericNotification',
                'data' => [
                    'type' => 'new_message',
                    'title' => 'New Message',
                    'message' => 'Hello ' . $i,
                    'sender_id' => 999,
                ],
            ]);
        }

        $queries = [];
        DB::listen(function ($query) use (&$queries) {
            $queries[] = [
                'sql' => $query->sql,
                'time' => $query->time,
            ];
        });

        $response = $this->actingAs($user)->get(route('notifications.index'));
        $response->assertOk();

        echo "\n=== NOTIFICATIONS QUERIES PROFILE (Total: " . count($queries) . ") ===\n";
        foreach ($queries as $idx => $q) {
            echo ($idx + 1) . ". " . $q['sql'] . " (" . $q['time'] . "ms)\n";
        }
    }

    public function test_profile_seller_profile_query_count(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'shop_name' => 'Artisan Shop 1',
            'city' => 'Cavite',
        ]);

        for ($i = 0; $i < 5; $i++) {
            Product::create([
                'user_id' => $seller->id,
                'sku' => 'SKU-S-' . $i,
                'name' => 'Seller Product ' . $i,
                'category' => 'Vases',
                'status' => 'Active',
                'price' => 150,
                'stock' => 10,
                'sold' => $i + 1, // some sales to trigger best sellers
                'cover_photo_path' => "products/ps{$i}.jpg",
            ]);
        }

        $queries = [];
        DB::listen(function ($query) use (&$queries) {
            $queries[] = [
                'sql' => $query->sql,
                'time' => $query->time,
            ];
        });

        $response = $this->get(route('shop.seller', $seller->shop_slug));
        $response->assertOk();

        echo "\n=== SELLER PROFILE QUERIES PROFILE (Total: " . count($queries) . ") ===\n";
        foreach ($queries as $idx => $q) {
            echo ($idx + 1) . ". " . $q['sql'] . " (" . $q['time'] . "ms)\n";
        }
    }

    public function test_profile_shop_settings_query_count(): void
    {
        /** @var \App\Models\User $seller */
        $seller = User::factory()->artisanApproved()->create([
            'shop_name' => 'Artisan Shop 1',
            'city' => 'Cavite',
        ]);

        $queries = [];
        DB::listen(function ($query) use (&$queries) {
            $queries[] = [
                'sql' => $query->sql,
                'time' => $query->time,
            ];
        });

        $response = $this->actingAs($seller)->get(route('shop.settings'));
        $response->assertOk();

        echo "\n=== SHOP SETTINGS QUERIES PROFILE (Total: " . count($queries) . ") ===\n";
        foreach ($queries as $idx => $q) {
            echo ($idx + 1) . ". " . $q['sql'] . " (" . $q['time'] . "ms)\n";
        }
    }
}

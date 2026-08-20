<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payout;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PayoutSampleDataSeeder extends Seeder
{
    public function run(): void
    {
        $kurt = User::where('email', 'kurtapexlegends@gmail.com')->first();
        $bulacan = User::where('email', 'bulacanclayworks@example.com')->first();
        $terracotta = User::where('email', 'terracottamanila@example.com')->first();
        $vigan = User::where('email', 'viganpottery@example.com')->first();

        // 1. Configure Kurt's Artisan Studio with GCash
        if ($kurt) {
            $kurt->update([
                'payout_method' => 'GCash',
                'payout_account_name' => 'Kurt Acosta',
                'payout_account_number' => '09175551234',
                'artisan_status' => 'approved',
            ]);

            // Sample Customer User
            $customer = User::firstOrCreate(
                ['email' => 'maria.customer@example.com'],
                [
                    'name' => 'Maria Clara',
                    'password' => bcrypt('password'),
                    'role' => 'buyer',
                    'email_verified_at' => now(),
                ]
            );

            // Clean previous test sample orders for this seeder to be idempotent
            $oldOrders = Order::withTrashed()->whereIn('order_number', ['LK-ORD-8821', 'LK-ORD-8822', 'LK-ORD-8823', 'LK-ORD-8824'])->get();
            foreach ($oldOrders as $oldOrd) {
                OrderItem::where('order_id', $oldOrd->id)->delete();
                $oldOrd->forceDelete();
            }

            // Fetch real products from Kurt's shop or fallback
            $prodPedestal = Product::where('user_id', $kurt->id)->where('name', 'like', '%Pedestal%')->first() 
                ?? Product::where('user_id', $kurt->id)->first();
            $prodLumina = Product::where('user_id', $kurt->id)->where('name', 'like', '%Lumina%')->first()
                ?? Product::where('user_id', $kurt->id)->skip(1)->first()
                ?? $prodPedestal;
            $prodOlive = Product::where('user_id', $kurt->id)->where('name', 'like', '%Olive%')->first()
                ?? Product::where('user_id', $kurt->id)->skip(2)->first()
                ?? $prodPedestal;
            $prodWabi = Product::where('user_id', $kurt->id)->where('name', 'like', '%Wabi%')->first()
                ?? Product::where('user_id', $kurt->id)->skip(3)->first()
                ?? $prodPedestal;

            // Order 1: Completed (Ready for Payout)
            $ord1 = Order::create([
                'order_number' => 'LK-ORD-8821',
                'user_id' => $customer->id,
                'artisan_id' => $kurt->id,
                'customer_name' => 'Maria Clara',
                'merchandise_subtotal' => 2500.00,
                'platform_commission_amount' => 125.00,
                'seller_net_amount' => 2375.00,
                'shipping_fee_amount' => 150.00,
                'total_amount' => 2650.00,
                'status' => 'Completed',
                'payment_method' => 'gcash',
                'payment_status' => 'paid',
                'shipping_method' => 'Delivery',
                'shipping_address' => '124 Luna St., Intramuros, Manila',
                'delivered_at' => now()->subDays(2),
                'received_at' => now()->subDays(2),
                'created_at' => now()->subDays(4),
            ]);

            OrderItem::create([
                'order_id' => $ord1->id,
                'product_id' => $prodPedestal?->id,
                'product_name' => $prodPedestal?->name ?? 'Heritage Terracotta Pedestal Vase',
                'variant' => 'Standard / Natural Clay',
                'price' => 625.00,
                'cost' => 250.00,
                'quantity' => 4,
                'product_img' => $prodPedestal?->img ?? 'products/covers/eYzPNFOGU5k96pavp9SCX1vndpbLpBohTDULYmtG.jpg',
            ]);

            // Order 2: Completed (Ready for Payout)
            $ord2 = Order::create([
                'order_number' => 'LK-ORD-8822',
                'user_id' => $customer->id,
                'artisan_id' => $kurt->id,
                'customer_name' => 'Jose Rizal',
                'merchandise_subtotal' => 1800.00,
                'platform_commission_amount' => 90.00,
                'seller_net_amount' => 1710.00,
                'shipping_fee_amount' => 120.00,
                'total_amount' => 1920.00,
                'status' => 'Completed',
                'payment_method' => 'gcash',
                'payment_status' => 'paid',
                'shipping_method' => 'Delivery',
                'shipping_address' => '45 Real St., Calamba, Laguna',
                'delivered_at' => now()->subDay(),
                'received_at' => now()->subDay(),
                'created_at' => now()->subDays(3),
            ]);

            OrderItem::create([
                'order_id' => $ord2->id,
                'product_id' => $prodLumina?->id,
                'product_name' => $prodLumina?->name ?? 'Lumina Glazed Artisan Vessel',
                'variant' => 'Ceramic White / Glazed',
                'price' => 600.00,
                'cost' => 220.00,
                'quantity' => 3,
                'product_img' => $prodLumina?->img ?? 'products/covers/iZIGrbe948MoR59SmCSySMHAxQ7nF1mLhgDrql7S.jpg',
            ]);

            // Order 3: Shipped (Orders in Progress)
            $ord3 = Order::create([
                'order_number' => 'LK-ORD-8823',
                'user_id' => $customer->id,
                'artisan_id' => $kurt->id,
                'customer_name' => 'Andres Bonifacio',
                'merchandise_subtotal' => 1200.00,
                'platform_commission_amount' => 60.00,
                'seller_net_amount' => 1140.00,
                'shipping_fee_amount' => 100.00,
                'total_amount' => 1300.00,
                'status' => 'Shipped',
                'payment_method' => 'gcash',
                'payment_status' => 'paid',
                'shipping_method' => 'Delivery',
                'shipping_address' => '77 Tondo St., Manila',
                'shipped_at' => now()->subHours(6),
                'created_at' => now()->subDay(),
            ]);

            OrderItem::create([
                'order_id' => $ord3->id,
                'product_id' => $prodOlive?->id,
                'product_name' => $prodOlive?->name ?? 'Artisan Matte Olive Tall Vase',
                'variant' => 'Matte Olive / Fluted',
                'price' => 600.00,
                'cost' => 240.00,
                'quantity' => 2,
                'product_img' => $prodOlive?->img ?? 'products/covers/yus5szQXbN1xC11l52LWEDQdf3sYRsnEuLxM3kL0.jpg',
            ]);

            // Order 4: Return in progress (Dispute / Return Hold)
            $ord4 = Order::create([
                'order_number' => 'LK-ORD-8824',
                'user_id' => $customer->id,
                'artisan_id' => $kurt->id,
                'customer_name' => 'Emilio Aguinaldo',
                'merchandise_subtotal' => 1500.00,
                'platform_commission_amount' => 75.00,
                'seller_net_amount' => 1425.00,
                'shipping_fee_amount' => 100.00,
                'total_amount' => 1600.00,
                'status' => 'Refund/Return',
                'return_reason' => 'Item arrived with cracked bottom glazing.',
                'payment_method' => 'gcash',
                'payment_status' => 'paid',
                'shipping_method' => 'Delivery',
                'shipping_address' => '1898 Kawit St., Cavite',
                'delivered_at' => now()->subDays(3),
                'created_at' => now()->subDays(5),
            ]);

            OrderItem::create([
                'order_id' => $ord4->id,
                'product_id' => $prodWabi?->id,
                'product_name' => $prodWabi?->name ?? 'Wabi-Sabi Asymmetrical Ceramic Vase',
                'variant' => 'Standard / Raw Earth',
                'price' => 750.00,
                'cost' => 300.00,
                'quantity' => 2,
                'product_img' => $prodWabi?->img ?? 'products/covers/fPXqNrGKVdNl2rM9wfbzK9GST0lCYuT9Yxfb2BOI.png',
            ]);

            // Payout record: Previous settlement
            Payout::where('reference_number', 'GCASH-REF-89210928')->delete();
            Payout::create([
                'user_id' => $kurt->id,
                'amount' => 3500.00,
                'payout_method' => 'GCash',
                'payout_account_name' => 'Kurt Acosta',
                'payout_account_number' => '09175551234',
                'reference_number' => 'GCASH-REF-89210928',
                'status' => 'Completed',
                'created_at' => now()->subDays(7),
            ]);
        }

        // 2. Configure Bulacan Heritage Ceramics with Maya
        if ($bulacan) {
            $bulacan->update([
                'payout_method' => 'Maya',
                'payout_account_name' => 'Bulacan Pottery Co',
                'payout_account_number' => '09187779988',
                'artisan_status' => 'approved',
            ]);

            $customer = User::firstOrCreate(
                ['email' => 'maria.customer@example.com'],
                ['name' => 'Maria Clara', 'password' => bcrypt('password'), 'role' => 'buyer']
            );

            $oldBulacanOrders = Order::withTrashed()->where('order_number', 'LK-ORD-9901')->get();
            foreach ($oldBulacanOrders as $oldOrd) {
                OrderItem::where('order_id', $oldOrd->id)->delete();
                $oldOrd->forceDelete();
            }

            $bulacanProd = Product::where('user_id', $bulacan->id)->first();

            $ordBulacan = Order::create([
                'order_number' => 'LK-ORD-9901',
                'user_id' => $customer->id,
                'artisan_id' => $bulacan->id,
                'customer_name' => 'Gabriela Silang',
                'merchandise_subtotal' => 3200.00,
                'platform_commission_amount' => 160.00,
                'seller_net_amount' => 3040.00,
                'shipping_fee_amount' => 200.00,
                'total_amount' => 3400.00,
                'status' => 'Completed',
                'payment_method' => 'maya',
                'payment_status' => 'paid',
                'shipping_method' => 'Delivery',
                'shipping_address' => 'Santa Maria, Bulacan',
                'delivered_at' => now()->subDay(),
                'received_at' => now()->subDay(),
                'created_at' => now()->subDays(2),
            ]);

            OrderItem::create([
                'order_id' => $ordBulacan->id,
                'product_id' => $bulacanProd?->id,
                'product_name' => $bulacanProd?->name ?? 'Handmade Bulacan Clay Planter',
                'variant' => 'Standard',
                'price' => 1600.00,
                'cost' => 600.00,
                'quantity' => 2,
                'product_img' => $bulacanProd?->img ?? 'products/covers/eYzPNFOGU5k96pavp9SCX1vndpbLpBohTDULYmtG.jpg',
            ]);
        }

        // 3. Configure Terra Cotta Manila without payout account (Needs Setup demo)
        if ($terracotta) {
            $terracotta->update([
                'payout_method' => null,
                'payout_account_name' => null,
                'payout_account_number' => null,
                'artisan_status' => 'approved',
            ]);

            $customer = User::firstOrCreate(
                ['email' => 'maria.customer@example.com'],
                ['name' => 'Maria Clara', 'password' => bcrypt('password'), 'role' => 'buyer']
            );

            $oldTerraOrders = Order::withTrashed()->where('order_number', 'LK-ORD-7701')->get();
            foreach ($oldTerraOrders as $oldOrd) {
                OrderItem::where('order_id', $oldOrd->id)->delete();
                $oldOrd->forceDelete();
            }

            $terraProd = Product::where('user_id', $terracotta->id)->first();

            $ordTerra = Order::create([
                'order_number' => 'LK-ORD-7701',
                'user_id' => $customer->id,
                'artisan_id' => $terracotta->id,
                'customer_name' => 'Juan Luna',
                'merchandise_subtotal' => 850.00,
                'platform_commission_amount' => 42.50,
                'seller_net_amount' => 807.50,
                'shipping_fee_amount' => 100.00,
                'total_amount' => 950.00,
                'status' => 'Completed',
                'payment_method' => 'card',
                'payment_status' => 'paid',
                'shipping_method' => 'Delivery',
                'shipping_address' => 'Escolta St., Binondo, Manila',
                'delivered_at' => now()->subDay(),
                'received_at' => now()->subDay(),
                'created_at' => now()->subDays(2),
            ]);

            OrderItem::create([
                'order_id' => $ordTerra->id,
                'product_id' => $terraProd?->id,
                'product_name' => $terraProd?->name ?? 'Raw Manila Terracotta Pot',
                'variant' => 'Small',
                'price' => 850.00,
                'cost' => 300.00,
                'quantity' => 1,
                'product_img' => $terraProd?->img ?? 'products/covers/SXFZvRpvenV1fGkWTW9T6ijVfxgpyPDq97PiuRyE.jpg',
            ]);
        }

        // 4. Configure Vigan Heritage Pottery as fully settled (₱0.00)
        if ($vigan) {
            $vigan->update([
                'payout_method' => 'Bank Transfer (BDO)',
                'payout_account_name' => 'Vigan Heritage Clay Inc',
                'payout_account_number' => '1092837465',
                'artisan_status' => 'approved',
            ]);
        }
    }
}

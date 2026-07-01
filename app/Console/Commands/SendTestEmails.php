<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use App\Models\User;
use App\Models\Product;
use App\Models\Order;
use App\Models\OrderItem;
use App\Mail\OrderPlaced;
use App\Mail\OrderAccepted;
use App\Mail\OrderShipped;
use App\Mail\OrderDelivered;
use App\Mail\RefundProcessed;
use App\Mail\ReturnRequested;
use App\Mail\ShipmentReminder;
use App\Mail\NewArtisanApplication;
use App\Mail\ArtisanApproved;
use App\Mail\ArtisanRejected;

class SendTestEmails extends Command
{
    protected $signature = 'emails:send-test';
    protected $description = 'Send test emails to Seller, Buyer, and Admin for verification';

    public function handle()
    {
        $sellerEmail = 'kurtapexlegends@gmail.com';
        $buyerEmail = 'kurtstanleytalastas@gmail.com';
        $adminEmail = 'likhangkamaybusiness@gmail.com';

        $this->info("Fetching or creating test data...");

        // Ensure we have an artisan seller
        $seller = User::where('role', 'artisan')->first();
        if (!$seller) {
            $this->info("No artisan seller found. Creating one...");
            $seller = User::create([
                'name' => 'Kurts Apex Legends Seller',
                'first_name' => 'Kurts',
                'last_name' => 'Legends',
                'email' => $sellerEmail,
                'password' => bcrypt('password'),
                'role' => 'artisan',
                'shop_name' => 'Apex Legends Pottery Shop',
                'shop_slug' => 'apex-legends-pottery',
                'artisan_status' => 'approved',
                'setup_completed_at' => now(),
                'approved_at' => now(),
            ]);
        }

        // Ensure we have a buyer
        $buyer = User::where('role', 'buyer')->first();
        if (!$buyer) {
            $this->info("No buyer found. Creating one...");
            $buyer = User::create([
                'name' => 'Kurt Stanley Talastas',
                'first_name' => 'Kurt',
                'last_name' => 'Talastas',
                'email' => $buyerEmail,
                'password' => bcrypt('password'),
                'role' => 'buyer',
            ]);
        }

        // Ensure we have a product
        $product = Product::first();
        if (!$product) {
            $this->info("No product found. Creating one...");
            $product = Product::create([
                'user_id' => $seller->id,
                'sku' => 'TEST-PROD-001',
                'name' => 'Handcrafted Clay Mug',
                'description' => 'A beautifully glazed clay mug made by local artisans.',
                'category' => 'Mugs',
                'status' => 'Active',
                'price' => 250.00,
                'cost_price' => 120.00,
                'stock' => 10,
                'sold' => 0,
                'lead_time' => 3,
                'cover_photo_path' => 'products/clay-mug.jpg',
            ]);
        }

        // Ensure we have an order
        $order = Order::with('items')->latest()->first();
        if (!$order) {
            $this->info("No orders found. Creating one...");
            $order = Order::create([
                'artisan_id' => $seller->id,
                'user_id' => $buyer->id,
                'order_number' => 'ORD-TEST-1001',
                'customer_name' => $buyer->name,
                'merchandise_subtotal' => 250.00,
                'total_amount' => 250.00,
                'status' => 'Accepted',
                'payment_method' => 'COD',
                'payment_status' => 'pending',
                'received_at' => null,
                'warranty_expires_at' => null,
                'shipping_address' => '456 Maginhawa St, Quezon City, Metro Manila',
                'shipping_method' => 'Delivery',
                'shipping_notes' => 'Please leave it at the gate if I am not home.',
            ]);

            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $product->id,
                'product_name' => $product->name,
                'price' => $product->price,
                'cost' => $product->cost_price,
                'quantity' => 1,
                'product_img' => $product->cover_photo_path,
            ]);
            
            // Reload order with items
            $order->load('items');
        }

        $this->info("Sending emails with 1-second delay between each to avoid Resend API rate limits...");

        // 1. Send to Seller (kurtapexlegends@gmail.com)
        $this->info("Sending to Seller: $sellerEmail");
        Mail::to($sellerEmail)->send(new OrderPlaced($order));
        sleep(1);
        Mail::to($sellerEmail)->send(new ReturnRequested($order));
        sleep(1);
        Mail::to($sellerEmail)->send(new ShipmentReminder($order));
        sleep(1);

        // 2. Send to Buyer (kurtstanleytalastas@gmail.com)
        $this->info("Sending to Buyer: $buyerEmail");
        Mail::to($buyerEmail)->send(new OrderAccepted($order));
        sleep(1);
        Mail::to($buyerEmail)->send(new OrderShipped($order));
        sleep(1);
        Mail::to($buyerEmail)->send(new OrderDelivered($order));
        sleep(1);
        Mail::to($buyerEmail)->send(new RefundProcessed($order));
        sleep(1);

        // 3. Send to Super Admin (likhangkamaybusiness@gmail.com)
        $this->info("Sending to Super Admin: $adminEmail");
        Mail::to($adminEmail)->send(new NewArtisanApplication($seller));
        sleep(1);
        Mail::to($sellerEmail)->send(new ArtisanApproved($seller));
        sleep(1);
        Mail::to($sellerEmail)->send(new ArtisanRejected($seller));

        $this->info("All test emails sent successfully!");
        return 0;
    }
}

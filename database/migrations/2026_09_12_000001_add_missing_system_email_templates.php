<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $now = now();

        $templates = [
            [
                'slug' => 'buyer_order_confirmation',
                'name' => 'Buyer Order Confirmation & Receipt',
                'subject' => 'Order Confirmation & Receipt #{order_number} - LikhangKamay',
                'headline' => 'Thank You For Supporting Local Artisans!',
                'body' => "Hello {user_name},\n\nYour order **#{order_number}** has been placed!\n\nOur artisan partners at **{shop_name}** are now preparing your handcrafted items.\n\nYou can track the progress of your order directly from your buyer account dashboard.",
                'button_label' => 'Track Your Order',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'artisan_application_received',
                'name' => 'Artisan Application Acknowledgment',
                'subject' => 'Application Received: Your Shop is in Review - LikhangKamay',
                'headline' => 'Application Received!',
                'body' => "Hello {user_name},\n\nThank you for applying to open **{shop_name}** on LikhangKamay!\n\nOur administrative curation team is currently reviewing your submitted verification documents. The standard review window is 24 to 48 hours.\n\nYou will receive an update as soon as your store is approved or if revisions are requested.",
                'button_label' => 'Track Application Status',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'payment_receipt',
                'name' => 'Online Payment Receipt',
                'subject' => 'Payment Receipt for Order #{order_number} - LikhangKamay',
                'headline' => 'Payment Successfully Processed',
                'body' => "Hello {user_name},\n\nYour online payment for Order **#{order_number}** has been successfully verified and secured via PayMongo.\n\nTotal Paid: {total_amount}\nPayment Reference: {payment_id}\n\nThe artisan has been notified to proceed with fulfillment.",
                'button_label' => 'View Order Receipt',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'subscription_billing_receipt',
                'name' => 'Subscription Billing Receipt',
                'subject' => 'Subscription Activated: {tier_label} Plan - LikhangKamay',
                'headline' => 'Subscription Confirmed',
                'body' => "Hello {user_name},\n\nYour subscription for **{shop_name}** has been activated on the **{tier_label}** plan.\n\nInvoice Reference: {reference_number}\nAmount Paid: {amount_paid}\n\nAll tools and quotas for your plan are now available in your Seller Workspace.",
                'button_label' => 'Open Seller Workspace',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'staff_welcome_invite',
                'name' => 'Staff Account Welcome & Invite',
                'subject' => 'Welcome to {shop_name} on LikhangKamay!',
                'headline' => 'Welcome to the Studio Team',
                'body' => "Hello {user_name},\n\nYou have been invited to join the studio team for **{shop_name}** as **{role_name}**.\n\nSign-in Email: {login_email}\nTemporary Password: {temporary_password}\n\nPlease sign in to your workspace and change your password to start your shift.",
                'button_label' => 'Sign In to Workspace',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        foreach ($templates as $template) {
            DB::table('email_templates')->updateOrInsert(
                ['slug' => $template['slug']],
                $template
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('email_templates')->whereIn('slug', [
            'buyer_order_confirmation',
            'artisan_application_received',
            'payment_receipt',
            'subscription_billing_receipt',
            'staff_welcome_invite',
        ])->delete();
    }
};

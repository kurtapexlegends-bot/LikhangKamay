<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('email_templates', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('subject');
            $table->string('headline')->nullable();
            $table->text('body');
            $table->string('button_label')->nullable();
            $table->string('button_url')->nullable();
            $table->string('category')->default('custom'); // 'system' or 'custom'
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Seed all 20 exact system templates
        $now = now();
        DB::table('email_templates')->insert([
            [
                'slug' => 'verify_email',
                'name' => 'Email Verification Code',
                'subject' => 'Verify Your Email - LikhangKamay',
                'headline' => 'Verify Your Email Address',
                'body' => "Welcome to LikhangKamay. Please enter the verification code below in the application to verify your email address and activate your account:\n\n# {verification_code}\n\nThis verification code will expire in 15 minutes.",
                'button_label' => 'Verify Email Address',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'reset_password',
                'name' => 'Password Reset Request',
                'subject' => 'Reset Your Password - LikhangKamay',
                'headline' => 'Reset Your Password',
                'body' => "Hello {user_name},\n\nWe received a request to reset your password for your LikhangKamay account.\n\nClick the button below to choose a new password:\n\nIf you did not request a password reset, no further action is required and your account remains safe.",
                'button_label' => 'Reset Password Now',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'artisan_approved',
                'name' => 'Artisan Account Approved',
                'subject' => 'Your LikhangKamay Seller Account is Approved!',
                'headline' => 'Congratulations! You\'re Approved!',
                'body' => "Hi {user_name},\n\nGreat news! Your seller account for **{shop_name}** has been verified and approved by our team.\n\nWhat\'s Next?\n- Access your Seller Dashboard\n- Add your first products\n- Start receiving orders from buyers\n- Manage your business with our ERP tools",
                'button_label' => 'Go to Dashboard',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'artisan_rejected',
                'name' => 'Artisan Application Rejected',
                'subject' => 'Update on Your LikhangKamay Seller Application',
                'headline' => 'Application Needs Attention',
                'body' => "Hi {user_name},\n\nThank you for applying to become a seller on LikhangKamay. Unfortunately, we could not approve your application at this time.\n\nReview Feedback:\n{rejection_reason}\n\nDon\'t worry! You can update your application and resubmit. Please address the feedback mentioned above and try again.",
                'button_label' => 'Update & Resubmit',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'artisan_new_application',
                'name' => 'New Artisan Application Received',
                'subject' => 'New Artisan Application Submitted',
                'headline' => 'New Artisan Application',
                'body' => "A new artisan has submitted their seller application and is waiting for review.\n\nArtisan Name: {user_name}\nShop Name: {shop_name}\n\nPlease review their submitted documentation in the Super Admin dashboard.",
                'button_label' => 'Review Application',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'product_moderation',
                'name' => 'Product Moderation Status Update',
                'subject' => 'Update on Your Product Submission - LikhangKamay',
                'headline' => 'Product Review Status',
                'body' => "Hello {user_name},\n\nOur marketplace curation team has reviewed your product listing **{product_name}**.\n\nFeedback Notes:\n{rejection_reason}\n\nYou can view and update your listing in your artisan workspace.",
                'button_label' => 'View Artisan Dashboard',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'sponsorship_status',
                'name' => 'Sponsorship Status Notice',
                'subject' => 'Update on Your Sponsorship Request - LikhangKamay',
                'headline' => 'Sponsorship Status Update',
                'body' => "Hello {user_name},\n\nWe have reviewed your sponsorship request for product **{product_name}**.\n\nFeedback:\n{rejection_reason}\n\nYou can manage your active and past sponsorships in your seller workspace.",
                'button_label' => 'Manage Sponsorships',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'low_stock',
                'name' => 'Low Stock Inventory Warning',
                'subject' => 'Low Stock Alert: Action Required',
                'headline' => 'Low Stock Alert',
                'body' => "Hello {user_name},\n\nYour product listing **{product_name}** is running low on stock.\n\nWe recommend replenishing your stock soon to ensure buyers can continue purchasing without interruption.",
                'button_label' => 'Update Inventory',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'order_placed',
                'name' => 'Order Confirmation & Receipt',
                'subject' => 'Order Confirmation & Receipt #{order_number} - LikhangKamay',
                'headline' => 'Thank You For Supporting Local Artisans!',
                'body' => "Hello {user_name},\n\nYour order **#{order_number}** has been placed!\n\nOur skilled artisans are preparing your handcrafted item for production and fulfillment.\n\nYou can track the progress of your order directly from your buyer account dashboard.",
                'button_label' => 'Track Your Order',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'order_accepted',
                'name' => 'Order Accepted by Artisan',
                'subject' => 'Order #{order_number} Accepted - Production Started!',
                'headline' => 'Your Order is Being Crafted!',
                'body' => "Hello {user_name},\n\nGreat news! The artisan has accepted your order **#{order_number}** and handcrafting is now underway.\n\nWe will notify you as soon as your items are packaged and ready for dispatch.",
                'button_label' => 'View Order Progress',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'order_shipped',
                'name' => 'Order Shipped Notice',
                'subject' => 'Order #{order_number} Has Been Shipped!',
                'headline' => 'Your Parcel is on the Way!',
                'body' => "Hello {user_name},\n\nYour order **#{order_number}** has been handed over to our delivery courier partner.\n\nTracking Reference: **{tracking_number}**\n\nPlease ensure someone is available at your shipping address to receive the parcel.",
                'button_label' => 'Track Live Shipment',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'order_delivered',
                'name' => 'Order Delivered Confirmation',
                'subject' => 'Order #{order_number} Delivered Successfully!',
                'headline' => 'Order Delivered',
                'body' => "Hello {user_name},\n\nYour order **#{order_number}** has been delivered to your address!\n\nWe hope you love your handcrafted creation. Please take a moment to leave a review for the artisan.",
                'button_label' => 'Leave a Review',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'order_cancelled',
                'name' => 'Order Cancelled Notice',
                'subject' => 'Order #{order_number} Has Been Cancelled',
                'headline' => 'Order Cancellation Notice',
                'body' => "Hello {user_name},\n\nOrder **#{order_number}** has been cancelled.\n\nIf you did not request this cancellation or have questions regarding refunds, please contact buyer support.",
                'button_label' => 'View Order History',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'refund_processed',
                'name' => 'Refund Processed Notice',
                'subject' => 'Refund Processed for Order #{order_number}',
                'headline' => 'Refund Authorized',
                'body' => "Hello {user_name},\n\nA refund of **₱{refund_amount}** for Order **#{order_number}** has been processed successfully to your original payment method.",
                'button_label' => 'View Account Activity',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'return_requested',
                'name' => 'Return Requested by Buyer',
                'subject' => 'Return Requested for Order #{order_number}',
                'headline' => 'Buyer Requested Return',
                'body' => "Hello,\n\nA buyer has requested a return for Order **#{order_number}**.\n\nPlease log into your seller workspace to inspect the request details and respond.",
                'button_label' => 'View Return Request',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'return_rejected',
                'name' => 'Return Request Rejected',
                'subject' => 'Update on Return Request for Order #{order_number}',
                'headline' => 'Return Request Decision',
                'body' => "Hello {user_name},\n\nYour return request for Order **#{order_number}** was reviewed and could not be approved at this time.\n\nReason:\n{rejection_reason}",
                'button_label' => 'View Order Details',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'dispute_escalated',
                'name' => 'Dispute Escalated Notice',
                'subject' => 'Dispute Escalated for Order #{order_number}',
                'headline' => 'Escalated Dispute Alert',
                'body' => "A dispute for Order **#{order_number}** has been escalated for arbitration review.\n\nPlease inspect the evidence submitted by both parties in the admin moderation panel.",
                'button_label' => 'Open Dispute Panel',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'dispute_arbitrated',
                'name' => 'Dispute Resolution Result',
                'subject' => 'Dispute Resolution Result for Order #{order_number}',
                'headline' => 'Dispute Arbitrated',
                'body' => "Hello {user_name},\n\nThe support team has completed arbitration for the dispute regarding Order **#{order_number}**.\n\nResolution Details:\n{rejection_reason}",
                'button_label' => 'View Dispute Summary',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'review_reminder',
                'name' => 'Product Review Reminder',
                'subject' => 'How was your handcrafted item from LikhangKamay?',
                'headline' => 'Share Your Feedback!',
                'body' => "Hello {user_name},\n\nYour recent order **#{order_number}** was delivered!\n\nTake a moment to leave a review and photo for your artisan to support their shop and help other local buyers.",
                'button_label' => 'Write a Review Now',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'shipment_reminder',
                'name' => 'Shipment Deadline Reminder',
                'subject' => 'Shipment Deadline Approaching for Order #{order_number}',
                'headline' => 'Shipment Deadline Reminder',
                'body' => "Hello Artisan,\n\nThis is a reminder that Order **#{order_number}** is scheduled for fulfillment soon.\n\nPlease dispatch your package and enter your shipping details to avoid automated order cancellation.",
                'button_label' => 'Fulfill Order Now',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_templates');
    }
};

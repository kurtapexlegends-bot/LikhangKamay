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

        // Seed default system templates
        $now = now();
        DB::table('email_templates')->insert([
            [
                'slug' => 'verify_email',
                'name' => 'Email Verification Code',
                'subject' => 'Verify Your Email Address - LikhangKamay',
                'headline' => 'Welcome to LikhangKamay!',
                'body' => "Hello {user_name},\n\nThank you for signing up on LikhangKamay, the Philippines' home for authentic handcrafted goods.\n\nYour 6-digit email verification code is:\n\n# {verification_code}\n\nThis code will expire in 15 minutes. Enter this code on the verification screen to activate your account.",
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
                'headline' => 'Password Reset Request',
                'body' => "Hello {user_name},\n\nWe received a request to reset your password for your LikhangKamay account.\n\nClick the button below to choose a new password:\n\nIf you did not request a password reset, no further action is required and your account remains safe.",
                'button_label' => 'Reset Password Now',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'order_receipt',
                'name' => 'Order Confirmation & Receipt',
                'subject' => 'Order Confirmation & Receipt #{order_number} - LikhangKamay',
                'headline' => 'Thank You For Supporting Local Artisans!',
                'body' => "Hello {user_name},\n\nYour order **#{order_number}** has been confirmed!\n\nOur skilled artisans are preparing your handcrafted item for production and fulfillment.\n\nYou can track the progress of your order directly from your buyer account dashboard.",
                'button_label' => 'Track Your Order',
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
                'body' => "Hello {user_name},\n\nOur marketplace curation team has reviewed your product submission.\n\nProduct Name: **{product_name}**\n\nIf you have any questions regarding quality standards or artisan guidelines, feel free to reach out to creator support.",
                'button_label' => 'View Artisan Dashboard',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'artisan_welcome',
                'name' => 'Artisan Onboarding Welcome',
                'subject' => 'Welcome to the LikhangKamay Artisan Community!',
                'headline' => 'Your Artisan Shop is Approved!',
                'body' => "Mabuhay {user_name},\n\nCongratulations! Your artisan shop **{shop_name}** has been approved for selling on LikhangKamay.\n\nYou can now log into your seller workspace to upload 3D model previews, add product listings, and set up your shop profile.",
                'button_label' => 'Open Seller Workspace',
                'button_url' => '{action_url}',
                'category' => 'system',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'platform_announcement',
                'name' => 'General Platform Announcement',
                'subject' => 'Important Announcement from LikhangKamay',
                'headline' => 'LikhangKamay Platform Update',
                'body' => "Hello {user_name},\n\nWe have exciting updates to share regarding the LikhangKamay marketplace platform!\n\nThank you for being a valued part of our growing community of Filipino creators and supporters.",
                'button_label' => 'Read Full Announcement',
                'button_url' => '{action_url}',
                'category' => 'custom',
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

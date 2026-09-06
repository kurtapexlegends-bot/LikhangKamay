<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            if (Schema::hasColumns('reviews', ['product_id', 'is_hidden_from_marketplace'])) {
                if (!Schema::hasIndex('reviews', ['product_id', 'is_hidden_from_marketplace']) &&
                    !Schema::hasIndex('reviews', 'reviews_product_id_is_hidden_from_marketplace_index')) {
                    $table->index(['product_id', 'is_hidden_from_marketplace']);
                }
            }
        });

        Schema::table('messages', function (Blueprint $table) {
            if (Schema::hasColumns('messages', ['receiver_id', 'is_read'])) {
                if (!Schema::hasIndex('messages', ['receiver_id', 'is_read']) &&
                    !Schema::hasIndex('messages', 'messages_receiver_id_is_read_index')) {
                    $table->index(['receiver_id', 'is_read']);
                }
            }

            if (Schema::hasColumns('messages', ['sender_id', 'receiver_id'])) {
                if (!Schema::hasIndex('messages', ['sender_id', 'receiver_id']) &&
                    !Schema::hasIndex('messages', 'messages_sender_id_receiver_id_index')) {
                    $table->index(['sender_id', 'receiver_id']);
                }
            }
        });

        Schema::table('user_notification_states', function (Blueprint $table) {
            if (Schema::hasColumns('user_notification_states', ['user_id', 'read_at'])) {
                if (!Schema::hasIndex('user_notification_states', ['user_id', 'read_at']) &&
                    !Schema::hasIndex('user_notification_states', 'user_notification_states_user_id_read_at_index')) {
                    $table->index(['user_id', 'read_at']);
                }
            }
        });

        Schema::table('order_items', function (Blueprint $table) {
            if (Schema::hasColumn('order_items', 'product_id')) {
                if (!Schema::hasIndex('order_items', ['product_id']) &&
                    !Schema::hasIndex('order_items', 'order_items_product_id_index')) {
                    $table->index('product_id');
                }
            }

            if (Schema::hasColumn('order_items', 'discount_id')) {
                if (!Schema::hasIndex('order_items', ['discount_id']) &&
                    !Schema::hasIndex('order_items', 'order_items_discount_id_index')) {
                    $table->index('discount_id');
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            if (Schema::hasIndex('reviews', 'reviews_product_id_is_hidden_from_marketplace_index') ||
                Schema::hasIndex('reviews', ['product_id', 'is_hidden_from_marketplace'])) {
                $table->dropIndex(['product_id', 'is_hidden_from_marketplace']);
            }
        });

        Schema::table('messages', function (Blueprint $table) {
            if (Schema::hasIndex('messages', 'messages_receiver_id_is_read_index') ||
                Schema::hasIndex('messages', ['receiver_id', 'is_read'])) {
                $table->dropIndex(['receiver_id', 'is_read']);
            }

            if (Schema::hasIndex('messages', 'messages_sender_id_receiver_id_index') ||
                Schema::hasIndex('messages', ['sender_id', 'receiver_id'])) {
                $table->dropIndex(['sender_id', 'receiver_id']);
            }
        });

        Schema::table('user_notification_states', function (Blueprint $table) {
            if (Schema::hasIndex('user_notification_states', 'user_notification_states_user_id_read_at_index') ||
                Schema::hasIndex('user_notification_states', ['user_id', 'read_at'])) {
                $table->dropIndex(['user_id', 'read_at']);
            }
        });

        Schema::table('order_items', function (Blueprint $table) {
            if (Schema::hasIndex('order_items', 'order_items_product_id_index')) {
                $table->dropIndex('order_items_product_id_index');
            }

            if (Schema::hasIndex('order_items', 'order_items_discount_id_index')) {
                $table->dropIndex('order_items_discount_id_index');
            }
        });
    }
};

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
        if (!Schema::hasTable('custom_commissions')) {
            Schema::create('custom_commissions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('artisan_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
                $table->string('commission_number', 40)->unique();
                $table->string('title', 255);
                $table->text('description')->nullable();
                $table->decimal('total_amount', 10, 2);
                $table->decimal('deposit_amount', 10, 2);
                $table->decimal('balance_amount', 10, 2);
                $table->decimal('deposit_percentage', 5, 2)->nullable();
                $table->string('status', 30)->default('awaiting_deposit')->index();
                $table->string('deposit_payment_method', 50)->nullable();
                $table->string('deposit_payment_id', 100)->nullable();
                $table->timestamp('deposit_paid_at')->nullable();
                $table->string('balance_payment_method', 50)->nullable();
                $table->string('balance_payment_id', 100)->nullable();
                $table->timestamp('balance_paid_at')->nullable();
                $table->string('paymongo_deposit_session_id', 100)->nullable();
                $table->string('paymongo_balance_session_id', 100)->nullable();
                $table->timestamp('cancelled_at')->nullable();
                $table->text('cancellation_reason')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        Schema::table('messages', function (Blueprint $table) {
            if (!Schema::hasColumn('messages', 'commission_id')) {
                $table->foreignId('commission_id')
                    ->nullable()
                    ->after('receiver_id')
                    ->constrained('custom_commissions')
                    ->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            if (Schema::hasColumn('messages', 'commission_id')) {
                $table->dropForeign(['commission_id']);
                $table->dropColumn('commission_id');
            }
        });

        Schema::dropIfExists('custom_commissions');
    }
};

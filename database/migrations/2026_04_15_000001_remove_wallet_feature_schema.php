<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                $columns = array_filter([
                    Schema::hasColumn('orders', 'wallet_settled_at') ? 'wallet_settled_at' : null,
                    Schema::hasColumn('orders', 'refunded_to_wallet_at') ? 'refunded_to_wallet_at' : null,
                ]);

                if (!empty($columns)) {
                    $table->dropColumn($columns);
                }
            });
        }

        Schema::dropIfExists('seller_wallet_withdrawal_requests');
        Schema::dropIfExists('wallet_top_ups');
        Schema::dropIfExists('wallet_transactions');
        Schema::dropIfExists('wallets');
    }

    public function down(): void
    {
        if (!Schema::hasTable('wallets')) {
            Schema::create('wallets', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
                $table->string('currency', 3)->default('PHP');
                $table->decimal('balance', 12, 2)->default(0);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('wallet_transactions')) {
            Schema::create('wallet_transactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('wallet_id')->constrained()->cascadeOnDelete();
                $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('counterparty_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->enum('direction', ['credit', 'debit']);
                $table->string('category', 100);
                $table->decimal('amount', 12, 2);
                $table->decimal('balance_after', 12, 2);
                $table->string('description')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('wallet_top_ups')) {
            Schema::create('wallet_top_ups', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('wallet_id')->nullable()->constrained()->nullOnDelete();
                $table->decimal('amount', 12, 2);
                $table->string('currency', 3)->default('PHP');
                $table->string('status')->default('pending');
                $table->string('reference_number')->unique();
                $table->string('paymongo_session_id')->nullable()->index();
                $table->timestamp('paid_at')->nullable();
                $table->timestamp('cancelled_at')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('seller_wallet_withdrawal_requests')) {
            Schema::create('seller_wallet_withdrawal_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('wallet_id')->constrained()->cascadeOnDelete();
                $table->foreignId('hold_transaction_id')->nullable()->constrained('wallet_transactions')->nullOnDelete();
                $table->foreignId('reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->decimal('amount', 12, 2);
                $table->string('currency', 10)->default('PHP');
                $table->string('status', 20)->default('pending');
                $table->string('note', 255)->nullable();
                $table->string('rejection_reason', 255)->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->timestamps();

                $table->index(['status', 'created_at']);
            });
        }

        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (!Schema::hasColumn('orders', 'wallet_settled_at')) {
                    $table->timestamp('wallet_settled_at')->nullable()->after('delivered_at');
                }

                if (!Schema::hasColumn('orders', 'refunded_to_wallet_at')) {
                    $table->timestamp('refunded_to_wallet_at')->nullable()->after('wallet_settled_at');
                }
            });
        }
    }
};

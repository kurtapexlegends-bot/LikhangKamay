<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscription_transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('subscription_transactions', 'user_id')) {
                $table->foreignId('user_id')->nullable()->after('id')->constrained()->nullOnDelete();
            }

            if (!Schema::hasColumn('subscription_transactions', 'from_plan')) {
                $table->string('from_plan')->nullable()->after('user_id');
            }

            if (!Schema::hasColumn('subscription_transactions', 'to_plan')) {
                $table->string('to_plan')->nullable()->after('from_plan');
            }

            if (!Schema::hasColumn('subscription_transactions', 'amount')) {
                $table->decimal('amount', 12, 2)->default(0)->after('to_plan');
            }

            if (!Schema::hasColumn('subscription_transactions', 'currency')) {
                $table->string('currency', 3)->default('PHP')->after('amount');
            }

            if (!Schema::hasColumn('subscription_transactions', 'status')) {
                $table->string('status')->default('pending')->after('currency');
            }

            if (!Schema::hasColumn('subscription_transactions', 'reference_number')) {
                $table->string('reference_number')->nullable()->unique()->after('status');
            }

            if (!Schema::hasColumn('subscription_transactions', 'paymongo_session_id')) {
                $table->string('paymongo_session_id')->nullable()->index()->after('reference_number');
            }

            if (!Schema::hasColumn('subscription_transactions', 'paid_at')) {
                $table->timestamp('paid_at')->nullable()->after('paymongo_session_id');
            }

            if (!Schema::hasColumn('subscription_transactions', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('paid_at');
            }

            if (!Schema::hasColumn('subscription_transactions', 'metadata')) {
                $table->json('metadata')->nullable()->after('cancelled_at');
            }
        });

        if (
            Schema::hasColumn('subscription_transactions', 'artisan_id')
            && Schema::hasColumn('subscription_transactions', 'user_id')
        ) {
            DB::table('subscription_transactions')
                ->whereNull('user_id')
                ->update([
                    'user_id' => DB::raw('artisan_id'),
                ]);
        }

        if (
            Schema::hasColumn('subscription_transactions', 'tier_purchased')
            && Schema::hasColumn('subscription_transactions', 'to_plan')
        ) {
            DB::table('subscription_transactions')
                ->whereNull('to_plan')
                ->update([
                    'to_plan' => DB::raw('tier_purchased'),
                ]);
        }

        if (
            Schema::hasColumn('subscription_transactions', 'amount_paid')
            && Schema::hasColumn('subscription_transactions', 'amount')
        ) {
            DB::table('subscription_transactions')
                ->where('amount', 0)
                ->update([
                    'amount' => DB::raw('amount_paid'),
                ]);
        }

        if (Schema::hasColumn('subscription_transactions', 'status')) {
            DB::table('subscription_transactions')
                ->whereNull('status')
                ->update([
                    'status' => 'paid',
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('subscription_transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn([
                'from_plan',
                'to_plan',
                'amount',
                'currency',
                'status',
                'reference_number',
                'paymongo_session_id',
                'paid_at',
                'cancelled_at',
                'metadata',
            ]);
        });
    }
};

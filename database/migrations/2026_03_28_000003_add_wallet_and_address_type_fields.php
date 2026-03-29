<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('merchandise_subtotal', 12, 2)->default(0)->after('customer_name');
            $table->decimal('convenience_fee_amount', 12, 2)->default(0)->after('merchandise_subtotal');
            $table->decimal('platform_commission_amount', 12, 2)->default(0)->after('convenience_fee_amount');
            $table->decimal('seller_net_amount', 12, 2)->default(0)->after('platform_commission_amount');
            $table->string('shipping_address_type', 20)->nullable()->after('shipping_address');
            $table->timestamp('wallet_settled_at')->nullable()->after('delivered_at');
            $table->timestamp('refunded_to_wallet_at')->nullable()->after('wallet_settled_at');
        });

        Schema::table('user_addresses', function (Blueprint $table) {
            $table->string('address_type', 20)->default('home')->after('label');
        });

        DB::table('orders')
            ->update([
                'merchandise_subtotal' => DB::raw('total_amount'),
                'convenience_fee_amount' => 0,
                'platform_commission_amount' => 0,
                'seller_net_amount' => DB::raw('total_amount'),
            ]);

        DB::table('user_addresses')->orderBy('id')->get()->each(function ($address) {
            $label = mb_strtolower(trim((string) $address->label));

            $addressType = match ($label) {
                'home' => 'home',
                'office', 'work' => 'office',
                default => 'other',
            };

            DB::table('user_addresses')
                ->where('id', $address->id)
                ->update(['address_type' => $addressType]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_addresses', function (Blueprint $table) {
            $table->dropColumn('address_type');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'merchandise_subtotal',
                'convenience_fee_amount',
                'platform_commission_amount',
                'seller_net_amount',
                'shipping_address_type',
                'wallet_settled_at',
                'refunded_to_wallet_at',
            ]);
        });
    }
};

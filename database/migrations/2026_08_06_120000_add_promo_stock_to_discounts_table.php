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
        Schema::table('discounts', function (Blueprint $table) {
            $table->unsignedInteger('promo_stock')->nullable()->after('value');
            $table->unsignedInteger('promo_sold')->default(0)->after('promo_stock');
            $table->unsignedInteger('max_purchase_limit')->nullable()->after('promo_sold');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('discounts', function (Blueprint $table) {
            $table->dropColumn(['promo_stock', 'promo_sold', 'max_purchase_limit']);
        });
    }
};

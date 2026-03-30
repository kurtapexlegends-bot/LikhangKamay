<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('shipping_recipient_name')->nullable()->after('shipping_address_type');
            $table->string('shipping_contact_phone', 30)->nullable()->after('shipping_recipient_name');
            $table->timestamp('cancelled_at')->nullable()->after('delivered_at');
            $table->string('cancellation_reason')->nullable()->after('cancelled_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'shipping_recipient_name',
                'shipping_contact_phone',
                'cancelled_at',
                'cancellation_reason',
            ]);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->boolean('was_sponsored')->default(false)->after('cost');
            $table->foreignId('sponsorship_request_id')->nullable()->after('was_sponsored')->constrained()->nullOnDelete();
            $table->timestamp('sponsored_at_checkout')->nullable()->after('sponsorship_request_id');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sponsorship_request_id');
            $table->dropColumn(['was_sponsored', 'sponsored_at_checkout']);
        });
    }
};

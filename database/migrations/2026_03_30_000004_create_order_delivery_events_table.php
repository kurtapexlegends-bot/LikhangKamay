<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_delivery_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_delivery_id')->nullable()->constrained('order_deliveries')->nullOnDelete();
            $table->string('provider')->default('lalamove');
            $table->string('event_key')->unique();
            $table->string('event_type')->nullable();
            $table->string('external_order_id')->nullable();
            $table->json('payload');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_delivery_events');
    }
};

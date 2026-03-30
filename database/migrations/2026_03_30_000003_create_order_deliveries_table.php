<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete()->unique();
            $table->string('provider')->default('lalamove');
            $table->string('status')->nullable();
            $table->string('service_type')->nullable();
            $table->string('quotation_id')->nullable();
            $table->string('external_order_id')->nullable()->unique();
            $table->string('request_id')->nullable();
            $table->text('share_link')->nullable();
            $table->string('price_currency', 10)->nullable();
            $table->decimal('price_total', 12, 2)->nullable();
            $table->json('price_breakdown')->nullable();
            $table->json('quotation_payload')->nullable();
            $table->json('order_payload')->nullable();
            $table->json('latest_payload')->nullable();
            $table->string('last_webhook_type')->nullable();
            $table->timestamp('last_webhook_received_at')->nullable();
            $table->timestamp('terminal_failed_at')->nullable();
            $table->timestamp('auto_cancelled_at')->nullable();
            $table->text('failure_reason')->nullable();
            $table->boolean('is_pod_enabled')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_deliveries');
    }
};

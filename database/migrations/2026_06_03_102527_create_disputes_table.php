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
        Schema::create('disputes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->string('status')->default('pending'); // pending, seller_accepted, seller_rejected, seller_proposed_replacement, escalated, resolved_refunded, resolved_rejected, resolved_replacement
            $table->text('reason');
            $table->json('proof_photos'); // Array of file paths
            $table->string('seller_response_type')->nullable(); // refund, replacement, reject
            $table->text('seller_explanation')->nullable();
            $table->text('seller_proposed_description')->nullable();
            $table->text('escalation_reason')->nullable();
            $table->text('admin_notes')->nullable();
            $table->string('admin_decision')->nullable(); // refund, reject
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('disputes');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sponsorship_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sponsorship_request_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('viewer_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('session_id', 120)->nullable();
            $table->string('placement', 50);
            $table->string('event_type', 20);
            $table->string('event_key')->unique();
            $table->date('event_date');
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['seller_id', 'event_type', 'event_date']);
            $table->index(['product_id', 'event_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sponsorship_events');
    }
};

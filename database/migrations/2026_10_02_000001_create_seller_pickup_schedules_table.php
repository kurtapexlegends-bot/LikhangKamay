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
        if (!Schema::hasTable('seller_pickup_schedules')) {
            Schema::create('seller_pickup_schedules', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
                $table->boolean('is_enabled')->default(true);
                $table->json('operating_days')->nullable();
                $table->json('time_slots')->nullable();
                $table->foreignId('pickup_location_id')->nullable()->constrained('seller_locations')->nullOnDelete();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seller_pickup_schedules');
    }
};

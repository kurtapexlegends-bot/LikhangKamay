<?php

declare(strict_types=1);

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
        Schema::create('seller_analytics_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->date('snapshot_date');
            $table->decimal('revenue', 15, 2)->default(0.00);
            $table->decimal('cost', 15, 2)->default(0.00);
            $table->integer('orders_count')->default(0);
            $table->timestamps();

            $table->unique(['seller_id', 'snapshot_date']);
            $table->index('snapshot_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seller_analytics_snapshots');
    }
};

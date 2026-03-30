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
        if (!Schema::hasColumn('supplies', 'product_id')) {
            Schema::table('supplies', function (Blueprint $table) {
                $table->foreignId('product_id')
                    ->nullable()
                    ->constrained()
                    ->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('supplies', 'product_id')) {
            Schema::table('supplies', function (Blueprint $table) {
                $table->dropConstrainedForeignId('product_id');
            });
        }
    }
};

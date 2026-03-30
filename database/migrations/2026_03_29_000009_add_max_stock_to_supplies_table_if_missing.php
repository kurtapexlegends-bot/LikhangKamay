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
        if (!Schema::hasColumn('supplies', 'max_stock')) {
            Schema::table('supplies', function (Blueprint $table) {
                $table->integer('max_stock')->default(500);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('supplies', 'max_stock')) {
            Schema::table('supplies', function (Blueprint $table) {
                $table->dropColumn('max_stock');
            });
        }
    }
};

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
        Schema::table('users', function (Blueprint $table) {
            $table->index('banned_at');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->index('is_sponsored');
            $table->index('sponsored_until');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['banned_at']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['is_sponsored']);
            $table->dropIndex(['sponsored_until']);
        });
    }
};

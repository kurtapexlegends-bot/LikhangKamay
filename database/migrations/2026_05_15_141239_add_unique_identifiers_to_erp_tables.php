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
        Schema::table('employees', function (Blueprint $table) {
            $table->string('employee_id')->nullable()->after('user_id');
            $table->index(['user_id', 'employee_id']);
        });

        Schema::table('supplies', function (Blueprint $table) {
            $table->string('sku')->nullable()->after('user_id');
            $table->index(['user_id', 'sku']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('employee_id');
        });

        Schema::table('supplies', function (Blueprint $table) {
            $table->dropColumn('sku');
        });
    }
};

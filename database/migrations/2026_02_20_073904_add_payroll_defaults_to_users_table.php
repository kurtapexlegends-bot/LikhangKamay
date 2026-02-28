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
            if (!Schema::hasColumn('users', 'overtime_rate')) {
                $table->decimal('overtime_rate', 8, 2)->default(50.00)->comment('Fixed Hourly OT Rate');
            }
            $table->integer('payroll_working_days')->default(22)->comment('Standard working days in a month');
            $table->decimal('default_absences', 5, 2)->default(0);
            $table->decimal('default_undertime', 5, 2)->default(0);
            $table->decimal('default_overtime', 5, 2)->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['payroll_working_days', 'default_absences', 'default_undertime', 'default_overtime']);
        });
    }
};

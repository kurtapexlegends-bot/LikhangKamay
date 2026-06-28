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
        if (!Schema::hasColumn('payroll_items', 'deductions')) {
            Schema::table('payroll_items', function (Blueprint $table) {
                $table->decimal('deductions', 15, 2)->default(0.00)->nullable();
            });
        }

        if (!Schema::hasColumn('payroll_items', 'bonus')) {
            Schema::table('payroll_items', function (Blueprint $table) {
                $table->decimal('bonus', 15, 2)->default(0.00)->nullable();
            });
        }

        if (!Schema::hasColumn('payroll_items', 'absences_days')) {
            Schema::table('payroll_items', function (Blueprint $table) {
                $table->integer('absences_days')->default(0)->nullable();
            });
        }

        if (!Schema::hasColumn('payroll_items', 'undertime_hours')) {
            Schema::table('payroll_items', function (Blueprint $table) {
                $table->integer('undertime_hours')->default(0)->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payroll_items', function (Blueprint $table) {
            if (Schema::hasColumn('payroll_items', 'deductions')) {
                $table->dropColumn('deductions');
            }
            if (Schema::hasColumn('payroll_items', 'bonus')) {
                $table->dropColumn('bonus');
            }
            if (Schema::hasColumn('payroll_items', 'absences_days')) {
                $table->dropColumn('absences_days');
            }
            if (Schema::hasColumn('payroll_items', 'undertime_hours')) {
                $table->dropColumn('undertime_hours');
            }
        });
    }
};

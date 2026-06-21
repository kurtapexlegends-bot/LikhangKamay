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
            $table->string('payroll_factor_method')->default('custom')->after('overtime_multiplier');
            $table->decimal('rest_day_ot_multiplier', 8, 2)->default(1.69)->after('payroll_factor_method');
            $table->decimal('holiday_ot_multiplier', 8, 2)->default(2.60)->after('rest_day_ot_multiplier');
        });

        Schema::table('payroll_items', function (Blueprint $table) {
            $table->decimal('rest_day_ot_hours', 8, 2)->default(0)->after('overtime_pay');
            $table->decimal('rest_day_ot_pay', 10, 2)->default(0)->after('rest_day_ot_hours');
            $table->decimal('holiday_ot_hours', 8, 2)->default(0)->after('rest_day_ot_pay');
            $table->decimal('holiday_ot_pay', 10, 2)->default(0)->after('holiday_ot_hours');
            $table->decimal('paid_leave_days', 8, 2)->default(0)->after('holiday_ot_pay');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['payroll_factor_method', 'rest_day_ot_multiplier', 'holiday_ot_multiplier']);
        });

        Schema::table('payroll_items', function (Blueprint $table) {
            $table->dropColumn(['rest_day_ot_hours', 'rest_day_ot_pay', 'holiday_ot_hours', 'holiday_ot_pay', 'paid_leave_days']);
        });
    }
};

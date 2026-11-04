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
            if (!Schema::hasColumn('users', 'enable_statutory_deductions')) {
                $table->boolean('enable_statutory_deductions')->default(false)->after('payroll_factor_method');
            }
        });

        Schema::table('payroll_items', function (Blueprint $table) {
            if (!Schema::hasColumn('payroll_items', 'gross_pay')) {
                $table->decimal('gross_pay', 10, 2)->nullable()->after('holiday_ot_pay');
            }
            if (!Schema::hasColumn('payroll_items', 'taxable_income')) {
                $table->decimal('taxable_income', 10, 2)->nullable()->after('gross_pay');
            }
            if (!Schema::hasColumn('payroll_items', 'sss_ee')) {
                $table->decimal('sss_ee', 10, 2)->nullable()->after('taxable_income');
            }
            if (!Schema::hasColumn('payroll_items', 'sss_er')) {
                $table->decimal('sss_er', 10, 2)->nullable()->after('sss_ee');
            }
            if (!Schema::hasColumn('payroll_items', 'philhealth_ee')) {
                $table->decimal('philhealth_ee', 10, 2)->nullable()->after('sss_er');
            }
            if (!Schema::hasColumn('payroll_items', 'philhealth_er')) {
                $table->decimal('philhealth_er', 10, 2)->nullable()->after('philhealth_ee');
            }
            if (!Schema::hasColumn('payroll_items', 'pagibig_ee')) {
                $table->decimal('pagibig_ee', 10, 2)->nullable()->after('philhealth_er');
            }
            if (!Schema::hasColumn('payroll_items', 'pagibig_er')) {
                $table->decimal('pagibig_er', 10, 2)->nullable()->after('pagibig_ee');
            }
            if (!Schema::hasColumn('payroll_items', 'withholding_tax')) {
                $table->decimal('withholding_tax', 10, 2)->nullable()->after('pagibig_er');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'enable_statutory_deductions')) {
                $table->dropColumn('enable_statutory_deductions');
            }
        });

        Schema::table('payroll_items', function (Blueprint $table) {
            $columnsToDrop = array_filter([
                Schema::hasColumn('payroll_items', 'withholding_tax') ? 'withholding_tax' : null,
                Schema::hasColumn('payroll_items', 'pagibig_er') ? 'pagibig_er' : null,
                Schema::hasColumn('payroll_items', 'pagibig_ee') ? 'pagibig_ee' : null,
                Schema::hasColumn('payroll_items', 'philhealth_er') ? 'philhealth_er' : null,
                Schema::hasColumn('payroll_items', 'philhealth_ee') ? 'philhealth_ee' : null,
                Schema::hasColumn('payroll_items', 'sss_er') ? 'sss_er' : null,
                Schema::hasColumn('payroll_items', 'sss_ee') ? 'sss_ee' : null,
                Schema::hasColumn('payroll_items', 'taxable_income') ? 'taxable_income' : null,
                Schema::hasColumn('payroll_items', 'gross_pay') ? 'gross_pay' : null,
            ]);

            if (!empty($columnsToDrop)) {
                $table->dropColumn(array_values($columnsToDrop));
            }
        });
    }
};

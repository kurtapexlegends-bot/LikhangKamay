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
        if (Schema::hasTable('users') && !Schema::hasColumn('users', 'deleted_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->softDeletes();
            });
        }

        if (Schema::hasTable('payrolls') && !Schema::hasColumn('payrolls', 'deleted_at')) {
            Schema::table('payrolls', function (Blueprint $table) {
                $table->softDeletes();
            });
        }

        if (Schema::hasTable('payroll_items') && !Schema::hasColumn('payroll_items', 'deleted_at')) {
            Schema::table('payroll_items', function (Blueprint $table) {
                $table->softDeletes();
            });
        }

        if (Schema::hasTable('reviews') && !Schema::hasColumn('reviews', 'deleted_at')) {
            Schema::table('reviews', function (Blueprint $table) {
                $table->softDeletes();
            });
        }

        if (Schema::hasTable('review_disputes') && !Schema::hasColumn('review_disputes', 'deleted_at')) {
            Schema::table('review_disputes', function (Blueprint $table) {
                $table->softDeletes();
            });
        }

        if (Schema::hasTable('seller_locations') && !Schema::hasColumn('seller_locations', 'deleted_at')) {
            Schema::table('seller_locations', function (Blueprint $table) {
                $table->softDeletes();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('seller_locations') && Schema::hasColumn('seller_locations', 'deleted_at')) {
            Schema::table('seller_locations', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }

        if (Schema::hasTable('review_disputes') && Schema::hasColumn('review_disputes', 'deleted_at')) {
            Schema::table('review_disputes', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }

        if (Schema::hasTable('reviews') && Schema::hasColumn('reviews', 'deleted_at')) {
            Schema::table('reviews', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }

        if (Schema::hasTable('payroll_items') && Schema::hasColumn('payroll_items', 'deleted_at')) {
            Schema::table('payroll_items', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }

        if (Schema::hasTable('payrolls') && Schema::hasColumn('payrolls', 'deleted_at')) {
            Schema::table('payrolls', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }

        if (Schema::hasTable('users') && Schema::hasColumn('users', 'deleted_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }
    }
};

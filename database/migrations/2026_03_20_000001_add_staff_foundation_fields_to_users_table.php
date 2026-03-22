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
            $table->foreignId('seller_owner_id')
                ->nullable()
                ->after('role')
                ->constrained('users')
                ->nullOnDelete();
            $table->string('staff_role_preset_key')
                ->nullable()
                ->after('seller_owner_id');
            $table->json('staff_module_permissions')
                ->nullable()
                ->after('staff_role_preset_key');
            $table->boolean('must_change_password')
                ->default(false)
                ->after('staff_module_permissions');
            $table->foreignId('created_by_user_id')
                ->nullable()
                ->after('must_change_password')
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignId('employee_id')
                ->nullable()
                ->after('created_by_user_id')
                ->constrained('employees')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('employee_id');
            $table->dropConstrainedForeignId('created_by_user_id');
            $table->dropColumn('must_change_password');
            $table->dropColumn('staff_module_permissions');
            $table->dropColumn('staff_role_preset_key');
            $table->dropConstrainedForeignId('seller_owner_id');
        });
    }
};

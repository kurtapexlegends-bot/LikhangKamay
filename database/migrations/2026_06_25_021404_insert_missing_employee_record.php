<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Insert missing employee ID 9 if not exists to restore referential integrity.
        // We check if User ID 4 exists first to avoid FOREIGN KEY constraint issues during unit testing.
        if (DB::table('users')->where('id', 4)->exists() && !DB::table('employees')->where('id', 9)->exists()) {
            DB::table('employees')->insert([
                'id' => 9,
                'user_id' => 4, // Kurt Shop (Seller Owner)
                'employee_id' => 'EMP-0009',
                'name' => 'Yashica Kashmir Acosta',
                'role' => 'Shop Manager',
                'salary' => 100000.00,
                'status' => 'Active',
                'join_date' => '2026-03-29',
                'created_at' => '2026-03-29 07:31:31',
                'updated_at' => '2026-03-29 07:31:31',
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('employees')->where('id', 9)->delete();
    }
};

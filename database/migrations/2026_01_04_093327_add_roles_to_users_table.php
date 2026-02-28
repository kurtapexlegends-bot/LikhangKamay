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
            // 'buyer', 'artisan', 'admin'
            $table->string('role')->default('buyer')->after('email'); 
            
            // Only for Artisans (Nullable because buyers don't have shops)
            $table->string('shop_name')->nullable()->after('role'); 
            
            // For Admin approval later (Optional but good for Capstone)
            $table->boolean('is_verified')->default(false)->after('shop_name'); 
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            //
        });
    }
};

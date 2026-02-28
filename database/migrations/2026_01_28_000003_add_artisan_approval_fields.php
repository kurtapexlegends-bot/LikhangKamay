<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Artisan approval workflow
            $table->enum('artisan_status', ['pending', 'approved', 'rejected'])->default('pending')->after('is_verified');
            $table->text('artisan_rejection_reason')->nullable()->after('artisan_status');
            $table->timestamp('approved_at')->nullable()->after('artisan_rejection_reason');
            $table->foreignId('approved_by')->nullable()->after('approved_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['approved_by']);
            $table->dropColumn(['artisan_status', 'artisan_rejection_reason', 'approved_at', 'approved_by']);
        });
    }
};

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
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'auto_complete_at')) {
                $table->timestamp('auto_complete_at')->nullable()->after('status');
                $table->index('auto_complete_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'auto_complete_at')) {
                $table->dropIndex(['auto_complete_at']);
                $table->dropColumn('auto_complete_at');
            }
        });
    }
};

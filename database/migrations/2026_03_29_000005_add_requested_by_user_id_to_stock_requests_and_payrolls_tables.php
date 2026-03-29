<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_requests', function (Blueprint $table) {
            $table->foreignId('requested_by_user_id')
                ->nullable()
                ->after('user_id')
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::table('payrolls', function (Blueprint $table) {
            $table->foreignId('requested_by_user_id')
                ->nullable()
                ->after('user_id')
                ->constrained('users')
                ->nullOnDelete();
        });

        DB::table('stock_requests')
            ->whereNull('requested_by_user_id')
            ->update([
                'requested_by_user_id' => DB::raw('user_id'),
            ]);

        DB::table('payrolls')
            ->whereNull('requested_by_user_id')
            ->update([
                'requested_by_user_id' => DB::raw('user_id'),
            ]);
    }

    public function down(): void
    {
        Schema::table('stock_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('requested_by_user_id');
        });

        Schema::table('payrolls', function (Blueprint $table) {
            $table->dropConstrainedForeignId('requested_by_user_id');
        });
    }
};

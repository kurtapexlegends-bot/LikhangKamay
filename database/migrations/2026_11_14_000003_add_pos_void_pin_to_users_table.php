<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'pos_void_pin') || !Schema::hasColumn('users', 'pos_void_pin_updated_at')) {
            Schema::table('users', function (Blueprint $table) {
                if (!Schema::hasColumn('users', 'pos_void_pin')) {
                    $table->string('pos_void_pin', 255)->nullable()->after('password');
                }

                if (!Schema::hasColumn('users', 'pos_void_pin_updated_at')) {
                    $table->timestamp('pos_void_pin_updated_at')->nullable()->after('pos_void_pin');
                }
            });
        }
    }

    public function down(): void
    {
        $columnsToDrop = array_values(array_filter(
            ['pos_void_pin_updated_at', 'pos_void_pin'],
            fn (string $col) => Schema::hasColumn('users', $col)
        ));

        if (!empty($columnsToDrop)) {
            Schema::table('users', function (Blueprint $table) use ($columnsToDrop) {
                $table->dropColumn($columnsToDrop);
            });
        }
    }
};

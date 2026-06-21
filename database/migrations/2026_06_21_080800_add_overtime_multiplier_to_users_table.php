<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('overtime_multiplier', 8, 2)
                ->default(1.25)
                ->after('overtime_rate')
                ->comment('Overtime hourly rate multiplier');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('overtime_multiplier');
        });
    }
};

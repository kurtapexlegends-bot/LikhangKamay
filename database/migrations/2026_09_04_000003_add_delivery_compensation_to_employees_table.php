<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (!Schema::hasColumn('employees', 'delivery_compensation_type')) {
                $table->string('delivery_compensation_type')->nullable()->default('salary')->after('salary');
            }
            if (!Schema::hasColumn('employees', 'delivery_fee_rate')) {
                $table->decimal('delivery_fee_rate', 10, 2)->nullable()->default(0)->after('delivery_compensation_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $columnsToDrop = ['delivery_compensation_type', 'delivery_fee_rate'];
            foreach ($columnsToDrop as $col) {
                if (Schema::hasColumn('employees', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};

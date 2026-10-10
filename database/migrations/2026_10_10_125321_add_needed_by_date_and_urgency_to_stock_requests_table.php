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
        Schema::table('stock_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('stock_requests', 'needed_by_date')) {
                $table->date('needed_by_date')->nullable()->after('quantity');
            }
            if (!Schema::hasColumn('stock_requests', 'urgency_level')) {
                $table->string('urgency_level', 20)->default('routine')->after('needed_by_date');
            }
            if (!Schema::hasColumn('stock_requests', 'notes')) {
                $table->text('notes')->nullable()->after('urgency_level');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_requests', function (Blueprint $table) {
            $dropColumns = [];
            if (Schema::hasColumn('stock_requests', 'notes')) {
                $dropColumns[] = 'notes';
            }
            if (Schema::hasColumn('stock_requests', 'urgency_level')) {
                $dropColumns[] = 'urgency_level';
            }
            if (Schema::hasColumn('stock_requests', 'needed_by_date')) {
                $dropColumns[] = 'needed_by_date';
            }
            if (!empty($dropColumns)) {
                $table->dropColumn($dropColumns);
            }
        });
    }
};

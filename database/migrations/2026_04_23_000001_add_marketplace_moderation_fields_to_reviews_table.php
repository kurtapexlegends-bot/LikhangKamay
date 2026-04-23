<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('reviews')) {
            return;
        }

        Schema::table('reviews', function (Blueprint $table) {
            if (!Schema::hasColumn('reviews', 'is_hidden_from_marketplace')) {
                $table->boolean('is_hidden_from_marketplace')->default(false)->after('is_pinned');
            }

            if (!Schema::hasColumn('reviews', 'hidden_at')) {
                $table->timestamp('hidden_at')->nullable()->after('is_hidden_from_marketplace');
            }

            if (!Schema::hasColumn('reviews', 'hidden_by')) {
                $table->foreignId('hidden_by')->nullable()->after('hidden_at')->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('reviews')) {
            return;
        }

        Schema::table('reviews', function (Blueprint $table) {
            if (Schema::hasColumn('reviews', 'hidden_by')) {
                try {
                    $table->dropConstrainedForeignId('hidden_by');
                } catch (\Throwable) {
                    $table->dropColumn('hidden_by');
                }
            }

            $columnsToDrop = array_values(array_filter([
                Schema::hasColumn('reviews', 'hidden_at') ? 'hidden_at' : null,
                Schema::hasColumn('reviews', 'is_hidden_from_marketplace') ? 'is_hidden_from_marketplace' : null,
            ]));

            if ($columnsToDrop !== []) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};

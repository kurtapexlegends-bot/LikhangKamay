<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('review_disputes')) {
            return;
        }

        Schema::table('review_disputes', function (Blueprint $table) {
            if (!Schema::hasColumn('review_disputes', 'review_id')) {
                $table->foreignId('review_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            }

            if (!Schema::hasColumn('review_disputes', 'seller_owner_id')) {
                $table->foreignId('seller_owner_id')->nullable()->after('review_id')->constrained('users')->nullOnDelete();
            }

            if (!Schema::hasColumn('review_disputes', 'reported_by_user_id')) {
                $table->foreignId('reported_by_user_id')->nullable()->after('seller_owner_id')->constrained('users')->nullOnDelete();
            }

            if (!Schema::hasColumn('review_disputes', 'status')) {
                $table->string('status')->default('pending')->after('reported_by_user_id');
            }

            if (!Schema::hasColumn('review_disputes', 'reason')) {
                $table->string('reason')->nullable()->after('status');
            }

            if (!Schema::hasColumn('review_disputes', 'details')) {
                $table->text('details')->nullable()->after('reason');
            }

            if (!Schema::hasColumn('review_disputes', 'resolved_at')) {
                $table->timestamp('resolved_at')->nullable()->after('details');
            }

            if (!Schema::hasColumn('review_disputes', 'resolution_notes')) {
                $table->text('resolution_notes')->nullable()->after('resolved_at');
            }
        });

        if (Schema::hasColumn('review_disputes', 'seller_id') && Schema::hasColumn('review_disputes', 'seller_owner_id')) {
            DB::table('review_disputes')
                ->whereNull('seller_owner_id')
                ->update(['seller_owner_id' => DB::raw('seller_id')]);
        }

        if (Schema::hasColumn('review_disputes', 'explanation') && Schema::hasColumn('review_disputes', 'details')) {
            DB::table('review_disputes')
                ->whereNull('details')
                ->update(['details' => DB::raw('explanation')]);
        }

        try {
            Schema::table('review_disputes', function (Blueprint $table) {
                if (Schema::hasColumn('review_disputes', 'seller_owner_id') && Schema::hasColumn('review_disputes', 'status')) {
                    $table->index(['seller_owner_id', 'status']);
                }
            });
        } catch (\Throwable) {
            // Index may already exist on databases that were manually adjusted.
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('review_disputes')) {
            return;
        }

        Schema::table('review_disputes', function (Blueprint $table) {
            try {
                $table->dropIndex(['seller_owner_id', 'status']);
            } catch (\Throwable) {
                // Ignore missing indexes.
            }

            if (Schema::hasColumn('review_disputes', 'reported_by_user_id')) {
                try {
                    $table->dropConstrainedForeignId('reported_by_user_id');
                } catch (\Throwable) {
                    $table->dropColumn('reported_by_user_id');
                }
            }

            if (Schema::hasColumn('review_disputes', 'seller_owner_id')) {
                try {
                    $table->dropConstrainedForeignId('seller_owner_id');
                } catch (\Throwable) {
                    $table->dropColumn('seller_owner_id');
                }
            }

            $columnsToDrop = array_values(array_filter([
                Schema::hasColumn('review_disputes', 'details') ? 'details' : null,
                Schema::hasColumn('review_disputes', 'resolved_at') ? 'resolved_at' : null,
                Schema::hasColumn('review_disputes', 'resolution_notes') ? 'resolution_notes' : null,
            ]));

            if ($columnsToDrop !== []) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};

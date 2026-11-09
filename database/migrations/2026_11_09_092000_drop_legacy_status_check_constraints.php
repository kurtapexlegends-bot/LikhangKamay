<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            // Drop legacy enum check constraints from initial migrations on PostgreSQL
            if (Schema::hasTable('stock_requests')) {
                DB::statement('ALTER TABLE stock_requests DROP CONSTRAINT IF EXISTS stock_requests_status_check;');
            }
            if (Schema::hasTable('sponsorship_requests')) {
                DB::statement('ALTER TABLE sponsorship_requests DROP CONSTRAINT IF EXISTS sponsorship_requests_status_check;');
            }

            // Also dynamically drop any check constraint on status column of these two tables
            DB::statement("
                DO $$
                DECLARE
                    r RECORD;
                BEGIN
                    FOR r IN (
                        SELECT conname, relname
                        FROM pg_constraint c
                        JOIN pg_class t ON c.conrelid = t.oid
                        WHERE t.relname IN ('stock_requests', 'sponsorship_requests')
                          AND c.contype = 'c'
                          AND (conname LIKE '%status%' OR pg_get_constraintdef(c.oid) LIKE '%status%')
                    ) LOOP
                        EXECUTE 'ALTER TABLE ' || quote_ident(r.relname) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
                    END LOOP;
                END $$;
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Additive constraint removal; no destructive reversal needed,
        // preserving forward-compatible string statuses in PostgreSQL.
    }
};

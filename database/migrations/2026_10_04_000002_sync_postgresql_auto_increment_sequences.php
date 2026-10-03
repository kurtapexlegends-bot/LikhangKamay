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
            $tables = [
                'employees',
                'users',
                'orders',
                'order_items',
                'products',
                'supplies',
                'stock_requests',
                'email_templates',
                'disputes',
                'reviews',
            ];

            foreach ($tables as $table) {
                if (Schema::hasTable($table) && Schema::hasColumn($table, 'id')) {
                    DB::statement("
                        DO \$\$
                        DECLARE
                            seq_name text;
                            max_val bigint;
                        BEGIN
                            seq_name := pg_get_serial_sequence('{$table}', 'id');
                            IF seq_name IS NOT NULL THEN
                                EXECUTE 'SELECT COALESCE(MAX(id), 1) FROM ' || quote_ident('{$table}') INTO max_val;
                                EXECUTE 'SELECT setval(' || quote_literal(seq_name) || ', ' || max_val || ', true)';
                            END IF;
                        END \$\$;
                    ");
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Sequence re-synchronization is idempotent and safe; no reversal needed.
    }
};

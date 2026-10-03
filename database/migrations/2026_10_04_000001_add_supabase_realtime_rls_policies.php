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
            $tables = ['orders', 'order_deliveries', 'notifications', 'messages', 'platform_activities', 'seller_activity_logs'];

            foreach ($tables as $table) {
                DB::statement("
                    DO \$\$
                    BEGIN
                        IF EXISTS (
                            SELECT 1 FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                              AND table_name = '{$table}'
                        ) THEN
                            -- 1. Ensure RLS is enabled on the table
                            EXECUTE 'ALTER TABLE ' || quote_ident('{$table}') || ' ENABLE ROW LEVEL SECURITY';

                            -- 2. Create allow_realtime_select policy for Realtime CDC events if not exists
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_policies 
                                WHERE schemaname = 'public' 
                                  AND tablename = '{$table}' 
                                  AND policyname = 'allow_realtime_select'
                            ) THEN
                                EXECUTE 'CREATE POLICY allow_realtime_select ON ' || quote_ident('{$table}') || ' FOR SELECT TO PUBLIC USING (true)';
                            END IF;

                            -- 3. Grant SELECT privileges to anon and authenticated roles if present (Supabase)
                            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                                EXECUTE 'GRANT SELECT ON ' || quote_ident('{$table}') || ' TO anon';
                            END IF;
                            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                                EXECUTE 'GRANT SELECT ON ' || quote_ident('{$table}') || ' TO authenticated';
                            END IF;

                            -- 4. Publish table to supabase_realtime publication if publication exists
                            IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
                                IF NOT EXISTS (
                                    SELECT 1 FROM pg_publication_tables 
                                    WHERE pubname = 'supabase_realtime' 
                                      AND schemaname = 'public' 
                                      AND tablename = '{$table}'
                                ) THEN
                                    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE ' || quote_ident('{$table}');
                                END IF;
                            END IF;
                        END IF;
                    END \$\$;
                ");
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            $tables = ['orders', 'order_deliveries', 'notifications', 'messages', 'platform_activities', 'seller_activity_logs'];

            foreach ($tables as $table) {
                DB::statement("
                    DO \$\$
                    BEGIN
                        IF EXISTS (
                            SELECT 1 FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                              AND table_name = '{$table}'
                        ) THEN
                            IF EXISTS (
                                SELECT 1 FROM pg_policies 
                                WHERE schemaname = 'public' 
                                  AND tablename = '{$table}' 
                                  AND policyname = 'allow_realtime_select'
                            ) THEN
                                EXECUTE 'DROP POLICY IF EXISTS allow_realtime_select ON ' || quote_ident('{$table}');
                            END IF;

                            IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
                                IF EXISTS (
                                    SELECT 1 FROM pg_publication_tables 
                                    WHERE pubname = 'supabase_realtime' 
                                      AND schemaname = 'public' 
                                      AND tablename = '{$table}'
                                ) THEN
                                    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE ' || quote_ident('{$table}');
                                END IF;
                            END IF;
                        END IF;
                    END \$\$;
                ");
            }
        }
    }
};

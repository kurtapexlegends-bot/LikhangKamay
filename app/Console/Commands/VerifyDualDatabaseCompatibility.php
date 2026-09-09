<?php

namespace App\Console\Commands;

use App\Services\Database\DualDatabaseVerificationService;
use Illuminate\Console\Command;

class VerifyDualDatabaseCompatibility extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:verify-dual 
                            {--strict : Exit with code 1 if either database is unreachable or any verification fails}
                            {--all : Execute migrations and live assertions across both database connections}
                            {--inspect-only : Run static code compatibility and migration checks only}
                            {--spin-containers : Attempt to spin up Docker service containers if available}
                            {--mysql-connection=mysql : MySQL connection name}
                            {--pgsql-connection=pgsql : PostgreSQL connection name}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verify dual-database (MySQL & PostgreSQL) compatibility, additive migrations, scopes, and fallback guards.';

    public function handle(DualDatabaseVerificationService $verifier): int
    {
        $this->line('');
        $this->info('========================================================================');
        $this->info('   LikhangKamay | Dual-Database (MySQL & PostgreSQL) Verification       ');
        $this->info('========================================================================');

        $isStrict = (bool) $this->option('strict');
        $isInspectOnly = (bool) $this->option('inspect-only');
        $spinContainers = (bool) $this->option('spin-containers');
        $mysqlConn = (string) $this->option('mysql-connection');
        $pgsqlConn = (string) $this->option('pgsql-connection');

        $overallSuccess = true;

        // Step 1: Container Lifecycle Management
        if ($spinContainers) {
            $this->info("\n[1/6] Checking Docker Service Containers...");
            $containerResults = $verifier->attemptSpinUpContainers();
            if (!$containerResults['docker_available']) {
                $this->warn("  * {$containerResults['message']}");
            } else {
                $this->info("  * Docker: {$containerResults['docker_version']}");
                $this->info("  * PostgreSQL: {$containerResults['postgres_container']}");
                $this->info("  * MySQL: {$containerResults['mysql_container']}");
            }
        } else {
            $this->comment("\n[1/6] Container check skipped (pass --spin-containers to run).");
        }

        // Step 2: Codebase Static & AST Audit
        $this->info("\n[2/6] Auditing Codebase for Cross-DB Compatibility Anti-Patterns...");
        $audit = $verifier->auditCodebaseCompatibility();
        $this->line("  Scanned {$audit['scanned_files']} PHP files across app/, database/, config/, and routes/.");

        if (!$audit['passed']) {
            $overallSuccess = false;
            $this->error("  Found " . count($audit['violations']) . " cross-database or safety rule violations:");
            foreach ($audit['violations'] as $v) {
                $this->error("    - [{$v['type']}] {$v['file']}: {$v['message']}");
            }
        } else {
            $this->info('  ✓ ZERO banned commands (migrate:fresh, db:wipe, migrate:reset).');
            $this->info('  ✓ ALL Schema::hasColumn and Schema::hasTable calls guarded with rescue().');
            $this->info('  ✓ ZERO boolean integer comparison anti-patterns (where("is_...", 1)).');
            $this->info('  ✓ ZERO MySQL-only backtick quotes in raw query expressions.');
        }

        if ($isInspectOnly) {
            $this->displaySummary($overallSuccess);
            return $overallSuccess ? Command::SUCCESS : Command::FAILURE;
        }

        // Step 3: Database Connectivity Diagnostics
        $this->info("\n[3/6] Verifying Target Database Connections...");
        $mysqlStatus = $verifier->verifyConnection($mysqlConn);
        $pgsqlStatus = $verifier->verifyConnection($pgsqlConn);

        $this->table(
            ['Connection', 'Reachable', 'Driver', 'Database', 'Server Version', 'Error'],
            [
                [
                    $mysqlConn,
                    $mysqlStatus['reachable'] ? '✓ YES' : '✗ NO',
                    $mysqlStatus['driver'],
                    $mysqlStatus['database'],
                    $mysqlStatus['version'] ?? 'N/A',
                    $mysqlStatus['error'] ?? 'None',
                ],
                [
                    $pgsqlConn,
                    $pgsqlStatus['reachable'] ? '✓ YES' : '✗ NO',
                    $pgsqlStatus['driver'],
                    $pgsqlStatus['database'],
                    $pgsqlStatus['version'] ?? 'N/A',
                    $pgsqlStatus['error'] ?? 'None',
                ],
            ]
        );

        if ($isStrict && (!$mysqlStatus['reachable'] || !$pgsqlStatus['reachable'])) {
            $this->error("Strict mode enabled: Both MySQL and PostgreSQL connections must be reachable.");
            $overallSuccess = false;
        }

        $targetConnections = [$mysqlConn, $pgsqlConn];

        // Step 4: Additive Migrations Check
        $this->info("\n[4/6] Verifying Additive Migrations Execution & PostgreSQL Schema Compilation...");
        foreach ($targetConnections as $conn) {
            $isLive = ($conn === $mysqlConn ? $mysqlStatus['reachable'] : $pgsqlStatus['reachable']);
            if ($isLive) {
                $migrationResult = $verifier->verifyAdditiveMigrations($conn);
                if ($migrationResult['executed']) {
                    $this->info("  ✓ [{$conn}] Additive migrations executed successfully (0 data wiped).");
                } else {
                    $this->error("  ✗ [{$conn}] Additive migrations failed: {$migrationResult['error']}");
                    $overallSuccess = false;
                }
            } elseif ($conn === 'pgsql') {
                $schemaResult = $verifier->verifyPostgresSchemaCompilation();
                if ($schemaResult['passed']) {
                    $this->info("  ✓ [pgsql] All {$schemaResult['compiled']}/{$schemaResult['total']} additive migrations compiled cleanly on PostgreSQL schema grammar.");
                } else {
                    $this->error("  ✗ [pgsql] PostgreSQL schema compilation failed on " . count($schemaResult['errors']) . " migrations:");
                    foreach ($schemaResult['errors'] as $mName => $mErr) {
                        $this->error("      - {$mName}: {$mErr}");
                    }
                    $overallSuccess = false;
                }
            } else {
                $this->warn("  * [{$conn}] Connection offline. Live migrations skipped.");
            }
        }

        // Step 5: Eloquent Scopes, Boolean Casts & JSON Queries
        $this->info("\n[5/6] Verifying Eloquent Scopes, Boolean Casts & JSON Queries...");
        foreach ($targetConnections as $conn) {
            $isLive = ($conn === $mysqlConn ? $mysqlStatus['reachable'] : $pgsqlStatus['reachable']);
            $modeLabel = $isLive ? 'Live Execution' : 'Driver Grammar Compilation';
            $this->comment("  --> Testing connection: [{$conn}] ({$modeLabel})");

            // Scopes
            $scopeResults = $verifier->verifyEloquentScopes($conn);
            if ($scopeResults['passed']) {
                $this->info("    ✓ 12/12 Core Eloquent scopes compiled/executed without SQL syntax errors.");
            } else {
                $this->error("    ✗ Eloquent scope verification failures on [{$conn}]:");
                foreach ($scopeResults['scopes'] as $name => $res) {
                    if ($res['status'] === 'failed') {
                        $this->error("      - {$name}: {$res['error']}");
                    }
                }
                $overallSuccess = false;
            }

            // Boolean Handling
            $boolResults = $verifier->verifyBooleanHandling($conn);
            if ($boolResults['passed']) {
                $this->info("    ✓ Boolean queries (PostgresCompatibleBoolean::dbVal, DB::raw) passed.");
            } else {
                $this->error("    ✗ Boolean query failures on [{$conn}]:");
                foreach ($boolResults['checks'] as $name => $res) {
                    if ($res['status'] === 'failed') {
                        $this->error("      - {$name}: {$res['error']}");
                    }
                }
                $overallSuccess = false;
            }

            // JSON Queries
            $jsonResults = $verifier->verifyJsonQueries($conn);
            if ($jsonResults['passed']) {
                $this->info("    ✓ JSON queries (whereJsonLength, whereJsonContains, arrow path) passed.");
            } else {
                $this->error("    ✗ JSON query failures on [{$conn}]:");
                foreach ($jsonResults['checks'] as $name => $res) {
                    if ($res['status'] === 'failed') {
                        $this->error("      - {$name}: {$res['error']}");
                    }
                }
                $overallSuccess = false;
            }

            // Analytics Date Expressions
            $dateResults = $verifier->verifyDateExpressions($conn);
            if ($dateResults['passed']) {
                $this->info("    ✓ Analytics raw SQL date/time dialect expressions passed.");
            } else {
                $this->error("    ✗ Analytics date expression failures on [{$conn}]:");
                foreach ($dateResults['checks'] as $name => $res) {
                    if ($res['status'] === 'failed') {
                        $this->error("      - {$name}: {$res['error']}");
                    }
                }
                $overallSuccess = false;
            }
        }

        // Step 6: Graceful Schema Fallback Guards
        $this->info("\n[6/6] Verifying Graceful Schema Fallback Guards...");
        foreach ($targetConnections as $conn) {
            $guardResult = $verifier->verifyFallbackGuards($conn);
            if ($guardResult['passed']) {
                $this->info("  ✓ [{$conn}] Schema fallback guards correctly suppress missing table/column errors.");
            } else {
                $this->error("  ✗ [{$conn}] Schema fallback guards failed to suppress errors safely.");
                $overallSuccess = false;
            }
        }

        $this->displaySummary($overallSuccess);

        return $overallSuccess ? Command::SUCCESS : Command::FAILURE;
    }

    protected function displaySummary(bool $success): void
    {
        $this->line('');
        if ($success) {
            $this->info('========================================================================');
            $this->info('  [PASS] All Dual-Database Compatibility Verifications Succeeded!       ');
            $this->info('========================================================================');
        } else {
            $this->error('========================================================================');
            $this->error('  [FAIL] Dual-Database Compatibility Verifications Failed.              ');
            $this->error('========================================================================');
        }
        $this->line('');
    }
}

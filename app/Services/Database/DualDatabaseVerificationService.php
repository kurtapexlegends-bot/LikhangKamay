<?php

namespace App\Services\Database;

use App\Casts\PostgresCompatibleBoolean;
use App\Models\Discount;
use App\Models\OwnerApproval;
use App\Models\Product;
use App\Models\Review;
use App\Models\SellerLocation;
use App\Models\Supply;
use App\Models\User;
use App\Services\Analytics\ShopAnalyticsMetricsService;
use App\Services\SponsorshipAnalyticsService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Throwable;

class DualDatabaseVerificationService
{
    /**
     * Banned data-wiping commands in accordance with engineering rules.
     */
    public const BANNED_COMMANDS = [
        'migrate:fresh',
        'migrate:reset',
        'db:wipe',
    ];

    /**
     * Static codebase audit for cross-database anti-patterns and banned commands.
     *
     * @return array<string, mixed>
     */
    public function auditCodebaseCompatibility(): array
    {
        $violations = [];
        $scannedFiles = 0;

        $directoriesToScan = [
            app_path(),
            database_path('migrations'),
            database_path('seeders'),
            config_path(),
            base_path('routes'),
        ];

        foreach ($directoriesToScan as $dir) {
            if (!File::isDirectory($dir)) {
                continue;
            }

            $files = File::allFiles($dir);
            foreach ($files as $file) {
                if ($file->getExtension() !== 'php') {
                    continue;
                }

                $scannedFiles++;
                $content = $file->getContents();
                $relativePath = str_replace(base_path() . DIRECTORY_SEPARATOR, '', $file->getPathname());

                // Skip this service itself from self-flagging test patterns
                if (str_contains($relativePath, 'DualDatabaseVerificationService')) {
                    continue;
                }

                // 1. Audit banned data-wiping commands
                foreach (self::BANNED_COMMANDS as $banned) {
                    if (str_contains($content, "'$banned'") || str_contains($content, "\"$banned\"")) {
                        $violations[] = [
                            'type' => 'banned_command',
                            'file' => $relativePath,
                            'message' => "Banned destructive command detected: [{$banned}]. Use additive migrations only.",
                        ];
                    }
                }

                // 2. Audit unguarded Schema::hasColumn / Schema::hasTable in app/ directory
                if (str_starts_with($relativePath, 'app' . DIRECTORY_SEPARATOR)) {
                    if (preg_match_all('/(?:Schema::(?:connection\([^)]+\)->)?|\$schema->)has(Column|Table|Columns|Index)\([^)]+\)/s', $content, $matches, PREG_OFFSET_CAPTURE)) {
                        foreach ($matches[0] as $match) {
                            $matchStr = $match[0];
                            $offset = $match[1];

                            if (!$this->isGuardedByRescueOrTry($content, $offset)) {
                                $violations[] = [
                                    'type' => 'unguarded_schema_check',
                                    'file' => $relativePath,
                                    'message' => "Unguarded schema check [{$matchStr}]. Must be wrapped in rescue(fn() => ...) or try-catch.",
                                ];
                            }
                        }
                    }
                }

                // 3. Audit boolean comparison anti-patterns: ->where('is_...', 1) or ->where('is_...', '=', 1)
                if (preg_match_all('/->(?:where|orWhere)\(\s*[\'"][a-zA-Z0-9_]*(?:is_|has_|allow_|enforce_)[a-zA-Z0-9_]*[\'"]\s*,\s*(?:[\'"]=\s*[\'"]\s*,\s*)?(?:[\'"]?[01][\'"]?)\s*\)/', $content, $boolMatches)) {
                    foreach ($boolMatches[0] as $matchStr) {
                        $violations[] = [
                            'type' => 'boolean_anti_pattern',
                            'file' => $relativePath,
                            'message' => "Boolean column compared with integer literal in [{$matchStr}]. Use PostgresCompatibleBoolean::dbVal() or DB::raw('true'/'false').",
                        ];
                    }
                }

                // 4. Audit raw SQL MySQL-only backtick quotes in raw query strings
                if (preg_match_all('/(?:selectRaw|whereRaw|orderByRaw|groupByRaw|havingRaw|DB::raw)\([\'"][^)]*`[^)]*[\'"]\)/', $content, $backtickMatches)) {
                    foreach ($backtickMatches[0] as $matchStr) {
                        $violations[] = [
                            'type' => 'unquoted_backticks',
                            'file' => $relativePath,
                            'message' => "MySQL-specific backtick quotes detected in raw query [{$matchStr}]. Use standard ANSI SQL.",
                        ];
                    }
                }
            }
        }

        return [
            'scanned_files' => $scannedFiles,
            'violations' => $violations,
            'passed' => empty($violations),
        ];
    }

    /**
     * Verify database connection connectivity and driver metadata.
     *
     * @return array<string, mixed>
     */
    public function verifyConnection(string $connection): array
    {
        try {
            $db = DB::connection($connection);
            $pdo = $db->getPdo();
            $driver = $db->getDriverName();
            $databaseName = $db->getDatabaseName();
            $version = $pdo->getAttribute(\PDO::ATTR_SERVER_VERSION);

            return [
                'connection' => $connection,
                'reachable' => true,
                'driver' => $driver,
                'database' => $databaseName,
                'version' => $version,
                'error' => null,
            ];
        } catch (Throwable $e) {
            return [
                'connection' => $connection,
                'reachable' => false,
                'driver' => config("database.connections.{$connection}.driver", 'unknown'),
                'database' => config("database.connections.{$connection}.database", 'unknown'),
                'version' => null,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Verify additive migrations on the specified connection.
     * Strictly avoids data-wiping commands.
     *
     * @return array<string, mixed>
     */
    public function verifyAdditiveMigrations(string $connection): array
    {
        $connStatus = $this->verifyConnection($connection);
        if (!$connStatus['reachable']) {
            return [
                'connection' => $connection,
                'executed' => false,
                'error' => "Connection unreachable: {$connStatus['error']}",
            ];
        }

        try {
            $outputBuffer = new \Symfony\Component\Console\Output\BufferedOutput();
            $exitCode = Artisan::call('migrate', [
                '--database' => $connection,
                '--force' => true,
            ], $outputBuffer);

            $output = trim($outputBuffer->fetch());

            return [
                'connection' => $connection,
                'executed' => ($exitCode === 0),
                'exit_code' => $exitCode,
                'output' => $output,
                'error' => ($exitCode === 0) ? null : ($output ?: 'Migration command failed.'),
            ];
        } catch (Throwable $e) {
            return [
                'connection' => $connection,
                'executed' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Verify that all additive migrations compile cleanly on PostgreSQL schema grammar.
     * Can run in-memory without requiring an external running PostgreSQL daemon.
     *
     * @return array<string, mixed>
     */
    public function verifyPostgresSchemaCompilation(): array
    {
        $conn = new \Illuminate\Database\PostgresConnection(new \PDO('sqlite::memory:'), 'verify_pgsql', '', ['driver' => 'pgsql']);
        app('db')->extend('verify_pgsql', fn() => $conn);
        config(['database.connections.verify_pgsql' => ['driver' => 'pgsql', 'prefix' => '']]);

        $prevDefault = DB::getDefaultConnection();
        DB::setDefaultConnection('verify_pgsql');

        $migrator = app('migrator');
        $files = $migrator->getMigrationFiles(database_path('migrations'));

        $errors = [];
        $compiledCount = 0;

        try {
            foreach ($files as $name => $file) {
                try {
                    $migration = require $file;
                    if (!is_object($migration)) {
                        $class = $migrator->getMigrationClass($file);
                        if (class_exists($class)) {
                            $migration = new $class;
                        }
                    }
                    if (!is_object($migration) || !method_exists($migration, 'up')) {
                        continue;
                    }

                    $conn->pretend(function () use ($migration) {
                        $migration->up();
                    });
                    $compiledCount++;
                } catch (Throwable $e) {
                    $errors[$name] = $e->getMessage();
                }
            }
        } finally {
            DB::setDefaultConnection($prevDefault);
        }

        return [
            'total' => count($files),
            'compiled' => $compiledCount,
            'passed' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Verify Eloquent scopes execute or compile without driver syntax errors on the connection.
     *
     * @return array<string, mixed>
     */
    public function verifyEloquentScopes(string $connection): array
    {
        $connStatus = $this->verifyConnection($connection);
        $isLive = $connStatus['reachable'];

        $scopeCallbacks = [
            'Product::approved' => [
                'live' => fn() => Product::on($connection)->approved()->count(),
                'compile' => fn() => Product::on($connection)->approved()->toSql(),
            ],
            'Product::b2bSupplies' => [
                'live' => fn() => Product::on($connection)->b2bSupplies()->count(),
                'compile' => fn() => Product::on($connection)->b2bSupplies()->toSql(),
            ],
            'Discount::active' => [
                'live' => fn() => Discount::on($connection)->active()->count(),
                'compile' => fn() => Discount::on($connection)->active()->toSql(),
            ],
            'Review::visibleToMarketplace' => [
                'live' => fn() => Review::on($connection)->visibleToMarketplace()->count(),
                'compile' => fn() => Review::on($connection)->visibleToMarketplace()->toSql(),
            ],
            'Supply::lowStock' => [
                'live' => fn() => Supply::on($connection)->lowStock()->count(),
                'compile' => fn() => Supply::on($connection)->lowStock()->toSql(),
            ],
            'Supply::forUser' => [
                'live' => fn() => Supply::on($connection)->forUser(1)->count(),
                'compile' => fn() => Supply::on($connection)->forUser(1)->toSql(),
            ],
            'Supply::byCategory' => [
                'live' => fn() => Supply::on($connection)->byCategory('Raw Materials')->count(),
                'compile' => fn() => Supply::on($connection)->byCategory('Raw Materials')->toSql(),
            ],
            'SellerLocation::active' => [
                'live' => fn() => SellerLocation::on($connection)->active()->count(),
                'compile' => fn() => SellerLocation::on($connection)->active()->toSql(),
            ],
            'OwnerApproval::pending' => [
                'live' => fn() => OwnerApproval::on($connection)->pending()->count(),
                'compile' => fn() => OwnerApproval::on($connection)->pending()->toSql(),
            ],
            'OwnerApproval::reviewed' => [
                'live' => fn() => OwnerApproval::on($connection)->reviewed()->count(),
                'compile' => fn() => OwnerApproval::on($connection)->reviewed()->toSql(),
            ],
            'OwnerApproval::forDomain' => [
                'live' => fn() => OwnerApproval::on($connection)->forDomain('hr')->count(),
                'compile' => fn() => OwnerApproval::on($connection)->forDomain('hr')->toSql(),
            ],
            'Product::search' => [
                'live' => fn() => Product::on($connection)->search('clay bowl')->count(),
                'compile' => fn() => Product::on($connection)->search('clay bowl')->toSql(),
            ],
        ];

        $results = [];
        $allPassed = true;

        foreach ($scopeCallbacks as $name => $handlers) {
            try {
                if ($isLive) {
                    $val = ($handlers['live'])();
                    $results[$name] = ['status' => 'passed', 'count' => $val, 'error' => null];
                } else {
                    $sql = ($handlers['compile'])();
                    if (empty($sql)) {
                        throw new \RuntimeException("Compiled SQL is empty.");
                    }
                    if ($connection === 'pgsql' && str_contains($sql, '`')) {
                        throw new \RuntimeException("Postgres SQL contains backticks: {$sql}");
                    }
                    $results[$name] = ['status' => 'passed', 'sql' => $sql, 'error' => null];
                }
            } catch (Throwable $e) {
                $allPassed = false;
                $results[$name] = [
                    'status' => 'failed',
                    'count' => null,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return [
            'connection' => $connection,
            'mode' => $isLive ? 'live' : 'grammar_compilation',
            'passed' => $allPassed,
            'scopes' => $results,
        ];
    }

    /**
     * Verify boolean queries and PostgresCompatibleBoolean handling.
     *
     * @return array<string, mixed>
     */
    public function verifyBooleanHandling(string $connection): array
    {
        $connStatus = $this->verifyConnection($connection);
        $isLive = $connStatus['reachable'];

        $checks = [];
        $allPassed = true;

        // 1. Query using PostgresCompatibleBoolean::dbVal(true)
        try {
            if ($isLive) {
                $count = Discount::on($connection)
                    ->where('is_active', PostgresCompatibleBoolean::dbVal(true))
                    ->count();
                $checks['dbVal(true)'] = ['status' => 'passed', 'count' => $count, 'error' => null];
            } else {
                $sql = Discount::on($connection)
                    ->where('is_active', PostgresCompatibleBoolean::dbVal(true))
                    ->toSql();
                $checks['dbVal(true)'] = ['status' => 'passed', 'sql' => $sql, 'error' => null];
            }
        } catch (Throwable $e) {
            $allPassed = false;
            $checks['dbVal(true)'] = ['status' => 'failed', 'error' => $e->getMessage()];
        }

        // 2. Query using PostgresCompatibleBoolean::dbVal(false)
        try {
            if ($isLive) {
                $count = Review::on($connection)
                    ->where('is_hidden_from_marketplace', PostgresCompatibleBoolean::dbVal(false))
                    ->count();
                $checks['dbVal(false)'] = ['status' => 'passed', 'count' => $count, 'error' => null];
            } else {
                $sql = Review::on($connection)
                    ->where('is_hidden_from_marketplace', PostgresCompatibleBoolean::dbVal(false))
                    ->toSql();
                $checks['dbVal(false)'] = ['status' => 'passed', 'sql' => $sql, 'error' => null];
            }
        } catch (Throwable $e) {
            $allPassed = false;
            $checks['dbVal(false)'] = ['status' => 'failed', 'error' => $e->getMessage()];
        }

        // 3. Query using DB::raw('true')
        try {
            if ($isLive) {
                $count = Product::on($connection)
                    ->where('is_b2b_supply', DB::raw('true'))
                    ->count();
                $checks['DB::raw("true")'] = ['status' => 'passed', 'count' => $count, 'error' => null];
            } else {
                $sql = Product::on($connection)
                    ->where('is_b2b_supply', DB::raw('true'))
                    ->toSql();
                $checks['DB::raw("true")'] = ['status' => 'passed', 'sql' => $sql, 'error' => null];
            }
        } catch (Throwable $e) {
            $allPassed = false;
            $checks['DB::raw("true")'] = ['status' => 'failed', 'error' => $e->getMessage()];
        }

        return [
            'connection' => $connection,
            'mode' => $isLive ? 'live' : 'grammar_compilation',
            'passed' => $allPassed,
            'checks' => $checks,
        ];
    }

    /**
     * Verify JSON extraction and query builder methods.
     *
     * @return array<string, mixed>
     */
    public function verifyJsonQueries(string $connection): array
    {
        $connStatus = $this->verifyConnection($connection);
        $isLive = $connStatus['reachable'];

        $checks = [];
        $allPassed = true;

        // 1. JSON length query
        try {
            if ($isLive) {
                $count = Product::on($connection)
                    ->whereJsonLength('gallery_paths', '<', 3)
                    ->count();
                $checks['whereJsonLength'] = ['status' => 'passed', 'count' => $count, 'error' => null];
            } else {
                $sql = Product::on($connection)
                    ->whereJsonLength('gallery_paths', '<', 3)
                    ->toSql();
                $checks['whereJsonLength'] = ['status' => 'passed', 'sql' => $sql, 'error' => null];
            }
        } catch (Throwable $e) {
            $allPassed = false;
            $checks['whereJsonLength'] = ['status' => 'failed', 'error' => $e->getMessage()];
        }

        // 2. JSON contains query
        try {
            if ($isLive) {
                $count = User::on($connection)
                    ->whereJsonContains('modules_enabled', 'pos')
                    ->count();
                $checks['whereJsonContains'] = ['status' => 'passed', 'count' => $count, 'error' => null];
            } else {
                $sql = User::on($connection)
                    ->whereJsonContains('modules_enabled', 'pos')
                    ->toSql();
                $checks['whereJsonContains'] = ['status' => 'passed', 'sql' => $sql, 'error' => null];
            }
        } catch (Throwable $e) {
            $allPassed = false;
            $checks['whereJsonContains'] = ['status' => 'failed', 'error' => $e->getMessage()];
        }

        // 3. JSON path string arrow extraction (data->key)
        try {
            if ($isLive) {
                $count = User::on($connection)
                    ->where('modules_enabled->pos', 'true')
                    ->count();
                $checks['jsonPathArrow'] = ['status' => 'passed', 'count' => $count, 'error' => null];
            } else {
                $sql = User::on($connection)
                    ->where('modules_enabled->pos', 'true')
                    ->toSql();
                $checks['jsonPathArrow'] = ['status' => 'passed', 'sql' => $sql, 'error' => null];
            }
        } catch (Throwable $e) {
            $allPassed = false;
            $checks['jsonPathArrow'] = ['status' => 'failed', 'error' => $e->getMessage()];
        }

        return [
            'connection' => $connection,
            'mode' => $isLive ? 'live' : 'grammar_compilation',
            'passed' => $allPassed,
            'checks' => $checks,
        ];
    }

    /**
     * Verify analytics date/time raw SQL expressions across drivers.
     *
     * @return array<string, mixed>
     */
    public function verifyDateExpressions(string $connection): array
    {
        $connStatus = $this->verifyConnection($connection);
        $isLive = $connStatus['reachable'];

        $checks = [];
        $allPassed = true;

        $shopMetrics = app(ShopAnalyticsMetricsService::class);

        $expressions = [
            'monthNumberExpression' => $shopMetrics->monthNumberExpression('created_at', $connection),
            'yearNumberExpression' => $shopMetrics->yearNumberExpression('created_at', $connection),
            'dayOfWeekExpression' => $shopMetrics->dayOfWeekExpression('created_at', $connection),
            'hourExpression' => $shopMetrics->hourExpression('created_at', $connection),
            'yearMonthExpression' => $shopMetrics->yearMonthExpression('created_at', $connection),
            'dateDiffExpression' => $shopMetrics->dateDiffExpression('updated_at', 'created_at', $connection),
        ];

        foreach ($expressions as $name => $sqlExpr) {
            try {
                if ($isLive) {
                    $row = DB::connection($connection)
                        ->table('users')
                        ->selectRaw("{$sqlExpr} as test_val")
                        ->first();
                    $checks[$name] = ['status' => 'passed', 'expr' => trim(preg_replace('/\s+/', ' ', $sqlExpr)), 'error' => null];
                } else {
                    $sql = DB::connection($connection)->table('users')->selectRaw("{$sqlExpr} as test_val")->toSql();
                    if (empty($sql)) {
                        throw new \RuntimeException("Compiled SQL for date expression {$name} is empty.");
                    }
                    if ($connection === 'pgsql' && str_contains($sql, '`')) {
                        throw new \RuntimeException("Postgres SQL contains MySQL backticks: {$sql}");
                    }
                    $checks[$name] = ['status' => 'passed', 'expr' => trim(preg_replace('/\s+/', ' ', $sqlExpr)), 'sql' => $sql, 'error' => null];
                }
            } catch (Throwable $e) {
                $allPassed = false;
                $checks[$name] = ['status' => 'failed', 'expr' => trim(preg_replace('/\s+/', ' ', $sqlExpr)), 'error' => $e->getMessage()];
            }
        }

        return [
            'connection' => $connection,
            'mode' => $isLive ? 'live' : 'grammar_compilation',
            'passed' => $allPassed,
            'checks' => $checks,
        ];
    }

    /**
     * Verify graceful fallback guards: rescue(fn() => Schema::hasColumn(...)).
     *
     * @return array<string, mixed>
     */
    public function verifyFallbackGuards(string $connection): array
    {
        $columnCheck = rescue(fn() => Schema::connection($connection)->hasColumn('non_existent_table_verify', 'non_existent_column'), false);
        $tableCheck = rescue(fn() => Schema::connection($connection)->hasTable('non_existent_table_verify'), false);

        $passed = ($columnCheck === false && $tableCheck === false);

        return [
            'connection' => $connection,
            'passed' => $passed,
            'column_fallback_safe' => ($columnCheck === false),
            'table_fallback_safe' => ($tableCheck === false),
        ];
    }

    /**
     * Attempt to spin up Docker service containers if Docker is available.
     *
     * @return array<string, mixed>
     */
    public function attemptSpinUpContainers(): array
    {
        $dockerCheck = @exec('docker --version 2>&1', $output, $returnCode);

        if ($returnCode !== 0 || empty($dockerCheck)) {
            return [
                'docker_available' => false,
                'message' => 'Docker is not installed or not available in the system PATH.',
                'mysql_container' => null,
                'postgres_container' => null,
            ];
        }

        $containers = [
            'postgres' => [
                'name' => 'likhangkamay-verify-pgsql',
                'image' => 'postgres:16',
                'port' => '5432',
                'env' => '-e POSTGRES_PASSWORD=password -e POSTGRES_DB=likhangkamay_test -e POSTGRES_USER=postgres',
            ],
            'mysql' => [
                'name' => 'likhangkamay-verify-mysql',
                'image' => 'mysql:8.0',
                'port' => '3306',
                'env' => '-e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=likhangkamay_test',
            ],
        ];

        $results = [
            'docker_available' => true,
            'docker_version' => $dockerCheck,
        ];

        foreach ($containers as $type => $info) {
            $existing = shell_exec("docker ps -a --filter \"name={$info['name']}\" --format \"{{.Status}}\"");
            if (!empty(trim((string) $existing))) {
                if (!str_contains((string) $existing, 'Up')) {
                    shell_exec("docker start {$info['name']}");
                }
                $results["{$type}_container"] = "Running (existing: {$info['name']})";
            } else {
                $cmd = "docker run -d --name {$info['name']} {$info['env']} -p {$info['port']}:{$info['port']} {$info['image']}";
                shell_exec($cmd);
                $results["{$type}_container"] = "Started new container ({$info['name']})";
            }
        }

        return $results;
    }

    /**
     * Determine if a code offset is enclosed within a rescue() helper or try-catch block.
     */
    public function isGuardedByRescueOrTry(string $content, int $offset): bool
    {
        // 1. Check enclosing rescue(...)
        $lastRescuePos = strrpos(substr($content, 0, $offset), 'rescue(');
        if ($lastRescuePos === false) {
            $lastRescuePos = strrpos(substr($content, 0, $offset), 'rescue (');
        }

        if ($lastRescuePos !== false) {
            $parenPos = strpos($content, '(', $lastRescuePos);
            if ($parenPos !== false && $parenPos < $offset) {
                $len = strlen($content);
                $depth = 0;
                $inString = false;
                $stringChar = '';
                for ($i = $parenPos; $i < $len; $i++) {
                    $ch = $content[$i];
                    if ($inString) {
                        if ($ch === '\\') {
                            $i++;
                            continue;
                        }
                        if ($ch === $stringChar) {
                            $inString = false;
                        }
                        continue;
                    }

                    if ($ch === "'" || $ch === '"') {
                        $inString = true;
                        $stringChar = $ch;
                        continue;
                    }

                    if ($ch === '(') {
                        $depth++;
                    } elseif ($ch === ')') {
                        $depth--;
                        if ($depth === 0) {
                            if ($i < $offset) {
                                break;
                            }
                            return true;
                        }
                    }
                }
                if ($depth > 0) {
                    return true;
                }
            }
        }

        // 2. Check enclosing try { ... } catch
        $lastTryPos = strrpos(substr($content, 0, $offset), 'try');
        if ($lastTryPos !== false) {
            $bracePos = strpos($content, '{', $lastTryPos);
            if ($bracePos !== false && $bracePos < $offset) {
                $len = strlen($content);
                $depth = 0;
                $inString = false;
                $stringChar = '';
                for ($i = $bracePos; $i < $len; $i++) {
                    $ch = $content[$i];
                    if ($inString) {
                        if ($ch === '\\') {
                            $i++;
                            continue;
                        }
                        if ($ch === $stringChar) {
                            $inString = false;
                        }
                        continue;
                    }

                    if ($ch === "'" || $ch === '"') {
                        $inString = true;
                        $stringChar = $ch;
                        continue;
                    }

                    if ($ch === '{') {
                        $depth++;
                    } elseif ($ch === '}') {
                        $depth--;
                        if ($depth === 0) {
                            if ($i < $offset) {
                                break;
                            }
                            return true;
                        }
                    }
                }
                if ($depth > 0) {
                    return true;
                }
            }
        }

        return false;
    }
}

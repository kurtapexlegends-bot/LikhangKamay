<?php

namespace Tests\Feature\Database;

use App\Casts\PostgresCompatibleBoolean;
use App\Models\Discount;
use App\Models\OwnerApproval;
use App\Models\Product;
use App\Models\Review;
use App\Models\SellerLocation;
use App\Models\Supply;
use App\Models\User;
use App\Services\Analytics\ShopAnalyticsMetricsService;
use App\Services\Database\DualDatabaseVerificationService;
use App\Services\SponsorshipAnalyticsService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DualDatabaseCompatibilityTest extends TestCase
{
    protected DualDatabaseVerificationService $verifier;

    protected function setUp(): void
    {
        parent::setUp();
        $this->verifier = app(DualDatabaseVerificationService::class);
    }

    /**
     * Test that no data-wiping commands (migrate:fresh, migrate:reset, db:wipe)
     * exist in codebase execution paths.
     */
    public function test_codebase_has_no_banned_data_wiping_commands(): void
    {
        $audit = $this->verifier->auditCodebaseCompatibility();

        $bannedViolations = array_filter(
            $audit['violations'],
            fn($v) => $v['type'] === 'banned_command'
        );

        $this->assertEmpty(
            $bannedViolations,
            'Banned data-wiping commands found in codebase: ' . json_encode($bannedViolations)
        );
    }

    /**
     * Test that all runtime Schema::hasColumn/Table calls are guarded with rescue().
     */
    public function test_all_schema_checks_have_rescue_fallback_guards(): void
    {
        $audit = $this->verifier->auditCodebaseCompatibility();

        $unguarded = array_filter(
            $audit['violations'],
            fn($v) => $v['type'] === 'unguarded_schema_check'
        );

        $this->assertEmpty(
            $unguarded,
            'Unguarded Schema checks found in app/: ' . json_encode($unguarded)
        );
    }

    /**
     * Test that no boolean columns are compared with integer literals (where('is_...', 1)).
     */
    public function test_no_boolean_columns_compared_with_integer_literals(): void
    {
        $audit = $this->verifier->auditCodebaseCompatibility();

        $booleanViolations = array_filter(
            $audit['violations'],
            fn($v) => $v['type'] === 'boolean_anti_pattern'
        );

        $this->assertEmpty(
            $booleanViolations,
            'Boolean columns compared with integer literals: ' . json_encode($booleanViolations)
        );
    }

    /**
     * Test that all additive migrations compile cleanly on PostgreSQL schema grammar.
     */
    public function test_all_migrations_compile_cleanly_on_postgres_grammar(): void
    {
        $result = $this->verifier->verifyPostgresSchemaCompilation();

        $this->assertTrue($result['passed'], 'Postgres migration compilation errors: ' . json_encode($result['errors']));
        $this->assertGreaterThanOrEqual(172, $result['compiled']);
        $this->assertEmpty($result['errors']);
    }

    /**
     * Test that PostgresCompatibleBoolean produces cross-db safe SQL expressions.
     */
    public function test_postgres_compatible_boolean_produces_driver_safe_sql(): void
    {
        $trueVal = PostgresCompatibleBoolean::dbVal(true);
        $falseVal = PostgresCompatibleBoolean::dbVal(false);

        $this->assertInstanceOf(\Illuminate\Contracts\Database\Query\Expression::class, $trueVal);
        $this->assertInstanceOf(\Illuminate\Contracts\Database\Query\Expression::class, $falseVal);

        // PostgreSQL assertions
        $pgsqlDiscountSql = Discount::on('pgsql')->where('is_active', $trueVal)->toSql();
        $this->assertStringContainsString('is_active', $pgsqlDiscountSql);
        $this->assertStringContainsString('= true', $pgsqlDiscountSql);

        $pgsqlReviewSql = Review::on('pgsql')->where('is_hidden_from_marketplace', $falseVal)->toSql();
        $this->assertStringContainsString('is_hidden_from_marketplace', $pgsqlReviewSql);
        $this->assertStringContainsString('= false', $pgsqlReviewSql);

        // MySQL assertions
        $mysqlDiscountSql = Discount::on('mysql')->where('is_active', $trueVal)->toSql();
        $this->assertStringContainsString('is_active', $mysqlDiscountSql);
        $this->assertStringContainsString('= true', $mysqlDiscountSql);

        $mysqlReviewSql = Review::on('mysql')->where('is_hidden_from_marketplace', $falseVal)->toSql();
        $this->assertStringContainsString('is_hidden_from_marketplace', $mysqlReviewSql);
        $this->assertStringContainsString('= false', $mysqlReviewSql);
    }

    /**
     * Test all 12 core Eloquent scopes compile valid SQL across database drivers.
     */
    public function test_all_core_eloquent_scopes_compile_valid_sql(): void
    {
        $scopeCallbacks = [
            'Product::approved' => fn(string $conn) => Product::on($conn)->approved()->toSql(),
            'Product::b2bSupplies' => fn(string $conn) => Product::on($conn)->b2bSupplies()->toSql(),
            'Discount::active' => fn(string $conn) => Discount::on($conn)->active()->toSql(),
            'Review::visibleToMarketplace' => fn(string $conn) => Review::on($conn)->visibleToMarketplace()->toSql(),
            'Supply::lowStock' => fn(string $conn) => Supply::on($conn)->lowStock()->toSql(),
            'Supply::forUser' => fn(string $conn) => Supply::on($conn)->forUser(1)->toSql(),
            'Supply::byCategory' => fn(string $conn) => Supply::on($conn)->byCategory('Raw Materials')->toSql(),
            'SellerLocation::active' => fn(string $conn) => SellerLocation::on($conn)->active()->toSql(),
            'OwnerApproval::pending' => fn(string $conn) => OwnerApproval::on($conn)->pending()->toSql(),
            'OwnerApproval::reviewed' => fn(string $conn) => OwnerApproval::on($conn)->reviewed()->toSql(),
            'OwnerApproval::forDomain' => fn(string $conn) => OwnerApproval::on($conn)->forDomain('hr')->toSql(),
            'Product::search' => fn(string $conn) => Product::on($conn)->search('clay bowl')->toSql(),
        ];

        // PostgreSQL: must compile non-empty SQL and contain ZERO MySQL backticks
        foreach ($scopeCallbacks as $name => $callback) {
            $pgsqlSql = $callback('pgsql');
            $this->assertNotEmpty($pgsqlSql, "Scope [{$name}] generated empty SQL on pgsql.");
            $this->assertStringNotContainsString('`', $pgsqlSql, "Scope [{$name}] on pgsql contains non-ANSI MySQL backticks.");
        }

        // MySQL: must compile non-empty SQL
        foreach ($scopeCallbacks as $name => $callback) {
            $mysqlSql = $callback('mysql');
            $this->assertNotEmpty($mysqlSql, "Scope [{$name}] generated empty SQL on mysql.");
        }
    }

    /**
     * Test analytics raw SQL date/time dialect expressions for both MySQL and PostgreSQL.
     */
    public function test_analytics_date_expressions_support_dual_dialects(): void
    {
        $shopMetrics = app(ShopAnalyticsMetricsService::class);

        // Explicit PostgreSQL Dialect Expressions
        $pgMonth = $shopMetrics->monthNumberExpression('orders.created_at', 'pgsql');
        $pgYear = $shopMetrics->yearNumberExpression('orders.created_at', 'pgsql');
        $pgDayOfWeek = $shopMetrics->dayOfWeekExpression('orders.created_at', 'pgsql');
        $pgHour = $shopMetrics->hourExpression('orders.created_at', 'pgsql');
        $pgYearMonth = $shopMetrics->yearMonthExpression('orders.created_at', 'pgsql');
        $pgDiff = $shopMetrics->dateDiffExpression('orders.created_at', 'orders.updated_at', 'pgsql');

        $this->assertStringContainsString('EXTRACT(MONTH FROM', $pgMonth);
        $this->assertStringContainsString('EXTRACT(YEAR FROM', $pgYear);
        $this->assertStringContainsString('to_char', $pgDayOfWeek);
        $this->assertStringContainsString('EXTRACT(HOUR FROM', $pgHour);
        $this->assertStringContainsString('to_char', $pgYearMonth);
        $this->assertStringContainsString('::date', $pgDiff);

        // Explicit MySQL Dialect Expressions
        $myMonth = $shopMetrics->monthNumberExpression('orders.created_at', 'mysql');
        $myYear = $shopMetrics->yearNumberExpression('orders.created_at', 'mysql');
        $myDayOfWeek = $shopMetrics->dayOfWeekExpression('orders.created_at', 'mysql');
        $myHour = $shopMetrics->hourExpression('orders.created_at', 'mysql');
        $myYearMonth = $shopMetrics->yearMonthExpression('orders.created_at', 'mysql');
        $myDiff = $shopMetrics->dateDiffExpression('orders.created_at', 'orders.updated_at', 'mysql');

        $this->assertStringContainsString('MONTH(', $myMonth);
        $this->assertStringContainsString('YEAR(', $myYear);
        $this->assertStringContainsString('DAYOFWEEK(', $myDayOfWeek);
        $this->assertStringContainsString('HOUR(', $myHour);
        $this->assertStringContainsString('DATE_FORMAT(', $myYearMonth);
        $this->assertStringContainsString('DATEDIFF(', $myDiff);

        // Explicit SQLite Dialect Expressions
        $sqliteMonth = $shopMetrics->monthNumberExpression('orders.created_at', 'sqlite');
        $sqliteDiff = $shopMetrics->dateDiffExpression('orders.created_at', 'orders.updated_at', 'sqlite');
        $this->assertStringContainsString("strftime('%m'", $sqliteMonth);
        $this->assertStringContainsString('julianday(', $sqliteDiff);
    }

    /**
     * Test JSON queries compile safely across MySQL and PostgreSQL.
     */
    public function test_json_queries_compile_safely(): void
    {
        // PostgreSQL JSON compilation
        $pgJsonLengthSql = Product::on('pgsql')->whereJsonLength('gallery_paths', '<', 3)->toSql();
        $this->assertNotEmpty($pgJsonLengthSql);

        $pgJsonContainsSql = User::on('pgsql')->whereJsonContains('modules_enabled', 'pos')->toSql();
        $this->assertNotEmpty($pgJsonContainsSql);

        $pgArrowSql = User::on('pgsql')->where('modules_enabled->pos', 'true')->toSql();
        $this->assertNotEmpty($pgArrowSql);
        $this->assertStringContainsString('->>', $pgArrowSql);

        // MySQL JSON compilation
        $myJsonLengthSql = Product::on('mysql')->whereJsonLength('gallery_paths', '<', 3)->toSql();
        $this->assertNotEmpty($myJsonLengthSql);

        $myJsonContainsSql = User::on('mysql')->whereJsonContains('modules_enabled', 'pos')->toSql();
        $this->assertNotEmpty($myJsonContainsSql);

        $myArrowSql = User::on('mysql')->where('modules_enabled->pos', 'true')->toSql();
        $this->assertNotEmpty($myArrowSql);
        $this->assertStringContainsString('json_extract', $myArrowSql);
    }

    /**
     * Test graceful fallback guards safely suppress errors when tables or columns do not exist.
     */
    public function test_schema_fallback_guards_gracefully_handle_missing_columns(): void
    {
        $hasColumn = rescue(fn() => Schema::hasColumn('non_existent_table_xyz', 'non_existent_column'), false);
        $this->assertFalse($hasColumn);

        $hasTable = rescue(fn() => Schema::hasTable('non_existent_table_xyz'), false);
        $this->assertFalse($hasTable);
    }

    /**
     * Test db:verify-dual artisan command execution.
     */
    public function test_db_verify_dual_command_executes_successfully(): void
    {
        $buffer = new \Symfony\Component\Console\Output\BufferedOutput();
        $exitCode = Artisan::call('db:verify-dual', [], $buffer);
        $output = $buffer->fetch();

        $this->assertEquals(0, $exitCode, "db:verify-dual failed with output:\n" . $output);
        $this->assertStringContainsString('ZERO banned commands', $output);
        $this->assertStringContainsString('guarded with rescue()', $output);
        $this->assertStringContainsString('Dual-Database Compatibility Verifications Succeeded', $output);
    }

    /**
     * Test that lexical nesting detection correctly identifies guarded vs unguarded schema checks
     * and does not allow prior sibling rescue() calls to mask subsequent unguarded checks.
     */
    public function test_nesting_detection_accurately_identifies_guarded_and_unguarded_schema_calls(): void
    {
        $guarded = 'function test() { return rescue(fn() => Schema::hasColumn("users", "role"), false); }';
        $posGuarded = strpos($guarded, 'hasColumn');
        $this->assertTrue($this->verifier->isGuardedByRescueOrTry($guarded, $posGuarded));

        $guardedTry = 'function test() { try { return Schema::hasColumn("users", "role"); } catch (\Throwable) { return false; } }';
        $posTry = strpos($guardedTry, 'hasColumn');
        $this->assertTrue($this->verifier->isGuardedByRescueOrTry($guardedTry, $posTry));

        // Prior sibling rescue must NOT mask subsequent unguarded check
        $siblingUnguarded = 'function a() { rescue(fn() => 1); } function b() { return Schema::hasColumn("users", "role"); }';
        $posUnguarded = strpos($siblingUnguarded, 'Schema::hasColumn');
        $this->assertFalse($this->verifier->isGuardedByRescueOrTry($siblingUnguarded, $posUnguarded));
    }

    /**
     * Test that MySQL and PostgreSQL credentials isolate symmetrically to prevent
     * cross-driver port and user pollution.
     */
    public function test_database_credentials_isolate_symmetrically(): void
    {
        $mysqlPort = config('database.connections.mysql.port');
        $pgsqlPort = config('database.connections.pgsql.port');

        $this->assertEquals('3306', (string) $mysqlPort);
        $this->assertEquals('5432', (string) $pgsqlPort);
    }

    /**
     * Test that offline date expressions compile to non-empty SQL without backticks on pgsql.
     */
    public function test_offline_date_expressions_compile_cleanly(): void
    {
        $result = $this->verifier->verifyDateExpressions('pgsql');
        $this->assertTrue($result['passed']);
        foreach ($result['checks'] as $checkName => $check) {
            $this->assertEquals('passed', $check['status']);
            $this->assertNotEmpty($check['expr']);
        }
    }
}

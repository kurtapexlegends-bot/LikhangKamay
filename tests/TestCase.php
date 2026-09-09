<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $defaultConn = config('database.default');
        $dbName = config("database.connections.{$defaultConn}.database");

        // 1. ABSOLUTE BAN: Under no circumstances can tests run against the primary local or production database
        $protectedDatabases = ['likhangkamay', 'forge', 'production', 'likhangkamay_prod'];
        if (in_array(strtolower((string) $dbName), $protectedDatabases, true)) {
            throw new \RuntimeException(
                "CRITICAL DATA SAFETY VIOLATION: Automated tests are strictly blocked from running against protected database [{$dbName}]."
            );
        }

        // 2. Environment check: Local runs vs CI runner
        $isCi = env('CI') === true || env('CI') === 'true' || env('GITHUB_ACTIONS') === true || env('GITHUB_ACTIONS') === 'true';

        if (!$isCi) {
            // Local runs must ALWAYS use in-memory SQLite to guarantee local Laragon data is never touched
            if ($defaultConn !== 'sqlite' || $dbName !== ':memory:') {
                throw new \RuntimeException(
                    "CRITICAL SAFETY GUARD: Local automated tests must execute against in-memory SQLite (:memory:). Running tests locally against [{$defaultConn}] ({$dbName}) is strictly blocked to protect local data."
                );
            }
        } else {
            // CI runs can use in-memory SQLite OR dedicated ephemeral test databases ending in _test
            $isSafeTestDb = ($defaultConn === 'sqlite' && $dbName === ':memory:')
                || str_ends_with(strtolower((string) $dbName), '_test');

            if (!$isSafeTestDb) {
                throw new \RuntimeException(
                    "CRITICAL SAFETY GUARD: CI tests must execute against in-memory SQLite or a dedicated *_test database. Blocked: [{$defaultConn}] ({$dbName})."
                );
            }
        }
    }
}

<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') !== 'sqlite' || config('database.connections.sqlite.database') !== ':memory:') {
            throw new \RuntimeException(
                'CRITICAL SAFETY GUARD: Automated tests must execute against in-memory SQLite (:memory:). Running tests against [' . config('database.default') . '] is strictly blocked to prevent data wiping.'
            );
        }
    }
}

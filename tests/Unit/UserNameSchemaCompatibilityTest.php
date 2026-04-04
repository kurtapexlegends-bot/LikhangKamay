<?php

namespace Tests\Unit;

use App\Models\User;
use Tests\TestCase;

class UserNameSchemaCompatibilityTest extends TestCase
{
    protected function tearDown(): void
    {
        $this->setSplitNameColumnsCache(null);

        parent::tearDown();
    }

    public function test_persistable_name_attributes_include_split_columns_when_supported(): void
    {
        $this->setSplitNameColumnsCache(true);

        $attributes = User::persistableNameAttributes([
            'name' => 'Clay Seller',
            'first_name' => 'Clay',
            'last_name' => 'Seller',
        ]);

        $this->assertSame([
            'name' => 'Clay Seller',
            'first_name' => 'Clay',
            'last_name' => 'Seller',
        ], $attributes);
    }

    public function test_persistable_name_attributes_omit_split_columns_when_schema_does_not_support_them(): void
    {
        $this->setSplitNameColumnsCache(false);

        $attributes = User::persistableNameAttributes([
            'name' => 'Clay Seller',
            'first_name' => 'Clay',
            'last_name' => 'Seller',
        ]);

        $this->assertSame([
            'name' => 'Clay Seller',
        ], $attributes);
    }

    private function setSplitNameColumnsCache(?bool $value): void
    {
        $property = new \ReflectionProperty(User::class, 'hasSplitNameColumns');
        $property->setAccessible(true);
        $property->setValue(null, $value);
    }
}

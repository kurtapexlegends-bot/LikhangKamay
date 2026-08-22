<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;

trait Searchable
{
    /**
     * Perform a PostgreSQL Full-Text Search.
     *
     * @param Builder $query
     * @param string $search
     * @param array $columns
     * @return Builder
     */
    public function scopeSearch(Builder $query, string $search, array $columns = ['name', 'description'])
    {
        if (empty($search)) {
            return $query;
        }

        $search = trim($search);
        /** @var \Illuminate\Database\Connection $connection */
        $connection = $query->getConnection();
        $driver = $connection->getDriverName();

        if ($driver === 'pgsql') {
            // High-performance PostgreSQL Full-Text Search with prefix matching & ILIKE fallback
            $columnsString = implode(", ' ', ", array_map(fn($col) => "COALESCE($col, '')", $columns));
            $terms = array_values(array_filter(
                array_map(fn($t) => preg_replace('/[^a-zA-Z0-9]/', '', $t), explode(' ', $search)),
                fn($t) => $t !== ''
            ));
            $prefixQuery = !empty($terms) ? implode(' & ', array_map(fn($t) => $t . ':*', $terms)) : null;

            return $query->where(function ($q) use ($columns, $search, $columnsString, $prefixQuery) {
                if (!empty($prefixQuery)) {
                    $q->whereRaw("to_tsvector('english', CONCAT($columnsString)) @@ to_tsquery('english', ?)", [$prefixQuery]);
                }
                foreach ($columns as $column) {
                    $q->orWhere($column, 'ILIKE', "%{$search}%");
                }
            });
        }

        if ($driver === 'mysql') {
            // Fallback to LIKE for MySQL to avoid "Can't find FULLTEXT index matching the column list" errors
            return $query->where(function ($q) use ($search, $columns) {
                foreach ($columns as $column) {
                    $q->orWhere($column, 'like', "%{$search}%");
                }
            });
        }

        // Generic fallback for SQLite or other drivers
        return $query->where(function ($q) use ($search, $columns) {
            foreach ($columns as $column) {
                $q->orWhere($column, 'like', "%{$search}%");
            }
        });
    }
}

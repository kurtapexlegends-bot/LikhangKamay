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
            // High-performance PostgreSQL Full-Text Search
            $columnsString = implode(", ' ', ", array_map(fn($col) => "COALESCE($col, '')", $columns));
            
            return $query->whereRaw(
                "to_tsvector('english', CONCAT($columnsString)) @@ websearch_to_tsquery('english', ?)",
                [$search]
            )->orderByRaw(
                "ts_rank(to_tsvector('english', CONCAT($columnsString)), websearch_to_tsquery('english', ?)) DESC",
                [$search]
            );
        }

        if ($driver === 'mysql') {
            // MySQL Full-Text Search fallback
            $columnsList = implode(',', $columns);
            return $query->whereRaw("MATCH($columnsList) AGAINST(? IN BOOLEAN MODE)", [$search]);
        }

        // Generic fallback for SQLite or other drivers
        return $query->where(function ($q) use ($search, $columns) {
            foreach ($columns as $column) {
                $q->orWhere($column, 'like', "%{$search}%");
            }
        });
    }
}

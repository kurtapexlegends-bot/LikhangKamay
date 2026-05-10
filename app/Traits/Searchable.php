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

        // Clean the search query
        $search = trim($search);
        
        // Use websearch_to_tsquery for "human-like" search behavior (supports quotes, minus for exclusion)
        $columnsString = implode(", ' ', ", array_map(fn($col) => "COALESCE($col, '')", $columns));
        
        return $query->whereRaw(
            "to_tsvector('english', CONCAT($columnsString)) @@ websearch_to_tsquery('english', ?)",
            [$search]
        )->orderByRaw(
            "ts_rank(to_tsvector('english', CONCAT($columnsString)), websearch_to_tsquery('english', ?)) DESC",
            [$search]
        );
    }
}

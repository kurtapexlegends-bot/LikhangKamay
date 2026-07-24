<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

class PostgresCompatibleBoolean implements CastsAttributes
{
    /**
     * Cast the given value from the database into a PHP boolean.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): bool
    {
        if (is_null($value)) {
            return false;
        }

        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * Prepare the given value for storage as a boolean string literal ('true' / 'false')
     * to satisfy both MySQL and strict PostgreSQL datatype constraints.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        $boolVal = filter_var($value, FILTER_VALIDATE_BOOLEAN);

        if ($model->getConnection()->getDriverName() === 'pgsql') {
            return $boolVal ? 'true' : 'false';
        }

        return $boolVal;
    }
}

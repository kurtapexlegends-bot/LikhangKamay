<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends Model
{
    use SoftDeletes;

    protected $fillable = ['name', 'slug'];

    protected static function booted()
    {
        static::saved(function () {
            \Illuminate\Support\Facades\Cache::forget('home_categories');
            \Illuminate\Support\Facades\Cache::forget('catalog_categories');
        });

        static::deleted(function () {
            \Illuminate\Support\Facades\Cache::forget('home_categories');
            \Illuminate\Support\Facades\Cache::forget('catalog_categories');
        });
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'category', 'name');
    }
}

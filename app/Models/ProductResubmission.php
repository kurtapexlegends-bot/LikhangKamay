<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductResubmission extends Model
{
    protected $fillable = ['product_id', 'notes', 'rejection_reason'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}

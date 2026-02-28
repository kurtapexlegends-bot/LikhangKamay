<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id', 'product_id', 'product_name', 
        'variant', 'price', 'cost', 'quantity', 'product_img'
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
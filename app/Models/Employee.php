<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    use HasFactory, \Illuminate\Database\Eloquent\SoftDeletes;

    protected $dates = ['deleted_at'];

    protected $fillable = [
        'user_id',
        'name',
        'role',
        'salary',
        'status',
        'join_date'
    ];

    // Optional: Relationship back to the Seller
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
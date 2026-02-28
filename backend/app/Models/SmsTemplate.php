<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SmsTemplate extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    protected $fillable = [
        'key',
        'name',
        'template_type',
        'content',
        'days_offset',
        'body',
        'active',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'active' => 'boolean',
        'is_active' => 'boolean',
    ];
}

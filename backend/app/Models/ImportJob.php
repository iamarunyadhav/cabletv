<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ImportJob extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    protected $fillable = [
        'type',
        'status',
        'file_path',
        'meta',
        'stats',
        'error',
    ];

    protected $casts = [
        'meta' => 'array',
        'stats' => 'array',
    ];
}

<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Package extends Model
{
    use HasFactory, HasUuidPrimaryKey, LogsActivity;

    protected $fillable = [
        'name',
        'price',
        'discount_type',
        'discount_value',
        'description',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
        'price' => 'decimal:2',
        'discount_value' => 'decimal:2',
    ];

    public function connections(): HasMany
    {
        return $this->hasMany(Connection::class);
    }
}

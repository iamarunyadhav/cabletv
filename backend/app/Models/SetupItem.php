<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SetupItem extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    protected $fillable = [
        'name',
        'price',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'price' => 'decimal:2',
    ];

    public function connectionSetupItems(): HasMany
    {
        return $this->hasMany(ConnectionSetupItem::class);
    }

    public function connections(): BelongsToMany
    {
        return $this->belongsToMany(Connection::class, 'connection_setup_items');
    }
}
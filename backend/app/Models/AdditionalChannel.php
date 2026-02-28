<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdditionalChannel extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    protected $fillable = [
        'name',
        'description',
        'monthly_amount',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'monthly_amount' => 'decimal:2',
    ];

    public function connectionAdditionalChannels(): HasMany
    {
        return $this->hasMany(ConnectionAdditionalChannel::class);
    }

    public function connections(): BelongsToMany
    {
        return $this->belongsToMany(Connection::class, 'connection_additional_channels');
    }
}
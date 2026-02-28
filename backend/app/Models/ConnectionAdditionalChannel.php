<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class ConnectionAdditionalChannel extends Pivot
{
    use HasFactory, HasUuidPrimaryKey;

    protected $table = 'connection_additional_channels';

    protected $fillable = [
        'connection_id',
        'additional_channel_id',
        'price_snapshot',
    ];

    protected $casts = [
        'price_snapshot' => 'decimal:2',
    ];

    public function connection(): BelongsTo
    {
        return $this->belongsTo(Connection::class);
    }

    public function additionalChannel(): BelongsTo
    {
        return $this->belongsTo(AdditionalChannel::class);
    }
}

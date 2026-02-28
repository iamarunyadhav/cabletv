<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConnectionSetupItem extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    protected $fillable = [
        'connection_id',
        'setup_item_id',
        'price_snapshot',
    ];

    protected $casts = [
        'price_snapshot' => 'decimal:2',
    ];

    public function connection(): BelongsTo
    {
        return $this->belongsTo(Connection::class);
    }

    public function setupItem(): BelongsTo
    {
        return $this->belongsTo(SetupItem::class);
    }
}
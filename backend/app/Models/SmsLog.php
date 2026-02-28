<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmsLog extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    protected $fillable = [
        'customer_id',
        'connection_id',
        'phone',
        'message',
        'type',
        'status',
        'delivery_status',
        'sent_at',
        'delivered_at',
        'provider_message_id',
        'provider_response',
        'cost',
        'error_message',
        'failed_reason',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'delivered_at' => 'datetime',
        'provider_response' => 'array',
        'cost' => 'decimal:4',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function connection(): BelongsTo
    {
        return $this->belongsTo(Connection::class);
    }
}
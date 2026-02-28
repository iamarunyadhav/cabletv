<?php

namespace App\Models;

use App\Enums\ConnectionStatus;
use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SuspensionHistory extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    protected $fillable = [
        'customer_id',
        'connection_id',
        'previous_status',
        'new_status',
        'action',
        'reason',
        'notes',
        'balance_at_time',
        'performed_by',
        'performed_at',
        'is_automated',
    ];

    protected $casts = [
        'balance_at_time' => 'decimal:2',
        'performed_at' => 'datetime',
        'is_automated' => 'boolean',
        'previous_status' => ConnectionStatus::class,
        'new_status' => ConnectionStatus::class,
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function connection(): BelongsTo
    {
        return $this->belongsTo(Connection::class);
    }

    public function performedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}

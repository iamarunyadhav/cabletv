<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BillingActionLog extends Model
{
    use HasUuidPrimaryKey;

    protected $fillable = [
        'billing_group_id',
        'billing_cycle_id',
        'customer_id',
        'connection_id',
        'action_type',
        'action_date',
        'run_id',
        'message',
        'metadata',
    ];

    protected $casts = [
        'action_date' => 'date',
        'metadata' => 'array',
    ];

    public function billingGroup(): BelongsTo
    {
        return $this->belongsTo(BillingGroup::class);
    }

    public function billingCycle(): BelongsTo
    {
        return $this->belongsTo(BillingCycle::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function connection(): BelongsTo
    {
        return $this->belongsTo(Connection::class);
    }
}

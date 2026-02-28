<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BillingCycle extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    protected $fillable = [
        'billing_group_id',
        'cycle_year',
        'cycle_month',
        'window_start',
        'window_end',
        'reminder_date',
        'grace_end',
        'disconnect_date',
        'invoicing_completed_at',
        'reminders_sent_at',
        'grace_marked_at',
        'disconnects_processed_at',
    ];

    protected $casts = [
        'window_start' => 'date',
        'window_end' => 'date',
        'reminder_date' => 'date',
        'grace_end' => 'date',
        'disconnect_date' => 'date',
        'invoicing_completed_at' => 'datetime',
        'reminders_sent_at' => 'datetime',
        'grace_marked_at' => 'datetime',
        'disconnects_processed_at' => 'datetime',
    ];

    public function billingGroup(): BelongsTo
    {
        return $this->belongsTo(BillingGroup::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(BillingNotification::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function isWindowOpen(CarbonInterface $date): bool
    {
        return $date->betweenIncluded(
            $this->window_start->startOfDay(),
            $this->window_end->endOfDay()
        );
    }
}

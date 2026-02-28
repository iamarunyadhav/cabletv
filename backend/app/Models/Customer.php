<?php

namespace App\Models;

use App\Enums\CustomerStatus;
use App\Models\Concerns\HasUuidPrimaryKey;
use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use HasFactory, HasUuidPrimaryKey, LogsActivity, SoftDeletes;

    protected $fillable = [
        'connection_id',
        'name',
        'email',
        'phone',
        'nic',
        'address',
        'agreement_number',
        'area_id',
        'billing_group_id',
        'status',
        'connection_date',
    ];

    protected $casts = [
        'connection_date' => 'date',
        'deleted_at' => 'datetime',
        'status' => CustomerStatus::class,
    ];

    public function billingGroup(): BelongsTo
    {
        return $this->belongsTo(BillingGroup::class);
    }

    public function connections(): HasMany
    {
        return $this->hasMany(Connection::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(LedgerEntry::class);
    }

    public function smsLogs(): HasMany
    {
        return $this->hasMany(SmsLog::class);
    }

    public function suspensionHistory(): HasMany
    {
        return $this->hasMany(SuspensionHistory::class);
    }
}

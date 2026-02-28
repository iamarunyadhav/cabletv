<?php

namespace App\Models;

use App\Enums\ConnectionStatus;
use App\Models\Concerns\HasUuidPrimaryKey;
use App\Models\Concerns\LogsActivity;
use App\Models\ConnectionAdditionalChannel;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Connection extends Model
{
    use HasFactory, HasUuidPrimaryKey, LogsActivity;

    protected $fillable = [
        'customer_id',
        'package_id',
        'box_number',
        'current_balance',
        'special_amount',
        'status',
        'activated_at',
        'postpone_start',
        'postpone_end',
        'suspended_at',
        'suspended_by',
        'suspension_reason',
    ];

    protected $casts = [
        'current_balance' => 'decimal:2',
        'special_amount' => 'decimal:2',
        'activated_at' => 'datetime',
        'postpone_start' => 'date',
        'postpone_end' => 'date',
        'suspended_at' => 'datetime',
        'status' => ConnectionStatus::class,
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    public function suspendedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'suspended_by');
    }

    public function connectionAdditionalChannels(): HasMany
    {
        return $this->hasMany(ConnectionAdditionalChannel::class);
    }

    public function connectionSetupItems(): HasMany
    {
        return $this->hasMany(ConnectionSetupItem::class);
    }

    public function additionalChannels(): BelongsToMany
    {
        return $this->belongsToMany(AdditionalChannel::class, 'connection_additional_channels')
            ->using(ConnectionAdditionalChannel::class);
    }

    public function setupItems(): BelongsToMany
    {
        return $this->belongsToMany(SetupItem::class, 'connection_setup_items');
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

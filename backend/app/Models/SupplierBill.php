<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class SupplierBill extends Model
{
    use HasFactory, HasUuidPrimaryKey, LogsActivity;

    protected $fillable = [
        'supplier_id',
        'bill_number',
        'reference_number',
        'bill_date',
        'period_start',
        'period_end',
        'due_date',
        'amount_due',
        'amount_paid',
        'status',
        'description',
        'notes',
    ];

    protected $casts = [
        'bill_date' => 'date',
        'due_date' => 'date',
        'period_start' => 'date',
        'period_end' => 'date',
        'amount_due' => 'decimal:2',
        'amount_paid' => 'decimal:2',
    ];

    protected $appends = [
        'balance_due',
        'is_overdue',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class);
    }

    public function getBalanceDueAttribute(): float
    {
        $due = (float) $this->amount_due;
        $paid = (float) $this->amount_paid;

        return max($due - $paid, 0);
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->due_date instanceof Carbon && $this->due_date->isPast() && $this->amount_paid < $this->amount_due;
    }

    public function getStatusAttribute($value): string
    {
        $paid = (float) $this->amount_paid;
        $due = (float) $this->amount_due;

        if ($paid >= $due) {
            return 'paid';
        }

        if ($this->getIsOverdueAttribute()) {
            return 'overdue';
        }

        if ($paid > 0) {
            return 'partial';
        }

        return $value ?: 'pending';
    }

    public function recalculateStatus(): void
    {
        $paidFromPayments = $this->payments()->sum('amount');
        $manualPaid = (float) ($this->amount_paid ?? 0);
        $paid = max($paidFromPayments, $manualPaid);

        $this->amount_paid = $paid;
        $this->status = $this->determineStatus($paid);
        $this->save();
    }

    private function determineStatus(float $paid): string
    {
        if ($paid >= (float) $this->amount_due) {
            return 'paid';
        }

        if ($this->getIsOverdueAttribute()) {
            return 'overdue';
        }

        if ($paid > 0) {
            return 'partial';
        }

        return 'pending';
    }
}

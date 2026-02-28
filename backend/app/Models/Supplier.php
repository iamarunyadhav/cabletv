<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Supplier extends Model
{
    use HasFactory, HasUuidPrimaryKey, LogsActivity;

    protected $fillable = [
        'code',
        'name',
        'contact_person',
        'phone',
        'email',
        'billing_email',
        'billing_cycle_start',
        'billing_cycle_end',
        'contract_amount',
        'address',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'contract_amount' => 'decimal:2',
    ];

    public function bills(): HasMany
    {
        return $this->hasMany(SupplierBill::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class);
    }

    protected static function booted(): void
    {
        static::creating(function (Supplier $supplier): void {
            if (empty($supplier->code)) {
                $supplier->code = $supplier->generateCodeFromName($supplier->name);
            }
        });
    }

    public function scopeWithFinancials($query)
    {
        return $query
            ->withSum('bills as total_billed', 'amount_due')
            ->withSum('bills as total_bill_paid', 'amount_paid')
            ->withSum('payments as total_payments', 'amount');
    }

    public function loadFinancials(): self
    {
        $this->loadSum('bills as total_billed', 'amount_due')
            ->loadSum('bills as total_bill_paid', 'amount_paid')
            ->loadSum('payments as total_payments', 'amount');

        $billed = (float) ($this->total_billed ?? 0);
        $paid = (float) ($this->total_bill_paid ?? 0);

        $this->setAttribute('outstanding_balance', max($billed - $paid, 0));

        return $this;
    }

    private function generateCodeFromName(string $name): string
    {
        $base = strtoupper(Str::slug($name, '_'));
        $base = $base !== '' ? substr($base, 0, 12) : 'SUPPLIER';

        $code = $base;
        $suffix = 1;

        while (
            static::query()
                ->where('code', $code)
                ->exists()
        ) {
            $code = $base . '_' . $suffix;
            $suffix++;
        }

        return $code;
    }
}

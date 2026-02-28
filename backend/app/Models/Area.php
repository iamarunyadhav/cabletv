<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Area extends Model
{
    use HasFactory, HasUuidPrimaryKey, LogsActivity;

    protected $fillable = [
        'name',
        'code',
        'description',
    ];

    public function billingGroups(): HasMany
    {
        return $this->hasMany(BillingGroup::class);
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }
}

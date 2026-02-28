<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Concerns\HasUuids;

trait HasUuidPrimaryKey
{
    use HasUuids;

    protected function initializeHasUuidPrimaryKey(): void
    {
        $this->incrementing = false;
        $this->keyType = 'string';
    }

    protected static function bootHasUuidPrimaryKey(): void
    {
        static::creating(function ($model): void {
            $model->incrementing = false;
            $model->keyType = 'string';
        });
    }
}

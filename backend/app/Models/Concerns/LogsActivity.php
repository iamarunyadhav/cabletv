<?php

namespace App\Models\Concerns;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

trait LogsActivity
{
    public static function bootLogsActivity(): void
    {
        static::created(function (Model $model): void {
            $model->writeAuditLog('INSERT', [], $model->getAuditSnapshot());
        });

        static::updated(function (Model $model): void {
            $old = $model->getOriginal();
            $new = $model->getAuditSnapshot();

            $ignore = array_merge(
                ['updated_at', 'created_at', 'deleted_at'],
                property_exists($model, 'auditIgnored') && is_array($model->auditIgnored) ? $model->auditIgnored : []
            );

            $changedKeys = array_values(array_diff(array_keys($model->getChanges()), $ignore));
            $oldData = Arr::only($old, $changedKeys);
            $newData = Arr::only($new, $changedKeys);

            if (! empty($newData)) {
                $model->writeAuditLog('UPDATE', $oldData, $newData);
            }
        });

        static::deleted(function (Model $model): void {
            $model->writeAuditLog('DELETE', $model->getAuditSnapshot(), []);
        });
    }

    protected function getAuditSnapshot(): array
    {
        $attributes = property_exists($this, 'auditAttributes') && is_array($this->auditAttributes)
            ? $this->auditAttributes
            : ($this->getFillable() ?: array_keys($this->getAttributes()));

        $hidden = array_merge(
            $this->getHidden(),
            property_exists($this, 'auditHidden') && is_array($this->auditHidden) ? $this->auditHidden : [],
            ['password', 'remember_token']
        );

        $filtered = Arr::except($this->getAttributes(), $hidden);

        return Arr::only($filtered, $attributes);
    }

    protected function writeAuditLog(string $action, array $oldData, array $newData): void
    {
        try {
            $user = Auth::user();
            $request = request();

            AuditLog::query()->create([
                'table_name' => $this->getTable(),
                'record_id' => (string) $this->getKey(),
                'action' => strtoupper($action),
                'old_data' => $oldData ?: null,
                'new_data' => $newData ?: null,
                'user_id' => $user?->id,
                'user_email' => $user?->email,
                'ip_address' => $request?->ip(),
                'user_agent' => $request?->userAgent(),
                'performed_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to write audit log', [
                'model' => static::class,
                'id' => $this->getKey(),
                'error' => $e->getMessage(),
            ]);
        }
    }
}

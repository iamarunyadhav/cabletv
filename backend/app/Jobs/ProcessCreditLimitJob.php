<?php

namespace App\Jobs;

use App\Models\AuditLog;
use App\Models\BillingGroup;
use App\Models\Customer;
use App\Support\SystemSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessCreditLimitJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(
        public readonly string $billingGroupId
    ) {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        /** @var BillingGroup|null $group */
        $group = BillingGroup::query()->find($this->billingGroupId);

        if (! $group) {
            Log::warning('Billing group not found for credit limit job', [
                'billing_group_id' => $this->billingGroupId,
            ]);

            $this->writeJobAuditLog('FAIL', [
                'job' => static::class,
                'billing_group_id' => $this->billingGroupId,
                'error' => 'Billing group not found.',
            ]);

            return;
        }

        $limit = (float) $group->maximum_debit_balance;
        if ($limit <= 0) {
            $this->writeJobAuditLog('RUN', [
                'job' => static::class,
                'billing_group_id' => $group->id,
                'maximum_debit_balance' => $limit,
                'note' => 'Credit limit disabled.',
            ]);

            return;
        }

        $processedCustomers = 0;
        $overLimitCustomers = 0;
        $overLimitConnections = 0;

        Customer::query()
            ->where('billing_group_id', $group->id)
            ->with([
                'connections' => fn ($query) => $query->select([
                    'id',
                    'customer_id',
                ]),
            ])
            ->withSum('connections as outstanding_balance', 'current_balance')
            ->orderBy('customers.id')
            ->chunkById(200, function (Collection $customers) use (
                $limit,
                &$processedCustomers,
                &$overLimitCustomers,
                &$overLimitConnections
            ): void {
                foreach ($customers as $customer) {
                    $processedCustomers++;
                    $outstanding = (float) ($customer->outstanding_balance ?? 0);

                    if ($outstanding <= $limit) {
                        continue;
                    }

                    $overLimitCustomers++;
                    $overLimitConnections += $customer->connections->count();
                }
            });

        $this->writeJobAuditLog('RUN', [
            'job' => static::class,
            'billing_group_id' => $group->id,
            'maximum_debit_balance' => $limit,
            'processed_customers' => $processedCustomers,
            'over_limit_customers' => $overLimitCustomers,
            'over_limit_connections' => $overLimitConnections,
            'mode' => 'monitor_only',
        ]);
    }

    public function failed(Throwable $e): void
    {
        $this->writeJobAuditLog('FAIL', [
            'job' => static::class,
            'billing_group_id' => $this->billingGroupId,
            'error' => $e->getMessage(),
        ]);
    }

    private function writeJobAuditLog(string $action, array $payload): void
    {
        if (! SystemSetting::bool('audit_log_queue_enabled', true)) {
            return;
        }

        try {
            AuditLog::query()->create([
                'table_name' => 'queue_jobs',
                'record_id' => $this->billingGroupId,
                'action' => strtoupper($action),
                'old_data' => null,
                'new_data' => $payload,
                'user_id' => null,
                'user_email' => null,
                'ip_address' => null,
                'user_agent' => null,
                'performed_at' => now(),
            ]);
        } catch (Throwable $e) {
            Log::warning('Failed to write job audit log', [
                'job' => static::class,
                'billing_group_id' => $this->billingGroupId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}

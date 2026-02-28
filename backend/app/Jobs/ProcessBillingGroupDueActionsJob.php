<?php

namespace App\Jobs;

use App\Models\AuditLog;
use App\Models\BillingGroup;
use App\Services\Billing\BillingCycleService;
use App\Services\Billing\BillingDueActionService;
use App\Support\SystemSetting;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessBillingGroupDueActionsJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(
        public readonly string $billingGroupId,
        public readonly string $runDate,
        public readonly string $runId,
        public readonly bool $dryRun = false,
    ) {
        $this->onQueue('default');
    }

    public function handle(
        BillingCycleService $billingCycleService,
        BillingDueActionService $billingDueActionService
    ): void {
        $group = BillingGroup::query()->find($this->billingGroupId);

        if (! $group) {
            Log::warning('Billing group not found for due actions job', [
                'billing_group_id' => $this->billingGroupId,
            ]);

            $this->writeJobAuditLog('FAIL', [
                'job' => static::class,
                'billing_group_id' => $this->billingGroupId,
                'run_date' => $this->runDate,
                'run_id' => $this->runId,
                'error' => 'Billing group not found.',
            ]);

            return;
        }

        $referenceDate = CarbonImmutable::parse($this->runDate)->startOfDay();
        $cycle = $billingCycleService->ensureCycle($group, $referenceDate);
        $summary = $billingDueActionService->processGroup(
            $group,
            $cycle,
            $referenceDate,
            $this->runId,
            $this->dryRun
        );

        $this->writeJobAuditLog('RUN', [
            'job' => static::class,
            'billing_group_id' => $group->id,
            'run_date' => $this->runDate,
            'run_id' => $this->runId,
            'dry_run' => $this->dryRun,
            'cycle_id' => $cycle->id,
            'summary' => $summary,
        ]);
    }

    public function failed(Throwable $e): void
    {
        $this->writeJobAuditLog('FAIL', [
            'job' => static::class,
            'billing_group_id' => $this->billingGroupId,
            'run_date' => $this->runDate,
            'run_id' => $this->runId,
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

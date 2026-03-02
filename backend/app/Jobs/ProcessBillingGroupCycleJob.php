<?php

namespace App\Jobs;

use App\Models\AuditLog;
use App\Models\BillingGroup;
use App\Services\Billing\BillingAutomationService;
use App\Services\Billing\BillingCycleService;
use App\Support\SystemSetting;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessBillingGroupCycleJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(
        public readonly string $billingGroupId,
        public readonly string $runDate,
    ) {
        $this->onQueue('default');
    }

    public function handle(
        BillingCycleService $billingCycleService,
        BillingAutomationService $billingAutomationService
    ): void {
        /** @var BillingGroup $group */
        $group = BillingGroup::query()->find($this->billingGroupId);

        if (! $group) {
            Log::warning('Billing group not found for cycle job', [
                'billing_group_id' => $this->billingGroupId,
            ]);

            $this->writeJobAuditLog('FAIL', [
                'job' => static::class,
                'billing_group_id' => $this->billingGroupId,
                'run_date' => $this->runDate,
                'error' => 'Billing group not found.',
            ]);

            return;
        }

        $referenceDate = CarbonImmutable::parse($this->runDate)->startOfDay();
        $cycle = $billingCycleService->ensureCycle($group, $referenceDate);
        $steps = [
            'invoices_generated' => false,
            'reminders_sent' => false,
            'grace_marked' => false,
            'disconnects_processed' => false,
        ];

        if (! $cycle->invoicing_completed_at && $referenceDate->greaterThanOrEqualTo($cycle->window_start)) {
            $billingAutomationService->generateInvoices($cycle);
            $billingAutomationService->sendRenewalNotices($cycle);
            $cycle->update(['invoicing_completed_at' => now()]);
            $steps['invoices_generated'] = true;
        }

        if (! $cycle->reminders_sent_at && $referenceDate->greaterThanOrEqualTo($cycle->reminder_date)) {
            $billingAutomationService->sendFriendlyReminders($cycle);
            $cycle->update(['reminders_sent_at' => now()]);
            $steps['reminders_sent'] = true;
        }

        if (! $cycle->grace_marked_at && $referenceDate->greaterThanOrEqualTo($cycle->grace_end)) {
            $billingAutomationService->markGraceAndOverdue($cycle);
            $cycle->update(['grace_marked_at' => now()]);
            $steps['grace_marked'] = true;
        }

        if (! $cycle->disconnects_processed_at && $referenceDate->greaterThanOrEqualTo($cycle->disconnect_date)) {
            $billingAutomationService->processDisconnects($cycle);
            $cycle->update(['disconnects_processed_at' => now()]);
            $steps['disconnects_processed'] = true;
        }

        $this->writeJobAuditLog('RUN', [
            'job' => static::class,
            'billing_group_id' => $group->id,
            'run_date' => $this->runDate,
            'cycle_id' => $cycle->id,
            'steps' => $steps,
        ]);
    }

    public function failed(Throwable $e): void
    {
        $this->writeJobAuditLog('FAIL', [
            'job' => static::class,
            'billing_group_id' => $this->billingGroupId,
            'run_date' => $this->runDate,
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



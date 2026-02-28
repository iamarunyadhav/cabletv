<?php

namespace App\Console\Commands;

use App\Jobs\ProcessCreditLimitJob;
use App\Models\AuditLog;
use App\Models\BillingGroup;
use App\Support\SystemSetting;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;
use Throwable;

class ProcessCreditLimitsCommand extends Command
{
    protected $signature = 'billing:process-credit-limits';

    protected $description = 'Queue credit-limit monitoring jobs for each billing group (no suspension)';

    public function handle(): int
    {
        try {
            $dispatched = 0;

            BillingGroup::query()
                ->orderBy('name')
                ->chunkById(50, function (Collection $groups) use (&$dispatched): void {
                    foreach ($groups as $group) {
                        ProcessCreditLimitJob::dispatch($group->id);
                        $dispatched++;
                    }
                });

            $this->info('Credit limit jobs dispatched.');

            $this->writeSchedulerAuditLog('RUN', [
                'command' => $this->getName(),
                'dispatched_jobs' => $dispatched,
            ]);

            return self::SUCCESS;
        } catch (Throwable $e) {
            $this->error($e->getMessage());

            $this->writeSchedulerAuditLog('FAIL', [
                'command' => $this->getName(),
                'error' => $e->getMessage(),
            ]);

            return self::FAILURE;
        }
    }

    private function writeSchedulerAuditLog(string $action, array $payload): void
    {
        if (! SystemSetting::bool('audit_log_scheduler_enabled', true)) {
            return;
        }

        try {
            AuditLog::query()->create([
                'table_name' => 'scheduler',
                'record_id' => $this->getName(),
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
            $this->warn('Scheduler audit log failed: '.$e->getMessage());
        }
    }
}

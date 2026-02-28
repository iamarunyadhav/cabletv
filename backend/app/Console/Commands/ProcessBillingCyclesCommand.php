<?php

namespace App\Console\Commands;

use App\Jobs\ProcessBillingGroupCycleJob;
use App\Models\AuditLog;
use App\Models\BillingGroup;
use App\Support\SystemSetting;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;
use Throwable;

class ProcessBillingCyclesCommand extends Command
{
    protected $signature = 'billing:process-cycles {--date=}';

    protected $description = 'Queue billing cycle automation for every billing group';

    public function handle(): int
    {
        try {
            $runDateInput = $this->option('date');
            $runDate = $runDateInput ? CarbonImmutable::parse($runDateInput) : CarbonImmutable::now();
            $runDay = (int) $runDate->day;
            $runDateString = $runDate->toDateString();
            $dispatched = 0;

            BillingGroup::query()
                ->where('billing_start_day', $runDay)
                ->orderBy('billing_start_day')
                ->chunkById(50, function (Collection $groups) use ($runDateString, &$dispatched): void {
                    foreach ($groups as $group) {
                        ProcessBillingGroupCycleJob::dispatch($group->id, $runDateString);
                        $dispatched++;
                    }
                });

            $this->info(sprintf(
                'Billing cycles dispatched for %s (day %d)',
                $runDateString,
                $runDay
            ));

            $this->writeSchedulerAuditLog('RUN', [
                'command' => $this->getName(),
                'run_date' => $runDateString,
                'run_day' => $runDay,
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

<?php

namespace App\Console\Commands;

use App\Jobs\ProcessBillingGroupDueActionsJob;
use App\Models\AuditLog;
use App\Models\BillingGroup;
use App\Support\SystemSetting;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;
use Throwable;

class ProcessDueActionsCommand extends Command
{
    protected $signature = 'billing:process-due-actions {--date=} {--dry-run}';

    protected $description = 'Queue daily friendly reminders and disconnect notices for every billing group';

    public function handle(): int
    {
        try {
            $runDateInput = $this->option('date');
            $runDate = $runDateInput ? CarbonImmutable::parse($runDateInput) : CarbonImmutable::now();
            $runDateString = $runDate->toDateString();
            $dryRun = (bool) $this->option('dry-run');
            $runId = (string) Str::uuid();
            $dispatched = 0;

            BillingGroup::query()
                ->orderBy('name')
                ->chunkById(50, function (Collection $groups) use (
                    $runDateString,
                    $runId,
                    $dryRun,
                    &$dispatched
                ): void {
                    foreach ($groups as $group) {
                        ProcessBillingGroupDueActionsJob::dispatch(
                            $group->id,
                            $runDateString,
                            $runId,
                            $dryRun
                        );
                        $dispatched++;
                    }
                });

            $this->info(sprintf(
                'Due actions queued for %s (%srun id: %s)',
                $runDateString,
                $dryRun ? 'dry run, ' : '',
                $runId
            ));

            $this->writeSchedulerAuditLog('RUN', [
                'command' => $this->getName(),
                'run_date' => $runDateString,
                'dry_run' => $dryRun,
                'run_id' => $runId,
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

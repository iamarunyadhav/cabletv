<?php

namespace App\Services\Billing;

use App\Enums\ConnectionStatus;
use App\Models\BillingActionLog;
use App\Models\BillingCycle;
use App\Models\BillingGroup;
use App\Models\Connection;
use App\Models\Customer;
use App\Services\Connections\ConnectionStatusAutomationService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class BillingDueActionService
{
    public function __construct(
        private readonly BillingAutomationService $billingAutomationService,
        private readonly ConnectionStatusAutomationService $connectionStatusAutomationService,
    ) {}

    /**
     * @return array{
     *     processed_customers: int,
     *     reminders_sent: int,
     *     disconnect_notices_sent: int,
     *     suspensions_made: int,
     *     skipped_existing: int,
     *     dry_run: bool,
     *     actions_run: bool
     * }
     */
    public function processGroup(
        BillingGroup $group,
        BillingCycle $cycle,
        CarbonImmutable $runDate,
        string $runId,
        bool $dryRun = false
    ): array {
        $limit = (float) $group->maximum_debit_balance;
        $actionDate = $runDate->toDateString();
        $isFriendlyReminderDay = $cycle->reminder_date && $runDate->isSameDay($cycle->reminder_date);
        $isDisconnectDay = $cycle->disconnect_date && $runDate->isSameDay($cycle->disconnect_date);

        if ($limit <= 0.0 || (! $isFriendlyReminderDay && ! $isDisconnectDay)) {
            return [
                'processed_customers' => 0,
                'reminders_sent' => 0,
                'disconnect_notices_sent' => 0,
                'suspensions_made' => 0,
                'skipped_existing' => 0,
                'dry_run' => $dryRun,
                'actions_run' => false,
            ];
        }

        $counters = [
            'processed_customers' => 0,
            'reminders_sent' => 0,
            'disconnect_notices_sent' => 0,
            'suspensions_made' => 0,
            'skipped_existing' => 0,
            'dry_run' => $dryRun,
            'actions_run' => true,
        ];

        $existingLogs = $this->existingLogsForDate($group->id, $actionDate);
        $friendlyReminderEnabled = $this->billingAutomationService->isWorkflowEnabled('friendly_reminder');
        $disconnectNoticeEnabled = $this->billingAutomationService->isWorkflowEnabled('disconnect_notice');
        $suspendNoticeEnabled = $this->billingAutomationService->isWorkflowEnabled('suspend_notice');

        Customer::query()
            ->where('billing_group_id', $group->id)
            ->with([
                'connections' => fn ($query) => $query->select([
                    'id',
                    'customer_id',
                    'box_number',
                    'status',
                    'current_balance',
                ]),
            ])
            ->withSum('connections as outstanding_balance', 'current_balance')
            ->orderBy('customers.id')
            ->chunkById(200, function (Collection $customers) use (
                $cycle,
                $limit,
                $isFriendlyReminderDay,
                $isDisconnectDay,
                $actionDate,
                $runId,
                $friendlyReminderEnabled,
                $disconnectNoticeEnabled,
                $suspendNoticeEnabled,
                $dryRun,
                &$counters,
                &$existingLogs
            ): void {
                foreach ($customers as $customer) {
                    $counters['processed_customers']++;
                    $outstanding = (float) ($customer->outstanding_balance ?? 0);

                    if ($outstanding <= $limit) {
                        continue;
                    }

                    $connections = $customer->connections;
                    if ($connections->isEmpty()) {
                        continue;
                    }
                    if ($isFriendlyReminderDay && $friendlyReminderEnabled) {
                        $this->sendFriendlyReminder(
                            $cycle,
                            $customer,
                            $connections,
                            $outstanding,
                            $limit,
                            $actionDate,
                            $runId,
                            $dryRun,
                            $existingLogs,
                            $counters
                        );
                    }

                    if ($isDisconnectDay) {
                        $this->processDisconnects(
                            $cycle,
                            $customer,
                            $connections,
                            $outstanding,
                            $limit,
                            $actionDate,
                            $runId,
                            $disconnectNoticeEnabled,
                            $suspendNoticeEnabled,
                            $dryRun,
                            $existingLogs,
                            $counters
                        );
                    }
                }
            });

        return $counters;
    }

    private function existingLogsForDate(string $billingGroupId, string $actionDate): array
    {
        $logs = BillingActionLog::query()
            ->where('billing_group_id', $billingGroupId)
            ->whereDate('action_date', $actionDate)
            ->get(['connection_id', 'action_type']);

        $grouped = [
            'friendly_reminder' => [],
            'disconnect_notice' => [],
            'auto_suspend' => [],
        ];

        foreach ($logs as $log) {
            if (! array_key_exists($log->action_type, $grouped)) {
                $grouped[$log->action_type] = [];
            }

            $grouped[$log->action_type][$log->connection_id] = true;
        }

        return $grouped;
    }

    private function sendFriendlyReminder(
        BillingCycle $cycle,
        Customer $customer,
        Collection $connections,
        float $outstanding,
        float $limit,
        string $actionDate,
        string $runId,
        bool $dryRun,
        array &$existingLogs,
        array &$counters
    ): void {
        $pendingConnections = $connections->filter(function (Connection $connection) use ($existingLogs): bool {
            return ! ($existingLogs['friendly_reminder'][$connection->id] ?? false);
        });

        if ($pendingConnections->isEmpty()) {
            $counters['skipped_existing'] += $connections->count();

            return;
        }

        if (! $dryRun) {
            $this->billingAutomationService->sendNotification(
                $cycle,
                $customer,
                'friendly_reminder',
                [
                    'outstanding' => $outstanding,
                    'limit' => $limit,
                    'minimum_payment' => max(0, $outstanding - $limit),
                    'disconnect_date' => $cycle->disconnect_date?->toDateString(),
                ],
            );
        }

        $message = sprintf(
            'Friendly reminder queued for outstanding %s exceeding limit %s.',
            number_format($outstanding, 2, '.', ','),
            number_format($limit, 2, '.', ','),
        );

        foreach ($pendingConnections as $connection) {
            $created = $this->createActionLog(
                $cycle,
                $customer,
                $connection,
                'friendly_reminder',
                $actionDate,
                $runId,
                $message,
                [
                    'outstanding' => $outstanding,
                    'limit' => $limit,
                    'dry_run' => $dryRun,
                ]
            );

            if ($created) {
                $existingLogs['friendly_reminder'][$connection->id] = true;
                $counters['reminders_sent']++;
            } else {
                $counters['skipped_existing']++;
            }
        }
    }

    private function processDisconnects(
        BillingCycle $cycle,
        Customer $customer,
        Collection $connections,
        float $outstanding,
        float $limit,
        string $actionDate,
        string $runId,
        bool $sendDisconnectNotice,
        bool $sendSuspendNotice,
        bool $dryRun,
        array &$existingLogs,
        array &$counters
    ): void {
        $noticeTargets = $sendDisconnectNotice
            ? $connections->filter(function (Connection $connection) use ($existingLogs): bool {
                return ! ($existingLogs['disconnect_notice'][$connection->id] ?? false);
            })
            : collect();

        $suspendTargets = $connections->filter(function (Connection $connection) use ($existingLogs): bool {
            return $connection->status === ConnectionStatus::Active
                && ! ($existingLogs['auto_suspend'][$connection->id] ?? false);
        });

        if ($noticeTargets->isNotEmpty() && ! $dryRun) {
            $this->billingAutomationService->sendNotification(
                $cycle,
                $customer,
                'disconnect_notice',
                [
                    'outstanding' => $outstanding,
                    'limit' => $limit,
                ],
            );
        }

        $noticeMessage = sprintf(
            'Disconnect notice queued for outstanding %s exceeding limit %s.',
            number_format($outstanding, 2, '.', ','),
            number_format($limit, 2, '.', ','),
        );

        foreach ($noticeTargets as $connection) {
            $created = $this->createActionLog(
                $cycle,
                $customer,
                $connection,
                'disconnect_notice',
                $actionDate,
                $runId,
                $noticeMessage,
                [
                    'outstanding' => $outstanding,
                    'limit' => $limit,
                    'dry_run' => $dryRun,
                ]
            );

            if ($created) {
                $existingLogs['disconnect_notice'][$connection->id] = true;
                $counters['disconnect_notices_sent']++;
            } else {
                $counters['skipped_existing']++;
            }
        }

        if ($suspendTargets->isEmpty()) {
            return;
        }

        $suspendMessage = sprintf(
            'Auto suspension executed on disconnect date with outstanding %s (limit %s).',
            number_format($outstanding, 2, '.', ','),
            number_format($limit, 2, '.', ','),
        );

        foreach ($suspendTargets as $connection) {
            $reason = sprintf(
                'Outstanding %s exceeds limit %s. Auto suspension on disconnect date.',
                number_format($outstanding, 2, '.', ','),
                number_format($limit, 2, '.', ','),
            );

            if (! $dryRun) {
                DB::transaction(function () use ($connection, $reason): void {
                    $this->connectionStatusAutomationService->transition(
                        $connection->fresh(),
                        ConnectionStatus::Suspended,
                        'auto_disconnect_date_suspend',
                        $reason
                    );
                });

                if ($sendSuspendNotice) {
                    $this->billingAutomationService->sendNotification(
                        $cycle,
                        $customer,
                        'suspend_notice',
                        [
                            'outstanding' => $outstanding,
                            'limit' => $limit,
                            'connection_no' => $connection->box_number,
                            'reason' => $reason,
                        ]
                    );
                }
            }

            $created = $this->createActionLog(
                $cycle,
                $customer,
                $connection,
                'auto_suspend',
                $actionDate,
                $runId,
                $suspendMessage,
                [
                    'outstanding' => $outstanding,
                    'limit' => $limit,
                    'dry_run' => $dryRun,
                ]
            );

            if ($created) {
                $existingLogs['auto_suspend'][$connection->id] = true;
                $counters['suspensions_made']++;
            } else {
                $counters['skipped_existing']++;
            }
        }
    }

    private function createActionLog(
        BillingCycle $cycle,
        Customer $customer,
        Connection $connection,
        string $actionType,
        string $actionDate,
        string $runId,
        string $message,
        array $metadata
    ): bool {
        $log = BillingActionLog::query()->firstOrCreate(
            [
                'connection_id' => $connection->id,
                'action_type' => $actionType,
                'action_date' => $actionDate,
            ],
            [
                'billing_group_id' => $cycle->billing_group_id,
                'billing_cycle_id' => $cycle->id,
                'customer_id' => $customer->id,
                'run_id' => $runId,
                'message' => $message,
                'metadata' => $metadata,
            ],
        );

        if (! $log->wasRecentlyCreated) {
            return false;
        }

        return true;
    }
}

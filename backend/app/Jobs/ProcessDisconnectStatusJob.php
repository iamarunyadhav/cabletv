<?php

namespace App\Jobs;

use App\Enums\ConnectionStatus;
use App\Models\Customer;
use App\Services\Connections\ConnectionStatusAutomationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessDisconnectStatusJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly string $customerId) {}

    public function handle(ConnectionStatusAutomationService $connectionStatusAutomationService): void
    {
        $customer = Customer::query()
            ->with('billingGroup')
            ->with([
                'connections' => fn ($query) => $query->select([
                    'id',
                    'customer_id',
                    'status',
                    'current_balance',
                ]),
            ])
            ->withSum('connections as outstanding_balance', 'current_balance')
            ->find($this->customerId);

        if (! $customer || ! $customer->billingGroup) {
            return;
        }

        $limit = (float) $customer->billingGroup->maximum_debit_balance;
        if ($limit <= 0) {
            return;
        }

        $outstanding = (float) ($customer->outstanding_balance ?? 0);
        if ($outstanding <= $limit) {
            return;
        }

        foreach ($customer->connections as $connection) {
            if ($connection->status !== ConnectionStatus::Active) {
                continue;
            }

            $minimumPayment = max(0, $outstanding - $limit);
            $reason = sprintf(
                'Minimum payment due: %s (balance %s exceeds limit %s).',
                number_format($minimumPayment, 2, '.', ','),
                number_format($outstanding, 2, '.', ','),
                number_format($limit, 2, '.', ','),
            );

            $connectionStatusAutomationService->transition(
                $connection,
                ConnectionStatus::Suspended,
                'auto_pending_disconnect',
                $reason,
            );
        }
    }
}

<?php

namespace App\Services\Connections;

use App\Enums\ConnectionStatus;
use App\Models\Connection;
use App\Models\SuspensionHistory;
use Illuminate\Support\Collection;

class ConnectionStatusAutomationService
{
    public function transition(
        Connection $connection,
        ConnectionStatus $newStatus,
        string $action,
        ?string $reason = null
    ): void {
        $previousStatus = $connection->status ?? ConnectionStatus::Pending;

        $payload = [
            'status' => $newStatus,
        ];

        if ($newStatus === ConnectionStatus::Suspended) {
            $payload['suspended_at'] = now();
            $payload['suspended_by'] = null;
            $payload['suspension_reason'] = $reason;
        } else {
            $payload['suspended_at'] = null;
            $payload['suspended_by'] = null;
            $payload['suspension_reason'] = null;
        }

        $connection->update($payload);

        SuspensionHistory::query()->create([
            'customer_id' => $connection->customer_id,
            'connection_id' => $connection->id,
            'previous_status' => $previousStatus,
            'new_status' => $newStatus,
            'action' => $action,
            'reason' => $reason,
            'notes' => null,
            'balance_at_time' => $connection->current_balance,
            'performed_by' => null,
            'performed_at' => now(),
            'is_automated' => true,
        ]);
    }

    public function resumeCustomerConnections(Collection $connections, string $action): void
    {
        foreach ($connections as $connection) {
            if ($connection->status === ConnectionStatus::Suspended) {
                $this->transition($connection, ConnectionStatus::Active, $action);
            }
        }
    }
}

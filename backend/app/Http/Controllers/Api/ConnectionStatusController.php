<?php

namespace App\Http\Controllers\Api;

use App\Enums\ConnectionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Connections\ConnectionStatusRequest;
use App\Http\Resources\ConnectionResource;
use App\Http\Resources\SuspensionHistoryResource;
use App\Models\Connection;
use App\Models\SuspensionHistory;
use App\Services\Billing\BillingAutomationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ConnectionStatusController extends Controller
{
    public function __construct(
        private readonly BillingAutomationService $billingAutomationService,
    ) {}

    public function bulkResume(Request $request): JsonResponse
    {
        $data = $request->validate([
            'connection_ids' => ['required', 'array'],
            'connection_ids.*' => ['uuid', 'exists:connections,id'],
        ]);

        $connections = Connection::query()
            ->whereIn('id', $data['connection_ids'])
            ->get();

        foreach ($connections as $connection) {
            $this->authorize('update', $connection->customer);
            $this->transition($connection, ConnectionStatus::Active, 'resumed', $request->get('notes'));
        }

        return response()->json(['message' => 'Connections resumed successfully.']);
    }

    public function activate(ConnectionStatusRequest $request, Connection $connection): ConnectionResource
    {
        $this->authorize('update', $connection->customer);

        $connection->update([
            'status' => ConnectionStatus::Active,
            'activated_at' => $connection->activated_at ?? now(),
            'postpone_start' => null,
            'postpone_end' => null,
            'suspended_at' => null,
            'suspension_reason' => null,
        ]);

        return new ConnectionResource($connection->fresh(['package']));
    }

    public function resume(ConnectionStatusRequest $request, Connection $connection): ConnectionResource
    {
        $this->authorize('update', $connection->customer);

        $this->transition($connection, ConnectionStatus::Active, 'resumed', $request->get('notes'));

        return new ConnectionResource($connection->fresh(['package']));
    }

    public function suspend(ConnectionStatusRequest $request, Connection $connection): ConnectionResource
    {
        $this->authorize('update', $connection->customer);

        $data = $request->validated();
        $connection->update([
            'status' => ConnectionStatus::Suspended,
            'suspended_at' => now(),
            'suspended_by' => Auth::id(),
            'suspension_reason' => $data['reason'] ?? null,
        ]);

        $this->recordHistory($connection, 'suspended', $data['reason'] ?? null, $data['notes'] ?? null);
        $this->sendManualNotification($connection, 'suspend_notice', $data['reason'] ?? null);

        return new ConnectionResource($connection->fresh(['package']));
    }

    public function postpone(ConnectionStatusRequest $request, Connection $connection): ConnectionResource
    {
        $this->authorize('update', $connection->customer);

        $data = $request->validated();
        $request->validate([
            'postpone_start' => ['required', 'date'],
            'postpone_end' => ['required', 'date', 'after_or_equal:postpone_start'],
        ]);

        $connection->update([
            'status' => ConnectionStatus::Postpone,
            'postpone_start' => $data['postpone_start'],
            'postpone_end' => $data['postpone_end'],
            'suspension_reason' => $data['reason'] ?? null,
        ]);

        $this->recordHistory($connection, 'postponed', $data['reason'] ?? null, $data['notes'] ?? null);

        return new ConnectionResource($connection->fresh(['package']));
    }

    public function disconnect(ConnectionStatusRequest $request, Connection $connection): ConnectionResource
    {
        $this->authorize('update', $connection->customer);

        $data = $request->validated();
        $connection->update([
            'status' => ConnectionStatus::Disconnect,
            'suspended_at' => now(),
            'suspension_reason' => $data['reason'] ?? null,
        ]);

        $this->recordHistory($connection, 'disconnected', $data['reason'] ?? null, $data['notes'] ?? null);
        $this->sendManualNotification($connection, 'disconnect_notice', $data['reason'] ?? null);

        return new ConnectionResource($connection->fresh(['package']));
    }

    public function history(Connection $connection)
    {
        $this->authorize('view', $connection->customer);

        return SuspensionHistoryResource::collection(
            $connection->suspensionHistory()
                ->with('performedBy.profile')
                ->orderByDesc('performed_at')
                ->get()
        );
    }

    protected function transition(Connection $connection, ConnectionStatus $status, string $action, ?string $notes = null): void
    {
        $previousStatus = $connection->status ?? ConnectionStatus::Pending;

        $connection->update([
            'status' => $status,
            'postpone_start' => null,
            'postpone_end' => null,
            'suspended_at' => null,
            'suspended_by' => null,
            'suspension_reason' => null,
        ]);

        $this->recordHistory($connection, $action, null, $notes, $previousStatus);
    }

    protected function recordHistory(
        Connection $connection,
        string $action,
        ?string $reason,
        ?string $notes,
        ?ConnectionStatus $previousStatus = null
    ): void {
        SuspensionHistory::query()->create([
            'customer_id' => $connection->customer_id,
            'connection_id' => $connection->id,
            'previous_status' => $previousStatus ?? $connection->status,
            'new_status' => $connection->status,
            'action' => $action,
            'reason' => $reason,
            'notes' => $notes,
            'balance_at_time' => $connection->current_balance,
            'performed_by' => Auth::id(),
            'performed_at' => now(),
            'is_automated' => false,
        ]);
    }

    protected function sendManualNotification(Connection $connection, string $workflowKey, ?string $reason = null): void
    {
        $connection->loadMissing('customer.billingGroup', 'package');
        $customer = $connection->customer;

        if (! $customer) {
            return;
        }

        $payload = [
            'connection_no' => $connection->box_number ?? $connection->id,
            'package' => $connection->package->name ?? '',
            'reason' => $reason ?? '',
            'outstanding' => (float) ($connection->current_balance ?? 0),
            'limit' => (float) ($customer->billingGroup?->maximum_debit_balance ?? 0),
        ];

        $this->billingAutomationService->sendNotification(null, $customer, $workflowKey, $payload);
    }
}

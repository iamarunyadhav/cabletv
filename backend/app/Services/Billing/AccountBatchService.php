<?php

namespace App\Services\Billing;

use App\Models\AccountBatch;
use App\Models\AccountBatchLine;
use App\Models\Connection;
use App\Models\Customer;
use App\Models\LedgerEntry;
use App\Services\Support\SequenceService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class AccountBatchService
{
    public function __construct(private readonly SequenceService $sequenceService) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public function create(Customer $customer, array $payload): AccountBatch
    {
        return DB::transaction(function () use ($customer, $payload): AccountBatch {
            $connections = $customer->connections()->lockForUpdate()->get();
            if ($connections->isEmpty()) {
                throw new InvalidArgumentException('Customer has no connections to apply balances.');
            }

            $receipt = $this->generateReceiptNumber();

            /** @var AccountBatch $batch */
            $batch = AccountBatch::query()->create([
                'customer_id' => $customer->id,
                'connection_id' => $payload['connection_id'] ?? null,
                'batch_date' => $payload['batch_date'] ?? now()->toDateString(),
                'memo' => $payload['memo'] ?? null,
                'receipt_number' => $receipt,
                'created_by' => Auth::id(),
            ]);

            $linesPayload = $payload['lines'] ?? [];
            $totalBalance = (float) $customer->connections()->sum('current_balance');

            foreach ($linesPayload as $line) {
                $amount = round((float) ($line['amount'] ?? 0), 2);
                $direction = strtolower($line['direction'] ?? '');
                if ($amount <= 0 || ! in_array($direction, ['debit', 'credit'], true)) {
                    continue;
                }

                $targetConnection = $this->resolveConnection($connections, $line['connection_id'] ?? $batch->connection_id);

                if ($direction === 'debit') {
                    $totalBalance = $this->applyDebit($targetConnection, $amount, $customer);
                } else {
                    $totalBalance = $this->applyCredit($connections, $amount, $targetConnection, $customer);
                }

                $ledger = LedgerEntry::query()->create([
                    'customer_id' => $customer->id,
                    'connection_id' => $targetConnection?->id,
                    'type' => $direction === 'debit' ? 'batch_debit' : 'batch_credit',
                    'description' => sprintf('%s (Batch %s)', $line['label'] ?? ucfirst($direction), $batch->receipt_number ?? $batch->id),
                    'memo' => $line['notes'] ?? ($payload['memo'] ?? null),
                    'amount' => $direction === 'debit' ? $amount : -$amount,
                    'balance_after' => $totalBalance,
                    'reference_id' => $batch->id,
                ]);

                $batchLine = AccountBatchLine::query()->create([
                    'batch_id' => $batch->id,
                    'label' => $line['label'] ?? ucfirst($direction),
                    'direction' => $direction,
                    'amount' => $amount,
                    'connection_id' => $targetConnection?->id,
                    'notes' => $line['notes'] ?? null,
                    'ledger_entry_id' => $ledger->id,
                ]);
            }

            return $batch->load(['lines.connection', 'customer', 'createdBy']);
        });
    }

    private function generateReceiptNumber(): ?string
    {
        try {
            return $this->sequenceService->next('account_batch', null);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @param  Collection<int, Connection>  $connections
     */
    private function resolveConnection(Collection $connections, ?string $connectionId): ?Connection
    {
        if ($connectionId) {
            return $connections->firstWhere('id', $connectionId);
        }

        return $connections->sortByDesc('current_balance')->first();
    }

    private function applyDebit(?Connection $connection, float $amount, Customer $customer): float
    {
        if (! $connection) {
            throw new InvalidArgumentException('No connection available for debit.');
        }

        $amount = round($amount, 2);
        $connection->update(['current_balance' => round((float) $connection->current_balance + $amount, 2)]);

        return (float) $customer->connections()->sum('current_balance');
    }

    /**
     * @param  Collection<int, Connection>  $connections
     */
    private function applyCredit(Collection $connections, float $amount, ?Connection $targetConnection, Customer $customer): float
    {
        $amount = round($amount, 2);
        if ($amount <= 0) {
            return (float) $customer->connections()->sum('current_balance');
        }

        if ($targetConnection) {
            $current = (float) $targetConnection->current_balance;
            $targetConnection->update(['current_balance' => round($current - $amount, 2)]);

            return (float) $customer->connections()->sum('current_balance');
        }

        $remaining = $amount;
        foreach ($connections->sortByDesc('current_balance') as $conn) {
            if ($remaining <= 0) {
                break;
            }

            $current = (float) $conn->current_balance;
            if ($current <= 0) {
                continue;
            }

            $deduction = round(min($current, $remaining), 2);
            $conn->update(['current_balance' => round($current - $deduction, 2)]);
            $remaining = round($remaining - $deduction, 2);
        }

        if ($remaining > 0) {
            $target = $connections->sortByDesc('current_balance')->first();
            if ($target) {
                $target->update([
                    'current_balance' => round((float) $target->current_balance - $remaining, 2),
                ]);
            }
        }

        return (float) $customer->connections()->sum('current_balance');
    }
}

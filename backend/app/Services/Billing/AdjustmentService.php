<?php

namespace App\Services\Billing;

use App\Models\Connection;
use App\Models\Customer;
use App\Models\LedgerEntry;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class AdjustmentService
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function adjust(Customer $customer, array $payload): LedgerEntry
    {
        return DB::transaction(function () use ($customer, $payload): LedgerEntry {
            $connection = null;
            if (! empty($payload['connection_id'])) {
                $connection = $customer->connections()
                    ->lockForUpdate()
                    ->whereKey($payload['connection_id'])
                    ->firstOrFail();
            }

            $amount = round((float) $payload['amount'], 2);
            $signedAmount = $payload['type'] === 'credit'
                ? -abs($amount)
                : abs($amount);

            $this->applyAdjustmentToConnections($customer, $connection, $signedAmount);

            $totalBalance = (float) $customer->connections()->sum('current_balance');

            return LedgerEntry::query()->create([
                'customer_id' => $customer->id,
                'connection_id' => $connection?->id,
                'type' => 'adjustment_'.$payload['type'],
                'description' => $payload['reason'],
                'amount' => $signedAmount,
                'balance_after' => $totalBalance,
            ]);
        });
    }

    private function applyAdjustmentToConnections(Customer $customer, ?Connection $connection, float $signedAmount): void
    {
        $signedAmount = round($signedAmount, 2);
        if ($signedAmount === 0.0) {
            return;
        }

        if ($connection) {
            $connection->update([
                'current_balance' => round((float) $connection->current_balance + $signedAmount, 2),
            ]);

            return;
        }

        if ($signedAmount > 0) {
            $target = $customer->connections()->lockForUpdate()->latest()->first();
            if ($target) {
                $target->update([
                    'current_balance' => round((float) $target->current_balance + $signedAmount, 2),
                ]);
            }

            return;
        }

        /** @var Collection<int, Connection> $connections */
        $connections = $customer->connections()
            ->lockForUpdate()
            ->orderByDesc('current_balance')
            ->get();

        $remaining = round(abs($signedAmount), 2);
        foreach ($connections as $conn) {
            if ($remaining <= 0) {
                break;
            }

            $balance = (float) $conn->current_balance;
            if ($balance <= 0) {
                continue;
            }

            $deduction = round(min($balance, $remaining), 2);
            $conn->update(['current_balance' => round($balance - $deduction, 2)]);
            $remaining = round($remaining - $deduction, 2);
        }

        if ($remaining > 0 && $connections->isNotEmpty()) {
            $target = $connections->first();
            $target->update([
                'current_balance' => round((float) $target->current_balance - $remaining, 2),
            ]);
        }
    }
}

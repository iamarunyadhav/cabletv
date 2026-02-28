<?php

namespace App\Services\Billing;

use App\Models\Connection;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\LedgerEntry;
use App\Models\NumberSequence;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Services\Support\SequenceService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    public function __construct(private readonly SequenceService $sequenceService) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public function create(Customer $customer, array $payload): Payment
    {
        $attempts = 0;

        while (true) {
            try {
                return DB::transaction(function () use ($customer, $payload): Payment {
                    /** @var Connection|null $connection */
                    $connection = null;
                    if (! empty($payload['connection_id'])) {
                        $connection = $customer->connections()
                            ->lockForUpdate()
                            ->whereKey($payload['connection_id'])
                            ->firstOrFail();
                    }

                    $receiptNumber = $this->sequenceService->next('receipt');

                    $payment = Payment::query()->create([
                        'customer_id' => $customer->id,
                        'connection_id' => $connection?->id,
                        'payment_agent_id' => $payload['collector_id'] ?? null,
                        'recorded_by' => Auth::id(),
                        'receipt_number' => $receiptNumber,
                        'payment_method' => $payload['payment_method'],
                        'amount' => $payload['amount'],
                        'payment_date' => $payload['payment_date'],
                        'reference_number' => $payload['reference_number'] ?? null,
                        'notes' => $payload['notes'] ?? null,
                    ]);

                    $this->storeAllocations($payment, $payload['allocations'] ?? []);

                    $this->applyPaymentToConnections($customer, $connection, (float) $payload['amount']);

                    $totalBalance = (float) $customer->connections()->sum('current_balance');

                    LedgerEntry::query()->create([
                        'customer_id' => $customer->id,
                        'connection_id' => $connection?->id,
                        'type' => 'payment',
                        'description' => sprintf('Payment - Receipt %s', $receiptNumber),
                        'memo' => $payload['notes'] ?? null,
                        'amount' => -abs((float) $payload['amount']),
                        'balance_after' => $totalBalance,
                        'reference_id' => $payment->id,
                    ]);

                    return $payment->fresh([
                        'connection',
                        'paymentAgent',
                        'allocations.invoice',
                        'ledgerEntry',
                    ]);
                });
            } catch (UniqueConstraintViolationException $exception) {
                $attempts += 1;
                if ($attempts > 2) {
                    throw $exception;
                }

                $this->syncReceiptSequence();
            }
        }
    }

    private function storeAllocations(Payment $payment, array $allocations): void
    {
        foreach ($allocations as $allocation) {
            $amount = round((float) Arr::get($allocation, 'amount', 0), 2);
            if ($amount <= 0) {
                continue;
            }

            $allocationModel = PaymentAllocation::query()->create([
                'payment_id' => $payment->id,
                'invoice_id' => $allocation['invoice_id'],
                'amount' => $amount,
            ]);

            /** @var Invoice $invoice */
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($allocationModel->invoice_id);
            $newPaidAmount = round((float) $invoice->paid_amount + $amount, 2);

            $invoice->paid_amount = $newPaidAmount;
            if ($newPaidAmount >= (float) $invoice->total_amount) {
                $invoice->status = 'paid';
            } elseif ($newPaidAmount > 0) {
                $invoice->status = 'partially_paid';
            }
            $invoice->save();
        }
    }

    private function applyPaymentToConnections(Customer $customer, ?Connection $connection, float $amount): void
    {
        $amount = round($amount, 2);
        if ($amount <= 0) {
            return;
        }

        if ($connection) {
            $connection->update([
                'current_balance' => round((float) $connection->current_balance - $amount, 2),
            ]);

            return;
        }

        /** @var Collection<int, Connection> $connections */
        $connections = $customer->connections()
            ->lockForUpdate()
            ->orderByDesc('current_balance')
            ->get();

        $remaining = $amount;
        foreach ($connections as $conn) {
            if ($remaining <= 0) {
                break;
            }

            $currentBalance = (float) $conn->current_balance;
            if ($currentBalance <= 0) {
                continue;
            }

            $deduction = round(min($currentBalance, $remaining), 2);
            $conn->update(['current_balance' => round($currentBalance - $deduction, 2)]);
            $remaining = round($remaining - $deduction, 2);
        }

        if ($remaining > 0 && $connections->isNotEmpty()) {
            $target = $connections->first();
            $target->update([
                'current_balance' => round((float) $target->current_balance - $remaining, 2),
            ]);
        }
    }

    private function syncReceiptSequence(): void
    {
        DB::transaction(function (): void {
            $sequence = NumberSequence::query()
                ->lockForUpdate()
                ->where('key', 'receipt')
                ->first();

            if (! $sequence) {
                return;
            }

            $period = now()->format('Ym');
            $prefix = $sequence->prefix ? $sequence->prefix.'-' : '';
            $pattern = $prefix.$period.'-';

            $latest = Payment::query()
                ->where('receipt_number', 'like', $pattern.'%')
                ->orderByDesc('receipt_number')
                ->value('receipt_number');

            if (! $latest) {
                return;
            }

            $parts = explode('-', (string) $latest);
            $numeric = (int) end($parts);

            if ($numeric > (int) $sequence->current_value) {
                $sequence->current_value = $numeric;
                $sequence->save();
            }
        });
    }
}

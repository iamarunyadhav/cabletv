<?php

namespace App\Services\Billing;

use App\Models\BillingCycle;
use App\Models\Connection;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\LedgerEntry;
use App\Services\Support\SequenceService;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class InvoiceService
{
    public function __construct(
        private readonly SequenceService $sequenceService,
        private readonly ConnectionPricingService $connectionPricingService,
    ) {}

    public function generateForConnection(
        Connection $connection,
        CarbonInterface $periodStart,
        CarbonInterface $periodEnd,
        ?BillingCycle $billingCycle = null
    ): Invoice {
        $connection->loadMissing([
            'customer.billingGroup',
            'package',
            'connectionAdditionalChannels.additionalChannel',
        ]);

        $items = Collection::make();

        $pricing = $this->connectionPricingService->computeTotals($connection);
        $basePackagePrice = $pricing['base_price'];
        $items->push([
            'type' => 'package',
            'description' => sprintf('%s - Monthly Subscription', $connection->package?->name ?? 'Package'),
            'quantity' => 1,
            'unit_price' => $basePackagePrice,
            'line_total' => $basePackagePrice,
            'ref_id' => $connection->package?->id,
        ]);

        foreach ($connection->connectionAdditionalChannels as $channel) {
            $amount = (float) ($channel->price_snapshot ?? $channel->additionalChannel?->monthly_amount ?? 0);
            $items->push([
                'type' => 'additional_channel',
                'description' => sprintf('%s - Additional Channel', $channel->additionalChannel?->name ?? 'Channel'),
                'quantity' => 1,
                'unit_price' => $amount,
                'line_total' => $amount,
                'ref_id' => $channel->additional_channel_id,
            ]);
        }

        $subtotal = $items->sum('line_total');
        $discountAmount = $this->calculateDiscount(
            $subtotal,
            $connection->package?->discount_type ?? 'none',
            (float) ($connection->package?->discount_value ?? 0),
        );
        $totalAmount = max($subtotal - $discountAmount, 0);

        $billingGroup = $connection->customer?->billingGroup;
        $graceDays = $billingGroup?->grace_days ?? 5;
        $dueDate = $periodEnd->copy()->addDays($graceDays);

        return DB::transaction(function () use (
            $connection,
            $periodStart,
            $periodEnd,
            $items,
            $discountAmount,
            $totalAmount,
            $dueDate,
            $billingCycle
        ): Invoice {
            $invoiceNumber = $this->sequenceService->next('invoice');

            $invoice = Invoice::query()->create([
                'invoice_number' => $invoiceNumber,
                'customer_id' => $connection->customer_id,
                'connection_id' => $connection->id,
                'billing_cycle_id' => $billingCycle?->id,
                'billing_period_start' => $periodStart->toDateString(),
                'billing_period_end' => $periodEnd->toDateString(),
                'period_start' => $periodStart->toDateString(),
                'period_end' => $periodEnd->toDateString(),
                'amount' => $items->sum('line_total'),
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'paid_amount' => 0,
                'status' => 'unpaid',
                'due_date' => $dueDate->toDateString(),
                'is_prorated' => false,
            ]);

            $timestamp = now();
            foreach ($items as $item) {
                InvoiceItem::query()->create(array_merge($item, [
                    'invoice_id' => $invoice->id,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ]));
            }

            $newBalance = (float) $connection->current_balance + $totalAmount;
            $connection->update(['current_balance' => $newBalance]);

            $customerOutstanding = (float) Connection::query()
                ->where('customer_id', $connection->customer_id)
                ->sum('current_balance');

            $description = sprintf(
                'Invoice %s - %s%s [%s - %s]',
                $invoiceNumber,
                $connection->package?->name ?? 'Package',
                $connection->box_number ? sprintf(' (Box %s)', $connection->box_number) : '',
                $periodStart->toDateString(),
                $periodEnd->toDateString(),
            );

            LedgerEntry::query()->create([
                'customer_id' => $connection->customer_id,
                'connection_id' => $connection->id,
                'billing_cycle_id' => $billingCycle?->id,
                'type' => 'charge',
                'description' => $description,
                'memo' => null,
                'amount' => $totalAmount,
                'balance_after' => $customerOutstanding,
                'reference_id' => $invoice->id,
            ]);

            return $invoice->fresh(['items', 'customer', 'connection']);
        });
    }

    private function calculateDiscount(float $subtotal, string $type, float $value): float
    {
        return match ($type) {
            'percentage' => ($subtotal * $value) / 100,
            'fixed' => $value,
            default => 0,
        };
    }
}

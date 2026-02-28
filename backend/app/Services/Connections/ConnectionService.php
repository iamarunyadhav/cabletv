<?php

namespace App\Services\Connections;

use App\Models\AdditionalChannel;
use App\Models\Connection;
use App\Models\ConnectionSetupItem;
use App\Models\Customer;
use App\Models\LedgerEntry;
use App\Models\Package;
use App\Models\SetupItem;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ConnectionService
{
    public function listForCustomer(Customer $customer): Collection
    {
        return $customer->connections()
            ->with([
                'customer.billingGroup',
                'package',
                'additionalChannels',
                'setupItems',
            ])
            ->latest()
            ->get();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function createForCustomer(Customer $customer, array $payload): Connection
    {
        return DB::transaction(function () use ($customer, $payload): Connection {
            $packageId = $payload['package_id'] ?? $this->resolveDefaultPackageId();

            if (! $packageId) {
                throw new \RuntimeException('Default package not configured.');
            }

            $connection = Connection::query()->create([
                'customer_id' => $customer->id,
                'package_id' => $packageId,
                'box_number' => $payload['box_number'],
                'special_amount' => $payload['special_amount'] ?? null,
                'activated_at' => $payload['activation_date'] ?? now(),
                'status' => Arr::get($payload, 'status', 'pending'),
                'current_balance' => 0,
            ]);

            $this->syncAdditionalChannels($connection, $payload['additional_channel_ids'] ?? []);
            $this->syncSetupItems($connection, $payload['setup_item_ids'] ?? [], false);

            $currentBalance = (float) $connection->current_balance;

            $setupItemIds = $payload['setup_item_ids'] ?? [];
            if (! empty($setupItemIds)) {
                $setupItems = SetupItem::query()
                    ->whereIn('id', $setupItemIds)
                    ->get(['id', 'name', 'price']);

                foreach ($setupItems as $item) {
                    $currentBalance = $this->addLedgerCharge(
                        $connection,
                        (float) $item->price,
                        sprintf('Setup item charge: %s', $item->name),
                        $currentBalance,
                    );
                }
            }

            $setupBoxPrice = (float) Arr::get($payload, 'setup_box.price', 0);
            if ($setupBoxPrice > 0) {
                $description = Arr::get($payload, 'setup_box.recurring')
                    ? 'Setup box installment charge'
                    : 'Setup box one-time charge';

                $currentBalance = $this->addLedgerCharge($connection, $setupBoxPrice, $description, $currentBalance);
            }

            $firstCycleCharge = (float) ($payload['first_cycle_charge'] ?? 0);
            if ($firstCycleCharge > 0) {
                $description = sprintf('Prorated package charge (%s days)', $payload['prorated_days'] ?? '?');
                $currentBalance = $this->addLedgerCharge($connection, $firstCycleCharge, $description, $currentBalance);
            }

            $connection->update(['current_balance' => $currentBalance]);

            return $connection->fresh([
                'package',
                'additionalChannels',
                'setupItems',
            ]);
        });
    }

    private function resolveDefaultPackageId(): ?string
    {
        $defaultName = config('billing.default_package_name', 'Basic');

        return Package::query()
            ->where('name', $defaultName)
            ->value('id');
    }

    private function syncAdditionalChannels(Connection $connection, array $channelIds): void
    {
        $connection->additionalChannels()->detach();

        if (empty($channelIds)) {
            return;
        }

        $channels = AdditionalChannel::query()
            ->whereIn('id', $channelIds)
            ->get(['id', 'monthly_amount']);

        foreach ($channels as $channel) {
            $connection->additionalChannels()->attach($channel->id, [
                'id' => (string) Str::uuid(),
                'price_snapshot' => $channel->monthly_amount,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function updateConnection(Connection $connection, array $payload): Connection
    {
        return DB::transaction(function () use ($connection, $payload): Connection {
            $previousSetupTotal = 0.0;
            if (array_key_exists('setup_item_ids', $payload)) {
                $connection->loadMissing('connectionSetupItems');
                $previousSetupTotal = (float) $connection->connectionSetupItems->sum('price_snapshot');
            }

            if (array_key_exists('box_number', $payload)) {
                $connection->box_number = $payload['box_number'];
            }

            if (array_key_exists('package_id', $payload)) {
                $connection->package_id = $payload['package_id'];
            }

            if (array_key_exists('special_amount', $payload)) {
                $connection->special_amount = $payload['special_amount'];
            }

            if (isset($payload['status'])) {
                $connection->status = $payload['status'];
            }

            if (isset($payload['activation_date'])) {
                $connection->activated_at = $payload['activation_date'];
            }

            $connection->save();

            if (array_key_exists('additional_channel_ids', $payload)) {
                $this->syncAdditionalChannels($connection, $payload['additional_channel_ids'] ?? []);
            }

            if (array_key_exists('setup_item_ids', $payload)) {
                $this->syncSetupItems($connection, $payload['setup_item_ids'] ?? [], true);

                $newSetupTotal = 0.0;
                $setupItemIds = $payload['setup_item_ids'] ?? [];
                if (! empty($setupItemIds)) {
                    $newSetupTotal = (float) SetupItem::query()
                        ->whereIn('id', $setupItemIds)
                        ->sum('price');
                }

                $delta = round($newSetupTotal - $previousSetupTotal, 2);
                if ($delta !== 0.0) {
                    $currentBalance = (float) $connection->current_balance;
                    $currentBalance = $this->addLedgerAdjustment(
                        $connection,
                        $delta,
                        'Setup items updated',
                        $currentBalance,
                    );
                    $connection->update(['current_balance' => $currentBalance]);
                }
            }

            return $connection->fresh([
                'package',
                'additionalChannels',
                'setupItems',
            ]);
        });
    }

    private function syncSetupItems(Connection $connection, array $itemIds, bool $replaceExisting = false): void
    {
        if ($replaceExisting) {
            $connection->connectionSetupItems()->delete();
        }

        if (empty($itemIds)) {
            return;
        }

        $items = SetupItem::query()
            ->whereIn('id', $itemIds)
            ->get(['id', 'price']);

        foreach ($items as $item) {
            ConnectionSetupItem::query()->create([
                'connection_id' => $connection->id,
                'setup_item_id' => $item->id,
                'price_snapshot' => $item->price,
            ]);
        }
    }

    private function addLedgerCharge(Connection $connection, float $amount, string $description, float $currentBalance): float
    {
        $newBalance = $currentBalance + $amount;

        LedgerEntry::query()->create([
            'customer_id' => $connection->customer_id,
            'connection_id' => $connection->id,
            'type' => 'charge',
            'description' => $description,
            'amount' => $amount,
            'balance_after' => $newBalance,
        ]);

        return $newBalance;
    }

    private function addLedgerAdjustment(Connection $connection, float $amount, string $description, float $currentBalance): float
    {
        if ($amount === 0.0) {
            return $currentBalance;
        }

        $signedAmount = round($amount, 2);
        $newBalance = $currentBalance + $signedAmount;
        $type = $signedAmount > 0 ? 'adjustment_debit' : 'adjustment_credit';

        LedgerEntry::query()->create([
            'customer_id' => $connection->customer_id,
            'connection_id' => $connection->id,
            'type' => $type,
            'description' => $description,
            'amount' => $signedAmount,
            'balance_after' => $newBalance,
        ]);

        return $newBalance;
    }
}

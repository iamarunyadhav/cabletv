<?php

namespace App\Services\Billing;

use App\Models\Connection;

class ConnectionPricingService
{
    /**
     * @return array{base_price: float, channels_total: float, grand_total: float}
     */
    public function computeTotals(Connection $connection): array
    {
        $connection->loadMissing([
            'package',
            'connectionAdditionalChannels.additionalChannel',
        ]);

        $basePrice = (float) ($connection->special_amount ?? $connection->package?->price ?? 0);
        $channelsTotal = (float) $connection->connectionAdditionalChannels->sum(function ($channel) {
            return (float) ($channel->price_snapshot ?? $channel->additionalChannel?->monthly_amount ?? 0);
        });

        return [
            'base_price' => $basePrice,
            'channels_total' => $channelsTotal,
            'grand_total' => $basePrice + $channelsTotal,
        ];
    }

    public function computeMonthlyCharge(Connection $connection): float
    {
        $totals = $this->computeTotals($connection);
        $discount = $this->calculateDiscount(
            $totals['grand_total'],
            $connection->package?->discount_type ?? 'none',
            (float) ($connection->package?->discount_value ?? 0),
        );

        return max($totals['grand_total'] - $discount, 0);
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

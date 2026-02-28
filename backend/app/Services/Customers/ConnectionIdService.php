<?php

namespace App\Services\Customers;

use App\Models\BillingGroup;
use App\Models\Customer;
use Illuminate\Support\Str;
use RuntimeException;

class ConnectionIdService
{
    /**
     * @var array<string, int>
     */
    private array $sequenceCache = [];

    /**
     * @return array{area_code: string, billing_group_code: string, prefix: string, sequence: int, connection_id: string}
     */
    public function generate(BillingGroup $billingGroup, ?int $sequence = null): array
    {
        $billingGroup->loadMissing('area');

        if (! $billingGroup->area) {
            throw new RuntimeException('Billing group does not have an area assigned.');
        }

        $prefix = $this->buildPrefix($billingGroup);
        $finalSequence = $this->resolveSequence($billingGroup, $prefix, $sequence);

        return [
            'area_code' => $billingGroup->area->code,
            'billing_group_code' => $this->slug($billingGroup->name),
            'prefix' => $prefix,
            'sequence' => $finalSequence,
            'connection_id' => sprintf('%s-%d', $prefix, $finalSequence),
        ];
    }

    private function buildPrefix(BillingGroup $billingGroup): string
    {
        $areaCode = $billingGroup->area?->code ?: $this->slug((string) $billingGroup->area?->name);
        $groupCode = $this->slug($billingGroup->name);

        $parts = array_filter([
            $areaCode !== '' ? $areaCode : null,
            $groupCode !== '' ? $groupCode : null,
        ]);

        $prefix = implode('-', $parts);

        return $prefix !== '' ? $prefix : 'ZONE';
    }

    private function slug(string $value): string
    {
        return strtoupper(Str::slug($value, ''));
    }

    private function resolveSequence(BillingGroup $billingGroup, string $prefix, ?int $sequence): int
    {
        if ($sequence && $sequence > 0) {
            return $sequence;
        }

        $cacheKey = "{$billingGroup->id}|{$prefix}";

        if (! isset($this->sequenceCache[$cacheKey])) {
            $lastConnection = Customer::query()
                ->where('billing_group_id', $billingGroup->id)
                ->where('connection_id', 'like', "{$prefix}-%")
                ->orderByDesc('connection_id')
                ->value('connection_id');

            $counter = 0;
            if ($lastConnection && str_contains($lastConnection, '-')) {
                $segments = explode('-', $lastConnection);
                $counter = (int) end($segments);
            }

            $this->sequenceCache[$cacheKey] = max($counter, 0);
        }

        $this->sequenceCache[$cacheKey]++;

        return $this->sequenceCache[$cacheKey];
    }
}

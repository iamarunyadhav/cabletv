<?php

namespace App\Services\Customers;

use App\Models\BillingGroup;
use App\Models\Customer;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class CustomerService
{
    public function list(array $filters = [], ?string $search = null, int $perPage = 25): LengthAwarePaginator
    {
        $query = Customer::query()
            ->with([
                'billingGroup',
                'billingGroup.area',
                'connections.package',
            ])
            ->withSum('connections as total_due', 'current_balance')
            ->orderBy('created_at')
            ->orderByRaw('CAST(SUBSTRING_INDEX(connection_id, "-", -1) AS UNSIGNED)');

        if ($search) {
            $query->where(function (Builder $builder) use ($search): void {
                $builder
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('connection_id', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        if ($filters['area_id'] ?? null) {
            $query->whereHas('billingGroup', function (Builder $builder) use ($filters): void {
                $builder->where('area_id', $filters['area_id']);
            });
        }

        if ($filters['billing_group_id'] ?? null) {
            $query->where('billing_group_id', $filters['billing_group_id']);
        }

        if ($filters['status'] ?? null) {
            $query->whereHas('connections', function (Builder $builder) use ($filters): void {
                $builder->where('status', $filters['status']);
            });
        }

        if ($filters['due_threshold'] ?? null) {
            $query->having('total_due', '>=', $filters['due_threshold']);
        }

        if ($filters['package_id'] ?? null) {
            $packageIds = is_array($filters['package_id'])
                ? $filters['package_id']
                : explode(',', (string) $filters['package_id']);

            $query->whereHas('connections', function (Builder $builder) use ($packageIds): void {
                $builder->whereIn('package_id', array_filter($packageIds));
            });
        }

        return $query->paginate($perPage);
    }

    public function search(string $query, string $scope = 'all', int $limit = 20): Collection
    {
        $term = "%{$query}%";

        $builder = Customer::query()
            ->with(['billingGroup:id,name,area_id', 'billingGroup.area:id,name,code'])
            ->withSum('connections as total_due', 'current_balance');

        $builder->where(function (Builder $sub) use ($term, $scope): void {
            $fields = [
                'name' => fn (Builder $b) => $b->where('name', 'like', $term),
                'connection_id' => fn (Builder $b) => $b->orWhere('connection_id', 'like', $term),
                'phone' => fn (Builder $b) => $b->orWhere('phone', 'like', $term),
                'address' => fn (Builder $b) => $b->orWhere('address', 'like', $term),
                'area' => fn (Builder $b) => $b->orWhereHas('billingGroup.area', fn (Builder $q) => $q
                    ->where('name', 'like', $term)
                    ->orWhere('code', 'like', $term)),
                'billing_group' => fn (Builder $b) => $b->orWhereHas('billingGroup', fn (Builder $q) => $q
                    ->where('name', 'like', $term)),
            ];

            if ($scope !== 'all' && isset($fields[$scope])) {
                $fields[$scope]($sub);

                return;
            }

            $fields['name']($sub);
            $fields['connection_id']($sub);
            $fields['phone']($sub);
            $fields['address']($sub);
            $fields['area']($sub);
            $fields['billing_group']($sub);
        });

        return $builder
            ->orderByRaw(
                'CASE WHEN connection_id = ? THEN 0 WHEN name LIKE ? THEN 1 ELSE 2 END',
                [$query, "{$query}%"]
            )
            ->orderBy('name')
            ->limit($limit)
            ->get([
                'id',
                'name',
                'phone',
                'address',
                'connection_id',
                'billing_group_id',
                'status',
            ]);
    }

    public function create(array $payload): Customer
    {
        $payload['connection_date'] ??= now()->toDateString();
        $payload = $this->applyAreaFromBillingGroup($payload);

        $customer = Customer::query()->create($payload);

        return $customer->fresh([
            'billingGroup',
            'billingGroup.area',
            'connections.package',
        ]);
    }

    public function update(Customer $customer, array $payload): Customer
    {
        $payload = $this->applyAreaFromBillingGroup($payload);
        $customer->update($payload);

        return $customer->fresh([
            'billingGroup',
            'billingGroup.area',
            'connections.package',
        ]);
    }

    public function delete(Customer $customer): void
    {
        $customer->delete();
    }

    private function applyAreaFromBillingGroup(array $payload): array
    {
        if (! isset($payload['billing_group_id'])) {
            return $payload;
        }

        $billingGroup = BillingGroup::query()
            ->select(['id', 'area_id'])
            ->find($payload['billing_group_id']);

        $payload['area_id'] = $billingGroup?->area_id;

        return $payload;
    }
}

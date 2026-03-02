<?php

namespace Database\Seeders;

use App\Enums\ConnectionStatus;
use App\Enums\CustomerStatus;
use App\Models\Area;
use App\Models\BillingGroup;
use App\Models\Connection;
use App\Models\Customer;
use App\Models\Package;
use App\Services\Customers\ConnectionIdService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use RuntimeException;

class CustomerSeeder extends Seeder
{
    public function __construct(private readonly ConnectionIdService $connectionIdService)
    {
    }

    public function run(): void
    {
        $dataPath = database_path('seeders/data/customer_seed_data.json');

        if (! File::exists($dataPath)) {
            throw new RuntimeException('Customer seed data file is missing. Run the extractor or copy ASK-2026.xlsx first.');
        }

        $payload = json_decode(
            File::get($dataPath),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        if (empty($payload)) {
            $this->command?->warn('Customer seed data is empty, skipping.');

            return;
        }

        $defaultPackage = Package::query()
            ->firstOrCreate(
                ['name' => 'Basic'],
                [
                    'price' => 1200,
                    'description' => 'Core package',
                    'discount_type' => 'none',
                    'discount_value' => 0,
                    'active' => true,
                ],
            );

        DB::transaction(function () use ($payload, $defaultPackage) {
            foreach ($payload as $record) {
                $areaName = $record['area_name'] ?? $record['billing_group'] ?? 'General';
                $billingGroupName = $record['billing_group'] ?? $areaName;

                $area = $this->resolveArea($areaName);
                $billingGroup = $this->resolveBillingGroup($billingGroupName, $area);

                $sequence = (int) ($record['connection_no'] ?? 0) ?: null;
                $connectionMeta = $this->connectionIdService->generate($billingGroup, $sequence);
                $connectionId = $connectionMeta['connection_id'];
                $agreementNumber = $this->sanitizeAgreementNumber(
                    $record['agreement_numbers'][0] ?? $record['agreement_number_raw'] ?? null,
                );

                if (
                    $agreementNumber !== null
                    && Customer::query()
                        ->where('agreement_number', $agreementNumber)
                        ->where('connection_id', '!=', $connectionId)
                        ->exists()
                ) {
                    $agreementNumber = null;
                }

                $rawBoxNumbers = $record['box_numbers'] ?? [];
                $hasRealBoxes = $this->hasRealBoxes($rawBoxNumbers);
                $connectionStatus = $hasRealBoxes ? ConnectionStatus::Active : ConnectionStatus::Postpone;
                $customerStatus = $connectionStatus === ConnectionStatus::Postpone
                    ? CustomerStatus::Inactive
                    : CustomerStatus::Active;

                $customer = Customer::query()->updateOrCreate(
                    ['connection_id' => $connectionId],
                    [
                        'name' => $record['name'] ?? 'NO_DATA',
                        'email' => null,
                        'phone' => $record['phone_numbers'][0] ?? 'NO_DATA',
                        'nic' => $record['nic'] ?? null,
                        'address' => $record['address'] ?? 'NO_DATA',
                        'agreement_number' => $agreementNumber,
                        'area_id' => $billingGroup->area_id,
                        'billing_group_id' => $billingGroup->id,
                        'status' => $customerStatus,
                        'connection_date' => $this->parseDate($record['contract_date'] ?? null),
                    ],
                );

                $boxNumbers = $hasRealBoxes
                    ? $this->prepareBoxNumbers(
                        $rawBoxNumbers,
                        (int) ($record['box_count'] ?? 1),
                        $customer->connection_id,
                    )
                    : ['NO_DATA'];

                foreach ($boxNumbers as $boxNumber) {
                    Connection::query()->updateOrCreate(
                        [
                            'customer_id' => $customer->id,
                            'box_number' => $boxNumber,
                        ],
                        [
                            'package_id' => $defaultPackage->id,
                            'current_balance' => 0,
                            'status' => $connectionStatus,
                            'activated_at' => $this->parseDateTime($record['contract_date'] ?? null),
                        ],
                    );
                }
            }
        });
    }

    private function resolveArea(string $name): Area
    {
        $normalized = trim($name) !== '' ? trim($name) : 'General';

        $existing = Area::query()
            ->where('name', $normalized)
            ->first();

        if ($existing) {
            return $existing;
        }

        $code = strtoupper(Str::slug($normalized, '_'));
        if ($code === '') {
            $code = 'AREA';
        }

        $base = $code;
        $suffix = 1;
        while (Area::query()->where('code', $code)->exists()) {
            $code = sprintf('%s_%d', $base, $suffix++);
        }

        return Area::query()->create([
            'name' => $normalized,
            'code' => $code,
            'description' => 'Imported from legacy ASK dataset',
        ]);
    }

    private function resolveBillingGroup(string $name, Area $area): BillingGroup
    {
        $normalized = trim($name) !== '' ? trim($name) : $area->name;

        return BillingGroup::query()->firstOrCreate(
            ['name' => $normalized],
            [
                'area_id' => $area->id,
                'billing_start_day' => 1,
                'billing_end_day' => 30,
                'grace_days' => 5,
                'friendly_reminder_days' => 2,
                'disconnect_notice_days' => 7,
                'maximum_debit_balance' => 5000,
                'description' => 'Imported from legacy ASK dataset',
            ],
        );
    }

    private function hasRealBoxes(array $boxNumbers): bool
    {
        foreach ($boxNumbers as $number) {
            $trimmed = trim((string) $number);
            if ($trimmed !== '' && strtoupper($trimmed) !== 'NO_DATA') {
                return true;
            }
        }

        return false;
    }

    private function prepareBoxNumbers(array $boxNumbers, int $expected, string $connectionId): array
    {
        $cleaned = [];
        foreach ($boxNumbers as $number) {
            $number = trim((string) $number);
            if ($number === '') {
                continue;
            }
            $cleaned[$number] = $number;
        }

        $boxNumbers = array_values($cleaned);

        if ($expected < 1) {
            $expected = max(count($boxNumbers), 1);
        }

        while (count($boxNumbers) < $expected) {
            $boxNumbers[] = sprintf('%s-BOX-%02d', $connectionId, count($boxNumbers) + 1);
        }

        return $boxNumbers;
    }

    private function sanitizeAgreementNumber(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);

        if ($value === '' || strtoupper($value) === 'NO_DATA') {
            return null;
        }

        return $value;
    }

    private function parseDate(?string $value): ?Carbon
    {
        return $this->parseDateValue($value)?->startOfDay();
    }

    private function parseDateTime(?string $value): ?Carbon
    {
        return $this->parseDateValue($value);
    }

    private function parseDateValue(?string $value): ?Carbon
    {
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        $candidates = preg_split('/[|,:]+/', $value) ?: [];
        $candidates[] = $value;

        $formats = [
            'd-m-Y',
            'd/m/Y',
            'Y-m-d',
            'd-m-y',
            'd/m/y',
        ];

        foreach ($candidates as $candidate) {
            $candidate = trim((string) $candidate);

            if ($candidate === '') {
                continue;
            }

            foreach ($formats as $format) {
                try {
                    return Carbon::createFromFormat($format, $candidate);
                } catch (\Throwable $e) {
                    // try next
                }
            }

            try {
                return Carbon::parse($candidate);
            } catch (\Throwable $e) {
                // try next
            }
        }

        return null;
    }
}

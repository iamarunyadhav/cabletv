<?php

namespace App\Jobs;

use App\Models\Area;
use App\Models\BillingGroup;
use App\Models\Connection;
use App\Models\Customer;
use App\Models\ImportJob;
use App\Models\Package;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProcessLegacyImportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private ImportJob $importJob)
    {
        //
    }

    public function handle(): void
    {
        $this->importJob->update([
            'status' => 'running',
        ]);

        $path = $this->importJob->file_path;

        if (! Storage::disk('local')->exists($path)) {
            $this->failJob('Uploaded file could not be found.');

            return;
        }

        $fullPath = Storage::disk('local')->path($path);
        $handle = fopen($fullPath, 'r');

        if (! $handle) {
            $this->failJob('Unable to read uploaded file.');

            return;
        }

        $headers = fgetcsv($handle);
        if (! $headers) {
            $this->failJob('Empty import file.');

            return;
        }

        $headers = array_map('trim', $headers);
        $required = ['connection_id', 'name', 'phone', 'address', 'area', 'billing_group', 'package', 'box_number'];
        $missingRequired = array_diff($required, $headers);
        if (count($missingRequired) > 0) {
            $this->failJob('Missing required columns: '.implode(', ', $missingRequired));

            return;
        }

        $stats = [
            'processed_rows' => 0,
            'customers_created' => 0,
            'customers_updated' => 0,
            'connections_created' => 0,
            'connections_updated' => 0,
            'errors' => [],
        ];

        while (($row = fgetcsv($handle)) !== false) {
            $stats['processed_rows']++;

            $rowData = $this->mapRow($headers, $row);

            if (empty($rowData['connection_id']) || empty($rowData['name']) || empty($rowData['box_number'])) {
                $stats['errors'][] = $this->errorForRow($stats['processed_rows'], 'connection_id, name and box_number are required.');

                continue;
            }

            DB::beginTransaction();

            try {
                $area = $this->firstOrCreateArea($rowData['area'] ?? 'Unknown');
                $billingGroup = $this->firstOrCreateBillingGroup($rowData['billing_group'] ?? 'Default', $area->id);

                if (empty($rowData['package'])) {
                    DB::rollBack();
                    $stats['errors'][] = $this->errorForRow($stats['processed_rows'], 'Package column is required for every row.');

                    continue;
                }

                $package = Package::query()->firstOrCreate(
                    ['name' => $rowData['package']],
                    [
                        'price' => $rowData['price'] ?? 0,
                        'discount_type' => 'none',
                        'discount_value' => 0,
                        'description' => 'Imported package',
                        'active' => true,
                    ],
                );

                $customer = Customer::query()->firstOrNew(['connection_id' => $rowData['connection_id']]);
                $customer->fill([
                    'name' => $rowData['name'] ?? 'Unknown',
                    'email' => $rowData['email'] ?? null,
                    'phone' => $rowData['phone'] ?? '',
                    'nic' => $rowData['nic'] ?? null,
                    'address' => $rowData['address'] ?? '',
                    'agreement_number' => $rowData['agreement_number'] ?? null,
                    'area_id' => $billingGroup->area_id,
                    'billing_group_id' => $billingGroup->id,
                    'status' => $rowData['status'] ?? $customer->status ?? 'active',
                ]);
                $customer->save();

                if ($customer->wasRecentlyCreated) {
                    $stats['customers_created']++;
                } else {
                    $stats['customers_updated']++;
                }

                $connection = Connection::query()->firstOrNew([
                    'customer_id' => $customer->id,
                    'box_number' => $rowData['box_number'],
                ]);
                $connection->fill([
                    'package_id' => $package?->id ?? $connection->package_id,
                    'status' => $rowData['status'] ?? $connection->status ?? 'pending',
                ]);
                $connection->save();

                if ($connection->wasRecentlyCreated) {
                    $stats['connections_created']++;
                } else {
                    $stats['connections_updated']++;
                }

                DB::commit();
            } catch (\Throwable $e) {
                DB::rollBack();
                $stats['errors'][] = $this->errorForRow($stats['processed_rows'], $e->getMessage());
            }

            if ($stats['processed_rows'] % 100 === 0) {
                $this->importJob->update(['stats' => $stats]);
            }
        }

        fclose($handle);

        $this->importJob->update([
            'status' => 'completed',
            'stats' => $stats,
        ]);
    }

    private function firstOrCreateArea(string $name): Area
    {
        return Area::query()->firstOrCreate(
            ['name' => $name],
            [
                'code' => $this->generateCode($name, 'AREA'),
                'description' => 'Imported from legacy data',
            ],
        );
    }

    private function firstOrCreateBillingGroup(string $name, string $areaId): BillingGroup
    {
        return BillingGroup::query()->firstOrCreate(
            ['name' => $name],
            [
                'area_id' => $areaId,
                'billing_start_day' => 1,
                'billing_end_day' => 30,
                'grace_days' => 5,
                'friendly_reminder_days' => 2,
                'disconnect_notice_days' => 7,
                'maximum_debit_balance' => 0,
                'description' => 'Imported from legacy data',
            ],
        );
    }

    private function mapRow(array $headers, array $row): array
    {
        $mapped = [];
        foreach ($headers as $index => $key) {
            $mapped[$key] = $row[$index] ?? null;
        }

        return $mapped;
    }

    private function generateCode(string $name, string $fallback): string
    {
        $base = strtoupper(Str::slug($name, '_'));
        $base = $base !== '' ? substr($base, 0, 12) : $fallback;

        $code = $base;
        $suffix = 1;

        while (Area::query()->where('code', $code)->exists()) {
            $code = $base.'_'.$suffix;
            $suffix++;
        }

        return $code;
    }

    private function errorForRow(int $rowNumber, string $message): string
    {
        return sprintf('Row %d: %s', $rowNumber, $message);
    }

    private function failJob(string $message): void
    {
        $this->importJob->update([
            'status' => 'failed',
            'error' => $message,
        ]);
    }
}

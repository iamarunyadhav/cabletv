<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\BillingGroup;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use RuntimeException;

class BoxDetailsSeeder extends Seeder
{
    public function run(): void
    {
        $dataPath = database_path('seeders/data/billing_group_seed_data.json');

        if (! File::exists($dataPath)) {
            throw new RuntimeException('Billing group seed data is missing. Generate it from ASK-2026.xlsx first.');
        }

        $boxDetails = json_decode(File::get($dataPath), true, 512, JSON_THROW_ON_ERROR);

        foreach ($boxDetails as $detail) {
            $area = Area::query()->firstOrCreate(
                ['name' => $detail['area']],
                [
                    'code' => $this->generateAreaCode($detail['area']),
                    'description' => 'Auto-created via BoxDetailsSeeder',
                ],
            );

            BillingGroup::query()->updateOrCreate(
                ['name' => $detail['billing_group']],
                [
                    'area_id' => $area->id,
                    'billing_start_day' => $detail['billing_start'] ?? 1,
                    'billing_end_day' => $detail['billing_end'] ?? 30,
                    'grace_days' => 5,
                    'friendly_reminder_days' => 2,
                    'disconnect_notice_days' => 7,
                    'maximum_debit_balance' => 5000,
                    'description' => sprintf(
                        'Seeded from ASK-2026 box detail (%d connections, %d boxes, %s area)',
                        $detail['connections'],
                        $detail['boxes'],
                        $area->name,
                    ),
                ],
            );
        }
    }

    private function generateAreaCode(string $areaName): string
    {
        $base = strtoupper(Str::slug($areaName, '_'));
        $base = $base !== '' ? substr($base, 0, 8) : 'AREA';

        $code = $base;
        $suffix = 1;

        while (
            Area::query()
                ->where('code', $code)
                ->exists()
        ) {
            $code = $base.'_'.$suffix;
            $suffix++;
        }

        return $code;
    }
}

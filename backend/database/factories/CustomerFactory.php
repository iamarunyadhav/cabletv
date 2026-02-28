<?php

namespace Database\Factories;

use App\Models\Area;
use App\Models\BillingGroup;
use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    protected $model = Customer::class;

    public function definition(): array
    {
        $area = Area::query()->first() ?? Area::query()->create([
            'name' => fake()->city(),
            'code' => strtoupper(fake()->lexify('AR??')),
            'description' => fake()->sentence(),
        ]);
        $billingGroup = BillingGroup::query()->first() ?? BillingGroup::query()->create([
            'name' => fake()->unique()->company(),
            'area_id' => $area->id,
            'billing_start_day' => 1,
            'billing_end_day' => 30,
            'grace_days' => 5,
            'friendly_reminder_days' => 2,
            'disconnect_notice_days' => 7,
            'maximum_debit_balance' => 0,
            'description' => fake()->sentence(),
        ]);

        return [
            'connection_id' => strtoupper(fake()->bothify('HT-###')),
            'name' => fake()->name(),
            'email' => fake()->safeEmail(),
            'phone' => fake()->numerify('+947########'),
            'nic' => fake()->numerify('#########V'),
            'address' => fake()->address(),
            'agreement_number' => fake()->bothify('AGR-#####'),
            'billing_group_id' => $billingGroup?->id,
            'status' => 'active',
            'connection_date' => now()->subDays(rand(0, 365)),
        ];
    }
}

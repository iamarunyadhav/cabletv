<?php

namespace Tests\Feature;

use App\Enums\AppRole;
use App\Models\Area;
use App\Models\BillingGroup;
use App\Models\Package;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerCreateTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_create_ignores_area_and_package_fields(): void
    {
        $user = User::factory()->create();
        UserRole::query()->create([
            'user_id' => $user->id,
            'role' => AppRole::Admin->value,
        ]);

        $area = Area::query()->create([
            'name' => 'Colombo',
            'code' => 'COL',
            'description' => 'Test area',
        ]);

        $billingGroup = BillingGroup::query()->create([
            'name' => 'Colombo Group',
            'area_id' => $area->id,
            'billing_start_day' => 1,
            'billing_end_day' => 30,
            'grace_days' => 5,
            'friendly_reminder_days' => 2,
            'disconnect_notice_days' => 7,
            'maximum_debit_balance' => 1000,
            'description' => 'Test group',
        ]);

        $package = Package::query()->create([
            'name' => 'Basic',
            'price' => 1000,
            'discount_type' => 'none',
            'discount_value' => 0,
            'description' => 'Test package',
            'active' => true,
        ]);

        $payload = [
            'connection_id' => 'COL-100',
            'name' => 'Test Customer',
            'phone' => '+94770000000',
            'address' => 'Test address',
            'billing_group_id' => $billingGroup->id,
            'area_id' => $area->id,
            'package_id' => $package->id,
        ];

        $response = $this->actingAs($user)->postJson('/api/v1/customers', $payload);

        $response->assertStatus(201);

        $payloadData = $response->json('data');
        $this->assertArrayNotHasKey('area_id', $payloadData);
        $this->assertArrayNotHasKey('package_id', $payloadData);

        $this->assertDatabaseHas('customers', [
            'connection_id' => 'COL-100',
            'billing_group_id' => $billingGroup->id,
        ]);
    }
}

<?php

namespace Tests\Feature;

use App\Enums\AppRole;
use App\Models\AdditionalChannel;
use App\Models\Area;
use App\Models\BillingGroup;
use App\Models\Customer;
use App\Models\Package;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConnectionCreateTest extends TestCase
{
    use RefreshDatabase;

    public function test_connection_create_with_package_and_channels(): void
    {
        $user = User::factory()->create();
        UserRole::query()->create([
            'user_id' => $user->id,
            'role' => AppRole::Admin->value,
        ]);

        $area = Area::query()->create([
            'name' => 'Galle',
            'code' => 'GAL',
            'description' => 'Test area',
        ]);

        $billingGroup = BillingGroup::query()->create([
            'name' => 'Galle Group',
            'area_id' => $area->id,
            'billing_start_day' => 1,
            'billing_end_day' => 30,
            'grace_days' => 5,
            'friendly_reminder_days' => 2,
            'disconnect_notice_days' => 7,
            'maximum_debit_balance' => 1000,
            'description' => 'Test group',
        ]);

        $customer = Customer::query()->create([
            'connection_id' => 'GAL-1',
            'name' => 'Test Customer',
            'phone' => '+94770000001',
            'address' => 'Test address',
            'billing_group_id' => $billingGroup->id,
            'status' => 'active',
            'connection_date' => now()->toDateString(),
        ]);

        $package = Package::query()->create([
            'name' => 'Basic',
            'price' => 1200,
            'discount_type' => 'none',
            'discount_value' => 0,
            'description' => 'Test package',
            'active' => true,
        ]);

        $channelOne = AdditionalChannel::query()->create([
            'name' => 'Sports',
            'monthly_amount' => 200,
            'is_active' => true,
        ]);

        $channelTwo = AdditionalChannel::query()->create([
            'name' => 'Kids',
            'monthly_amount' => 150,
            'is_active' => true,
        ]);

        $payload = [
            'box_number' => 'BOX-001',
            'package_id' => $package->id,
            'additional_channel_ids' => [$channelOne->id, $channelTwo->id],
        ];

        $response = $this->actingAs($user)->postJson("/api/v1/customers/{$customer->id}/connections", $payload);

        $response->assertStatus(201);
        $response->assertJsonPath('data.base_price', 1200);
        $response->assertJsonPath('data.channels_total', 350);
        $response->assertJsonPath('data.grand_total', 1550);

        $connectionId = $response->json('data.id');

        $this->assertDatabaseHas('connections', [
            'id' => $connectionId,
            'customer_id' => $customer->id,
            'package_id' => $package->id,
        ]);

        $this->assertDatabaseHas('connection_additional_channels', [
            'connection_id' => $connectionId,
            'additional_channel_id' => $channelOne->id,
            'price_snapshot' => '200.00',
        ]);
        $this->assertDatabaseHas('connection_additional_channels', [
            'connection_id' => $connectionId,
            'additional_channel_id' => $channelTwo->id,
            'price_snapshot' => '150.00',
        ]);
    }
}

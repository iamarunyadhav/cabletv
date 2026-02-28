<?php

namespace Tests\Feature;

use App\Enums\AppRole;
use App\Models\Area;
use App\Models\BillingGroup;
use App\Models\Connection;
use App\Models\Customer;
use App\Models\Package;
use App\Models\SmsProviderSetting;
use App\Models\SmsTemplate;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SmsSendTest extends TestCase
{
    use RefreshDatabase;

    public function test_send_sms_with_template(): void
    {
        $user = User::factory()->create();
        UserRole::query()->create([
            'user_id' => $user->id,
            'role' => AppRole::Admin->value,
        ]);

        SmsProviderSetting::query()->create([
            'provider' => 'log',
            'config' => [],
            'is_active' => true,
        ]);

        $area = Area::query()->create([
            'name' => 'Kandy',
            'code' => 'KAN',
            'description' => 'Test area',
        ]);

        $billingGroup = BillingGroup::query()->create([
            'name' => 'Kandy Group',
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
            'connection_id' => 'KAN-10',
            'name' => 'SMS Customer',
            'phone' => '+94770000002',
            'address' => 'Test address',
            'billing_group_id' => $billingGroup->id,
            'status' => 'active',
            'connection_date' => now()->toDateString(),
        ]);

        $package = Package::query()->create([
            'name' => 'Basic',
            'price' => 1000,
            'discount_type' => 'none',
            'discount_value' => 0,
            'description' => 'Test package',
            'active' => true,
        ]);

        Connection::query()->create([
            'customer_id' => $customer->id,
            'package_id' => $package->id,
            'box_number' => 'BOX-10',
            'current_balance' => 1500,
            'status' => 'active',
        ]);

        $template = SmsTemplate::query()->create([
            'key' => 'friendly_reminder',
            'name' => 'Friendly Reminder',
            'template_type' => 'friendly_reminder',
            'content' => 'Hello {customer_name}',
            'body' => 'Hello {customer_name}',
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->postJson('/api/v1/sms/send', [
            'customer_id' => $customer->id,
            'template_id' => $template->id,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('sms_messages', [
            'customer_id' => $customer->id,
            'template_id' => $template->id,
            'status' => 'sent',
        ]);

        $this->assertDatabaseHas('sms_logs', [
            'customer_id' => $customer->id,
            'status' => 'sent',
        ]);
    }
}

<?php

namespace Database\Seeders;

use App\Enums\AppRole;
use App\Models\AdditionalChannel;
use App\Models\Area;
use App\Models\BillingGroup;
use App\Models\NumberSequence;
use App\Models\Package;
use App\Models\PaymentAgent;
use App\Models\Profile;
use App\Models\Setting;
use App\Models\SetupItem;
use App\Models\SmsProviderSetting;
use App\Models\SmsTemplate;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CoreSetupSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Platform Admin',
                'password' => Hash::make('ChangeMe123!'),
                'email_verified_at' => now(),
                'remember_token' => Str::random(20),
            ],
        );

        Profile::query()->updateOrCreate(
            ['id' => $admin->id],
            [
                'full_name' => $admin->name,
                'phone' => '+94112223344',
            ],
        );

        UserRole::query()->updateOrCreate(
            ['user_id' => $admin->id, 'role' => AppRole::Admin],
            [],
        );

        Setting::query()->upsert(
            [
                ['key' => 'company_name', 'value' => 'Cable TV Service', 'description' => 'Company name for invoices'],
                ['key' => 'company_address', 'value' => '123 Main Street, City, State', 'description' => 'Company address'],
                ['key' => 'company_phone', 'value' => '+1234567890', 'description' => 'Company contact number'],
                ['key' => 'invoice_prefix', 'value' => 'INV', 'description' => 'Prefix for invoice numbers'],
                ['key' => 'receipt_prefix', 'value' => 'RCP', 'description' => 'Prefix for receipt numbers'],
                ['key' => 'connection_prefix', 'value' => 'CBL', 'description' => 'Prefix for connection IDs'],
                ['key' => 'sms_auto_receipt_enabled', 'value' => '1', 'description' => 'Automatically send payment receipt SMS on save'],
                ['key' => 'sms_auto_friendly_reminder_enabled', 'value' => '1', 'description' => 'Send friendly reminder SMS during billing automation'],
                ['key' => 'sms_auto_overdue_notice_enabled', 'value' => '1', 'description' => 'Send overdue/grace period SMS alerts'],
                ['key' => 'sms_auto_disconnect_notice_enabled', 'value' => '1', 'description' => 'Send disconnect notice SMS during automation'],
                ['key' => 'sms_auto_renewal_notice_enabled', 'value' => '1', 'description' => 'Send renewal balance SMS after billing cycle starts'],
            ],
            ['key'],
            ['value', 'description'],
        );

        if (SmsProviderSetting::query()->count() === 0) {
            SmsProviderSetting::query()->create([
                'provider' => 'log',
                'is_active' => true,
                'config' => [],
            ]);
        }

        foreach ([
            ['key' => 'invoice', 'prefix' => 'INV', 'padding' => 5],
            ['key' => 'receipt', 'prefix' => 'RCP', 'padding' => 5],
            ['key' => 'connection', 'prefix' => 'CBL', 'padding' => 4],
            ['key' => 'agreement', 'prefix' => 'AGR', 'padding' => 5],
        ] as $sequence) {
            NumberSequence::query()->updateOrCreate(
                ['key' => $sequence['key']],
                [
                    'prefix' => $sequence['prefix'],
                    'padding' => $sequence['padding'],
                    'current_value' => 0,
                ],
            );
        }

        $areas = [
            ['name' => 'HATTON', 'code' => 'HT'],
            ['name' => '50 ACER', 'code' => 'AC'],
            ['name' => 'ABBOTSLIGH', 'code' => 'AB'],
            ['name' => 'BRODUC', 'code' => 'BR'],
            ['name' => 'COMMERCIAL', 'code' => 'CO'],
            ['name' => 'DUNBAR LD', 'code' => 'DL'],
            ['name' => 'DUNBAR UD', 'code' => 'DU'],
            ['name' => 'DUNBAR SKEAM', 'code' => 'DS'],
            ['name' => 'FLORENCE', 'code' => 'FL'],
            ['name' => 'HATTON ES', 'code' => 'HE'],
            ['name' => 'MALBROUGH', 'code' => 'MB'],
            ['name' => 'MALIYAPU ES', 'code' => 'ME'],
            ['name' => 'MARSK', 'code' => 'MK'],
            ['name' => 'MONTIFIOR', 'code' => 'MF'],
            ['name' => 'PANMURE', 'code' => 'PN'],
            ['name' => 'STRATHON', 'code' => 'ST'],
            ['name' => 'SMR', 'code' => 'SMR'],
        ];

        foreach ($areas as $areaData) {
            $area = Area::query()->updateOrCreate(
                ['code' => $areaData['code']],
                [
                    'name' => $areaData['name'],
                    'description' => 'Seeded from legacy Hatton list (2025-11-27)',
                ],
            );

            BillingGroup::query()->updateOrCreate(
                ['name' => $areaData['name']],
                [
                    'area_id' => $area->id,
                    'billing_start_day' => 1,
                    'billing_end_day' => 30,
                    'grace_days' => 5,
                    'friendly_reminder_days' => 2,
                    'disconnect_notice_days' => 7,
                    'maximum_debit_balance' => 5000,
                    'description' => 'Seeded from legacy Hatton list (2025-11-27)',
                ],
            );
        }

        foreach ([
            ['name' => 'Basic', 'price' => 1200, 'description' => 'Core package'],
            ['name' => 'Family', 'price' => 1850, 'description' => 'Family entertainment mix'],
            ['name' => 'Sports Plus', 'price' => 2500, 'description' => 'Sports & premium mix'],
        ] as $package) {
            Package::query()->updateOrCreate(
                ['name' => $package['name']],
                [
                    'price' => $package['price'],
                    'description' => $package['description'],
                    'discount_type' => 'none',
                    'discount_value' => 0,
                    'active' => true,
                ],
            );
        }

        foreach ([
            ['name' => 'HBO Pack', 'monthly_amount' => 350],
            ['name' => 'Kids Pack', 'monthly_amount' => 250],
            ['name' => 'Sports World', 'monthly_amount' => 450],
        ] as $channel) {
            AdditionalChannel::query()->updateOrCreate(
                ['name' => $channel['name']],
                [
                    'monthly_amount' => $channel['monthly_amount'],
                    'description' => 'Seeded add-on channel',
                    'is_active' => true,
                ],
            );
        }

        foreach ([
            ['name' => 'Decoder Setup', 'price' => 2500],
            ['name' => 'Outdoor Cable Run', 'price' => 1500],
            ['name' => 'Pole Extension', 'price' => 800],
        ] as $setupItem) {
            SetupItem::query()->updateOrCreate(
                ['name' => $setupItem['name']],
                [
                    'price' => $setupItem['price'],
                    'is_active' => true,
                ],
            );
        }

        foreach ([
            [
                'key' => 'friendly_reminder',
                'name' => 'Friendly Reminder',
                'template_type' => 'friendly_reminder',
                'days_offset' => 2,
                'body' => 'Dear {customer_name}, your outstanding balance {balance} exceeds the limit {limit}. Minimum payment due {min_payment}.',
            ],
            [
                'key' => 'renewal',
                'name' => 'Renewal Notice',
                'template_type' => 'renewal',
                'days_offset' => 0,
                'body' => 'Dear {customer_name}, your package renewal is due on {due_date}.',
            ],
            [
                'key' => 'monthly_renewal',
                'name' => 'Monthly Renewal Balance',
                'template_type' => 'monthly_renewal',
                'days_offset' => 0,
                'body' => 'Dear {customer_name}, your monthly bill is renewed. Balance {balance}. Please pay before {disconnect_date} to avoid disconnection.',
            ],
            [
                'key' => 'warning',
                'name' => 'Warning Notice',
                'template_type' => 'warning',
                'days_offset' => 0,
                'body' => 'Warning: balance {balance} exceeds limit {limit}. Please pay {min_payment} to avoid suspension.',
            ],
            [
                'key' => 'overdue',
                'name' => 'Overdue Notice',
                'template_type' => 'overdue',
                'days_offset' => 0,
                'body' => 'Reminder: your account is overdue with balance {balance} (limit {limit}). Please clear dues immediately.',
            ],
            [
                'key' => 'disconnect_notice',
                'name' => 'Disconnect Notice',
                'template_type' => 'disconnect_notice',
                'days_offset' => 7,
                'body' => 'Final notice: service will be suspended in 2 hours unless balance {balance} is below limit {limit}.',
            ],
            [
                'key' => 'suspend_notice',
                'name' => 'Suspend Notice',
                'template_type' => 'suspend_notice',
                'days_offset' => 0,
                'body' => 'Service has been suspended due to overdue balance {balance}.',
            ],
            [
                'key' => 'suspension',
                'name' => 'Suspension Alert',
                'template_type' => 'suspension',
                'days_offset' => 0,
                'body' => 'Connection {connection_no} is now suspended. Contact support to reactivate.',
            ],
            [
                'key' => 'payment_receipt',
                'name' => 'Payment Receipt',
                'template_type' => 'payment_receipt',
                'days_offset' => 0,
                'body' => 'Payment received. Thank you {customer_name}.',
            ],
        ] as $template) {
            SmsTemplate::query()->updateOrCreate(
                ['key' => $template['key']],
                [
                    'name' => $template['name'],
                    'template_type' => $template['template_type'],
                    'content' => $template['body'],
                    'days_offset' => $template['days_offset'],
                    'body' => $template['body'],
                    'active' => true,
                    'is_active' => true,
                ],
            );
        }

        PaymentAgent::query()->updateOrCreate(
            ['code' => 'CASHIER-01'],
            [
                'name' => 'Main Counter',
                'agent_type' => 'in_house',
                'email' => 'cashier@example.com',
                'phone' => '+94112223345',
                'is_active' => true,
            ],
        );
    }
}

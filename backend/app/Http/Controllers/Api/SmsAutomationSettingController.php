<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SmsAutomationSettingResource;
use App\Models\Setting;
use App\Models\SmsAutomationSetting;
use App\Support\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SmsAutomationSettingController extends Controller
{
    private const WORKFLOW_SETTING_MAP = [
        'friendly_reminder' => 'sms_auto_friendly_reminder_enabled',
        'overdue_notice' => 'sms_auto_overdue_notice_enabled',
        'disconnect_notice' => 'sms_auto_disconnect_notice_enabled',
        'monthly_renewal' => 'sms_auto_renewal_notice_enabled',
        'payment_receipt' => 'sms_auto_receipt_enabled',
    ];

    public function index(): JsonResponse
    {
        $settings = SmsAutomationSetting::query()
            ->orderBy('workflow_key')
            ->get();

        return SmsAutomationSettingResource::collection($settings)->response();
    }

    public function update(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*.workflow_key' => ['required', 'string', 'max:100'],
            'settings.*.template_key' => ['nullable', 'string', 'max:100'],
            'settings.*.enabled' => ['required', 'boolean'],
            'settings.*.description' => ['nullable', 'string', 'max:255'],
        ]);

        foreach ($payload['settings'] as $item) {
            $setting = SmsAutomationSetting::query()->updateOrCreate(
                ['workflow_key' => $item['workflow_key']],
                [
                    'template_key' => $item['template_key'] ?? null,
                    'enabled' => $item['enabled'],
                    'description' => $item['description'] ?? null,
                ]
            );

            $this->syncLegacySetting($setting->workflow_key, $setting->enabled);
        }

        return response()->json([
            'message' => 'SMS automation settings updated.',
        ]);
    }

    private function syncLegacySetting(string $workflowKey, bool $enabled): void
    {
        $settingKey = self::WORKFLOW_SETTING_MAP[$workflowKey] ?? null;

        if (! $settingKey) {
            return;
        }

        Setting::query()->updateOrCreate(
            ['key' => $settingKey],
            ['value' => $enabled ? '1' : '0']
        );

        SystemSetting::forget($settingKey);
    }
}

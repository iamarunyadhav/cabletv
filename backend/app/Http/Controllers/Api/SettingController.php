<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\SmsAutomationSetting;
use App\Support\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    private const SMS_SETTING_WORKFLOW_MAP = [
        'sms_auto_friendly_reminder_enabled' => 'friendly_reminder',
        'sms_auto_overdue_notice_enabled' => 'overdue_notice',
        'sms_auto_disconnect_notice_enabled' => 'disconnect_notice',
        'sms_auto_renewal_notice_enabled' => 'monthly_renewal',
        'sms_auto_receipt_enabled' => 'payment_receipt',
    ];

    public function index(Request $request): JsonResponse
    {
        $query = Setting::query()->orderBy('key');

        if ($keys = $request->get('keys')) {
            $keys = is_array($keys) ? $keys : explode(',', (string) $keys);
            $query->whereIn('key', array_filter($keys));
        }

        return response()->json($query->get());
    }

    public function update(Request $request): JsonResponse
    {
        $settings = $request->input('settings');

        if (! is_array($settings)) {
            $settings = $request->all();
        }

        foreach ($settings as $key => $value) {
            if (is_array($value) && isset($value['key'])) {
                $key = $value['key'];
                $value = $value['value'] ?? null;
            }

            if (! is_string($key)) {
                continue;
            }

            Setting::query()->updateOrCreate(
                ['key' => $key],
                ['value' => is_scalar($value) ? (string) $value : json_encode($value)]
            );

            SystemSetting::forget($key);
            $this->syncSmsAutomationSetting($key, $value);
        }

        return response()->json(['message' => 'Settings saved successfully.']);
    }

    private function syncSmsAutomationSetting(string $settingKey, mixed $value): void
    {
        $workflowKey = self::SMS_SETTING_WORKFLOW_MAP[$settingKey] ?? null;

        if (! $workflowKey) {
            return;
        }

        $enabled = filter_var($value, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) ?? false;

        SmsAutomationSetting::query()->updateOrCreate(
            ['workflow_key' => $workflowKey],
            ['enabled' => $enabled],
        );
    }
}

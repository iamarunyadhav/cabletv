<?php

namespace App\Services\Sms;

use App\Models\SmsAutomationSetting;
use App\Models\SmsTemplate;
use App\Support\SystemSetting;

class SmsAutomationSettingsService
{
    private const LEGACY_SETTING_MAP = [
        'friendly_reminder' => 'sms_auto_friendly_reminder_enabled',
        'disconnect_notice' => 'sms_auto_disconnect_notice_enabled',
        'monthly_renewal' => 'sms_auto_renewal_notice_enabled',
        'overdue_notice' => 'sms_auto_overdue_notice_enabled',
        'payment_receipt' => 'sms_auto_receipt_enabled',
    ];

    private const WORKFLOW_DEFAULT_TEMPLATE_MAP = [
        'monthly_renewal' => 'monthly_renewal',
        'friendly_reminder' => 'friendly_reminder',
        'disconnect_notice' => 'disconnect_notice',
        'overdue_notice' => 'overdue',
        'payment_receipt' => 'payment_receipt',
        'suspend_notice' => 'suspend_notice',
    ];

    /**
     * @var array<string, array{enabled: bool, template_key: ?string, description: ?string}>
     */
    private array $cache = [];

    public function get(string $workflowKey): array
    {
        if (! isset($this->cache[$workflowKey])) {
            $this->cache[$workflowKey] = $this->load($workflowKey);
        }

        return $this->cache[$workflowKey];
    }

    public function isEnabled(string $workflowKey, bool $default = true): bool
    {
        $config = $this->get($workflowKey);

        return $config['enabled'] ?? $default;
    }

    public function resolveTemplate(string $workflowKey): ?SmsTemplate
    {
        $config = $this->get($workflowKey);
        $templateKey = $config['template_key'] ?? $workflowKey;

        return SmsTemplate::query()
            ->where(function ($query) use ($templateKey): void {
                $query->where('key', $templateKey)
                    ->orWhere('template_type', $templateKey);
            })
            ->where(function ($query): void {
                $query->whereNull('is_active')
                    ->orWhere('is_active', true)
                    ->orWhere('active', true);
            })
            ->first();
    }

    private function load(string $workflowKey): array
    {
        /** @var SmsAutomationSetting|null $setting */
        $setting = SmsAutomationSetting::query()
            ->where('workflow_key', $workflowKey)
            ->first();

        if ($setting) {
            $legacyKey = self::LEGACY_SETTING_MAP[$workflowKey] ?? null;
            $enabled = (bool) $setting->enabled;

            if ($legacyKey) {
                $enabled = SystemSetting::bool($legacyKey, $enabled);
            }

            return [
                'enabled' => $enabled,
                'template_key' => $setting->template_key,
                'description' => $setting->description,
            ];
        }

        // Fallback to legacy SystemSetting toggles for backward compatibility.
        $legacyKey = self::LEGACY_SETTING_MAP[$workflowKey] ?? null;
        $legacyEnabled = $legacyKey
            ? SystemSetting::bool($legacyKey, true)
            : true;

        return [
            'enabled' => $legacyEnabled,
            'template_key' => self::WORKFLOW_DEFAULT_TEMPLATE_MAP[$workflowKey] ?? $workflowKey,
            'description' => null,
        ];
    }
}

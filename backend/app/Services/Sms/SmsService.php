<?php

namespace App\Services\Sms;

use App\Models\SmsProviderSetting;
use RuntimeException;

class SmsService
{
    public function __construct(
        private readonly TextlkSmsProvider $textlkSmsProvider,
        private readonly LogSmsProvider $logSmsProvider,
    ) {
    }

    /**
     * @param  array<int, string>  $recipients
     */
    public function send(array $recipients, string $message, ?string $providerType = null): array
    {
        $recipients = array_values(array_filter(array_unique($recipients)));

        if (empty($recipients)) {
            throw new RuntimeException('No recipients provided for SMS dispatch.');
        }

        // TextLK expects specific type values (plain, unicode, voice, mms, viber, OTP, whatsapp).
        // Older callers passed a logical label "billing"; normalise that to null so provider defaults to config/default ("plain").
        $normalizedType = $providerType === 'billing' ? null : $providerType;

        $providerSetting = SmsProviderSetting::query()
            ->where('is_active', true)
            ->first();

        $provider = $providerSetting?->provider ?? config('sms.default_provider', 'log');
        $config = $providerSetting?->config ?? [];

        if ($provider === 'none') {
            $provider = 'log';
        }

        return match ($provider) {
            'textlk' => $this->textlkSmsProvider->send(
                $recipients,
                $message,
                $normalizedType,
                $config,
            ),
            'log' => $this->logSmsProvider->send($recipients, $message, $providerType),
            default => throw new RuntimeException("Unsupported SMS provider [{$provider}]."),
        };
    }
}

<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class TextlkSmsProvider
{
    /**
     * @param  array<int, string>  $recipients
     * @param  array<string, mixed>  $providerConfig
     */
    public function send(array $recipients, string $message, ?string $type = null, array $providerConfig = []): array
    {
        $recipients = array_values(array_filter(array_unique($recipients)));

        if (empty($recipients)) {
            throw new RuntimeException('No recipients provided for SMS dispatch.');
        }

        $normalizedConfig = $this->normalizeConfig($providerConfig);
        $config = array_merge(config('sms.textlk', []), $normalizedConfig);

        $token = $config['api_token'] ?? null;
        $senderId = $config['sender_id'] ?? null;
        $baseUrl = rtrim($config['base_url'] ?? '', '/');
        $smsType = $type ?? $config['type'] ?? 'plain';

        if (! $token || ! $senderId || ! $baseUrl) {
            throw new RuntimeException('TextLK provider is not fully configured.');
        }

        $endpoint = "{$baseUrl}/sms/send";

        $payload = [
            'recipient' => implode(',', $recipients),
            'sender_id' => $senderId,
            'type' => $smsType,
            'message' => $message,
        ];

        if (! empty($config['schedule_time'])) {
            $payload['schedule_time'] = $config['schedule_time'];
        }

        $response = Http::withToken($token)
            ->acceptJson()
            ->post($endpoint, $payload);

        if (! $response->successful()) {
            throw new RuntimeException(
                sprintf('TextLK responded with HTTP %d: %s', $response->status(), $response->body())
            );
        }

        $body = $response->json();

        if (($body['status'] ?? null) !== 'success') {
            throw new RuntimeException('TextLK delivery failed: '.json_encode($body));
        }

        return [
            'provider' => 'textlk',
            'payload' => $payload,
            'response' => $body,
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    private function normalizeConfig(array $config): array
    {
        $normalized = [];

        foreach ($config as $key => $value) {
            switch ($key) {
                case 'apiToken':
                    $normalized['api_token'] = $value;
                    break;
                case 'senderId':
                    $normalized['sender_id'] = $value;
                    break;
                case 'scheduleTime':
                    $normalized['schedule_time'] = $value;
                    break;
                default:
                    $normalized[$key] = $value;
            }
        }

        return $normalized;
    }
}

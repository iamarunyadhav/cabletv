<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Log;

class LogSmsProvider
{
    /**
     * @param  array<int, string>  $recipients
     */
    public function send(array $recipients, string $message, ?string $type = null): array
    {
        $payload = [
            'provider' => 'log',
            'recipients' => $recipients,
            'message' => $message,
            'type' => $type,
        ];

        Log::info('SMS log provider dispatch', $payload);

        return [
            'provider' => 'log',
            'payload' => $payload,
            'response' => ['status' => 'logged'],
        ];
    }
}

<?php

namespace App\Services\Sms;

class SmsTemplateRenderer
{
    /**
     * @param  array<string, string|int|float|null>  $params
     */
    public function render(string $body, array $params): string
    {
        return preg_replace_callback('/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\{\s*([a-zA-Z0-9_]+)\s*\}/', function (array $matches) use ($params): string {
            $key = $matches[1] ?: $matches[2];

            return (string) ($params[$key] ?? '');
        }, $body) ?? $body;
    }
}

<?php

namespace App\Services\Sms;

class SmsTemplateRenderer
{
    /**
     * @param  array<string, string|int|float|null>  $params
     */
    public function render(string $body, array $params): string
    {
        foreach ($params as $key => $value) {
            $body = str_replace('{'.$key.'}', (string) ($value ?? ''), $body);
        }

        return $body;
    }
}

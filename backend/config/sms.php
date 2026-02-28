<?php

return [
    'default_provider' => env('SMS_PROVIDER', 'textlk'),

    'textlk' => [
        'base_url' => env('TEXTLK_BASE_URL', 'https://app.text.lk/api/v3'),
        'api_token' => env('TEXTLK_API_TOKEN'),
        'sender_id' => env('TEXTLK_SENDER_ID', 'TextLKDemo'),
        'type' => env('TEXTLK_SMS_TYPE', 'plain'),
    ],
];

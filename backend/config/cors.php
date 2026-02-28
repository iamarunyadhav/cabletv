<?php

$frontendOrigins = array_filter(
    array_map('trim', explode(',', env('FRONTEND_ORIGINS', '')))
);

$defaultOrigins = [
    env('FRONTEND_URL', 'http://localhost:8080'),
    env('FRONTEND_ALT_URL', 'http://127.0.0.1:8080'),
];

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(
        array_unique(array_filter([...$frontendOrigins, ...$defaultOrigins]))
    ),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];

<?php

namespace App\Support;

use App\Models\Setting;

class SystemSetting
{
    /**
     * @var array<string, bool>
     */
    private static array $cache = [];

    public static function bool(string $key, bool $default = false): bool
    {
        if (! array_key_exists($key, self::$cache)) {
            $value = Setting::query()->where('key', $key)->value('value');

            if ($value === null) {
                self::$cache[$key] = $default;
            } else {
                $normalized = strtolower(trim((string) $value));
                self::$cache[$key] = in_array($normalized, ['1', 'true', 'yes', 'on'], true);
            }
        }

        return self::$cache[$key];
    }

    public static function forget(string $key): void
    {
        unset(self::$cache[$key]);
    }

    public static function clear(): void
    {
        self::$cache = [];
    }
}

<?php

namespace App\Enums;

enum AppRole: string
{
    case Admin = 'admin';
    case Cashier = 'cashier';
    case FieldTech = 'field_tech';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}

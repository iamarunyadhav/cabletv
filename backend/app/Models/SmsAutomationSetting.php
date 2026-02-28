<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class SmsAutomationSetting extends Model
{
    use HasUuidPrimaryKey;

    protected $fillable = [
        'workflow_key',
        'template_key',
        'enabled',
        'description',
    ];

    protected $casts = [
        'enabled' => 'boolean',
    ];
}

<?php

namespace App\Http\Requests\Connections;

use App\Enums\ConnectionStatus;
use Illuminate\Foundation\Http\FormRequest;

class ConnectionUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $connection = $this->route('connection');

        return $connection
            ? ($this->user()?->can('update', $connection) ?? false)
            : false;
    }

    public function rules(): array
    {
        return [
            'box_number' => ['required', 'string', 'max:255'],
            'package_id' => ['required', 'uuid', 'exists:packages,id'],
            'activation_date' => ['nullable', 'date'],
            'special_amount' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'in:' . implode(',', ConnectionStatus::values())],
            'additional_channel_ids' => ['array'],
            'additional_channel_ids.*' => ['uuid', 'exists:additional_channels,id'],
            'setup_item_ids' => ['array'],
            'setup_item_ids.*' => ['uuid', 'exists:setup_items,id'],
        ];
    }
}

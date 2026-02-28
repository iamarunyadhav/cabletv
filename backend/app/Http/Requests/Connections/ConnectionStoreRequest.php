<?php

namespace App\Http\Requests\Connections;

use Illuminate\Foundation\Http\FormRequest;

class ConnectionStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', \App\Models\Connection::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'box_number' => ['required', 'string', 'max:255'],
            'package_id' => ['required', 'uuid', 'exists:packages,id'],
            'activation_date' => ['nullable', 'date'],
            'special_amount' => ['nullable', 'numeric', 'min:0'],
            'additional_channel_ids' => ['array'],
            'additional_channel_ids.*' => ['uuid', 'exists:additional_channels,id'],
            'setup_item_ids' => ['array'],
            'setup_item_ids.*' => ['uuid', 'exists:setup_items,id'],
            'setup_box.price' => ['nullable', 'numeric', 'min:0'],
            'setup_box.recurring' => ['nullable', 'boolean'],
            'first_cycle_charge' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}

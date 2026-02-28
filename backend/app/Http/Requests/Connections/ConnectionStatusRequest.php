<?php

namespace App\Http\Requests\Connections;

use Illuminate\Foundation\Http\FormRequest;

class ConnectionStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        $connection = $this->route('connection');

        if ($connection) {
            return $this->user()?->can('update', $connection->customer) ?? false;
        }

        return $this->user()?->can('update', \App\Models\Customer::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'reason' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'postpone_start' => ['nullable', 'date'],
            'postpone_end' => ['nullable', 'date', 'after_or_equal:postpone_start'],
            'notify' => ['sometimes', 'boolean'],
        ];
    }
}

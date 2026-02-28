<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AccountBatchStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'batch_date' => ['nullable', 'date'],
            'memo' => ['nullable', 'string', 'max:255'],
            'connection_id' => ['nullable', 'uuid'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.label' => ['required', 'string', 'max:255'],
            'lines.*.direction' => ['required', 'in:debit,credit'],
            'lines.*.amount' => ['required', 'numeric', 'min:0.01'],
            'lines.*.connection_id' => ['nullable', 'uuid'],
            'lines.*.notes' => ['nullable', 'string'],
        ];
    }
}

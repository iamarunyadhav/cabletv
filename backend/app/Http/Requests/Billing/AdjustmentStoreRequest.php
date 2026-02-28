<?php

namespace App\Http\Requests\Billing;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdjustmentStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', \App\Models\LedgerEntry::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'min:0.01'],
            'type' => ['required', Rule::in(['credit', 'debit'])],
            'reason' => ['required', 'string'],
            'connection_id' => ['nullable', 'uuid', 'exists:connections,id'],
        ];
    }
}

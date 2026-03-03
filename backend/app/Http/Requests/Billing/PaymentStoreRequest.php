<?php

namespace App\Http\Requests\Billing;

use App\Enums\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PaymentStoreRequest extends FormRequest
{
    private const PAYMENT_METHOD_ALIASES = [
        'bank' => PaymentMethod::BankTransfer->value,
        'online' => PaymentMethod::Upi->value,
    ];

    public function authorize(): bool
    {
        return $this->user()?->can('create', \App\Models\Payment::class) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $method = strtolower(trim((string) $this->input('payment_method')));

        if ($method === '') {
            return;
        }

        $this->merge([
            'payment_method' => self::PAYMENT_METHOD_ALIASES[$method] ?? $method,
        ]);
    }

    public function rules(): array
    {
        return [
            'connection_id' => ['nullable', 'uuid', 'exists:connections,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_date' => ['required', 'date'],
            'payment_method' => ['required', Rule::in(array_column(PaymentMethod::cases(), 'value'))],
            'notes' => ['nullable', 'string'],
            'collector_id' => ['nullable', 'uuid', 'exists:payment_agents,id'],
            'reference_number' => [
                'nullable',
                'string',
                'max:255',
                Rule::requiredIf(fn () => $this->input('payment_method') === PaymentMethod::Cheque->value),
            ],
            'allocations' => ['array'],
            'allocations.*.invoice_id' => ['required_with:allocations', 'uuid', 'exists:invoices,id'],
            'allocations.*.amount' => ['required_with:allocations', 'numeric', 'min:0.01'],
            'send_sms' => ['sometimes', 'boolean'],
        ];
    }
}

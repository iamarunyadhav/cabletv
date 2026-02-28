<?php

namespace App\Http\Requests\Customers;

use App\Models\Customer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CustomerUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Customer $customer */
        $customer = $this->route('customer');

        return $this->user()?->can('update', $customer ?? Customer::class) ?? false;
    }

    public function rules(): array
    {
        /** @var Customer|null $customer */
        $customer = $this->route('customer');

        return [
            'connection_id' => [
                'sometimes',
                'string',
                'max:50',
                Rule::unique('customers', 'connection_id')->ignore($customer?->id),
            ],
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['nullable', 'email'],
            'phone' => ['sometimes', 'string', 'max:25'],
            'nic' => ['nullable', 'string', 'max:25'],
            'address' => ['sometimes', 'string', 'max:500'],
            'agreement_number' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('customers', 'agreement_number')->ignore($customer?->id),
            ],
            'billing_group_id' => ['nullable', 'uuid', 'exists:billing_groups,id'],
            'status' => ['nullable', 'in:active,inactive,suspended'],
            'connection_date' => ['nullable', 'date'],
        ];
    }
}

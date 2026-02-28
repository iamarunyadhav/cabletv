<?php

namespace App\Http\Requests\Customers;

use App\Models\Customer;
use Illuminate\Foundation\Http\FormRequest;

class CustomerStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Customer::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'connection_id' => ['required', 'string', 'max:50', 'unique:customers,connection_id'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email'],
            'phone' => ['required', 'string', 'max:25'],
            'nic' => ['nullable', 'string', 'max:25'],
            'address' => ['required', 'string', 'max:500'],
            'agreement_number' => ['nullable', 'string', 'max:50', 'unique:customers,agreement_number'],
            'billing_group_id' => ['required', 'uuid', 'exists:billing_groups,id'],
            'status' => ['nullable', 'in:active,inactive,suspended'],
            'connection_date' => ['nullable', 'date'],
        ];
    }
}

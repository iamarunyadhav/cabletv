<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SmsSendRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'customer_id' => ['nullable', 'uuid', 'exists:customers,id', 'required_without_all:to_number,customers,connections,area_id,billing_group_id'],
            'to_number' => ['nullable', 'string', 'required_without_all:customer_id,customers,connections,area_id,billing_group_id'],
            'connection_id' => ['nullable', 'uuid', 'exists:connections,id'],
            'template_key' => ['nullable', 'string', 'required_without_all:message_override,message,template_id'],
            'template_id' => ['nullable', 'uuid', 'exists:sms_templates,id', 'required_without_all:message_override,message,template_key'],
            'message_override' => ['nullable', 'string', 'required_without_all:template_key,template_id,message'],
            'params' => ['nullable', 'array'],
            'message' => ['nullable', 'string'],
            'type' => ['nullable', 'string', 'required_with:message'],
            'customers' => ['nullable', 'array'],
            'customers.*' => ['uuid', 'exists:customers,id'],
            'connections' => ['nullable', 'array'],
            'connections.*' => ['uuid', 'exists:connections,id'],
            'area_id' => ['nullable', 'uuid', 'exists:areas,id'],
            'billing_group_id' => ['nullable', 'uuid', 'exists:billing_groups,id'],
        ];
    }
}

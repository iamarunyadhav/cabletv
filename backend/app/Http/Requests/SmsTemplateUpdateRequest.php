<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SmsTemplateUpdateRequest extends FormRequest
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
        $template = $this->route('sms_template');
        $templateId = $template instanceof \App\Models\SmsTemplate ? $template->id : $template;

        return [
            'key' => ['sometimes', 'string', 'max:255', 'unique:sms_templates,key,'.$templateId],
            'name' => ['sometimes', 'string', 'max:255'],
            'body' => ['sometimes', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}

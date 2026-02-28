<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SmsTemplateResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'key' => $this->key ?? $this->template_type,
            'name' => $this->name,
            'body' => $this->body ?? $this->content,
            'is_active' => $this->is_active ?? $this->active,
            'template_type' => $this->template_type,
            'content' => $this->content,
            'days_offset' => $this->days_offset,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

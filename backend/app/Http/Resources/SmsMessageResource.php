<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SmsMessageResource extends JsonResource
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
            'customer_id' => $this->customer_id,
            'connection_id' => $this->connection_id,
            'template_id' => $this->template_id,
            'template_key' => $this->template_key,
            'to_number' => $this->to_number,
            'body' => $this->body,
            'status' => $this->status,
            'provider' => $this->provider,
            'provider_response' => $this->provider_response,
            'error_message' => $this->error_message,
            'sent_at' => $this->sent_at,
            'created_at' => $this->created_at,
        ];
    }
}

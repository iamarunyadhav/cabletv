<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SmsLogResource extends JsonResource
{
    /**
     * @param Request $request
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'phone' => $this->phone,
            'message' => $this->message,
            'type' => $this->type,
            'status' => $this->status,
            'sent_at' => optional($this->sent_at)->toIso8601String(),
        ];
    }
}

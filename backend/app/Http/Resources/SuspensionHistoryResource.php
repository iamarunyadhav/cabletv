<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SuspensionHistoryResource extends JsonResource
{
    /**
     * @param Request $request
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'action' => $this->action,
            'reason' => $this->reason,
            'notes' => $this->notes,
            'previous_status' => $this->previous_status,
            'new_status' => $this->new_status,
            'balance_at_time' => $this->balance_at_time,
            'performed_at' => optional($this->performed_at)->toIso8601String(),
            'performed_by' => $this->performed_by,
            'performed_by_name' => $this->performedBy?->profile?->full_name ?? $this->performedBy?->name,
            'is_automated' => $this->is_automated,
            'connection' => new ConnectionResource($this->whenLoaded('connection')),
        ];
    }
}

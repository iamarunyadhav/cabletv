<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LedgerEntryResource extends JsonResource
{
    /**
     * @param Request $request
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'description' => $this->description,
            'memo' => $this->memo,
            'amount' => (float) $this->amount,
            'balance_after' => (float) $this->balance_after,
            'reference_id' => $this->reference_id,
            'created_at' => optional($this->created_at)->toIso8601String(),
            'connection' => new ConnectionResource($this->whenLoaded('connection')),
        ];
    }
}

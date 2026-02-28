<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerResource extends JsonResource
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
            'connection_id' => $this->connection_id,
            'billing_group_id' => $this->billing_group_id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'nic' => $this->nic,
            'address' => $this->address,
            'agreement_number' => $this->agreement_number,
            'billing_group' => $this->whenLoaded('billingGroup'),
            'area' => $this->whenLoaded('billingGroup', function () {
                return $this->billingGroup?->area;
            }),
            'status' => $this->status?->value ?? $this->status,
            'connection_date' => $this->connection_date,
            'connections' => $this->whenLoaded('connections', function () {
                return $this->connections->map(function ($connection) {
                    return [
                        'id' => $connection->id,
                        'box_number' => $connection->box_number,
                        'current_balance' => $connection->current_balance,
                        'status' => $connection->status,
                        'package' => $connection->package?->only(['id', 'name', 'price']),
                    ];
                });
            }),
            'total_due' => $this->total_due ?? $this->connections?->sum('current_balance'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    /**
     * @param  Request  $request
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'customer_id' => $this->customer_id,
            'connection_id' => $this->connection_id,
            'amount' => (float) $this->amount,
            'payment_method' => $this->payment_method?->value ?? $this->payment_method,
            'payment_date' => $this->payment_date?->toDateTimeString(),
            'created_at' => $this->created_at?->toDateTimeString(),
            'receipt_number' => $this->receipt_number,
            'reference_number' => $this->reference_number,
            'notes' => $this->notes,
            'balance_after' => $this->when(true, function () {
                if ($this->relationLoaded('ledgerEntry')) {
                    return $this->ledgerEntry ? (float) $this->ledgerEntry->balance_after : null;
                }

                if ($this->customer) {
                    return (float) $this->customer->connections()->sum('current_balance');
                }

                return null;
            }),
            'customer' => new CustomerResource($this->whenLoaded('customer')),
            'connection' => new ConnectionResource($this->whenLoaded('connection')),
            'payment_agent' => $this->whenLoaded('paymentAgent'),
            'allocations' => PaymentAllocationResource::collection($this->whenLoaded('allocations')),
        ];
    }
}

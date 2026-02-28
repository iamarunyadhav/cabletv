<?php

namespace App\Http\Resources;

use App\Services\Billing\ConnectionPricingService;
use App\Services\Billing\PrepaymentStatusService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConnectionResource extends JsonResource
{
    /**
     * @param  Request  $request
     */
    public function toArray($request): array
    {
        $pricing = app(ConnectionPricingService::class)->computeTotals($this->resource);
        $prepayment = app(PrepaymentStatusService::class)->compute($this->resource);

        return [
            'id' => $this->id,
            'customer_id' => $this->customer_id,
            'package_id' => $this->package_id,
            'box_number' => $this->box_number,
            'status' => $this->status?->value ?? $this->status,
            'current_balance' => (float) $this->current_balance,
            'special_amount' => $this->special_amount ? (float) $this->special_amount : null,
            'activated_at' => optional($this->activated_at)->toIso8601String(),
            'postpone_start' => $this->postpone_start?->toDateString(),
            'postpone_end' => $this->postpone_end?->toDateString(),
            'package' => new PackageResource($this->whenLoaded('package')),
            'additional_channels' => AdditionalChannelResource::collection($this->whenLoaded('additionalChannels')),
            'setup_items' => SetupItemResource::collection($this->whenLoaded('setupItems')),
            'customer' => new CustomerResource($this->whenLoaded('customer')),
            'base_price' => $pricing['base_price'],
            'channels_total' => $pricing['channels_total'],
            'grand_total' => $pricing['grand_total'],
            'credit_balance' => $prepayment['credit_balance'],
            'prepaid_months' => $prepayment['prepaid_months'],
            'prepaid_through_date' => $prepayment['prepaid_through_date'],
            'prepaid_through_label' => $prepayment['prepaid_through_label'],
            'next_billing_date' => $prepayment['next_billing_date'],
            'monthly_charge' => $prepayment['monthly_charge'],
        ];
    }
}

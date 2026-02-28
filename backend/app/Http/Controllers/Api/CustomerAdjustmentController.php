<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Billing\AdjustmentStoreRequest;
use App\Http\Resources\LedgerEntryResource;
use App\Models\Customer;
use App\Services\Billing\AdjustmentService;
use Illuminate\Http\JsonResponse;

class CustomerAdjustmentController extends Controller
{
    public function __construct(private readonly AdjustmentService $adjustmentService)
    {
    }

    public function store(AdjustmentStoreRequest $request, Customer $customer): JsonResponse
    {
        $this->authorize('update', $customer);

        $entry = $this->adjustmentService->adjust($customer, $request->validated());

        return (new LedgerEntryResource($entry))
            ->response()
            ->setStatusCode(201);
    }
}

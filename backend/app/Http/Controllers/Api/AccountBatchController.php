<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AccountBatchStoreRequest;
use App\Models\AccountBatch;
use App\Models\Customer;
use App\Services\Billing\AccountBatchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountBatchController extends Controller
{
    public function __construct(private readonly AccountBatchService $accountBatchService)
    {
    }

    public function index(Request $request, Customer $customer): JsonResponse
    {
        $this->authorize('viewAny', AccountBatch::class);

        $batches = AccountBatch::query()
            ->with(['lines', 'createdBy'])
            ->where('customer_id', $customer->id)
            ->latest()
            ->limit($request->integer('limit', 50))
            ->get();

        return response()->json($batches);
    }

    public function show(AccountBatch $accountBatch): JsonResponse
    {
        $this->authorize('view', $accountBatch);

        return response()->json(
            $accountBatch->load(['lines.connection', 'customer', 'createdBy'])
        );
    }

    public function store(AccountBatchStoreRequest $request, Customer $customer): JsonResponse
    {
        $this->authorize('create', AccountBatch::class);

        $batch = $this->accountBatchService->create($customer, $request->validated());

        $balanceAfter = (float) $customer->connections()->sum('current_balance');

        return response()->json([
            'batch' => $batch,
            'balance_after' => $balanceAfter,
        ], 201);
    }
}

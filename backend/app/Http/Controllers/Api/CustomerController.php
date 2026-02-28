<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customers\CustomerStoreRequest;
use App\Http\Requests\Customers\CustomerUpdateRequest;
use App\Http\Resources\CustomerResource;
use App\Models\BillingGroup;
use App\Models\Customer;
use App\Services\Customers\ConnectionIdService;
use App\Services\Customers\CustomerService;
use App\Services\Support\SequenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CustomerController extends Controller
{
    public function __construct(
        private readonly CustomerService $customerService,
        private readonly SequenceService $sequenceService,
        private readonly ConnectionIdService $connectionIdService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        if ($request->user()) {
            $this->authorize('viewAny', Customer::class);
        }

        $filters = $request->only([
            'area_id',
            'billing_group_id',
            'status',
            'due_threshold',
            'package_id',
        ]);

        $perPage = (int) $request->get('per_page', 25);
        $perPage = max(1, min(100, $perPage));

        $customers = $this->customerService->list(
            $filters,
            $request->get('search'),
            $perPage,
        );

        return CustomerResource::collection($customers)
            ->response();
    }

    public function search(Request $request): JsonResponse
    {
        if ($request->user()) {
            $this->authorize('viewAny', Customer::class);
        }

        $query = trim((string) $request->get('q', ''));
        if ($query === '') {
            return response()->json(['data' => []]);
        }

        $scope = (string) $request->get('scope', 'all');
        $limit = (int) $request->get('limit', 20);
        $limit = max(1, min(50, $limit));

        $results = $this->customerService->search($query, $scope, $limit);

        return response()->json([
            'data' => $results->map(fn (Customer $customer) => [
                'id' => $customer->id,
                'name' => $customer->name,
                'connection_id' => $customer->connection_id,
                'phone' => $customer->phone,
                'address' => $customer->address,
                'status' => $customer->status,
                'current_balance' => $customer->total_due ?? 0,
                'area' => $customer->billingGroup?->area ? [
                    'id' => $customer->billingGroup->area->id,
                    'name' => $customer->billingGroup->area->name,
                    'code' => $customer->billingGroup->area->code,
                ] : null,
                'billing_group' => $customer->billingGroup ? [
                    'id' => $customer->billingGroup->id,
                    'name' => $customer->billingGroup->name,
                ] : null,
            ]),
        ]);
    }

    public function store(CustomerStoreRequest $request): JsonResponse
    {
        $customer = $this->customerService->create($request->validated());

        return (new CustomerResource($customer))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Customer $customer): CustomerResource
    {
        if ($request->user()) {
            $this->authorize('view', $customer);
        }

        return new CustomerResource(
            $customer->load(['billingGroup.area', 'connections.package'])
        );
    }

    public function update(CustomerUpdateRequest $request, Customer $customer): CustomerResource
    {
        $updated = $this->customerService->update($customer, $request->validated());

        return new CustomerResource($updated);
    }

    public function destroy(Customer $customer): JsonResponse
    {
        $this->authorize('delete', $customer);

        $this->customerService->delete($customer);

        return response()->json([
            'message' => 'Customer deleted successfully.',
        ]);
    }

    public function nextConnectionId(Request $request): JsonResponse
    {
        $this->authorize('create', Customer::class);

        $validated = $request->validate([
            'billing_group_id' => ['required', 'uuid', 'exists:billing_groups,id'],
        ]);

        /** @var BillingGroup $billingGroup */
        $billingGroup = BillingGroup::query()->with('area')->findOrFail($validated['billing_group_id']);

        if (! $billingGroup->area) {
            throw ValidationException::withMessages([
                'billing_group_id' => 'Billing group does not have an area assigned.',
            ]);
        }

        try {
            $generated = $this->connectionIdService->generate($billingGroup);
        } catch (\Throwable $exception) {
            throw ValidationException::withMessages([
                'billing_group_id' => $exception->getMessage(),
            ]);
        }

        return response()->json([
            'area_code' => $generated['area_code'],
            'billing_group_code' => $generated['billing_group_code'],
            'prefix' => $generated['prefix'],
            'sequence' => $generated['sequence'],
            'connection_id' => $generated['connection_id'],
        ]);
    }

    public function generateAgreementNumber(): JsonResponse
    {
        $this->authorize('create', Customer::class);

        try {
            $agreementNumber = $this->sequenceService->next('agreement');
        } catch (\Throwable $exception) {
            throw ValidationException::withMessages([
                'agreement_number' => $exception->getMessage(),
            ]);
        }

        return response()->json([
            'agreement_number' => $agreementNumber,
        ]);
    }
}

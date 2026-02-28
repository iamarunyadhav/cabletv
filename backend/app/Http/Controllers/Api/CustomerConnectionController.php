<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Connections\ConnectionStoreRequest;
use App\Http\Requests\Connections\ConnectionUpdateRequest;
use App\Http\Resources\ConnectionResource;
use App\Models\Connection;
use App\Models\Customer;
use App\Services\Connections\ConnectionService;
use Illuminate\Http\JsonResponse;

class CustomerConnectionController extends Controller
{
    public function __construct(private readonly ConnectionService $connectionService)
    {
    }

    public function index(Customer $customer)
    {
        $this->authorize('view', $customer);

        $connections = $this->connectionService->listForCustomer($customer);

        return ConnectionResource::collection($connections);
    }

    public function store(ConnectionStoreRequest $request, Customer $customer): JsonResponse
    {
        $this->authorize('update', $customer);

        $connection = $this->connectionService->createForCustomer($customer, $request->validated());

        return (new ConnectionResource($connection))
            ->response()
            ->setStatusCode(201);
    }

    public function update(ConnectionUpdateRequest $request, Connection $connection): ConnectionResource
    {
        $this->authorize('update', $connection);

        $updated = $this->connectionService->updateConnection($connection, $request->validated());

        return new ConnectionResource($updated);
    }

    public function destroy(Connection $connection): JsonResponse
    {
        $this->authorize('delete', $connection);

        if ($connection->invoices()->exists() || $connection->payments()->exists()) {
            return response()->json([
                'message' => 'Cannot delete connection with invoices or payments.',
            ], 422);
        }

        $connection->delete();

        return response()->json(['message' => 'Connection deleted.']);
    }
}

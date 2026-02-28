<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Billing\InvoiceStoreRequest;
use App\Http\Resources\InvoiceResource;
use App\Models\Connection;
use App\Models\Customer;
use App\Services\Billing\InvoiceService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerInvoiceController extends Controller
{
    public function __construct(private readonly InvoiceService $invoiceService) {}

    public function index(Request $request, Customer $customer)
    {
        $this->authorize('view', $customer);

        $query = $customer->invoices()
            ->with(['items', 'connection'])
            ->latest();

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        if ($from = $request->get('from')) {
            $query->whereDate('billing_period_start', '>=', $from);
        }

        if ($to = $request->get('to')) {
            $query->whereDate('billing_period_end', '<=', $to);
        }

        if ($connectionId = $request->get('connection_id')) {
            $query->where('connection_id', $connectionId);
        }

        $invoices = $query->paginate(min(100, (int) $request->integer('per_page', 20)));

        return InvoiceResource::collection($invoices);
    }

    public function store(InvoiceStoreRequest $request, Customer $customer): JsonResponse
    {
        $this->authorize('update', $customer);

        $data = $request->validated();

        /** @var Connection $connection */
        $connection = $customer->connections()
            ->whereKey($data['connection_id'])
            ->firstOrFail();

        $invoice = $this->invoiceService->generateForConnection(
            $connection,
            CarbonImmutable::parse($data['billing_period_start']),
            CarbonImmutable::parse($data['billing_period_end']),
        );

        return (new InvoiceResource($invoice))
            ->response()
            ->setStatusCode(201);
    }

    public function generateForConnection(InvoiceStoreRequest $request, Connection $connection): JsonResponse
    {
        $this->authorize('update', $connection->customer);

        $data = $request->validated();

        $invoice = $this->invoiceService->generateForConnection(
            $connection,
            CarbonImmutable::parse($data['billing_period_start']),
            CarbonImmutable::parse($data['billing_period_end']),
        );

        return (new InvoiceResource($invoice))
            ->response()
            ->setStatusCode(201);
    }
}

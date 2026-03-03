<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentMethod;
use App\Http\Controllers\Controller;
use App\Http\Requests\Billing\PaymentStoreRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Connection;
use App\Models\Customer;
use App\Models\Payment;
use App\Services\Billing\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerPaymentController extends Controller
{
    private const PAYMENT_METHOD_ALIASES = [
        'bank' => PaymentMethod::BankTransfer->value,
        'online' => PaymentMethod::Upi->value,
    ];

    private const PAYMENT_METHOD_VARIANTS = [
        PaymentMethod::BankTransfer->value => [PaymentMethod::BankTransfer->value, 'bank'],
        PaymentMethod::Upi->value => [PaymentMethod::Upi->value, 'online'],
    ];

    public function __construct(private readonly PaymentService $paymentService) {}

    public function index(Request $request, Customer $customer)
    {
        $this->authorize('view', $customer);

        $query = $customer->payments()
            ->with(['connection', 'paymentAgent', 'allocations.invoice', 'ledgerEntry'])
            ->latest('payment_date');

        if ($methods = $this->resolvePaymentMethodVariants($request->string('method')->toString())) {
            $query->whereIn('payment_method', $methods);
        }

        if ($paymentMethods = $this->resolvePaymentMethodVariants($request->string('payment_method')->toString())) {
            $query->whereIn('payment_method', $paymentMethods);
        }

        if ($from = $request->get('from')) {
            $query->whereDate('payment_date', '>=', $from);
        }

        if ($to = $request->get('to')) {
            $query->whereDate('payment_date', '<=', $to);
        }

        $payments = $query->paginate(min(100, (int) $request->integer('per_page', 20)));

        return PaymentResource::collection($payments);
    }

    public function store(PaymentStoreRequest $request, Customer $customer): JsonResponse
    {
        $this->authorize('create', Payment::class);
        $this->authorize('view', $customer);

        $payment = $this->paymentService->create($customer, $request->validated());

        return (new PaymentResource($payment))
            ->response()
            ->setStatusCode(201);
    }

    public function storeForConnection(PaymentStoreRequest $request, Connection $connection): JsonResponse
    {
        $customer = $connection->customer;
        $this->authorize('create', Payment::class);
        $this->authorize('view', $customer);

        $data = array_merge($request->validated(), [
            'connection_id' => $connection->id,
        ]);

        $payment = $this->paymentService->create($customer, $data);

        return (new PaymentResource($payment))
            ->response()
            ->setStatusCode(201);
    }

    private function normalizePaymentMethod(?string $method): ?string
    {
        $normalized = strtolower(trim((string) $method));

        if ($normalized === '') {
            return null;
        }

        return self::PAYMENT_METHOD_ALIASES[$normalized] ?? $normalized;
    }

    /**
     * @return list<string>
     */
    private function resolvePaymentMethodVariants(?string $method): array
    {
        $normalized = $this->normalizePaymentMethod($method);

        if ($normalized === null) {
            return [];
        }

        return self::PAYMENT_METHOD_VARIANTS[$normalized] ?? [$normalized];
    }
}

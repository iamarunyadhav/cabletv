<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentMethod;
use App\Http\Controllers\Controller;
use App\Http\Requests\Billing\PaymentStoreRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\Setting;
use App\Services\Billing\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    public function __construct(private readonly PaymentService $paymentService) {}

    public function index(Request $request)
    {
        if ($request->user()) {
            $this->authorize('viewAny', Payment::class);
        }

        $query = Payment::query()
            ->with(['customer', 'connection.customer.billingGroup', 'paymentAgent', 'ledgerEntry'])
            ->latest('payment_date');

        if ($from = $request->get('from')) {
            $query->whereDate('payment_date', '>=', $from);
        }

        if ($to = $request->get('to')) {
            $query->whereDate('payment_date', '<=', $to);
        }

        if ($method = $request->get('method')) {
            $query->where('payment_method', $method);
        }

        if ($customerId = $request->get('customer_id')) {
            $query->where('customer_id', $customerId);
        }

        if ($paymentMethod = $request->get('payment_method')) {
            $query->where('payment_method', $paymentMethod);
        }

        if ($search = $request->get('search')) {
            $query->where(function ($builder) use ($search): void {
                $builder->where('receipt_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($customerQuery) use ($search): void {
                        $customerQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('connection_id', 'like', "%{$search}%");
                    });
            });
        }

        $payments = $query->paginate(min(100, (int) $request->integer('per_page', 50)));

        return PaymentResource::collection($payments);
    }

    public function store(PaymentStoreRequest $request, Customer $customer)
    {
        $this->authorize('update', $customer);

        $payment = $this->paymentService->create($customer, $request->validated());

        return (new PaymentResource($payment))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Payment $payment): PaymentResource
    {
        if ($request->user()) {
            $this->authorize('view', $payment);
        }

        return new PaymentResource(
            $payment->load([
                'customer.billingGroup.area',
                'connection.customer.billingGroup',
                'paymentAgent',
                'allocations.invoice',
                'ledgerEntry',
            ])
        );
    }

    public function update(Request $request, Payment $payment): PaymentResource
    {
        $this->authorize('update', $payment);

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0'],
            'payment_method' => ['required', Rule::in(array_column(PaymentMethod::cases(), 'value'))],
            'payment_date' => ['required', 'date'],
            'reference_number' => [
                'nullable',
                'string',
                'max:255',
                Rule::requiredIf(fn () => $request->input('payment_method') === PaymentMethod::Cheque->value),
            ],
            'notes' => ['nullable', 'string'],
            'payment_agent_id' => ['nullable', 'uuid'],
        ]);

        $payment->update($data);

        return new PaymentResource(
            $payment->fresh(['customer', 'connection', 'paymentAgent'])
        );
    }

    public function destroy(Payment $payment): JsonResponse
    {
        $this->authorize('delete', $payment);

        if ($payment->allocations()->exists()) {
            return response()->json([
                'message' => 'Cannot delete payment with allocations.',
            ], 422);
        }

        $payment->delete();

        return response()->json(['message' => 'Payment deleted.']);
    }

    public function receipt(Request $request, string $receiptNumber): JsonResponse
    {
        $payment = Payment::query()
            ->with(['customer', 'connection.customer.billingGroup', 'paymentAgent', 'ledgerEntry'])
            ->where('receipt_number', $receiptNumber)
            ->firstOrFail();

        if ($request->user()) {
            $this->authorize('view', $payment);
        }

        $companySettings = Setting::query()
            ->whereIn('key', ['company_name', 'company_address', 'company_phone'])
            ->pluck('value', 'key');

        return response()->json([
            'payment' => new PaymentResource($payment),
            'company' => $companySettings,
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        if ($request->user()) {
            $this->authorize('viewAny', Invoice::class);
        }

        $query = Invoice::query()
            ->with(['customer', 'items'])
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

        if ($customerId = $request->get('customer_id')) {
            $query->where('customer_id', $customerId);
        }

        if ($search = $request->get('search')) {
            $query->where(function ($builder) use ($search): void {
                $builder->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($customerQuery) use ($search): void {
                        $customerQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('connection_id', 'like', "%{$search}%");
                    });
            });
        }

        $invoices = $query->paginate(min(100, (int) $request->integer('per_page', 50)));

        return InvoiceResource::collection($invoices);
    }

    public function show(Request $request, Invoice $invoice): InvoiceResource
    {
        if ($request->user()) {
            $this->authorize('view', $invoice);
        }

        return new InvoiceResource(
            $invoice->load(['items', 'customer', 'connection.customer.billingGroup'])
        );
    }

    public function update(Request $request, Invoice $invoice): InvoiceResource
    {
        $this->authorize('update', $invoice);

        $data = $request->validate([
            'billing_period_start' => ['required', 'date'],
            'billing_period_end' => ['required', 'date', 'after_or_equal:billing_period_start'],
            'due_date' => ['required', 'date'],
            'total_amount' => ['required', 'numeric', 'min:0'],
            'paid_amount' => ['required', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(InvoiceStatus::values())],
        ]);

        $invoice->update($this->normalizeInvoicePayload($data));

        return new InvoiceResource(
            $invoice->fresh(['items', 'customer', 'connection.customer.billingGroup'])
        );
    }

    public function destroy(Invoice $invoice): JsonResponse
    {
        $this->authorize('delete', $invoice);

        if ($invoice->allocations()->exists()) {
            return response()->json([
                'message' => 'Cannot delete invoice with payment allocations.',
            ], 422);
        }

        $invoice->items()->delete();
        $invoice->delete();

        return response()->json(['message' => 'Invoice deleted.']);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizeInvoicePayload(array $data): array
    {
        $totalAmount = round((float) $data['total_amount'], 2);
        $paidAmount = round((float) $data['paid_amount'], 2);
        $status = (string) $data['status'];

        if ($totalAmount <= 0) {
            $data['total_amount'] = 0.0;
            $data['paid_amount'] = 0.0;
            $data['status'] = InvoiceStatus::Paid->value;

            return $data;
        }

        $paidAmount = min(max($paidAmount, 0.0), $totalAmount);
        $maxPartialPaid = max(0.0, round($totalAmount - 0.01, 2));

        if ($status === InvoiceStatus::Paid->value) {
            $paidAmount = $totalAmount;
        }

        if ($status === InvoiceStatus::Unpaid->value) {
            $paidAmount = 0.0;
        }

        if ($status === InvoiceStatus::PartiallyPaid->value) {
            if ($maxPartialPaid <= 0) {
                $status = InvoiceStatus::Paid->value;
                $paidAmount = $totalAmount;
            } else {
                $paidAmount = min(max($paidAmount, 0.01), $maxPartialPaid);
            }
        }

        if ($status === InvoiceStatus::Overdue->value) {
            $paidAmount = min($paidAmount, $maxPartialPaid);
        }

        $data['status'] = $status;
        $data['total_amount'] = $totalAmount;
        $data['paid_amount'] = $paidAmount;

        return $data;
    }
}

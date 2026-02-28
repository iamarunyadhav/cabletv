<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupplierPayment;
use App\Models\SupplierBill;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SupplierPaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = SupplierPayment::query()
            ->with(['supplier', 'bill'])
            ->latest('payment_date');

        if ($supplierId = $request->get('supplier_id')) {
            $query->where('supplier_id', $supplierId);
        }

        return response()->json(
            $query->limit($request->integer('limit', 50))->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'supplier_id' => ['required', 'uuid', 'exists:suppliers,id'],
            'supplier_bill_id' => ['nullable', 'uuid', 'exists:supplier_bills,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_date' => ['required', 'date'],
            'payment_method' => ['required', 'string', 'max:100'],
            'reference_number' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        if (! empty($data['supplier_bill_id'])) {
            $bill = SupplierBill::query()->findOrFail($data['supplier_bill_id']);

            if ($bill->supplier_id !== $data['supplier_id']) {
                return response()->json([
                    'message' => 'Selected bill does not belong to supplier.',
                ], 422);
            }
        }

        $payment = SupplierPayment::query()->create(array_merge($data, [
            'recorded_by' => Auth::id(),
        ]));

        if (isset($bill)) {
            $bill->recalculateStatus();
            $payment->setRelation('bill', $bill);
        }

        return response()->json(
            $payment->load(['supplier', 'bill']),
            201
        );
    }
}

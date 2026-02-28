<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupplierBill;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierBillController extends Controller
{
    public function index(Request $request)
    {
        $query = SupplierBill::query()
            ->with('supplier')
            ->withSum('payments as payment_total', 'amount')
            ->latest('due_date');

        if ($supplierId = $request->get('supplier_id')) {
            $query->where('supplier_id', $supplierId);
        }

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        return response()->json(
            $query->limit($request->integer('limit', 50))->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'supplier_id' => ['required', 'uuid', 'exists:suppliers,id'],
            'bill_number' => ['nullable', 'string', 'max:255'],
            'reference_number' => ['nullable', 'string', 'max:255'],
            'bill_date' => ['nullable', 'date'],
            'period_start' => ['nullable', 'date'],
            'period_end' => ['nullable', 'date', 'after_or_equal:period_start'],
            'due_date' => ['required', 'date'],
            'amount_due' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        $bill = SupplierBill::query()->create($data);
        $bill->recalculateStatus();

        return response()->json($bill, 201);
    }

    public function update(Request $request, SupplierBill $supplierBill): JsonResponse
    {
        $data = $request->validate([
            'bill_number' => ['nullable', 'string', 'max:255'],
            'reference_number' => ['nullable', 'string', 'max:255'],
            'bill_date' => ['nullable', 'date'],
            'period_start' => ['nullable', 'date'],
            'period_end' => ['nullable', 'date', 'after_or_equal:period_start'],
            'due_date' => ['required', 'date'],
            'amount_due' => ['required', 'numeric', 'min:0'],
            'amount_paid' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        $supplierBill->update($data);
        $supplierBill->recalculateStatus();

        return response()->json($supplierBill);
    }

    public function destroy(SupplierBill $supplierBill): JsonResponse
    {
        if ($supplierBill->payments()->exists()) {
            return response()->json([
                'message' => 'Bill has payments and cannot be removed.',
            ], 422);
        }

        $supplierBill->delete();

        return response()->json(['message' => 'Bill deleted.']);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class SupplierController extends Controller
{
    public function index(): JsonResponse
    {
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();

        $suppliers = Supplier::query()
            ->withFinancials()
            ->withSum(
                ['bills as month_due' => function ($query) use ($startOfMonth, $endOfMonth): void {
                    $query->whereBetween('due_date', [$startOfMonth, $endOfMonth]);
                }],
                'amount_due',
            )
            ->withSum(
                ['payments as month_paid' => function ($query) use ($startOfMonth, $endOfMonth): void {
                    $query->whereBetween('payment_date', [$startOfMonth, $endOfMonth]);
                }],
                'amount',
            )
            ->orderBy('name')
            ->get()
            ->map(function (Supplier $supplier) {
                $billed = (float) ($supplier->total_billed ?? 0);
                $paidAgainstBills = (float) ($supplier->total_bill_paid ?? 0);

                $supplier->setAttribute('outstanding_balance', max($billed - $paidAgainstBills, 0));
                $supplier->setAttribute('month_due', (float) ($supplier->month_due ?? 0));
                $supplier->setAttribute('month_paid', (float) ($supplier->month_paid ?? 0));

                return $supplier;
            })
            ->values();

        return response()->json($suppliers);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', 'unique:suppliers,code'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email'],
            'billing_email' => ['nullable', 'email'],
            'billing_cycle_start' => ['nullable', 'integer', 'between:1,31'],
            'billing_cycle_end' => ['nullable', 'integer', 'between:1,31'],
            'contract_amount' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
        ]);

        $supplier = Supplier::query()->create($data);
        $supplier->loadFinancials();

        return response()->json($supplier, 201);
    }

    public function update(Request $request, Supplier $supplier): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', 'unique:suppliers,code,' . $supplier->id],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email'],
            'billing_email' => ['nullable', 'email'],
            'billing_cycle_start' => ['nullable', 'integer', 'between:1,31'],
            'billing_cycle_end' => ['nullable', 'integer', 'between:1,31'],
            'contract_amount' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ]);

        if (array_key_exists('code', $data) && ($data['code'] === '' || $data['code'] === null)) {
            unset($data['code']);
        }

        $supplier->update($data);
        $supplier->loadFinancials();

        return response()->json($supplier);
    }

    public function destroy(Supplier $supplier): JsonResponse
    {
        if ($supplier->bills()->exists() || $supplier->payments()->exists()) {
            return response()->json([
                'message' => 'Supplier has related bills or payments.',
            ], 422);
        }

        $supplier->delete();

        return response()->json(['message' => 'Supplier deleted.']);
    }
}

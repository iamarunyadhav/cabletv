<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Connection;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\SupplierBill;
use App\Models\SupplierPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $from = $request->get('from');
        $to = $request->get('to');

        $payments = Payment::query()
            ->select(['amount', 'payment_date'])
            ->when($from, fn ($q) => $q->whereDate('payment_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('payment_date', '<=', $to))
            ->orderBy('payment_date')
            ->get();

        $paymentsDaily = Payment::query()
            ->when($from, fn ($q) => $q->whereDate('payment_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('payment_date', '<=', $to))
            ->selectRaw('DATE(COALESCE(payment_date, created_at)) as payment_day')
            ->selectRaw('SUM(amount) as total_amount')
            ->groupBy('payment_day')
            ->orderBy('payment_day')
            ->get();

        $supplierPayments = SupplierPayment::query()
            ->select(['amount', 'payment_date'])
            ->when($from, fn ($q) => $q->whereDate('payment_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('payment_date', '<=', $to))
            ->orderBy('payment_date')
            ->get();

        $supplierPaymentsDaily = SupplierPayment::query()
            ->when($from, fn ($q) => $q->whereDate('payment_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('payment_date', '<=', $to))
            ->selectRaw('DATE(COALESCE(payment_date, created_at)) as payment_day')
            ->selectRaw('SUM(amount) as total_amount')
            ->groupBy('payment_day')
            ->orderBy('payment_day')
            ->get();

        $supplierBills = SupplierBill::query()
            ->select(['id', 'supplier_id', 'status', 'amount_due', 'amount_paid', 'due_date'])
            ->when($from, fn ($q) => $q->whereDate('due_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('due_date', '<=', $to))
            ->with('supplier:id,name')
            ->get();

        $connections = Connection::query()
            ->select(['id', 'box_number', 'status', 'current_balance', 'suspended_at', 'suspension_reason', 'customer_id', 'created_at'])
            ->with(['customer' => function ($customer): void {
                $customer->select('id', 'name', 'connection_id', 'phone', 'billing_group_id');
            }, 'customer.billingGroup:id,area_id', 'customer.billingGroup.area:id,name'])
            ->when($from, fn ($q) => $q->whereDate('created_at', '>=', $from))
            ->get();

        $customers = Customer::query()
            ->select(['id', 'billing_group_id'])
            ->with(['billingGroup:id,area_id', 'billingGroup.area:id,name'])
            ->get();

        return response()->json([
            'payments' => $payments,
            'paymentsDaily' => $paymentsDaily,
            'supplierPayments' => $supplierPayments,
            'supplierPaymentsDaily' => $supplierPaymentsDaily,
            'supplierBills' => $supplierBills,
            'connections' => $connections,
            'customers' => $customers,
        ]);
    }
}

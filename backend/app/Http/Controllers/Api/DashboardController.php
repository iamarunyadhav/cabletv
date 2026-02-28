<?php

namespace App\Http\Controllers\Api;

use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function summary(): JsonResponse
    {
        $this->authorize('viewAny', Customer::class);

        $activeCustomers = Customer::query()
            ->whereHas('connections', function ($query): void {
                $query->where('status', 'active');
            })
            ->count();

        $totalInvoices = Invoice::query()->count();
        $overdueInvoices = Invoice::query()
            ->where('status', InvoiceStatus::Overdue->value)
            ->count();

        $startOfMonth = Carbon::now()->startOfMonth();
        $monthlyRevenue = Payment::query()
            ->whereDate('payment_date', '>=', $startOfMonth)
            ->sum('amount');

        return response()->json([
            'active_customers' => $activeCustomers,
            'total_invoices' => $totalInvoices,
            'overdue_invoices' => $overdueInvoices,
            'monthly_revenue' => (float) $monthlyRevenue,
        ]);
    }
}

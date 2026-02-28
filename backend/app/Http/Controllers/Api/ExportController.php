<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Connection;
use App\Models\Payment;
use App\Models\SupplierBill;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    public function payables(Request $request): StreamedResponse
    {
        $query = SupplierBill::query()
            ->with('supplier:id,name')
            ->orderBy('due_date');

        return $this->streamCsv('supplier-payables.csv', ['Supplier', 'Bill #', 'Reference', 'Due Date', 'Status', 'Amount Due', 'Amount Paid', 'Outstanding'], function ($handle) use ($query): void {
            $query->chunk(500, function ($bills) use ($handle): void {
                foreach ($bills as $bill) {
                    fputcsv($handle, [
                        $bill->supplier?->name,
                        $bill->bill_number,
                        $bill->reference_number,
                        $bill->due_date?->format('Y-m-d'),
                        $bill->status,
                        $bill->amount_due,
                        $bill->amount_paid,
                        max(($bill->amount_due ?? 0) - ($bill->amount_paid ?? 0), 0),
                    ]);
                }
            });
        });
    }

    public function receivables(Request $request): StreamedResponse
    {
        $query = Connection::query()
            ->with(['customer:id,name,connection_id'])
            ->orderByDesc('current_balance');

        return $this->streamCsv('customer-receivables.csv', ['Customer', 'Connection ID', 'Box #', 'Status', 'Current Balance'], function ($handle) use ($query): void {
            $query->chunk(500, function ($connections) use ($handle): void {
                foreach ($connections as $connection) {
                    fputcsv($handle, [
                        $connection->customer?->name,
                        $connection->customer?->connection_id,
                        $connection->box_number,
                        $connection->status,
                        $connection->current_balance,
                    ]);
                }
            });
        });
    }

    public function payments(Request $request): StreamedResponse
    {
        $query = Payment::query()
            ->with(['customer:id,name'])
            ->orderByDesc('payment_date');

        return $this->streamCsv('payments.csv', ['Date', 'Customer', 'Method', 'Reference', 'Amount'], function ($handle) use ($query): void {
            $query->chunk(500, function ($payments) use ($handle): void {
                foreach ($payments as $payment) {
                    fputcsv($handle, [
                        $payment->payment_date?->format('Y-m-d'),
                        $payment->customer?->name,
                        $payment->payment_method,
                        $payment->reference_number,
                        $payment->amount,
                    ]);
                }
            });
        });
    }

    private function streamCsv(string $filename, array $header, \Closure $writer): StreamedResponse
    {
        return response()->streamDownload(function () use ($header, $writer): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $header);
            $writer($handle);
            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }
}

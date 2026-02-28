<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LedgerEntryResource;
use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerLedgerController extends Controller
{
    public function index(Request $request, Customer $customer)
    {
        $this->authorize('view', $customer);

        $query = $customer->ledgerEntries()
            ->with('connection')
            ->latest();

        if ($request->filled('types')) {
            $types = explode(',', (string) $request->get('types'));
            $query->whereIn('type', $types);
        }

        if ($from = $request->get('from')) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->get('to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        if ($connectionId = $request->get('connection_id')) {
            $query->where('connection_id', $connectionId);
        }

        if ($search = $request->get('search')) {
            $query->where('description', 'like', "%{$search}%");
        }

        return LedgerEntryResource::collection($query->get());
    }
}

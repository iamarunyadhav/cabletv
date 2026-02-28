<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Connection;
use Illuminate\Http\Request;

class SuspensionController extends Controller
{
    public function index(Request $request)
    {
        if ($request->user()) {
            $this->authorize('viewAny', Connection::class);
        }

        $query = Connection::query()
            ->with(['customer.billingGroup.area', 'package', 'suspensionHistory' => function ($history): void {
                $history->latest('performed_at');
            }])
            ->where('status', 'suspended')
            ->orderByDesc('suspended_at');

        if ($search = $request->get('search')) {
            $query->where(function ($builder) use ($search): void {
                $builder->where('box_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($customerQuery) use ($search): void {
                        $customerQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    });
            });
        }

        if ($reason = $request->get('reason')) {
            $query->where('suspension_reason', $reason);
        }

        if ($areaId = $request->get('area_id')) {
            $query->whereHas('customer.billingGroup', fn ($customer) => $customer->where('area_id', $areaId));
        }

        if ($min = $request->get('min_balance')) {
            $query->where('current_balance', '>=', (float) $min);
        }

        if ($max = $request->get('max_balance')) {
            $query->where('current_balance', '<=', (float) $max);
        }

        $connections = $query->get();

        if (($type = $request->get('type')) && in_array($type, ['auto', 'manual'], true)) {
            $connections = $connections->filter(function (Connection $connection) use ($type) {
                $latest = $connection->suspensionHistory->first();
                $isAuto = (bool) ($latest->is_automated ?? false);

                return $type === 'auto' ? $isAuto : ! $isAuto;
            })->values();
        }

        return response()->json($connections);
    }
}

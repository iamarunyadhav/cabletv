<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ConnectionResource;
use App\Models\Connection;
use Illuminate\Http\Request;

class ConnectionController extends Controller
{
    public function index(Request $request)
    {
        if ($request->user()) {
            $this->authorize('viewAny', Connection::class);
        }

        $query = Connection::query()
            ->with(['customer.billingGroup.area', 'package'])
            ->latest();

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        if ($areaId = $request->get('area_id')) {
            $query->whereHas('customer.billingGroup', fn ($builder) => $builder->where('area_id', $areaId));
        }

        if ($packageId = $request->get('package_id')) {
            $ids = is_array($packageId) ? $packageId : explode(',', (string) $packageId);
            $query->whereIn('package_id', array_filter($ids));
        }

        if ($search = $request->get('search')) {
            $query->where(function ($builder) use ($search): void {
                $builder->where('box_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', fn ($customerBuilder) => $customerBuilder->where('name', 'like', "%{$search}%"));
            });
        }

        return ConnectionResource::collection($query->paginate($request->get('per_page', 25)));
    }

    public function show(Request $request, Connection $connection): ConnectionResource
    {
        if ($request->user()) {
            $this->authorize('view', $connection);
        }

        return new ConnectionResource(
            $connection->load([
                'customer.billingGroup',
                'package',
                'additionalChannels',
                'setupItems',
            ])
        );
    }
}

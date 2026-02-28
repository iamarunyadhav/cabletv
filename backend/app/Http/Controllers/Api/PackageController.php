<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Package;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PackageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $packages = Package::query()
            ->when($request->has('active'), function ($query) use ($request): void {
                $active = filter_var($request->get('active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if ($active !== null) {
                    $query->where('active', $active);
                }
            })
            ->withCount(['connections as customer_count'])
            ->orderBy('name')
            ->get();

        return response()->json($packages);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:packages,name'],
            'price' => ['required', 'numeric', 'min:0'],
            'discount_type' => ['nullable', 'in:none,percentage,fixed'],
            'discount_value' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'active' => ['boolean'],
        ]);

        $package = Package::query()->create($data);

        return response()->json($package, 201);
    }

    public function show(Package $package): JsonResponse
    {
        return response()->json($package);
    }

    public function update(Request $request, Package $package): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:packages,name,'.$package->id],
            'price' => ['required', 'numeric', 'min:0'],
            'discount_type' => ['nullable', 'in:none,percentage,fixed'],
            'discount_value' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'active' => ['boolean'],
        ]);

        $package->update($data);

        return response()->json($package);
    }

    public function destroy(Package $package): JsonResponse
    {
        if ($package->connections()->exists()) {
            return response()->json([
                'message' => 'Cannot delete package with active connections.',
            ], 422);
        }

        $package->delete();

        return response()->json(['message' => 'Package deleted.']);
    }
}

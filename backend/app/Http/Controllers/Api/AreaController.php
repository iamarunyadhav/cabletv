<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Area;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AreaController extends Controller
{
    public function index(): JsonResponse
    {
        $areas = Area::query()
            ->withCount(['customers as customer_count'])
            ->orderBy('name')
            ->get();

        return response()->json($areas);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:10', 'unique:areas,code'],
            'description' => ['nullable', 'string'],
        ]);

        $area = Area::query()->create($data);

        return response()->json($area, 201);
    }

    public function show(Area $area): JsonResponse
    {
        return response()->json($area);
    }

    public function update(Request $request, Area $area): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:10', 'unique:areas,code,' . $area->id],
            'description' => ['nullable', 'string'],
        ]);

        $area->update($data);

        return response()->json($area);
    }

    public function destroy(Area $area): JsonResponse
    {
        if ($area->customers()->exists()) {
            return response()->json([
                'message' => 'Cannot delete area that has customers.',
            ], 422);
        }

        $area->delete();

        return response()->json(['message' => 'Area deleted.']);
    }
}

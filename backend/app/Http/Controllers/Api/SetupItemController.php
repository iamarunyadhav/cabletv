<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SetupItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SetupItemController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            SetupItem::query()->orderBy('name')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:setup_items,name'],
            'price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $item = SetupItem::query()->create($data);

        return response()->json($item, 201);
    }

    public function show(SetupItem $setupItem): JsonResponse
    {
        return response()->json($setupItem);
    }

    public function update(Request $request, SetupItem $setupItem): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:setup_items,name,' . $setupItem->id],
            'price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $setupItem->update($data);

        return response()->json($setupItem);
    }

    public function destroy(SetupItem $setupItem): JsonResponse
    {
        if ($setupItem->connections()->exists()) {
            return response()->json([
                'message' => 'Cannot delete setup item in use.',
            ], 422);
        }

        $setupItem->delete();

        return response()->json(['message' => 'Setup item deleted.']);
    }
}

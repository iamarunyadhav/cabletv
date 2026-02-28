<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdditionalChannel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdditionalChannelController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            AdditionalChannel::query()->orderBy('name')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:additional_channels,name'],
            'monthly_amount' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ]);

        $channel = AdditionalChannel::query()->create($data);

        return response()->json($channel, 201);
    }

    public function show(AdditionalChannel $additionalChannel): JsonResponse
    {
        return response()->json($additionalChannel);
    }

    public function update(Request $request, AdditionalChannel $additionalChannel): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:additional_channels,name,' . $additionalChannel->id],
            'monthly_amount' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ]);

        $additionalChannel->update($data);

        return response()->json($additionalChannel);
    }

    public function destroy(AdditionalChannel $additionalChannel): JsonResponse
    {
        if ($additionalChannel->connections()->exists()) {
            return response()->json([
                'message' => 'Cannot delete channel in use.',
            ], 422);
        }

        $additionalChannel->delete();

        return response()->json(['message' => 'Channel deleted.']);
    }
}

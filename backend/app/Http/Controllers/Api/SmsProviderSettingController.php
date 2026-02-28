<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SmsProviderSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SmsProviderSettingController extends Controller
{
    public function show(): JsonResponse
    {
        $setting = SmsProviderSetting::query()
            ->where('is_active', true)
            ->first();

        return response()->json($setting ?? ['provider' => 'none', 'config' => []]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'provider' => ['required', 'string', 'max:100'],
            'config' => ['nullable', 'array'],
        ]);

        SmsProviderSetting::query()->update(['is_active' => false]);

        $setting = SmsProviderSetting::query()->updateOrCreate(
            ['provider' => $data['provider']],
            ['config' => $data['config'], 'is_active' => true]
        );

        return response()->json($setting);
    }
}

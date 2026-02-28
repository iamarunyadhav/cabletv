<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BillingGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillingGroupController extends Controller
{
    public function index(): JsonResponse
    {
        $groups = BillingGroup::query()
            ->with('area')
            ->withCount(['customers as customer_count'])
            ->orderBy('name')
            ->get();

        return response()->json($groups);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:billing_groups,name'],
            'area_id' => ['required', 'uuid', 'exists:areas,id'],
            'billing_start_day' => ['required', 'integer', 'between:1,31'],
            'billing_end_day' => ['required', 'integer', 'between:1,31'],
            'grace_days' => ['required', 'integer', 'min:0'],
            'friendly_reminder_days' => ['nullable', 'integer', 'min:0'],
            'disconnect_notice_days' => ['nullable', 'integer', 'min:0'],
            'maximum_debit_balance' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
        ]);

        $group = BillingGroup::query()->create($data);

        return response()->json($group, 201);
    }

    public function show(BillingGroup $billingGroup): JsonResponse
    {
        return response()->json($billingGroup->load('area'));
    }

    public function update(Request $request, BillingGroup $billingGroup): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:billing_groups,name,' . $billingGroup->id],
            'area_id' => ['required', 'uuid', 'exists:areas,id'],
            'billing_start_day' => ['required', 'integer', 'between:1,31'],
            'billing_end_day' => ['required', 'integer', 'between:1,31'],
            'grace_days' => ['required', 'integer', 'min:0'],
            'friendly_reminder_days' => ['nullable', 'integer', 'min:0'],
            'disconnect_notice_days' => ['nullable', 'integer', 'min:0'],
            'maximum_debit_balance' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
        ]);

        $billingGroup->update($data);

        return response()->json($billingGroup);
    }

    public function destroy(BillingGroup $billingGroup): JsonResponse
    {
        if ($billingGroup->customers()->exists()) {
            return response()->json([
                'message' => 'Cannot delete billing group that has customers.',
            ], 422);
        }

        $billingGroup->delete();

        return response()->json(['message' => 'Billing group deleted.']);
    }
}

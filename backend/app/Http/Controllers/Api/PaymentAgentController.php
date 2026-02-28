<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentAgent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentAgentController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            PaymentAgent::query()->orderBy('name')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', 'unique:payment_agents,code'],
            'agent_type' => ['required', 'string', 'max:50'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'is_active' => ['boolean'],
        ]);

        $agent = PaymentAgent::query()->create($data);

        return response()->json($agent, 201);
    }

    public function show(PaymentAgent $paymentAgent): JsonResponse
    {
        return response()->json($paymentAgent);
    }

    public function update(Request $request, PaymentAgent $paymentAgent): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', 'unique:payment_agents,code,' . $paymentAgent->id],
            'agent_type' => ['required', 'string', 'max:50'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'is_active' => ['boolean'],
        ]);

        $paymentAgent->update($data);

        return response()->json($paymentAgent);
    }

    public function destroy(PaymentAgent $paymentAgent): JsonResponse
    {
        if ($paymentAgent->payments()->exists()) {
            return response()->json([
                'message' => 'Cannot delete agent with recorded payments.',
            ], 422);
        }

        $paymentAgent->delete();

        return response()->json(['message' => 'Payment agent deleted.']);
    }
}

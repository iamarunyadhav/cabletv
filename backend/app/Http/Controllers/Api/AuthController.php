<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Services\Auth\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuthService $authService
    ) {
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        [$user, $token] = $this->authService->register($request->validated());

        return response()->json([
            'token' => $token,
            'user'  => $user,
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        [$user, $token] = $this->authService->login(
            $credentials['email'],
            $credentials['password'],
        );

        return response()->json([
            'token' => $token,
            'user'  => $user,
        ]);
    }

    public function profile(Request $request): JsonResponse
    {
        $user = $request->user()->load(['profile', 'roles']);

        return response()->json([
            'user' => $user,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function requestReset(ForgotPasswordRequest $request): JsonResponse
    {
        $this->authService->requestResetLink($request->validated()['email']);

        return response()->json([
            'message' => __('passwords.sent'),
        ]);
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $this->authService->resetPassword($request->validated());

        return response()->json([
            'message' => __('passwords.reset'),
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Enums\AppRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::query()
            ->with(['profile', 'roles'])
            ->orderBy('name')
            ->get()
            ->map(function (User $user) {
                return [
                    'id' => $user->id,
                    'full_name' => $user->profile?->full_name ?? $user->name,
                    'phone' => $user->profile?->phone,
                    'email' => $user->email,
                    'roles' => $user->roles->map(fn ($role) => ['role' => $role->role]),
                ];
            });

        return response()->json(['users' => $users]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'phone' => ['nullable', 'string'],
        ]);

        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        $user->profile()->create([
            'full_name' => $data['name'],
            'phone' => $data['phone'] ?? null,
        ]);

        return response()->json($user->load('roles'));
    }

    public function assignRole(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'role' => ['required', 'string', 'in:' . implode(',', array_column(AppRole::cases(), 'value'))],
        ]);

        UserRole::query()->firstOrCreate([
            'user_id' => $user->id,
            'role' => $data['role'],
        ]);

        return response()->json(['message' => 'Role assigned.']);
    }

    public function removeRole(User $user, string $role): JsonResponse
    {
        UserRole::query()
            ->where('user_id', $user->id)
            ->where('role', $role)
            ->delete();

        return response()->json(['message' => 'Role removed.']);
    }
}

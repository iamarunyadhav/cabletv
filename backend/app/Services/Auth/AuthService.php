<?php

namespace App\Services\Auth;

use App\Enums\AppRole;
use App\Models\Profile;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;

class AuthService
{
    public function register(array $data): array
    {
        $role = AppRole::tryFrom($data['role'] ?? '') ?? AppRole::Cashier;

        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'email_verified_at' => now(),
        ]);

        Profile::query()->updateOrCreate(
            ['id' => $user->id],
            [
                'full_name' => $user->name,
                'phone' => $data['phone'] ?? null,
            ],
        );

        UserRole::query()->updateOrCreate(
            ['user_id' => $user->id, 'role' => $role],
            [],
        );

        $user->tokens()->delete();
        $token = $user->createToken('cable-spa')->plainTextToken;

        return [$user->load(['profile', 'roles']), $token];
    }

    public function login(string $email, string $password): array
    {
        $user = User::query()->where('email', $email)->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        $user->tokens()->delete();
        $token = $user->createToken('cable-spa')->plainTextToken;

        return [$user->load(['profile', 'roles']), $token];
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()?->delete();
    }

    public function requestResetLink(string $email): void
    {
        $status = Password::sendResetLink(['email' => $email]);

        if ($status !== Password::RESET_LINK_SENT) {
            throw ValidationException::withMessages([
                'email' => __($status),
            ]);
        }
    }

    public function resetPassword(array $payload): void
    {
        $status = Password::reset(
            $payload,
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => __($status),
            ]);
        }
    }
}

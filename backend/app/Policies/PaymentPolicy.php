<?php

namespace App\Policies;

use App\Enums\AppRole;
use App\Models\Payment;
use App\Models\User;

class PaymentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole([AppRole::Admin, AppRole::Cashier, AppRole::FieldTech]);
    }

    public function view(User $user, Payment $payment): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole([AppRole::Admin, AppRole::Cashier]);
    }

    public function update(User $user, Payment $payment): bool
    {
        return $user->hasAnyRole([AppRole::Admin, AppRole::Cashier]);
    }

    public function delete(User $user, Payment $payment): bool
    {
        return $user->hasRole(AppRole::Admin);
    }
}

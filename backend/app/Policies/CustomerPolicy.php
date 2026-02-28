<?php

namespace App\Policies;

use App\Enums\AppRole;
use App\Models\Customer;
use App\Models\User;

class CustomerPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole([AppRole::Admin, AppRole::Cashier, AppRole::FieldTech]);
    }

    public function view(User $user, Customer $customer): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole([AppRole::Admin, AppRole::Cashier]);
    }

    public function update(User $user, Customer $customer): bool
    {
        return $user->hasAnyRole([AppRole::Admin, AppRole::Cashier]);
    }

    public function delete(User $user, Customer $customer): bool
    {
        return $user->hasRole(AppRole::Admin);
    }
}

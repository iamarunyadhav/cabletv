<?php

namespace App\Policies;

use App\Enums\AppRole;
use App\Models\Connection;
use App\Models\User;

class ConnectionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole([AppRole::Admin, AppRole::Cashier, AppRole::FieldTech]);
    }

    public function view(User $user, Connection $connection): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole([AppRole::Admin, AppRole::Cashier]);
    }

    public function update(User $user, Connection $connection): bool
    {
        return $user->hasAnyRole([AppRole::Admin, AppRole::Cashier]);
    }

    public function delete(User $user, Connection $connection): bool
    {
        return $user->hasRole(AppRole::Admin);
    }
}

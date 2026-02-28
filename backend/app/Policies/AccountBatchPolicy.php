<?php

namespace App\Policies;

use App\Enums\AppRole;
use App\Models\AccountBatch;
use App\Models\User;

class AccountBatchPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole([AppRole::Admin, AppRole::Cashier, AppRole::FieldTech]);
    }

    public function view(User $user, AccountBatch $accountBatch): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole([AppRole::Admin, AppRole::Cashier]);
    }
}

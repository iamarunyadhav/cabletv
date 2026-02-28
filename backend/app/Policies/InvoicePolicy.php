<?php

namespace App\Policies;

use App\Enums\AppRole;
use App\Models\Invoice;
use App\Models\User;

class InvoicePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole([AppRole::Admin, AppRole::Cashier, AppRole::FieldTech]);
    }

    public function view(User $user, Invoice $invoice): bool
    {
        return $this->viewAny($user);
    }

    public function update(User $user, Invoice $invoice): bool
    {
        return $user->hasAnyRole([AppRole::Admin, AppRole::Cashier]);
    }

    public function delete(User $user, Invoice $invoice): bool
    {
        return $user->hasRole(AppRole::Admin);
    }
}

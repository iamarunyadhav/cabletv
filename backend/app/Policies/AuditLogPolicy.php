<?php

namespace App\Policies;

use App\Enums\AppRole;
use App\Models\AuditLog;
use App\Models\User;

class AuditLogPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole([AppRole::Admin, AppRole::Cashier, AppRole::FieldTech]);
    }

    public function view(User $user, AuditLog $auditLog): bool
    {
        return $this->viewAny($user);
    }
}

<?php

namespace App\Providers;

use App\Models\AuditLog;
use App\Models\AccountBatch;
use App\Models\Connection;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Payment;
use App\Policies\AccountBatchPolicy;
use App\Policies\AuditLogPolicy;
use App\Policies\ConnectionPolicy;
use App\Policies\CustomerPolicy;
use App\Policies\InvoicePolicy;
use App\Policies\PaymentPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Customer::class, CustomerPolicy::class);
        Gate::policy(Connection::class, ConnectionPolicy::class);
        Gate::policy(Payment::class, PaymentPolicy::class);
        Gate::policy(Invoice::class, InvoicePolicy::class);
        Gate::policy(AuditLog::class, AuditLogPolicy::class);
        Gate::policy(AccountBatch::class, AccountBatchPolicy::class);
    }
}

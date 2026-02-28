<?php

use App\Http\Controllers\Api\AccountBatchController;
use App\Http\Controllers\Api\AdditionalChannelController;
use App\Http\Controllers\Api\AreaController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingGroupController;
use App\Http\Controllers\Api\ConnectionController;
use App\Http\Controllers\Api\ConnectionStatusController;
use App\Http\Controllers\Api\CustomerActivityController;
use App\Http\Controllers\Api\CustomerAdjustmentController;
use App\Http\Controllers\Api\CustomerConnectionController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\CustomerInvoiceController;
use App\Http\Controllers\Api\CustomerLedgerController;
use App\Http\Controllers\Api\CustomerPaymentController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\LegacyImportController;
use App\Http\Controllers\Api\LookupController;
use App\Http\Controllers\Api\PackageController;
use App\Http\Controllers\Api\PaymentAgentController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\SetupItemController;
use App\Http\Controllers\Api\SmsAutomationSettingController;
use App\Http\Controllers\Api\SmsController;
use App\Http\Controllers\Api\SmsProviderSettingController;
use App\Http\Controllers\Api\SmsTemplateController;
use App\Http\Controllers\Api\SupplierBillController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\SupplierPaymentController;
use App\Http\Controllers\Api\SuspensionController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    /*
    |--------------------------------------------------------------------------
    | Public auth endpoints
    |--------------------------------------------------------------------------
    */
    Route::post('auth/login', [AuthController::class, 'login']);
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/password/forgot', [AuthController::class, 'requestReset']);
    Route::post('auth/password/reset', [AuthController::class, 'resetPassword']);

    /*
    |--------------------------------------------------------------------------
    | Public READ-ONLY endpoints
    | (Frontend can fetch these without being logged in)
    |--------------------------------------------------------------------------
    */

    // Generic lookups used by UI
    Route::get('lookups', [LookupController::class, 'index']);

    // Areas & Billing groups
    Route::apiResource('areas', AreaController::class)->only(['index', 'show']);
    Route::apiResource('billing-groups', BillingGroupController::class)->only(['index', 'show']);

    // Packages & add-ons
    Route::apiResource('packages', PackageController::class)->only(['index', 'show']);
    Route::apiResource('additional-channels', AdditionalChannelController::class)->only(['index', 'show']);
    Route::apiResource('setup-items', SetupItemController::class)->only(['index', 'show']);

    // Suppliers & their finance read
    Route::apiResource('suppliers', SupplierController::class)->only(['index', 'show']);
    Route::apiResource('supplier-bills', SupplierBillController::class)->only(['index', 'show']);
    Route::apiResource('supplier-payments', SupplierPaymentController::class)->only(['index', 'show']);

    // Customers & connections basic listing (so dashboard / customer list can load)
    Route::get('customers', [CustomerController::class, 'index']);
    Route::get('customers/search', [CustomerController::class, 'search']);
    Route::get('customers/{customer}', [CustomerController::class, 'show'])->whereUuid('customer');
    Route::get('connections', [ConnectionController::class, 'index']);
    Route::get('connections/{connection}', [ConnectionController::class, 'show']);
    Route::get('connections/{connection}/history', [ConnectionStatusController::class, 'history']);

    // Suspensions & reports view-only
    Route::get('suspensions', [SuspensionController::class, 'index']);

    // Payments & invoices read-only
    Route::get('payments', [PaymentController::class, 'index']);
    Route::get('payments/{payment}', [PaymentController::class, 'show']);
    Route::get('payments/receipt/{receiptNumber}', [PaymentController::class, 'receipt']);
    Route::get('invoices', [InvoiceController::class, 'index']);
    Route::get('invoices/{invoice}', [InvoiceController::class, 'show']);

    // SMS logs & active provider (view only)
    Route::get('sms/logs', [SmsController::class, 'logs']);
    Route::get('sms/providers/active', [SmsProviderSettingController::class, 'show']);

    /*
    |--------------------------------------------------------------------------
    | AUTHENTICATED endpoints (Sanctum)
    |--------------------------------------------------------------------------
    */
    Route::middleware('auth:sanctum')->group(function (): void {
        // Auth / profile
        Route::get('auth/profile', [AuthController::class, 'profile']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        // Dashboard & high-level reports
        Route::get('dashboard/summary', [DashboardController::class, 'summary']);
        Route::get('reports/overview', [ReportController::class, 'overview']);

        // Settings & legacy import
        Route::get('settings', [SettingController::class, 'index']);
        Route::put('settings', [SettingController::class, 'update']);
        Route::get('sms-automation-settings', [SmsAutomationSettingController::class, 'index']);
        Route::put('sms-automation-settings', [SmsAutomationSettingController::class, 'update']);
        Route::post('import/legacy', LegacyImportController::class);
        Route::get('import/legacy/{importJob}', [LegacyImportController::class, 'show']);

        // Customers CRUD + helpers
        Route::post('customers', [CustomerController::class, 'store']);
        Route::get('customers/next-connection-id', [CustomerController::class, 'nextConnectionId']);
        Route::get('customers/agreement-number', [CustomerController::class, 'generateAgreementNumber']);
        Route::put('customers/{customer}', [CustomerController::class, 'update'])->whereUuid('customer');
        Route::delete('customers/{customer}', [CustomerController::class, 'destroy'])->whereUuid('customer');
        Route::get('customers/{customer}/account-batches', [AccountBatchController::class, 'index'])->whereUuid('customer');
        Route::post('customers/{customer}/account-batches', [AccountBatchController::class, 'store'])->whereUuid('customer');

        // Customer-related nested resources
        Route::get('customers/{customer}/connections', [CustomerConnectionController::class, 'index'])->whereUuid('customer');
        Route::post('customers/{customer}/connections', [CustomerConnectionController::class, 'store'])->whereUuid('customer');
        Route::put('connections/{connection}', [CustomerConnectionController::class, 'update']);
        Route::delete('connections/{connection}', [CustomerConnectionController::class, 'destroy']);

        Route::get('customers/{customer}/invoices', [CustomerInvoiceController::class, 'index'])->whereUuid('customer');
        Route::post('customers/{customer}/invoices', [CustomerInvoiceController::class, 'store'])->whereUuid('customer');

        Route::get('customers/{customer}/payments', [CustomerPaymentController::class, 'index'])->whereUuid('customer');
        Route::post('customers/{customer}/payments', [CustomerPaymentController::class, 'store'])->whereUuid('customer');

        Route::get('customers/{customer}/ledger', [CustomerLedgerController::class, 'index'])->whereUuid('customer');
        Route::post('customers/{customer}/adjustments', [CustomerAdjustmentController::class, 'store'])->whereUuid('customer');
        Route::get('customers/{customer}/activity', [CustomerActivityController::class, 'index'])->whereUuid('customer');
        Route::get('account-batches/{accountBatch}', [AccountBatchController::class, 'show']);

        // Connection status changes
        Route::post('connections/resume', [ConnectionStatusController::class, 'bulkResume']);
        Route::post('connections/{connection}/activate', [ConnectionStatusController::class, 'activate']);
        Route::post('connections/{connection}/resume', [ConnectionStatusController::class, 'resume']);
        Route::post('connections/{connection}/suspend', [ConnectionStatusController::class, 'suspend']);
        Route::post('connections/{connection}/postpone', [ConnectionStatusController::class, 'postpone']);
        Route::post('connections/{connection}/disconnect', [ConnectionStatusController::class, 'disconnect']);
        Route::post('connections/{connection}/payments', [CustomerPaymentController::class, 'storeForConnection']);
        Route::post('connections/{connection}/invoices', [CustomerInvoiceController::class, 'generateForConnection']);

        // Areas / Billing groups / Packages – WRITE operations only
        Route::apiResource('areas', AreaController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('billing-groups', BillingGroupController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('packages', PackageController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('additional-channels', AdditionalChannelController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('setup-items', SetupItemController::class)->only(['store', 'update', 'destroy']);

        // Payment agents fully protected
        Route::apiResource('payment-agents', PaymentAgentController::class)->only(['index', 'store', 'show', 'update', 'destroy']);

        // Suppliers – WRITE operations
        Route::apiResource('suppliers', SupplierController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('supplier-bills', SupplierBillController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('supplier-payments', SupplierPaymentController::class)->only(['store']);

        // Payments write/update
        Route::put('payments/{payment}', [PaymentController::class, 'update']);
        Route::delete('payments/{payment}', [PaymentController::class, 'destroy']);

        // Invoices write/update
        Route::put('invoices/{invoice}', [InvoiceController::class, 'update']);
        Route::delete('invoices/{invoice}', [InvoiceController::class, 'destroy']);

        // SMS send/config/test
        Route::post('sms/send', [SmsController::class, 'send']);
        Route::get('sms/messages', [SmsController::class, 'messages']);
        Route::put('sms/providers/active', [SmsProviderSettingController::class, 'update']);
        Route::post('sms/test', [SmsController::class, 'test']);
        Route::apiResource('sms-templates', SmsTemplateController::class);

        // Audit logs & users (admin)
        Route::get('audit-logs', [AuditLogController::class, 'index']);
        Route::get('users', [UserController::class, 'index']);
        Route::post('users', [UserController::class, 'store']);
        Route::post('users/{user}/roles', [UserController::class, 'assignRole']);
        Route::delete('users/{user}/roles/{role}', [UserController::class, 'removeRole']);

        // Exports
        Route::get('export/payables', [ExportController::class, 'payables']);
        Route::get('export/receivables', [ExportController::class, 'receivables']);
        Route::get('export/payments', [ExportController::class, 'payments']);
    });
});

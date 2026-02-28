# Cable Billing Backend Architecture

This document captures how the new Laravel backend mirrors the current Supabase/domain model so that the frontend can be migrated without surprises.

## Domain Model

- **Areas & Billing Groups** – geographical categorisation with billing metadata (codes, billing window, grace/reminder/disconnect periods).
- **Customers & Connections** – customers belong to an area, billing group, and package; each customer can own many connections with per-connection balances, add-ons, setup items, suspension windows, and audit trails.
- **Packages & Add-ons** – `packages`, `additional_channels`, and `setup_items` define recurring and one-time charges (with optional discounts/special amounts).
- **Invoices & Payments** – invoices, line items, payment records, allocations, ledger entries, and receipt/invoice number generators track receivables.
- **SMS & Notifications** – sms templates, provider settings, sms logs, and analytics views replicate the existing Supabase automation.
- **Suppliers** – suppliers, supplier bills, and supplier payments keep third-party settlements.
- **Access Control** – `profiles` + `user_roles` with enum roles (`admin`, `cashier`, `field_tech`) replace Supabase auth metadata.
- **Operational Logs** – `audit_logs`, `suspension_history`, and `settings` tables capture activity and configuration values used throughout the app.

The Laravel migrations recreate every Supabase table (see `database/migrations/*_create_domain_tables.php`) using UUID primary keys and enum columns that map to the Supabase `Enums` (`connection_status`, `customer_status`, `invoice_status`, `payment_method`, `app_role`).

## Services ↔ Supabase Functions

| Supabase Function | Laravel Equivalent |
| --- | --- |
| `generate-invoice` | `App\Services\Billing\InvoiceService::generateForConnection()` |
| `generate-monthly-invoices` | `App\Console\Commands\GenerateMonthlyInvoices` + `InvoiceService` |
| `billing-scheduler` | `App\Console\Commands\RunBillingScheduler` (invokes all scheduled routines) |
| `send-friendly-reminders` | `ReminderService::sendFriendlyReminders()` |
| `send-disconnect-notices` | `ReminderService::sendDisconnectNotices()` |
| `auto-suspend-connections` | `SuspensionService::autoSuspendEligibleConnections()` |
| `send-suspension-sms` | `SuspensionService::dispatchSuspensionSms()` via `SmsService` |
| `send-sms` | `SmsService::sendCampaign()` with provider drivers + throttling/analytics |
| `get-receipt` | `ReceiptService::renderPaymentReceipt()` |
| `list-users` | `UserService::listWithRoles()` returning auth users + roles |
| `import-legacy-data` | `LegacyImportService` (parses XLSX/CSV, resolves areas/packages, bulk inserts) |

All command equivalents are scheduled in `app/Console/Kernel.php`, so Laravel’s scheduler replaces Supabase’s Edge Function cron.

## API Surface (High Level)

- `api/auth/*` – Sanctum token issuance, profile, password reset.
- `api/master-data/*` – CRUD for areas, billing groups, packages, additional channels, setup items, payment agents, sms templates, provider settings.
- `api/customers/*` – customer CRUD, connections management (activate/suspend/resume/postpone/disconnect), POS actions (payments, manual adjustments, ledger, SMS for a customer).
- `api/billing/*` – invoices, invoice items, allocations, ledger entries, dashboard metrics, reports, receipt PDFs.
- `api/payments/*` – payment CRUD, allocations, payment agents, reconciliation exports.
- `api/suppliers/*` – supplier, bills, payments, finance reports.
- `api/reports/*` – dashboard stats, SMS analytics (materialized view), due ageing, suspension analytics.
- `api/admin/*` – settings, audit logs, user/role management, legacy import, scheduler triggers.

Each controller delegates to a service class, and every mutating endpoint uses a dedicated FormRequest + Policy, ensuring we can port the frontend screen-by-screen with predictable REST calls.

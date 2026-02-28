# Cable Billing Platform – Development Notes

This document summarizes the core architecture, modules, and ideas implemented (or planned) in the project so new developers can quickly understand requirements and continue building. Keep it updated whenever major features are added.

---
## 1. Tech Stack

- **Frontend**: React 18 + TypeScript + Vite, shadcn/ui, TailwindCSS, TanStack Query, React Router, Recharts.
- **Backend**: Supabase (Postgres + Auth + Edge Functions + Scheduler).
- **State & Data fetching**: TanStack Query for all Supabase queries/mutations.
- **Notifications**: Supabase edge functions trigger SMS notifications via `send-sms` and related functions.

---
## 2. Key Business Modules

1. **Customers**
   - Stores customers with area/billing group/package reference.
   - Autogenerates connection IDs (`area_code-number`) and agreement numbers.
   - Address, agreement date, and metadata captured on create.
   - Customer table shows per-connection balances + total due.

2. **Areas**
   - Each area now includes a unique `code` (e.g., `HT`, `DC`).
   - Areas are used when generating connection IDs.

3. **Connections**
   - Includes serial numbers, activation date, setup box charges, proration data.
   - POS panel (RightPosPanel) handles payments, ledger entries, invoice allocations.

4. **Billing Groups**
   - Metadata: billing start/end day, grace days, reminder day, disconnect notice day, max debit.
   - Future work: store SMS templates/toggles per group.

5. **Recurring Billing / Scheduler**
   - `supabase/functions/billing-scheduler` orchestrates daily tasks:
     1. `generate-monthly-invoices`
     2. `send-friendly-reminders`
     3. `send-disconnect-notices`
     4. `auto-suspend-connections`
   - Runs daily via Supabase Scheduler cron.

6. **Notifications**
   - Friendly reminders, disconnect notices, suspension SMS via existing functions (`send-sms`, `send-suspension-sms`).
   - POS module includes plans for SMS toggles, collector dropdown, receipt messages.

---
## 3. Important Supabase Migrations

- `20251115123000_pos_phase1.sql`:
  - Adds `areas.code` (unique identifier).
  - Adds customer agreement fields, connection metadata, payment agents table.
  - Includes helper function `next_area_connection_code` + `generate_agreement_number`.
- Ensure `supabase db push` is run after pulling these migrations.

---
## 4. Edge Functions Directory (supabase/functions)

- `generate-monthly-invoices`: Creates invoices/ledger entries on billing day.
- `generate-invoice`: Builds a single invoice with line items (package, add-ons, setup fees).
- `send-friendly-reminders`: Sends reminder SMS after friendly reminder day.
- `send-disconnect-notices`: Warns before disconnect.
- `auto-suspend-connections`: Suspends/disconnects connections after threshold.
- `billing-scheduler`: New orchestrator – call once/day via Supabase Scheduler.

---
## 5. POS / Customer Account View

Pages/components:
- `src/pages/CustomerDetail.tsx`
- `src/components/customer/*`
  - `RightPosPanel` – handles payment entry, allocation, SMS.
  - `CustomerSummaryHeader`, `CustomerTabs`, `CustomerConnectionsTab`, etc.

Future improvements (planned):
- Collector dropdown with `payment_agents` data.
- SMS auto-toggle per payment.
- POS navigation entry allowing quick customer search.

---
## 6. Running the Scheduler

```bash
cd fullstack
supabase functions deploy billing-scheduler
# Example: run daily at 00:30 UTC
supabase functions schedule create billing-scheduler \
  --cron "30 0 * * *" \
  --function billing-scheduler
```

Make sure `generate-monthly-invoices`, `send-friendly-reminders`, `send-disconnect-notices`, `auto-suspend-connections` are also deployed.

---
## 7. Development To-Do (high level)

1. **POS Enhancements**: Add navigation entry, collector dropdown, SMS toggles, agent accounting.
2. **Billing Group UI**: Add date pickers, toggles for auto/manual notices, SMS templates.
3. **Role-based permissions**: Component-level guards for POS actions.
4. **Reports / exports**: Additional exports (CSV/PDF) for billing group, payments, suspensions.
5. **Backup/Integration hooks**: Explore email notifications, WhatsApp/FB integration, data backup endpoints.

Use this list to create structured tickets/iterations.

---
## 8. Useful Scripts

```bash
# Run dev server
cd fullstack
npm install
npm run dev

# Build for production
npm run build

# Deploy functions (example)
supabase functions deploy billing-scheduler
```

Keep this file updated to reflect new modules and architectural decisions.

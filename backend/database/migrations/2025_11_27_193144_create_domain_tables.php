<?php

use App\Enums\AppRole;
use App\Enums\ConnectionStatus;
use App\Enums\CustomerStatus;
use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $this->createTableIfMissing('areas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        $this->createTableIfMissing('billing_groups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->foreignUuid('area_id')->nullable()->constrained('areas')->nullOnDelete();
            $table->unsignedTinyInteger('billing_start_day');
            $table->unsignedTinyInteger('billing_end_day');
            $table->unsignedTinyInteger('grace_days')->default(5);
            $table->unsignedTinyInteger('friendly_reminder_days')->default(0);
            $table->unsignedTinyInteger('disconnect_notice_days')->default(0);
            $table->decimal('maximum_debit_balance', 12, 2)->default(0);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        $this->createTableIfMissing('packages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->decimal('price', 12, 2);
            $table->enum('discount_type', ['none', 'percentage', 'fixed'])->default('none');
            $table->decimal('discount_value', 12, 2)->nullable();
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        $this->createTableIfMissing('additional_channels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->text('description')->nullable();
            $table->decimal('monthly_amount', 12, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $this->createTableIfMissing('setup_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->decimal('price', 12, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $this->createTableIfMissing('payment_agents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('agent_type');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->boolean('is_active')->default(true);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        $this->createTableIfMissing('customers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('connection_id')->unique();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone');
            $table->string('nic')->nullable();
            $table->text('address');
            $table->string('agreement_number')->nullable();
            $table->foreignUuid('area_id')->nullable()->constrained('areas')->nullOnDelete();
            $table->foreignUuid('billing_group_id')->constrained('billing_groups')->restrictOnDelete();
            $table->foreignUuid('package_id')->constrained('packages')->restrictOnDelete();
            $table->enum('status', CustomerStatus::values())->default(CustomerStatus::Active->value);
            $table->date('connection_date')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        $this->createTableIfMissing('connections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignUuid('package_id')->constrained('packages')->restrictOnDelete();
            $table->string('box_number');
            $table->decimal('current_balance', 14, 2)->default(0);
            $table->decimal('special_amount', 12, 2)->nullable();
            $table->enum('status', ConnectionStatus::values())->default(ConnectionStatus::Pending->value);
            $table->timestamp('activated_at')->nullable();
            $table->date('postpone_start')->nullable();
            $table->date('postpone_end')->nullable();
            $table->timestamp('suspended_at')->nullable();
            $table->foreignUuid('suspended_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('suspension_reason')->nullable();
            $table->timestamps();
        });

        $this->createTableIfMissing('connection_additional_channels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('connection_id')->constrained('connections')->cascadeOnDelete();
            $table->foreignUuid('additional_channel_id')->constrained('additional_channels')->restrictOnDelete();
            $table->timestamps();
        });

        $this->createTableIfMissing('connection_setup_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('connection_id')->constrained('connections')->cascadeOnDelete();
            $table->foreignUuid('setup_item_id')->constrained('setup_items')->restrictOnDelete();
            $table->decimal('price_snapshot', 12, 2);
            $table->timestamps();
        });

        $this->createTableIfMissing('number_sequences', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('prefix')->nullable();
            $table->unsignedInteger('padding')->default(4);
            $table->unsignedBigInteger('current_value')->default(0);
            $table->timestamps();
        });

        $this->createTableIfMissing('invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('invoice_number')->unique();
            $table->foreignUuid('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignUuid('connection_id')->nullable()->constrained('connections')->nullOnDelete();
            $table->date('billing_period_start');
            $table->date('billing_period_end');
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->decimal('amount', 12, 2);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->enum('status', InvoiceStatus::values())->default(InvoiceStatus::Unpaid->value);
            $table->date('due_date');
            $table->timestamp('paid_date')->nullable();
            $table->boolean('is_prorated')->default(false);
            $table->timestamps();
        });

        $this->createTableIfMissing('invoice_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->string('type');
            $table->text('description');
            $table->decimal('quantity', 8, 2)->default(1);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('line_total', 12, 2);
            $table->uuid('ref_id')->nullable();
            $table->timestamps();
        });

        $this->createTableIfMissing('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignUuid('connection_id')->nullable()->constrained('connections')->nullOnDelete();
            $table->foreignUuid('payment_agent_id')->nullable()->constrained('payment_agents')->nullOnDelete();
            $table->foreignUuid('recorded_by')->constrained('users')->restrictOnDelete();
            $table->string('receipt_number')->unique();
            $table->enum('payment_method', PaymentMethod::values())->default(PaymentMethod::Cash->value);
            $table->decimal('amount', 12, 2);
            $table->date('payment_date');
            $table->string('reference_number')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        $this->createTableIfMissing('payment_allocations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('payment_id')->constrained('payments')->cascadeOnDelete();
            $table->foreignUuid('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->timestamps();
        });

        $this->createTableIfMissing('ledger_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignUuid('connection_id')->nullable()->constrained('connections')->nullOnDelete();
            $table->string('type');
            $table->text('description')->nullable();
            $table->decimal('amount', 12, 2);
            $table->decimal('balance_after', 14, 2);
            $table->uuid('reference_id')->nullable();
            $table->timestamps();
        });

        $this->createTableIfMissing('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        $this->createTableIfMissing('sms_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->string('template_type');
            $table->text('content');
            $table->integer('days_offset')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        $this->createTableIfMissing('sms_provider_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('provider')->unique();
            $table->json('config');
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });

        $this->createTableIfMissing('sms_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignUuid('connection_id')->nullable()->constrained('connections')->nullOnDelete();
            $table->string('phone');
            $table->text('message');
            $table->string('type');
            $table->string('status');
            $table->string('delivery_status')->nullable();
            $table->timestamp('sent_at')->useCurrent();
            $table->timestamp('delivered_at')->nullable();
            $table->string('provider_message_id')->nullable();
            $table->json('provider_response')->nullable();
            $table->decimal('cost', 10, 4)->default(0);
            $table->string('error_message')->nullable();
            $table->string('failed_reason')->nullable();
            $table->timestamps();
            $table->index('sent_at');
            $table->index('status');
            $table->index('delivery_status');
        });

        $this->createTableIfMissing('suppliers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('contact_person')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('billing_email')->nullable();
            $table->unsignedTinyInteger('billing_cycle_start')->nullable();
            $table->unsignedTinyInteger('billing_cycle_end')->nullable();
            $table->decimal('contract_amount', 12, 2)->default(0);
            $table->text('address')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $this->createTableIfMissing('supplier_bills', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->string('bill_number')->nullable();
            $table->string('reference_number')->nullable();
            $table->date('bill_date')->nullable();
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->date('due_date');
            $table->decimal('amount_due', 12, 2);
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->string('status')->default('pending');
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        $this->createTableIfMissing('supplier_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->foreignUuid('supplier_bill_id')->nullable()->constrained('supplier_bills')->nullOnDelete();
            $table->foreignUuid('recorded_by')->constrained('users')->restrictOnDelete();
            $table->string('payment_method');
            $table->string('reference_number')->nullable();
            $table->date('payment_date');
            $table->decimal('amount', 12, 2);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        $this->createTableIfMissing('suspension_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignUuid('connection_id')->constrained('connections')->cascadeOnDelete();
            $table->enum('previous_status', ConnectionStatus::values());
            $table->enum('new_status', ConnectionStatus::values());
            $table->string('action');
            $table->text('reason')->nullable();
            $table->text('notes')->nullable();
            $table->decimal('balance_at_time', 12, 2)->nullable();
            $table->foreignUuid('performed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('performed_at');
            $table->boolean('is_automated')->default(false);
            $table->timestamps();
        });

        $this->createTableIfMissing('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('phone')->nullable();
            $table->timestamps();
            $table->foreign('id')->references('id')->on('users')->cascadeOnDelete();
        });

        $this->createTableIfMissing('user_roles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('role', AppRole::values());
            $table->timestamps();
            $table->unique(['user_id', 'role']);
        });

        $this->createTableIfMissing('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('table_name');
            $table->string('record_id');
            $table->string('action');
            $table->json('old_data')->nullable();
            $table->json('new_data')->nullable();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_email')->nullable();
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('performed_at')->nullable();
            $table->timestamps();
        });

        DB::statement('DROP VIEW IF EXISTS sms_analytics_summary');
        DB::statement(<<<SQL
CREATE VIEW sms_analytics_summary AS
SELECT
    DATE(sent_at) AS date,
    type,
    COUNT(*) AS total_sent,
    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS successful_sent,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_sent,
    SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
    SUM(CASE WHEN delivery_status = 'pending' THEN 1 ELSE 0 END) AS pending_delivery,
    SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) AS failed_delivery,
    SUM(cost) AS total_cost
FROM sms_logs
GROUP BY DATE(sent_at), type
SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP VIEW IF EXISTS sms_analytics_summary');

        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('user_roles');
        Schema::dropIfExists('profiles');
        Schema::dropIfExists('suspension_history');
        Schema::dropIfExists('supplier_payments');
        Schema::dropIfExists('supplier_bills');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('sms_logs');
        Schema::dropIfExists('sms_provider_settings');
        Schema::dropIfExists('sms_templates');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('ledger_entries');
        Schema::dropIfExists('payment_allocations');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('number_sequences');
        Schema::dropIfExists('connection_setup_items');
        Schema::dropIfExists('connection_additional_channels');
        Schema::dropIfExists('connections');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('payment_agents');
        Schema::dropIfExists('setup_items');
        Schema::dropIfExists('additional_channels');
        Schema::dropIfExists('packages');
        Schema::dropIfExists('billing_groups');
        Schema::dropIfExists('areas');
    }

    private function createTableIfMissing(string $table, \Closure $callback): void
    {
        if (Schema::hasTable($table)) {
            return;
        }

        Schema::create($table, $callback);
    }
};

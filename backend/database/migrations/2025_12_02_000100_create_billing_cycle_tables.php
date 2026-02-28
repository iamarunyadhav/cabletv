<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('billing_cycles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('billing_group_id')->constrained('billing_groups')->cascadeOnDelete();
            $table->unsignedSmallInteger('cycle_year');
            $table->unsignedTinyInteger('cycle_month');
            $table->date('window_start');
            $table->date('window_end');
            $table->date('reminder_date');
            $table->date('grace_end');
            $table->date('disconnect_date');
            $table->timestamp('invoicing_completed_at')->nullable();
            $table->timestamp('reminders_sent_at')->nullable();
            $table->timestamp('grace_marked_at')->nullable();
            $table->timestamp('disconnects_processed_at')->nullable();
            $table->timestamps();

            $table->unique(['billing_group_id', 'cycle_year', 'cycle_month'], 'group_cycle_unique');
        });

        Schema::create('billing_notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('billing_cycle_id')->nullable()->constrained('billing_cycles')->nullOnDelete();
            $table->foreignUuid('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->string('notification_type');
            $table->decimal('amount', 12, 2)->default(0);
            $table->json('payload')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->unique(
                ['billing_cycle_id', 'customer_id', 'notification_type'],
                'billing_notifications_unique'
            );
            $table->index(['customer_id', 'notification_type']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->foreignUuid('billing_cycle_id')
                ->nullable()
                ->after('connection_id')
                ->constrained('billing_cycles')
                ->nullOnDelete();
        });

        Schema::table('ledger_entries', function (Blueprint $table) {
            $table->foreignUuid('billing_cycle_id')
                ->nullable()
                ->after('connection_id')
                ->constrained('billing_cycles')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ledger_entries', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('billing_cycle_id');
        });

        Schema::table('invoices', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('billing_cycle_id');
        });

        Schema::dropIfExists('billing_notifications');
        Schema::dropIfExists('billing_cycles');
    }
};

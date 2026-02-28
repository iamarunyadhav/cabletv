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
        if (Schema::hasTable('billing_action_logs')) {
            $hasUniqueActionPerDay = Schema::hasIndex(
                'billing_action_logs',
                'billing_action_logs_unique_action_per_day',
                'unique'
            );
            $hasGroupTypeDateIndex = Schema::hasIndex(
                'billing_action_logs',
                'billing_action_logs_group_type_date_idx'
            );

            if (! $hasUniqueActionPerDay || ! $hasGroupTypeDateIndex) {
                Schema::table('billing_action_logs', function (Blueprint $table) use (
                    $hasUniqueActionPerDay,
                    $hasGroupTypeDateIndex
                ) {
                    if (! $hasUniqueActionPerDay) {
                        $table->unique(
                            ['connection_id', 'action_type', 'action_date'],
                            'billing_action_logs_unique_action_per_day'
                        );
                    }

                    if (! $hasGroupTypeDateIndex) {
                        $table->index(
                            ['billing_group_id', 'action_type', 'action_date'],
                            'billing_action_logs_group_type_date_idx'
                        );
                    }
                });
            }

            return;
        }

        Schema::create('billing_action_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('billing_group_id')->constrained('billing_groups')->cascadeOnDelete();
            $table->foreignUuid('billing_cycle_id')->nullable()->constrained('billing_cycles')->nullOnDelete();
            $table->foreignUuid('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignUuid('connection_id')->constrained('connections')->cascadeOnDelete();
            $table->string('action_type');
            $table->date('action_date');
            $table->string('run_id')->nullable();
            $table->text('message')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(
                ['connection_id', 'action_type', 'action_date'],
                'billing_action_logs_unique_action_per_day'
            );
            $table->index(
                ['billing_group_id', 'action_type', 'action_date'],
                'billing_action_logs_group_type_date_idx'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('billing_action_logs');
    }
};

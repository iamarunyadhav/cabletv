<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sms_automation_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('workflow_key')->unique();
            $table->string('template_key')->nullable();
            $table->boolean('enabled')->default(true);
            $table->string('description')->nullable();
            $table->timestamps();
        });

        $now = now();
        DB::table('sms_automation_settings')->insert([
            [
                'id' => (string) Str::uuid(),
                'workflow_key' => 'monthly_renewal',
                'template_key' => 'monthly_renewal',
                'enabled' => true,
                'description' => 'Monthly renewal notice on cycle start',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'workflow_key' => 'friendly_reminder',
                'template_key' => 'friendly_reminder',
                'enabled' => true,
                'description' => 'Friendly reminder after grace period',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'workflow_key' => 'disconnect_notice',
                'template_key' => 'disconnect_notice',
                'enabled' => true,
                'description' => 'Disconnect warning on disconnect date',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'workflow_key' => 'overdue_notice',
                'template_key' => 'overdue',
                'enabled' => false,
                'description' => 'Overdue notice after grace marking',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'workflow_key' => 'payment_receipt',
                'template_key' => 'payment_receipt',
                'enabled' => true,
                'description' => 'Auto receipt when payments are posted',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'workflow_key' => 'suspend_notice',
                'template_key' => 'suspend_notice',
                'enabled' => true,
                'description' => 'Notice when a suspension is applied',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sms_automation_settings');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement('ALTER TABLE sms_logs DROP FOREIGN KEY sms_logs_customer_id_foreign');
        DB::statement('ALTER TABLE sms_logs MODIFY customer_id CHAR(36) NULL');
        DB::statement('ALTER TABLE sms_logs ADD CONSTRAINT sms_logs_customer_id_foreign FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement('ALTER TABLE sms_logs DROP FOREIGN KEY sms_logs_customer_id_foreign');
        DB::statement('ALTER TABLE sms_logs MODIFY customer_id CHAR(36) NOT NULL');
        DB::statement('ALTER TABLE sms_logs ADD CONSTRAINT sms_logs_customer_id_foreign FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE');
    }
};

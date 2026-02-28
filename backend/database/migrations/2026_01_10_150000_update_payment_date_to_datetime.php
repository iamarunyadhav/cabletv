<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasColumn('payments', 'payment_date')) {
            return;
        }

        DB::statement('ALTER TABLE payments MODIFY payment_date DATETIME NULL');
    }

    public function down(): void
    {
        if (! Schema::hasColumn('payments', 'payment_date')) {
            return;
        }

        DB::statement('ALTER TABLE payments MODIFY payment_date DATE NULL');
    }
};

<?php

use App\Enums\PaymentMethod;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $values = implode("','", PaymentMethod::values());
        DB::statement(
            "ALTER TABLE payments MODIFY payment_method ENUM('{$values}') NOT NULL DEFAULT '".PaymentMethod::Cash->value."'"
        );
    }

    public function down(): void
    {
        $values = implode("','", array_diff(PaymentMethod::values(), [PaymentMethod::Cheque->value]));
        DB::statement(
            "ALTER TABLE payments MODIFY payment_method ENUM('{$values}') NOT NULL DEFAULT '".PaymentMethod::Cash->value."'"
        );
    }
};

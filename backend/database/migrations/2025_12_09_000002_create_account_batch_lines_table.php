<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_batch_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('batch_id')->constrained('account_batches')->cascadeOnDelete();
            $table->string('label');
            $table->string('direction'); // debit | credit
            $table->decimal('amount', 12, 2);
            $table->foreignUuid('connection_id')->nullable()->constrained('connections')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignUuid('ledger_entry_id')->nullable()->constrained('ledger_entries')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_batch_lines');
    }
};

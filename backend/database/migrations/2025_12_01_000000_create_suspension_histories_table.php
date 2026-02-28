<?php

use App\Enums\ConnectionStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('suspension_histories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignUuid('connection_id')->nullable()->constrained('connections')->nullOnDelete();
            $table->enum('previous_status', ConnectionStatus::values())->nullable();
            $table->enum('new_status', ConnectionStatus::values());
            $table->string('action');
            $table->string('reason')->nullable();
            $table->text('notes')->nullable();
            $table->decimal('balance_at_time', 12, 2)->nullable();
            $table->foreignUuid('performed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('performed_at')->nullable();
            $table->boolean('is_automated')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('suspension_histories');
    }
};

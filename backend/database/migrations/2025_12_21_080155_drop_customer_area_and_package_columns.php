<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('customers')) {
            return;
        }

        Schema::table('customers', function ($table): void {
            if (Schema::hasColumn('customers', 'package_id')) {
                try {
                    $table->dropForeign(['package_id']);
                } catch (\Throwable) {
                    // foreign key may not exist
                }
                $table->dropColumn('package_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('customers')) {
            return;
        }

        Schema::table('customers', function ($table): void {
            if (! Schema::hasColumn('customers', 'package_id')) {
                $table->foreignUuid('package_id')->nullable()->constrained('packages')->nullOnDelete();
            }
        });
    }
};

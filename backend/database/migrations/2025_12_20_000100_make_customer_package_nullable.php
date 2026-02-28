<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('customers') || ! Schema::hasColumn('customers', 'package_id')) {
            return;
        }

        Schema::table('customers', function (Blueprint $table): void {
            $table->dropForeign(['package_id']);
            $table->foreignUuid('package_id')->nullable()->change();
            $table->foreign('package_id')->references('id')->on('packages')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('customers') || ! Schema::hasColumn('customers', 'package_id')) {
            return;
        }

        Schema::table('customers', function (Blueprint $table): void {
            $table->dropForeign(['package_id']);
            $table->foreignUuid('package_id')->nullable(false)->change();
            $table->foreign('package_id')->references('id')->on('packages')->restrictOnDelete();
        });
    }
};

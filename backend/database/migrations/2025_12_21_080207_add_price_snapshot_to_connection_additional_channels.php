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
        if (! Schema::hasTable('connection_additional_channels')) {
            return;
        }

        if (! Schema::hasColumn('connection_additional_channels', 'price_snapshot')) {
            Schema::table('connection_additional_channels', function (Blueprint $table): void {
                $table->decimal('price_snapshot', 12, 2)->nullable()->after('additional_channel_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('connection_additional_channels')) {
            return;
        }

        if (Schema::hasColumn('connection_additional_channels', 'price_snapshot')) {
            Schema::table('connection_additional_channels', function (Blueprint $table): void {
                $table->dropColumn('price_snapshot');
            });
        }
    }
};

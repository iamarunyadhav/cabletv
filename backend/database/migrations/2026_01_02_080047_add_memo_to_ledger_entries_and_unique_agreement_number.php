<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('ledger_entries', 'memo')) {
            Schema::table('ledger_entries', function (Blueprint $table): void {
                $table->text('memo')->nullable()->after('description');
            });
        }

        // Clean placeholder/duplicate agreement numbers so the unique index can be added safely.
        DB::table('customers')
            ->whereIn('agreement_number', ['', 'NO_DATA'])
            ->update(['agreement_number' => null]);

        $duplicates = DB::table('customers')
            ->select('agreement_number')
            ->whereNotNull('agreement_number')
            ->groupBy('agreement_number')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('agreement_number');

        if ($duplicates->isNotEmpty()) {
            DB::table('customers')
                ->whereIn('agreement_number', $duplicates)
                ->update(['agreement_number' => null]);
        }

        Schema::table('customers', function (Blueprint $table): void {
            $table->unique('agreement_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('ledger_entries', 'memo')) {
            Schema::table('ledger_entries', function (Blueprint $table): void {
                $table->dropColumn('memo');
            });
        }

        Schema::table('customers', function (Blueprint $table): void {
            $table->dropUnique('customers_agreement_number_unique');
        });
    }
};

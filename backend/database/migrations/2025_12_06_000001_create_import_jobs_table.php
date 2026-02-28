<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('import_jobs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->string('status')->default('pending'); // pending, running, completed, failed
            $table->string('file_path');
            $table->json('meta')->nullable();
            $table->json('stats')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_jobs');
    }
};

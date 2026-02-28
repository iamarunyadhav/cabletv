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
        if (Schema::hasTable('sms_templates')) {
            Schema::table('sms_templates', function (Blueprint $table): void {
                if (! Schema::hasColumn('sms_templates', 'key')) {
                    $table->string('key')->nullable()->unique();
                }

                if (! Schema::hasColumn('sms_templates', 'body')) {
                    $table->text('body')->nullable();
                }

                if (! Schema::hasColumn('sms_templates', 'is_active')) {
                    $table->boolean('is_active')->default(true);
                }

                if (! Schema::hasColumn('sms_templates', 'created_by')) {
                    $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
                }

                if (! Schema::hasColumn('sms_templates', 'updated_by')) {
                    $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
                }
            });
        }

        if (! Schema::hasTable('sms_messages')) {
            Schema::create('sms_messages', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('customer_id')->nullable()->constrained('customers')->nullOnDelete();
                $table->foreignUuid('connection_id')->nullable()->constrained('connections')->nullOnDelete();
                $table->foreignUuid('template_id')->nullable()->constrained('sms_templates')->nullOnDelete();
                $table->string('template_key')->nullable();
                $table->string('to_number');
                $table->text('body');
                $table->string('status');
                $table->string('provider')->nullable();
                $table->json('provider_response')->nullable();
                $table->text('error_message')->nullable();
                $table->timestamp('sent_at')->nullable();
                $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->index(['template_key', 'status']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sms_messages');

        if (Schema::hasTable('sms_templates')) {
            Schema::table('sms_templates', function (Blueprint $table): void {
                if (Schema::hasColumn('sms_templates', 'updated_by')) {
                    $table->dropForeign(['updated_by']);
                    $table->dropColumn('updated_by');
                }

                if (Schema::hasColumn('sms_templates', 'created_by')) {
                    $table->dropForeign(['created_by']);
                    $table->dropColumn('created_by');
                }

                if (Schema::hasColumn('sms_templates', 'is_active')) {
                    $table->dropColumn('is_active');
                }

                if (Schema::hasColumn('sms_templates', 'body')) {
                    $table->dropColumn('body');
                }

                if (Schema::hasColumn('sms_templates', 'key')) {
                    $table->dropUnique(['key']);
                    $table->dropColumn('key');
                }
            });
        }
    }
};

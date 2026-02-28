<?php

namespace Tests\Feature;

use App\Enums\AppRole;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SmsTemplateCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_sms_template_crud(): void
    {
        $user = User::factory()->create();
        UserRole::query()->create([
            'user_id' => $user->id,
            'role' => AppRole::Admin->value,
        ]);

        $payload = [
            'key' => 'friendly_reminder',
            'name' => 'Friendly Reminder',
            'body' => 'Hello {customer_name}',
            'is_active' => true,
        ];

        $createResponse = $this->actingAs($user)->postJson('/api/v1/sms-templates', $payload);
        $createResponse->assertStatus(201);

        $templateId = $createResponse->json('data.id');

        $this->assertDatabaseHas('sms_templates', [
            'id' => $templateId,
            'key' => 'friendly_reminder',
        ]);

        $updateResponse = $this->actingAs($user)->patchJson("/api/v1/sms-templates/{$templateId}", [
            'name' => 'Friendly Reminder Updated',
            'body' => 'Updated {customer_name}',
            'is_active' => false,
        ]);

        $updateResponse->assertStatus(200);
        $this->assertDatabaseHas('sms_templates', [
            'id' => $templateId,
            'name' => 'Friendly Reminder Updated',
        ]);

        $deleteResponse = $this->actingAs($user)->deleteJson("/api/v1/sms-templates/{$templateId}");
        $deleteResponse->assertStatus(200);
        $this->assertDatabaseMissing('sms_templates', [
            'id' => $templateId,
        ]);
    }
}

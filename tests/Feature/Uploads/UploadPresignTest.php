<?php

namespace Tests\Feature\Uploads;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class UploadPresignTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_request_presigned_upload(): void
    {
        $response = $this->postJson(route('api.uploads.presign'), [
            'folder' => 'products',
            'filename' => 'item.jpg',
            'contentType' => 'image/jpeg',
        ]);

        $response->assertUnauthorized();
    }

    public function test_authenticated_user_can_generate_presigned_url_for_allowed_folder_and_type(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $response = $this->actingAs($user)->postJson(route('api.uploads.presign'), [
            'folder' => 'products/models',
            'filename' => 'vase_craft.glb',
            'contentType' => 'model/gltf-binary',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['url', 'key', 'contentType', 'is_direct_cloud']);

        $data = $response->json();
        $this->assertStringStartsWith('products/models/', $data['key']);
        $this->assertStringEndsWith('.glb', $data['key']);
        $this->assertSame('model/gltf-binary', $data['contentType']);
    }

    public function test_presign_rejects_unsupported_extensions(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $response = $this->actingAs($user)->postJson(route('api.uploads.presign'), [
            'folder' => 'legal_docs',
            'filename' => 'exploit.exe',
            'contentType' => 'application/x-msdownload',
        ]);

        $response->assertStatus(422)
            ->assertJson(['error' => 'Unsupported file extension for direct upload.']);
    }

    public function test_presign_rejects_disallowed_folders(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $response = $this->actingAs($user)->postJson(route('api.uploads.presign'), [
            'folder' => 'system_configs',
            'filename' => 'test.png',
            'contentType' => 'image/png',
        ]);

        $response->assertStatus(422);
    }

    public function test_local_upload_persists_stream_content_and_prevents_traversal(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['email_verified_at' => now()]);

        // 1. Path traversal attempt is rejected
        $traversalResponse = $this->actingAs($user)
            ->call('PUT', route('api.uploads.local', ['key' => '../evil.jpg']), [], [], [], [], 'dummy content');
        $traversalResponse->assertStatus(400);

        // 2. Disallowed root folder is rejected
        $disallowedResponse = $this->actingAs($user)
            ->call('PUT', route('api.uploads.local', ['key' => 'etc/passwd']), [], [], [], [], 'dummy content');
        $disallowedResponse->assertStatus(403);

        // 3. Valid local upload succeeds
        $validKey = 'products/' . \Illuminate\Support\Str::uuid() . '.jpg';
        $content = 'binary-image-data-sample';

        $validResponse = $this->actingAs($user)
            ->call('PUT', route('api.uploads.local', ['key' => $validKey]), [], [], [], [], $content);

        $validResponse->assertOk()
            ->assertJson([
                'success' => true,
                'key' => $validKey,
            ]);

        Storage::disk('public')->assertExists($validKey);
        $this->assertSame($content, Storage::disk('public')->get($validKey));
    }
}

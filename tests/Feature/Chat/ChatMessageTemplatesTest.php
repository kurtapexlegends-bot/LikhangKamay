<?php

namespace Tests\Feature\Chat;

use App\Models\ChatMessageTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatMessageTemplatesTest extends TestCase
{
    use RefreshDatabase;

    public function test_artisan_can_create_chat_message_template_with_shortcut(): void
    {
        $artisan = User::factory()->artisanApproved()->create();

        $response = $this->actingAs($artisan)
            ->post(route('chat.templates.store'), [
                'title' => 'Location',
                'shortcut' => 'location', // automatically adds leading slash
                'content' => 'Blk 35 lot 17 Brgy. San Miguel 1 Dasmarinas City Cavite',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('chat_message_templates', [
            'user_id' => $artisan->id,
            'title' => 'Location',
            'shortcut' => '/location',
            'content' => 'Blk 35 lot 17 Brgy. San Miguel 1 Dasmarinas City Cavite',
        ]);
    }

    public function test_artisan_can_create_chat_message_template_with_message_key(): void
    {
        $artisan = User::factory()->artisanApproved()->create();

        $response = $this->actingAs($artisan)
            ->post(route('chat.templates.store'), [
                'title' => 'Shipping Policy',
                'shortcut' => '/shipping',
                'message' => 'We ship within 24 to 48 hours nationwide.',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('chat_message_templates', [
            'user_id' => $artisan->id,
            'title' => 'Shipping Policy',
            'shortcut' => '/shipping',
            'content' => 'We ship within 24 to 48 hours nationwide.',
        ]);
    }

    public function test_artisan_can_update_and_delete_template(): void
    {
        $artisan = User::factory()->artisanApproved()->create();

        $template = ChatMessageTemplate::create([
            'user_id' => $artisan->id,
            'title' => 'Old Title',
            'shortcut' => '/old',
            'content' => 'Old Content',
        ]);

        $updateResponse = $this->actingAs($artisan)
            ->put(route('chat.templates.update', $template->id), [
                'title' => 'Updated Title',
                'shortcut' => '/newshortcut',
                'content' => 'Updated Content',
            ]);

        $updateResponse->assertRedirect();
        $this->assertDatabaseHas('chat_message_templates', [
            'id' => $template->id,
            'title' => 'Updated Title',
            'shortcut' => '/newshortcut',
            'content' => 'Updated Content',
        ]);

        $deleteResponse = $this->actingAs($artisan)
            ->delete(route('chat.templates.destroy', $template->id));

        $deleteResponse->assertRedirect();
        $this->assertDatabaseMissing('chat_message_templates', [
            'id' => $template->id,
        ]);
    }

    public function test_unauthorized_user_cannot_update_other_sellers_template(): void
    {
        $seller1 = User::factory()->artisanApproved()->create();
        $seller2 = User::factory()->artisanApproved()->create();

        $template = ChatMessageTemplate::create([
            'user_id' => $seller1->id,
            'title' => 'Seller 1 Title',
            'shortcut' => '/seller1',
            'content' => 'Seller 1 Content',
        ]);

        $this->actingAs($seller2)
            ->put(route('chat.templates.update', $template->id), [
                'title' => 'Hacked Title',
                'shortcut' => '/hacked',
                'content' => 'Hacked Content',
            ])
            ->assertNotFound();
    }
}

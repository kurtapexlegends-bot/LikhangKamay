<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Notifications\DatabaseNotification;

class NotificationPresenter
{
    /**
     * @return array<string, mixed>
     */
    public static function present(DatabaseNotification $notification, ?User $user): array
    {
        $data = $notification->data ?? [];

        return [
            'id' => $notification->id,
            'type' => $data['type'] ?? 'general',
            'title' => $data['title'] ?? 'Notification',
            'message' => $data['message'] ?? '',
            'reason' => $data['reason'] ?? null,
            'request_type' => $data['request_type'] ?? null,
            'request_id' => $data['request_id'] ?? null,
            'url' => self::resolveUrl($data, $user),
            'read_at' => $notification->read_at,
            'created_at' => $notification->created_at?->diffForHumans(),
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function resolveUrl(array $data, ?User $user): ?string
    {
        $type = $data['type'] ?? 'general';

        return match ($type) {
            'new_message' => self::resolveBuyerSellerChatUrl($data, $user),
            'team_message' => self::resolveTeamMessageUrl($data),
            'new_order' => route('orders.index'),
            'new_review' => route('reviews.index'),
            'low_stock' => route('products.index'),
            'replacement_resolution' => route('my-orders.index'),
            'sponsorship_status' => route('seller.sponsorships') . (isset($data['request_id']) ? '#request-' . $data['request_id'] : ''),
            'artisan_application' => route('admin.pending'),
            default => $data['url'] ?? null,
        };
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function resolveBuyerSellerChatUrl(array $data, ?User $user): ?string
    {
        $senderId = isset($data['sender_id']) ? (int) $data['sender_id'] : null;

        if (!$senderId) {
            return $data['url'] ?? null;
        }

        if ($user?->isBuyer()) {
            return route('buyer.chat', ['user_id' => $senderId]);
        }

        if ($user?->isArtisan()) {
            return route('chat.index', ['user_id' => $senderId]);
        }

        return $data['url'] ?? null;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function resolveTeamMessageUrl(array $data): ?string
    {
        $senderId = isset($data['sender_id']) ? (int) $data['sender_id'] : null;

        if (!$senderId) {
            return $data['url'] ?? null;
        }

        return route('team-messages.index', ['user_id' => $senderId]);
    }
}

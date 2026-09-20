<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Notifications\DatabaseNotification;

class NotificationPresenter
{
    /**
     * Present a collection of notifications bulk-fetching user notification states in a single query.
     *
     * @param iterable<DatabaseNotification> $notifications
     * @param User|null $user
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    public static function presentCollection(iterable $notifications, ?User $user): \Illuminate\Support\Collection
    {
        $collection = collect($notifications);
        if ($collection->isEmpty()) {
            return collect();
        }

        $userStates = collect();
        if ($user) {
            $notificationIds = $collection->map(fn ($n) => (string) $n->id)->filter()->all();
            if (!empty($notificationIds)) {
                $userStates = \App\Models\UserNotificationState::where('user_id', $user->id)
                    ->whereIn('notification_id', $notificationIds)
                    ->get()
                    ->keyBy(fn ($state) => (string) $state->notification_id);
            }
        }

        return $collection->map(
            fn (DatabaseNotification $notification) => self::present(
                $notification,
                $user,
                $userStates->get((string) $notification->id)
            )
        );
    }

    /**
     * @param DatabaseNotification $notification
     * @param User|null $user
     * @param \App\Models\UserNotificationState|null|false $userState
     * @return array<string, mixed>
     */
    public static function present(DatabaseNotification $notification, ?User $user, $userState = false): array
    {
        $data = $notification->data ?? [];

        $readAt = $notification->read_at;
        if ($user) {
            if ($userState === false) {
                $userState = \App\Models\UserNotificationState::where('user_id', $user->id)
                    ->where('notification_id', $notification->id)
                    ->first();
            }

            if ($userState) {
                $readAt = $userState->read_at;
            } elseif ($notification->notifiable_id != $user->id) {
                $readAt = null;
            }
        }

        return [
            'id' => $notification->id,
            'type' => $data['type'] ?? 'general',
            'title' => self::humanizeNotificationText($data['title'] ?? 'Notification'),
            'message' => self::humanizeNotificationText($data['message'] ?? ''),
            'sender_id' => $data['sender_id'] ?? null,
            'reason' => self::humanizeNotificationText($data['reason'] ?? null),
            'request_type' => $data['request_type'] ?? null,
            'request_id' => $data['request_id'] ?? null,
            'url' => self::resolveUrl($data, $user),
            'read_at' => $readAt ? ($readAt instanceof \Carbon\CarbonInterface ? $readAt->toIso8601String() : (string) $readAt) : null,
            'created_at_raw' => $notification->created_at?->toIso8601String(),
            'created_at' => $notification->created_at?->diffForHumans(),
        ];
    }

    /**
     * Normalize notification copy to ban engineering jargon and 'rejected' across all users.
     */
    public static function humanizeNotificationText(?string $text): ?string
    {
        if ($text === null || $text === '') {
            return $text;
        }

        $dictionary = [
            'Dispute Request Rejected' => 'Return Request Declined',
            'Dispute Resolved: Claim Rejected' => 'Return Review Closed: Claim Declined',
            'Dispute Resolved: Refunded' => 'Return Review Concluded: Refund Approved',
            'Dispute Request Approved' => 'Refund Request Approved',
            'Dispute Escalated' => 'Order Review Requested',
            'New Escalation Queue' => 'Order Review Requested',
            'Review Dispute Approved' => 'Review Report Approved',
            'Review Dispute Declined' => 'Review Report Declined',
            'Payroll Request Rejected' => 'Payroll Request Declined',
            'Stock Request Rejected' => 'Stock Request Declined',
            'Delivery entered failure hold' => 'Delivery Problem Reported',
            'geofence perimeter' => 'store location boundary',
            'geofence' => 'store location',
            'terminal failure' => 'delivery issue',
            'failure hold' => 'delivery issue hold',
            'escalate to admin support' => 'ask platform support for help',
            'ruled in favor of refund' => 'approved a refund',
            'rejected the return claim' => 'declined the return claim',
            'rejected the return request' => 'declined the return request',
            'rejected the payroll request' => 'declined the payroll request',
            'rejected the stock request' => 'declined the stock request',
            'Please review the dispute.' => 'Please review the return request.',
            'rejected' => 'declined',
            'Rejected' => 'Declined',
            'dispute resolution' => 'order review',
            'dispute' => 'return request',
            'Dispute' => 'Return Request',
        ];

        return str_ireplace(array_keys($dictionary), array_values($dictionary), $text);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function resolveUrl(array $data, ?User $user): ?string
    {
        $type = $data['type'] ?? 'general';

        return match ($type) {
            'new_message' => self::resolveBuyerSellerChatUrl($data, $user),
            'team_message', 'team_channel_message', 'team_mention' => self::resolveTeamMessageUrl($data),
            'new_order' => route('orders.index'),
            'new_review' => route('reviews.index'),
            'low_stock' => route('products.index'),
            'replacement_resolution' => route('my-orders.index'),
            'review_moderation_status' => route('my-orders.index'),
            'sponsorship_status' => route('seller.sponsorships') . (isset($data['request_id']) ? '#request-' . $data['request_id'] : ''),
            'artisan_application' => route('admin.users.manager', ['tab' => 'approvals']),
            'payment_confirmed' => route('orders.index'),
            'refund_request' => route('orders.index'),
            'shipment_deadline' => route('orders.index'),
            'supply_depleted' => route('procurement.index'),
            'disciplinary_action' => route('profile.edit'),
            'owner_approval_decision' => self::resolveOwnerApprovalDecisionUrl($data, $user),
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

        if ($user?->isArtisan() || $user?->isStaff()) {
            return route('chat.index', ['user_id' => $senderId]);
        }

        return $data['url'] ?? null;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function resolveTeamMessageUrl(array $data): ?string
    {
        if (!empty($data['url'])) {
            return $data['url'];
        }

        if (!empty($data['team_channel_id'])) {
            return route('team-messages.index', ['channel_id' => (int) $data['team_channel_id']]);
        }

        $senderId = isset($data['sender_id']) ? (int) $data['sender_id'] : null;

        if (!$senderId) {
            return null;
        }

        return route('team-messages.index', ['user_id' => $senderId]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function resolveOwnerApprovalDecisionUrl(array $data, ?User $user): string
    {
        $domain = $data['domain'] ?? null;
        $isRestrictedStaff = $user?->isStaff() && !$user->canEditSellerModule('overview');

        if ($isRestrictedStaff) {
            return match ($domain) {
                'procurement' => route('stock-requests.index'),
                'hr_payroll', 'staff_rate' => route('hr.index'),
                default => route('dashboard'),
            };
        }

        return $data['url'] ?? route('seller.approvals.index', ['status' => $data['status'] ?? 'pending']);
    }
}

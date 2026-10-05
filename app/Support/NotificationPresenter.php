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
            'team_message', 'team_channel_message', 'team_mention' => self::resolveTeamMessageUrl($data, $user),
            'new_order', 'payment_confirmed', 'refund_request', 'shipment_deadline' => self::resolveOrderUrl($data, $user),
            'new_review' => self::resolveReviewUrl($data, $user),
            'low_stock', 'low_stock_warning' => self::resolveStockUrl($data, $user),
            'replacement_resolution', 'review_moderation_status' => self::resolveBuyerOrderUrl($data, $user),
            'sponsorship_status' => self::resolveSponsorshipUrl($data, $user),
            'artisan_application' => self::resolveArtisanApplicationUrl($data, $user),
            'supply_depleted' => self::resolveProcurementUrl($data, $user),
            'disciplinary_action' => route('profile.edit'),
            'owner_approval_decision' => self::resolveOwnerApprovalDecisionUrl($data, $user),
            'owner_approval_request' => self::resolveOwnerApprovalRequestUrl($data, $user),
            default => self::resolveDefaultUrl($data, $user),
        };
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function resolveBuyerSellerChatUrl(array $data, ?User $user): ?string
    {
        $senderId = isset($data['sender_id']) ? (int) $data['sender_id'] : null;

        if (!$senderId) {
            return self::sanitizeFallbackUrl($data['url'] ?? null, $user);
        }

        if ($user?->isBuyer()) {
            return route('buyer.chat', ['user_id' => $senderId]);
        }

        if ($user?->isArtisan() || $user?->isStaff()) {
            return route('chat.index', ['user_id' => $senderId]);
        }

        return self::sanitizeFallbackUrl($data['url'] ?? null, $user);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function resolveTeamMessageUrl(array $data, ?User $user): ?string
    {
        if (!$user || $user->isBuyer() || $user->isAdmin()) {
            return null;
        }

        if (!empty($data['url'])) {
            return self::sanitizeFallbackUrl($data['url'], $user);
        }

        if (!empty($data['team_channel_id'])) {
            return route('team-messages.index', ['channel_id' => (int) $data['team_channel_id']]);
        }

        $senderId = isset($data['sender_id']) ? (int) $data['sender_id'] : null;

        if (!$senderId) {
            return route('team-messages.index');
        }

        return route('team-messages.index', ['user_id' => $senderId]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function resolveOrderUrl(array $data, ?User $user): ?string
    {
        if ($user?->isBuyer()) {
            return route('my-orders.index');
        }

        if ($user?->isAdmin()) {
            return route('admin.disputes.index');
        }

        if ($user?->isArtisan()) {
            return route('orders.index');
        }

        if ($user?->isStaff()) {
            return $user->canAccessSellerModule('orders')
                ? route('orders.index')
                : route('staff.dashboard');
        }

        return route('orders.index');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function resolveReviewUrl(array $data, ?User $user): ?string
    {
        if ($user?->isBuyer()) {
            return route('my-orders.index');
        }

        if ($user?->isAdmin()) {
            return route('admin.catalog.index', ['tab' => 'moderation']);
        }

        if ($user?->isArtisan()) {
            return route('reviews.index');
        }

        if ($user?->isStaff()) {
            return $user->canAccessSellerModule('reviews')
                ? route('reviews.index')
                : route('staff.dashboard');
        }

        return route('reviews.index');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function resolveStockUrl(array $data, ?User $user): ?string
    {
        if ($user?->isBuyer()) {
            return null;
        }

        if ($user?->isAdmin()) {
            return route('admin.catalog.index', ['tab' => 'moderation']);
        }

        if ($user?->isArtisan()) {
            return route('products.index');
        }

        if ($user?->isStaff()) {
            if ($user->canAccessSellerModule('products')) {
                return route('products.index');
            }
            if ($user->canAccessSellerModule('stock_requests')) {
                return route('stock-requests.index');
            }
            return route('staff.dashboard');
        }

        return route('products.index');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function resolveBuyerOrderUrl(array $data, ?User $user): ?string
    {
        if ($user?->isArtisan()) {
            return route('orders.index');
        }

        if ($user?->isStaff()) {
            return $user->canAccessSellerModule('orders')
                ? route('orders.index')
                : route('staff.dashboard');
        }

        return route('my-orders.index');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function resolveSponsorshipUrl(array $data, ?User $user): ?string
    {
        if ($user?->isAdmin()) {
            return route('admin.users.manager');
        }

        if ($user?->isStaff()) {
            return route('staff.dashboard');
        }

        if ($user?->isArtisan()) {
            if ($user->canAccessSellerModule('sponsorships')) {
                return route('seller.sponsorships') . (isset($data['request_id']) ? '#request-' . $data['request_id'] : '');
            }
            return route('seller.subscription');
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function resolveArtisanApplicationUrl(array $data, ?User $user): ?string
    {
        if ($user?->isAdmin()) {
            return route('admin.users.manager', ['tab' => 'approvals']);
        }

        if ($user?->isArtisan()) {
            return route('artisan.pending');
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function resolveProcurementUrl(array $data, ?User $user): ?string
    {
        if ($user?->isArtisan()) {
            return $user->canAccessSellerModule('procurement')
                ? route('procurement.index')
                : route('seller.subscription');
        }

        if ($user?->isStaff()) {
            if ($user->canAccessSellerModule('procurement')) {
                return route('procurement.index');
            }
            if ($user->canAccessSellerModule('stock_requests')) {
                return route('stock-requests.index');
            }
            return route('staff.dashboard');
        }

        return null;
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
                'hr_payroll', 'staff_rate' => $user->canAccessSellerModule('hr') ? route('hr.index') : route('staff.dashboard'),
                default => route('dashboard'),
            };
        }

        if ($user?->isArtisan()) {
            if (!$user->canManageStaff() && !$user->isPremiumTier()) {
                return route('seller.subscription');
            }
            return self::sanitizeFallbackUrl(
                $data['url'] ?? route('seller.approvals.index', ['status' => $data['status'] ?? 'pending']),
                $user
            ) ?? route('seller.subscription');
        }

        if ($user?->isStaff()) {
            if ($user->canAccessSellerModule('approvals')) {
                return self::sanitizeFallbackUrl(
                    $data['url'] ?? route('seller.approvals.index', ['status' => $data['status'] ?? 'pending']),
                    $user
                ) ?? route('staff.dashboard');
            }
            return route('staff.dashboard');
        }

        return $data['url'] ?? route('seller.approvals.index', ['status' => $data['status'] ?? 'pending']);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function resolveOwnerApprovalRequestUrl(array $data, ?User $user): ?string
    {
        if ($user?->isArtisan()) {
            if (!$user->canManageStaff() && !$user->isPremiumTier()) {
                return route('seller.subscription');
            }
            return self::sanitizeFallbackUrl(
                $data['url'] ?? route('seller.approvals.index', ['status' => 'pending']),
                $user
            ) ?? route('seller.subscription');
        }

        if ($user?->isStaff()) {
            if ($user->canAccessSellerModule('approvals')) {
                return self::sanitizeFallbackUrl(
                    $data['url'] ?? route('seller.approvals.index', ['status' => 'pending']),
                    $user
                ) ?? route('staff.dashboard');
            }
            return route('staff.dashboard');
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function resolveDefaultUrl(array $data, ?User $user): ?string
    {
        $rawUrl = $data['url'] ?? null;
        return self::sanitizeFallbackUrl($rawUrl, $user);
    }

    /**
     * Guard fallback URLs against unauthorized role or tier module access.
     */
    private static function sanitizeFallbackUrl(?string $url, ?User $user): ?string
    {
        if ($url === null || $url === '') {
            return null;
        }

        if (!$user) {
            return $url;
        }

        if (str_contains($url, '/approvals')) {
            if ($user->isArtisan() && (!$user->canManageStaff() && !$user->isPremiumTier())) {
                return route('seller.subscription');
            }
            if ($user->isStaff() && !$user->canAccessSellerModule('approvals')) {
                return route('staff.dashboard');
            }
        }

        if (str_contains($url, '/team-messages')) {
            if ($user->isBuyer() || $user->isAdmin()) {
                return null;
            }
            if ($user->isStaff() && !$user->canAccessSellerModule('team_messages') && !$user->canAccessSellerModule('messages')) {
                return route('staff.dashboard');
            }
        }

        if (str_contains($url, '/sponsorships')) {
            if ($user->isArtisan() && !$user->canAccessSellerModule('sponsorships')) {
                return route('seller.subscription');
            }
            if ($user->isStaff()) {
                return route('staff.dashboard');
            }
        }

        if (str_contains($url, '/discounts')) {
            if ($user->isArtisan() && !$user->canAccessSellerModule('discounts')) {
                return route('seller.subscription');
            }
            if ($user->isStaff() && !$user->canAccessSellerModule('discounts')) {
                return route('staff.dashboard');
            }
        }

        if (str_contains($url, '/3d') || str_contains($url, 'three-d')) {
            if ($user->isArtisan() && !$user->canAccessSellerModule('3d')) {
                return route('seller.subscription');
            }
            if ($user->isStaff() && !$user->canAccessSellerModule('3d')) {
                return route('staff.dashboard');
            }
        }

        if (str_contains($url, '/orders')) {
            if ($user->isStaff() && !$user->canAccessSellerModule('orders')) {
                return route('staff.dashboard');
            }
        }

        if (str_contains($url, '/products')) {
            if ($user->isStaff() && !$user->canAccessSellerModule('products')) {
                return $user->canAccessSellerModule('stock_requests')
                    ? route('stock-requests.index')
                    : route('staff.dashboard');
            }
        }

        if (str_contains($url, '/procurement') && !str_contains($url, '/stock-requests')) {
            if ($user->isArtisan() && !$user->canAccessSellerModule('procurement')) {
                return route('seller.subscription');
            }
            if ($user->isStaff() && !$user->canAccessSellerModule('procurement')) {
                return $user->canAccessSellerModule('stock_requests')
                    ? route('stock-requests.index')
                    : route('staff.dashboard');
            }
        }

        if (str_contains($url, '/hr') || str_contains($url, '/payroll')) {
            if ($user->isArtisan() && (!$user->canManageStaff() && !$user->isPremiumTier())) {
                return route('seller.subscription');
            }
            if ($user->isStaff() && !$user->canAccessSellerModule('hr') && !$user->canAccessSellerModule('payroll')) {
                return route('staff.dashboard');
            }
        }

        return $url;
    }
}

<?php

namespace App\Models\Traits;

use Illuminate\Notifications\DatabaseNotification;
use App\Models\UserNotificationState;

/**
 * @mixin \App\Models\User
 */
trait HasWorkspaceNotifications
{
    /**
     * Get the notifications query strictly scoped to this specific user account.
     */
    public function getNotificationsQuery()
    {
        $query = DatabaseNotification::where('notifiable_type', $this->getMorphClass());

        if ($this->isStaff()) {
            $ownerId = $this->getEffectiveSellerId();
            if ($ownerId && $ownerId !== $this->id) {
                // Collect allowed notification types matching staff module access
                $allowedTypes = ['general', 'team_message']; // Direct/team alerts are always allowed
                
                if ($this->canAccessSellerModule('orders')) {
                    $allowedTypes = array_merge($allowedTypes, [
                        'new_order', 'delivery_update', 'replacement_resolution', 'payment_confirmed',
                        'dispute_accepted', 'dispute_replacement_proposed', 'dispute_rejected',
                        'dispute_arbitrated_refund', 'dispute_arbitrated_rejected', 'dispute_escalated',
                        'refund_request', 'shipment_deadline'
                    ]);
                }
                if ($this->canAccessSellerModule('products')) {
                    $allowedTypes = array_merge($allowedTypes, ['low_stock', 'low_stock_warning', 'product_moderation']);
                }
                if ($this->canAccessSellerModule('procurement')) {
                    $allowedTypes = array_merge($allowedTypes, ['supply_depleted', 'accounting_request']);
                }
                if ($this->canAccessSellerModule('accounting')) {
                    $allowedTypes = array_merge($allowedTypes, ['accounting_rejected']);
                }
                if ($this->canAccessSellerModule('messages')) {
                    $allowedTypes = array_merge($allowedTypes, ['new_message']);
                }

                $query->where(function ($q) use ($ownerId, $allowedTypes) {
                    $q->where('notifiable_id', $this->id)
                      ->orWhere(function ($sq) use ($ownerId, $allowedTypes) {
                          $sq->where('notifiable_id', $ownerId)
                             ->where(function ($jsonQ) use ($allowedTypes) {
                                 $jsonQ->whereIn('data->type', $allowedTypes)
                                       ->orWhereNull('data->type');
                              });
                      });
                });
            } else {
                $query->where('notifiable_id', $this->id);
            }
        } else {
            $query->where('notifiable_id', $this->id);
        }

        try {
            // Exclude notifications soft-deleted specifically by this user account
            $deletedIds = UserNotificationState::where('user_id', $this->id)
                ->whereNotNull('deleted_at')
                ->pluck('notification_id');

            if ($deletedIds->isNotEmpty()) {
                $query->whereNotIn('id', $deletedIds);
            }
        } catch (\Throwable $e) {
            // Table may not exist yet or connection issue; gracefully skip state filtering
        }

        return $query;
    }

    /**
     * Get unread notifications query scoped to this user's account read state.
     */
    public function getUnreadNotificationsQuery()
    {
        $userId = $this->id;

        try {
            // Collect notification IDs explicitly marked as read for this specific account
            $userReadIds = UserNotificationState::where('user_id', $userId)
                ->whereNotNull('read_at')
                ->pluck('notification_id');

            // Collect notification IDs explicitly marked as unread for this specific account
            $userUnreadIds = UserNotificationState::where('user_id', $userId)
                ->whereNull('read_at')
                ->pluck('notification_id');

            return $this->getNotificationsQuery()
                ->where(function ($q) use ($userId, $userReadIds, $userUnreadIds) {
                    if ($userUnreadIds->isNotEmpty()) {
                        $q->whereIn('id', $userUnreadIds);
                    }

                    $q->orWhere(function ($sq) use ($userId, $userReadIds) {
                        if ($userReadIds->isNotEmpty()) {
                            $sq->whereNotIn('id', $userReadIds);
                        }

                        $sq->where(function ($ownerQ) use ($userId) {
                            $ownerQ->where(function ($directQ) use ($userId) {
                                $directQ->where('notifiable_id', $userId)
                                        ->whereNull('read_at');
                            })->orWhere('notifiable_id', '!=', $userId);
                        });
                    });
                });
        } catch (\Throwable $e) {
            return $this->getNotificationsQuery()->whereNull('read_at');
        }
    }

    public function markWorkspaceNotificationAsRead(string $id): void
    {
        $notification = $this->getNotificationsQuery()->find($id);
        if (!$notification) return;

        if ($notification->notifiable_id == $this->id) {
            $notification->markAsRead();
        }

        try {
            UserNotificationState::updateOrCreate(
                ['user_id' => $this->id, 'notification_id' => $id],
                ['read_at' => now()]
            );
        } catch (\Throwable $e) {
            // Fallback silently if states table is unavailable
        }
    }

    public function markWorkspaceNotificationAsUnread(string $id): void
    {
        $notification = $this->getNotificationsQuery()->find($id);
        if (!$notification) return;

        if ($notification->notifiable_id == $this->id) {
            $notification->markAsUnread();
        }

        try {
            UserNotificationState::updateOrCreate(
                ['user_id' => $this->id, 'notification_id' => $id],
                ['read_at' => null]
            );
        } catch (\Throwable $e) {
            // Fallback silently
        }
    }

    public function markAllWorkspaceNotificationsAsRead(): void
    {
        $unreadNotifications = $this->getUnreadNotificationsQuery()->get();
        $now = now();

        foreach ($unreadNotifications as $notification) {
            if ($notification->notifiable_id == $this->id) {
                $notification->markAsRead();
            }

            try {
                UserNotificationState::updateOrCreate(
                    ['user_id' => $this->id, 'notification_id' => $notification->id],
                    ['read_at' => $now]
                );
            } catch (\Throwable $e) {
                // Fallback silently
            }
        }
    }

    public function deleteWorkspaceNotification(string $id): void
    {
        $notification = $this->getNotificationsQuery()->find($id);
        if (!$notification) return;

        if ($notification->notifiable_id == $this->id) {
            $notification->delete();
        }

        try {
            UserNotificationState::updateOrCreate(
                ['user_id' => $this->id, 'notification_id' => $id],
                ['deleted_at' => now()]
            );
        } catch (\Throwable $e) {
            // Fallback silently
        }
    }

    public function deleteAllWorkspaceNotifications(): void
    {
        $allNotifications = $this->getNotificationsQuery()->get();
        $now = now();

        foreach ($allNotifications as $notification) {
            if ($notification->notifiable_id == $this->id) {
                $notification->delete();
            }

            try {
                UserNotificationState::updateOrCreate(
                    ['user_id' => $this->id, 'notification_id' => $notification->id],
                    ['deleted_at' => $now]
                );
            } catch (\Throwable $e) {
                // Fallback silently
            }
        }
    }

    public function notifySellerWorkspace($notification, ?string $requiredModule = null): void
    {
        $this->notify($notification);

        if ($this->isArtisan()) {
            $staffUsers = \App\Models\User::query()
                ->where('seller_owner_id', $this->id)
                ->where('role', 'staff')
                ->get();

            foreach ($staffUsers as $staff) {
                if (!$requiredModule || $staff->canAccessSellerModule($requiredModule)) {
                    $staff->notify($notification);
                }
            }
        }
    }
}

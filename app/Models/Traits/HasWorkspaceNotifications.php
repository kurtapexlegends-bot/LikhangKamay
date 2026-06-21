<?php

namespace App\Models\Traits;

use Illuminate\Notifications\DatabaseNotification;

trait HasWorkspaceNotifications
{
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

        return $query;
    }

    /**
     * Get the unread notifications query for the user, including effective seller notifications if the user is a staff member.
     */
    public function getUnreadNotificationsQuery()
    {
        return $this->getNotificationsQuery()->whereNull('read_at');
    }
}

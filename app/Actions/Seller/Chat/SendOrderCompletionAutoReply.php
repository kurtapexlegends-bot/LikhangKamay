<?php

namespace App\Actions\Seller\Chat;

use App\Events\MessageSent;
use App\Models\Message;
use App\Models\Order;
use App\Models\User;
use App\Notifications\NewMessageNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SendOrderCompletionAutoReply
{
    /**
     * Default thank you template if seller hasn't set a custom template.
     */
    public const DEFAULT_TEMPLATE = "Thank you for your purchase! Your order #{order_number} is now complete. We hope you enjoy your handcrafted items! Feel free to leave a review or reach out if you need anything else.";

    /**
     * Send an automated completion thank-you message from seller to buyer.
     *
     * @param Order $order
     * @return Message|null
     */
    public function execute(Order $order): ?Message
    {
        // Must be in Completed status
        if ($order->status !== 'Completed') {
            return null;
        }

        // Resolve seller owner
        $sellerId = $order->artisan_id ?? $order->seller_id;
        $seller = User::find($sellerId);
        if (!$seller) {
            return null;
        }

        // Only premium/super_premium sellers have automated thank-you messages
        if (!$seller->isPremiumTier()) {
            return null;
        }

        // Check if seller enabled completion auto-reply (defaults to true)
        $isEnabled = $seller->auto_reply_on_completion ?? true;
        if (!$isEnabled) {
            return null;
        }

        // Idempotency check using atomic cache key to prevent duplicate messages
        $cacheKey = "order_completion_auto_reply_{$order->id}";
        if (Cache::has($cacheKey)) {
            return null;
        }

        // Check if a completion message with order reference already exists
        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'like';
        $existingMessage = Message::query()
            ->where('sender_id', $seller->id)
            ->where('receiver_id', $order->user_id)
            ->where('message', $like, "%#{$order->order_number}%")
            ->where('message', $like, "%complete%")
            ->first();

        if ($existingMessage) {
            Cache::put($cacheKey, true, now()->addDays(30));
            return null;
        }

        $buyer = User::find($order->user_id);
        $buyerName = $buyer ? ($buyer->first_name ?: $buyer->name) : 'Valued Customer';
        $shopName = $seller->shop_name ?: $seller->name;

        // Custom template or default
        $template = !empty($seller->auto_reply_completion_message)
            ? $seller->auto_reply_completion_message
            : self::DEFAULT_TEMPLATE;

        // Token replacements
        $messageText = str_replace(
            ['{order_number}', '{buyer_name}', '{shop_name}'],
            [$order->order_number, $buyerName, $shopName],
            $template
        );

        $message = Message::create([
            'sender_id' => $seller->id,
            'receiver_id' => $order->user_id,
            'message' => $messageText,
        ]);

        Cache::put($cacheKey, true, now()->addDays(30));

        // Send push notification & broadcast event
        if ($buyer) {
            try {
                $buyer->unreadNotifications()
                    ->where('type', NewMessageNotification::class)
                    ->where(function ($q) use ($seller) {
                        $q->where('data->sender_id', (string) $seller->id)
                          ->orWhere('data->sender_id', (int) $seller->id);
                    })
                    ->delete();
            } catch (\Throwable $e) {
                report($e);
            }

            try {
                $buyer->notify(new NewMessageNotification($message, $shopName));
            } catch (\Throwable $e) {
                report($e);
            }
        }

        try {
            broadcast(new MessageSent($message))->toOthers();
        } catch (\Throwable $e) {
            report($e);
        }

        return $message;
    }
}

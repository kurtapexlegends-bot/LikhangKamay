<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class SystemBroadcastNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $subjectText,
        public string $bodyText,
        public ?string $headlineText = null,
        public ?string $buttonUrl = null,
        public ?string $buttonLabel = null
    ) {
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $userName = $notifiable->name ?? 'Member';
        $shopName = $notifiable->shop_name ?? 'Your Shop';

        $replacements = [
            '{user_name}' => $userName,
            '{shop_name}' => $shopName,
            '{site_name}' => 'LikhangKamay',
            '{action_url}' => $this->buttonUrl ?: url('/'),
        ];

        $hydratedSubject = strtr($this->subjectText, $replacements);
        $hydratedHeadline = $this->headlineText ? strtr($this->headlineText, $replacements) : null;
        $hydratedBody = strtr($this->bodyText, $replacements);
        $hydratedUrl = $this->buttonUrl ? strtr($this->buttonUrl, $replacements) : url('/');

        return [
            'type' => 'system_broadcast',
            'title' => $hydratedHeadline ?: $hydratedSubject,
            'subject' => $hydratedSubject,
            'message' => Str::limit(strip_tags($hydratedBody), 200),
            'url' => $hydratedUrl,
            'button_label' => $this->buttonLabel ?: 'View Announcement',
        ];
    }
}

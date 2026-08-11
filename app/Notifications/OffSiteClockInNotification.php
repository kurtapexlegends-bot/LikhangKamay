<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\StaffAttendanceSession;

class OffSiteClockInNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly StaffAttendanceSession $session,
        public readonly string $staffName,
        public readonly string $locationName,
        public readonly int $distanceMeters,
        public readonly string $url
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'off_site_clock_in',
            'title' => 'Off-Site Clock-In Flagged',
            'message' => "{$this->staffName} clocked in {$this->distanceMeters}m outside {$this->locationName} geofence perimeter.",
            'session_id' => $this->session->id,
            'employee_id' => $this->session->employee_id,
            'distance_meters' => $this->distanceMeters,
            'location_name' => $this->locationName,
            'url' => $this->url,
        ];
    }
}

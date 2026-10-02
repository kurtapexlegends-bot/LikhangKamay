<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Order;
use App\Models\SellerLocation;
use App\Models\SellerPickupSchedule;
use App\Models\User;
use App\Support\StructuredAddress;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PickupScheduleService
{
    /**
     * Get or initialize effective pickup schedule for an artisan.
     */
    public function getEffectiveSchedule(User $seller): SellerPickupSchedule
    {
        return $seller->getPickupSchedule();
    }

    /**
     * Resolve the pickup location with structured snapshot data.
     *
     * @return array<string, mixed>|null
     */
    public function getResolvedLocation(User $seller): ?array
    {
        $schedule = $this->getEffectiveSchedule($seller);

        /** @var SellerLocation|null $location */
        $location = null;

        if ($schedule->pickup_location_id) {
            $location = SellerLocation::where('id', $schedule->pickup_location_id)
                ->where('user_id', $seller->id)
                ->first();
        }

        if (!$location) {
            $location = SellerLocation::where('user_id', $seller->id)
                ->where('is_active', true)
                ->first();
        }

        if ($location) {
            return [
                'id' => $location->id,
                'name' => $location->name,
                'address' => $location->address,
                'latitude' => (float) $location->latitude,
                'longitude' => (float) $location->longitude,
                'radius_meters' => $location->radius_meters,
                'source' => 'seller_location',
            ];
        }

        // Fallback to seller primary address
        $defaultAddress = $seller->getDefaultAddress();
        if ($defaultAddress) {
            $formatted = StructuredAddress::formatPhilippineAddress([
                'street_address' => $defaultAddress->street_address,
                'barangay' => $defaultAddress->barangay,
                'city' => $defaultAddress->city,
                'region' => $defaultAddress->region,
                'postal_code' => $defaultAddress->postal_code,
            ]);

            return [
                'id' => null,
                'name' => $seller->shop_name ?: ($seller->name . "'s Studio"),
                'address' => $formatted ?: ($defaultAddress->full_address ?: 'Studio Pickup Location'),
                'latitude' => $defaultAddress->latitude ? (float) $defaultAddress->latitude : null,
                'longitude' => $defaultAddress->longitude ? (float) $defaultAddress->longitude : null,
                'radius_meters' => 100,
                'source' => 'user_address',
            ];
        }

        $formattedShopAddress = StructuredAddress::formatPhilippineAddress([
            'street_address' => $seller->street_address,
            'barangay' => $seller->barangay,
            'city' => $seller->city,
            'region' => $seller->region,
            'postal_code' => $seller->zip_code,
        ]);

        return [
            'id' => null,
            'name' => $seller->shop_name ?: ($seller->name . "'s Studio"),
            'address' => $formattedShopAddress ?: 'Studio Workshop',
            'latitude' => null,
            'longitude' => null,
            'radius_meters' => 100,
            'source' => 'shop_profile',
        ];
    }

    /**
     * Calculate earliest selectable pickup date respecting lead time and operating days.
     */
    public function calculateEarliestPickupDate(User $seller, int $leadTimeDays = 0, ?Carbon $fromDate = null): Carbon
    {
        $timezone = config('app.timezone', 'Asia/Manila');
        $current = $fromDate ? $fromDate->copy()->setTimezone($timezone) : Carbon::now($timezone);
        $schedule = $this->getEffectiveSchedule($seller);
        $operatingDays = $schedule->getEffectiveOperatingDays();

        if ($leadTimeDays <= 0) {
            // If today is operating day and has slots remaining
            if (in_array($current->dayOfWeekIso, $operatingDays, true)) {
                $todaySlots = $this->getAvailableSlotsForDate($seller, $current);
                $hasAvailableSlot = collect($todaySlots)->contains('is_available', true);
                if ($hasAvailableSlot) {
                    return $current->startOfDay();
                }
            }

            // Move to next operating day
            $next = $current->copy()->addDay()->startOfDay();
            while (!in_array($next->dayOfWeekIso, $operatingDays, true)) {
                $next->addDay();
            }

            return $next;
        }

        // Advance by leadTimeDays operating days
        $target = $current->copy()->startOfDay();
        $daysAccumulated = 0;

        while ($daysAccumulated < $leadTimeDays) {
            $target->addDay();
            if (in_array($target->dayOfWeekIso, $operatingDays, true)) {
                $daysAccumulated++;
            }
        }

        // Ensure target is an operating day
        while (!in_array($target->dayOfWeekIso, $operatingDays, true)) {
            $target->addDay();
        }

        return $target;
    }

    /**
     * Get slot availability for a specific date.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getAvailableSlotsForDate(User $seller, Carbon|string $date): array
    {
        $timezone = config('app.timezone', 'Asia/Manila');
        $carbonDate = is_string($date) ? Carbon::parse($date, $timezone)->startOfDay() : $date->copy()->setTimezone($timezone)->startOfDay();
        $now = Carbon::now($timezone);
        $isToday = $carbonDate->isSameDay($now);

        $schedule = $this->getEffectiveSchedule($seller);
        $operatingDays = $schedule->getEffectiveOperatingDays();

        // Not an operating day
        if (!in_array($carbonDate->dayOfWeekIso, $operatingDays, true)) {
            return [];
        }

        // Active orders booked for this date
        $bookedCounts = Order::query()
            ->where('artisan_id', $seller->id)
            ->whereDate('pickup_date', $carbonDate->toDateString())
            ->where('shipping_method', 'Pick Up')
            ->whereNotIn('status', ['Cancelled', 'Rejected'])
            ->select('pickup_time_slot', DB::raw('count(*) as aggregate'))
            ->groupBy('pickup_time_slot')
            ->pluck('aggregate', 'pickup_time_slot')
            ->all();

        $slots = $schedule->getEffectiveTimeSlots();
        $results = [];

        foreach ($slots as $slot) {
            $slotId = (string) ($slot['id'] ?? uniqid('slot_'));
            $slotLabel = (string) ($slot['label'] ?? ($slot['start_time'] . ' - ' . $slot['end_time']));
            $maxCapacity = max(1, (int) ($slot['max_capacity'] ?? 5));
            $booked = (int) ($bookedCounts[$slotLabel] ?? ($bookedCounts[$slotId] ?? 0));
            $remaining = max(0, $maxCapacity - $booked);

            $isPast = false;
            if ($isToday && !empty($slot['end_time'])) {
                try {
                    $endTime = Carbon::createFromTimeString($slot['end_time'], $timezone)
                        ->setDate($carbonDate->year, $carbonDate->month, $carbonDate->day);
                    if ($now->greaterThanOrEqualTo($endTime)) {
                        $isPast = true;
                    }
                } catch (\Throwable) {
                    $isPast = false;
                }
            }

            $isFull = $remaining <= 0;
            $isAvailable = !$isPast && !$isFull;

            $results[] = [
                'id' => $slotId,
                'label' => $slotLabel,
                'start_time' => $slot['start_time'] ?? '',
                'end_time' => $slot['end_time'] ?? '',
                'max_capacity' => $maxCapacity,
                'booked_count' => $booked,
                'remaining_capacity' => $remaining,
                'is_full' => $isFull,
                'is_past' => $isPast,
                'is_available' => $isAvailable,
            ];
        }

        return $results;
    }

    /**
     * Provide comprehensive pickup overview for the buyer checkout scheduler.
     *
     * @return array<string, mixed>
     */
    public function getScheduleOverviewForBuyer(User $seller, int $leadTimeDays = 0, ?int $daysAhead = null): array
    {
        $timezone = config('app.timezone', 'Asia/Manila');
        $schedule = $this->getEffectiveSchedule($seller);

        if (!$schedule->is_enabled) {
            return [
                'pickup_enabled' => false,
                'reason' => 'Store pickup is currently unavailable for this artisan.',
                'location' => null,
                'days' => [],
            ];
        }

        $effectiveDaysAhead = $daysAhead !== null ? max(1, $daysAhead) : (int) ($schedule->max_advance_days ?: 30);
        $location = $this->getResolvedLocation($seller);
        $earliestDate = $this->calculateEarliestPickupDate($seller, $leadTimeDays);
        $operatingDays = $schedule->getEffectiveOperatingDays();

        $days = [];
        $cursor = Carbon::now($timezone)->startOfDay();

        for ($i = 0; $i < $effectiveDaysAhead; $i++) {
            $dateStr = $cursor->toDateString();
            $dayOfWeek = $cursor->dayOfWeekIso;
            $isOperating = in_array($dayOfWeek, $operatingDays, true);
            $isBeforeEarliest = $cursor->lessThan($earliestDate);
            $slots = $isOperating ? $this->getAvailableSlotsForDate($seller, $cursor) : [];
            $hasAvailableSlot = collect($slots)->contains('is_available', true);
            $isSelectable = $isOperating && !$isBeforeEarliest && $hasAvailableSlot;

            $statusReason = '';
            if (!$isOperating) {
                $statusReason = 'Shop closed';
            } elseif ($isBeforeEarliest) {
                $statusReason = 'Requires preparation';
            } elseif (!$hasAvailableSlot) {
                $statusReason = 'Fully booked';
            }

            $days[] = [
                'date' => $dateStr,
                'year' => (int) $cursor->format('Y'),
                'month' => (int) $cursor->format('n'),
                'month_name' => $cursor->format('M'),
                'month_full' => $cursor->format('F'),
                'day_of_week' => $dayOfWeek,
                'day_name' => $cursor->format('D'),
                'day_number' => $cursor->format('j'),
                'formatted' => $cursor->format('M d, Y'),
                'is_operating_day' => $isOperating,
                'is_before_earliest' => $isBeforeEarliest,
                'is_selectable' => $isSelectable,
                'status_reason' => $statusReason,
                'slots' => $slots,
            ];

            $cursor->addDay();
        }

        return [
            'pickup_enabled' => true,
            'seller_id' => $seller->id,
            'shop_name' => $seller->shop_name ?: $seller->name,
            'location' => $location,
            'lead_time_days' => $leadTimeDays,
            'earliest_date' => $earliestDate->toDateString(),
            'earliest_formatted' => $earliestDate->format('M d, Y'),
            'operating_days' => $operatingDays,
            'max_advance_days' => $effectiveDaysAhead,
            'days' => $days,
        ];
    }

    /**
     * Validate requested pickup date and slot.
     *
     * @return array{valid: bool, error: string|null, slot: array<string, mixed>|null}
     */
    public function validateSlotSelection(User $seller, string $dateString, string $slotIdentifier, int $leadTimeDays = 0): array
    {
        $timezone = config('app.timezone', 'Asia/Manila');

        try {
            $date = Carbon::parse($dateString, $timezone)->startOfDay();
        } catch (\Throwable) {
            return ['valid' => false, 'error' => 'Invalid pickup date selected.', 'slot' => null];
        }

        $earliest = $this->calculateEarliestPickupDate($seller, $leadTimeDays);
        if ($date->lessThan($earliest)) {
            return [
                'valid' => false,
                'error' => "The earliest available pickup date for your items is {$earliest->format('M d, Y')}.",
                'slot' => null,
            ];
        }

        $schedule = $this->getEffectiveSchedule($seller);
        $maxAdvance = (int) ($schedule->max_advance_days ?: 30);
        $latest = Carbon::now($timezone)->startOfDay()->addDays($maxAdvance);
        if ($date->greaterThan($latest)) {
            return [
                'valid' => false,
                'error' => "The latest available pickup date you can book is {$latest->format('M d, Y')}.",
                'slot' => null,
            ];
        }

        $slots = $this->getAvailableSlotsForDate($seller, $date);
        $matched = null;

        foreach ($slots as $slot) {
            if ($slot['id'] === $slotIdentifier || $slot['label'] === $slotIdentifier) {
                $matched = $slot;
                break;
            }
        }

        if (!$matched) {
            return ['valid' => false, 'error' => 'Selected pickup time slot does not exist.', 'slot' => null];
        }

        if ($matched['is_past']) {
            return ['valid' => false, 'error' => 'Selected pickup time slot has already passed.', 'slot' => null];
        }

        if ($matched['is_full']) {
            return ['valid' => false, 'error' => 'Selected pickup time slot is fully booked. Please choose another slot.', 'slot' => null];
        }

        return ['valid' => true, 'error' => null, 'slot' => $matched];
    }

    /**
     * Generate secure 4-digit numeric pickup PIN.
     */
    public function generatePickupPin(): string
    {
        return str_pad((string) random_int(1000, 9999), 4, '0', STR_PAD_LEFT);
    }

    /**
     * Verify buyer PIN for order handoff.
     */
    public function verifyPickupPin(Order $order, string $inputPin): bool
    {
        $actualPin = trim((string) ($order->pickup_pin ?? ''));
        $testedPin = trim($inputPin);

        if ($actualPin === '' || $testedPin === '') {
            return false;
        }

        return hash_equals($actualPin, $testedPin);
    }
}

<?php

namespace App\Services\Logistics;

use App\Mail\OrderShipped;
use App\Models\Employee;
use App\Models\Order;
use App\Models\OrderDelivery;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use App\Notifications\OrderDeliveryUpdateNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class InHouseDispatchService
{
    /**
     * Retrieve all active logistics/driver employees for a seller with dynamic availability status.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getDriversWithLiveAvailability(User $seller): array
    {
        $sellerId = $seller->id;

        $drivers = Employee::query()
            ->where('user_id', $sellerId)
            ->where('status', 'Active')
            ->where(function ($q) {
                $q->whereIn('role', [
                    'Logistics & Driver',
                    'Logistics / Driver',
                    'Driver',
                    'Courier',
                    'Rider',
                    'logistics & driver',
                    'logistics / driver',
                    'driver',
                    'courier',
                    'rider',
                ])
                ->orWhereRaw('LOWER(role) LIKE ?', ['%driver%'])
                ->orWhereRaw('LOWER(role) LIKE ?', ['%logistics%'])
                ->orWhereRaw('LOWER(role) LIKE ?', ['%courier%'])
                ->orWhereRaw('LOWER(role) LIKE ?', ['%rider%'])
                ->orWhereHas('loginAccount', function ($userQuery) {
                    $userQuery->where('staff_role_preset_key', 'driver');
                });
            })
            ->with(['loginAccount'])
            ->orderBy('name')
            ->get();

        if ($drivers->isEmpty()) {
            return [];
        }

        $today = Carbon::today();
        $employeeIds = $drivers->pluck('id')->all();
        $staffUserIds = $drivers->pluck('loginAccount.id')->filter()->values()->all();

        // Query active deliveries in progress for these drivers
        $activeDeliveries = OrderDelivery::query()
            ->where('provider', OrderDelivery::PROVIDER_IN_HOUSE)
            ->whereIn('status', [
                OrderDelivery::STATUS_ASSIGNING_DRIVER,
                OrderDelivery::STATUS_ON_GOING,
                OrderDelivery::STATUS_PICKED_UP,
            ])
            ->where(function ($q) use ($employeeIds, $staffUserIds) {
                $q->whereIn('driver_employee_id', $employeeIds);
                if (!empty($staffUserIds)) {
                    $q->orWhereIn('driver_user_id', $staffUserIds);
                }
            })
            ->get();

        $activeDeliveriesByEmployee = $activeDeliveries->groupBy('driver_employee_id');
        $activeDeliveriesByUser = $activeDeliveries->groupBy('driver_user_id');

        // Query today's attendance sessions for linked staff user accounts or employee IDs
        $attendanceSessions = StaffAttendanceSession::query()
            ->where(function ($q) use ($employeeIds, $staffUserIds) {
                $q->whereIn('employee_id', $employeeIds);
                if (!empty($staffUserIds)) {
                    $q->orWhereIn('staff_user_id', $staffUserIds);
                }
            })
            ->whereDate('attendance_date', $today)
            ->latest('clock_in_at')
            ->get();

        $sessionsByEmployee = $attendanceSessions->groupBy('employee_id');
        $sessionsByUser = $attendanceSessions->groupBy('staff_user_id');

        return $drivers->map(function (Employee $driver) use ($activeDeliveriesByEmployee, $activeDeliveriesByUser, $sessionsByEmployee, $sessionsByUser) {
            $staffUser = $driver->loginAccount;
            $userDeliveries = $staffUser ? ($activeDeliveriesByUser->get($staffUser->id) ?? collect()) : collect();
            $empDeliveries = $activeDeliveriesByEmployee->get($driver->id) ?? collect();
            $totalActiveDeliveries = $userDeliveries->merge($empDeliveries)->unique('id')->count();

            $userSessions = $staffUser ? ($sessionsByUser->get($staffUser->id) ?? collect()) : collect();
            $empSessions = $sessionsByEmployee->get($driver->id) ?? collect();
            $allSessions = $userSessions->merge($empSessions)->unique('id');

            $openSession = $allSessions->first(fn(StaffAttendanceSession $s) => $s->clock_in_at !== null && $s->clock_out_at === null);
            $latestSession = $allSessions->sortByDesc('clock_in_at')->first();

            // Status resolution: available, on_delivery, on_break, off_duty
            $statusKey = 'off_duty';
            $statusLabel = 'Off Duty';
            $badgeColor = 'stone';

            if ($openSession) {
                if ($totalActiveDeliveries > 0) {
                    $statusKey = 'on_delivery';
                    $statusLabel = "On Delivery ({$totalActiveDeliveries})";
                    $badgeColor = 'amber';
                } else {
                    $statusKey = 'available';
                    $statusLabel = 'Available';
                    $badgeColor = 'emerald';
                }
            } elseif ($latestSession && $latestSession->close_mode === 'paused') {
                $statusKey = 'on_break';
                $statusLabel = 'On Break';
                $badgeColor = 'amber';
            }

            return [
                'id' => $driver->id,
                'employee_code' => $driver->employee_id ?: "EMP-{$driver->id}",
                'name' => $driver->name,
                'role' => $driver->role,
                'phone' => $staffUser?->phone_number ?? $staffUser?->contact_number ?? $staffUser?->phone ?? null,
                'email' => $staffUser?->email,
                'vehicle_type' => $driver->vehicle_type ?: 'Motorcycle',
                'vehicle_plate_number' => $driver->vehicle_plate_number,
                'driver_license_number' => $driver->driver_license_number,
                'delivery_compensation_type' => $driver->delivery_compensation_type ?: 'salary',
                'delivery_fee_rate' => $driver->delivery_fee_rate !== null ? (float) $driver->delivery_fee_rate : null,
                'status' => $statusKey,
                'status_label' => $statusLabel,
                'badge_color' => $badgeColor,
                'is_clocked_in' => $openSession !== null,
                'active_deliveries_count' => $totalActiveDeliveries,
                'has_user_account' => $staffUser !== null,
                'user_id' => $staffUser?->id,
            ];
        })->values()->all();
    }

    /**
     * Dispatch an order using in-house fleet studio driver.
     *
     * @throws RuntimeException
     */
    public function dispatchOrderWithDriver(Order $order, int $employeeId, User $seller, ?string $notes = null): OrderDelivery
    {
        if (!$seller->isPremiumTier()) {
            throw new RuntimeException('In-house studio fleet dispatch is exclusively available on Premium and Elite plans.');
        }

        if ($order->shipping_method !== 'Delivery') {
            throw new RuntimeException('In-house fleet dispatch is applicable for delivery orders only.');
        }

        if (!in_array($order->status, ['Accepted', 'Processing'], true)) {
            throw new RuntimeException("Only accepted or processing orders can be dispatched (current status: {$order->status}).");
        }

        $driver = Employee::query()
            ->where('user_id', $seller->id)
            ->with('loginAccount')
            ->findOrFail($employeeId);

        return DB::transaction(function () use ($order, $driver, $seller, $notes) {
            /** @var Order $lockedOrder */
            $lockedOrder = Order::query()->with('delivery')->lockForUpdate()->findOrFail($order->id);

            $staffUser = $driver->loginAccount;
            $trackingNumber = 'LK-INHOUSE-' . $lockedOrder->order_number;

            /** @var OrderDelivery $delivery */
            $delivery = $lockedOrder->delivery ?: new OrderDelivery(['order_id' => $lockedOrder->id]);

            $delivery->fill([
                'provider' => OrderDelivery::PROVIDER_IN_HOUSE,
                'status' => OrderDelivery::STATUS_ON_GOING,
                'driver_user_id' => $staffUser?->id,
                'driver_employee_id' => $driver->id,
                'driver_name' => $driver->name,
                'driver_phone' => $staffUser?->phone_number ?? $staffUser?->contact_number ?? $staffUser?->phone ?? null,
                'vehicle_type' => $driver->vehicle_type ?: 'Motorcycle',
                'vehicle_plate_number' => $driver->vehicle_plate_number,
                'dispatch_notes' => $notes ? trim($notes) : null,
                'external_order_id' => $trackingNumber,
                'dispatched_at' => now(),
                'is_pod_enabled' => true,
            ]);
            $delivery->save();

            $delivery->events()->create([
                'provider' => OrderDelivery::PROVIDER_IN_HOUSE,
                'event_key' => 'IN_HOUSE_DISPATCHED_' . $lockedOrder->order_number . '_' . Str::uuid(),
                'event_type' => 'DISPATCHED',
                'external_order_id' => $trackingNumber,
                'payload' => [
                    'driver_id' => $driver->id,
                    'driver_name' => $driver->name,
                    'vehicle_type' => $driver->vehicle_type ?: 'Motorcycle',
                    'vehicle_plate_number' => $driver->vehicle_plate_number,
                    'dispatch_notes' => $notes,
                    'dispatched_at' => now()->toIso8601String(),
                ],
            ]);

            $lockedOrder->update([
                'status' => 'Shipped',
                'shipped_at' => now(),
                'tracking_number' => $trackingNumber,
            ]);

            $lockedOrder->loadMissing(['user', 'delivery']);

            if ($lockedOrder->user) {
                $lockedOrder->user->notify(new OrderDeliveryUpdateNotification(
                    $lockedOrder,
                    'Order dispatched with studio driver',
                    "Your order is on the way with studio driver {$driver->name} (" . ($driver->vehicle_type ?: 'Motorcycle') . ").",
                    route('my-orders.index')
                ));
            }

            if ($lockedOrder->user?->email) {
                $this->sendMailSilently(
                    $lockedOrder->user->email,
                    new OrderShipped($lockedOrder),
                    'order_shipped_in_house',
                    ['order_id' => $lockedOrder->id, 'order_number' => $lockedOrder->order_number]
                );
            }

            return $delivery;
        });
    }

    /**
     * Mark in-house delivery completed with Proof-of-Delivery photo.
     *
     * @throws RuntimeException
     */
    public function completeDelivery(
        OrderDelivery $delivery,
        User $actor,
        UploadedFile|string $podPhoto,
        ?string $podNotes = null
    ): OrderDelivery {
        return DB::transaction(function () use ($delivery, $actor, $podPhoto, $podNotes) {
            /** @var OrderDelivery $lockedDelivery */
            $lockedDelivery = OrderDelivery::query()
                ->with(['order.user', 'order.artisan', 'driverEmployee'])
                ->lockForUpdate()
                ->findOrFail($delivery->id);

            $order = $lockedDelivery->order;
            if (!$order) {
                throw new RuntimeException('No order associated with this delivery record.');
            }

            // Authorization: either the assigned driver staff user or the shop owner
            $isAssignedDriver = $lockedDelivery->driver_user_id && (int) $lockedDelivery->driver_user_id === (int) $actor->id;
            $isShopOwner = (int) $order->artisan_id === (int) $actor->getEffectiveSellerId();

            if (!$isAssignedDriver && !$isShopOwner && !$actor->isStaff()) {
                throw new RuntimeException('Unauthorized to complete this delivery.');
            }

            $podPhotoPath = null;
            if ($podPhoto instanceof UploadedFile) {
                $podPhotoPath = $podPhoto->store('delivery_proofs/' . date('Y/m'), 'public');
            } elseif (is_string($podPhoto) && $podPhoto !== '') {
                // If already a stored path
                $podPhotoPath = $podPhoto;
            }

            $lockedDelivery->update([
                'status' => OrderDelivery::STATUS_COMPLETED,
                'delivered_at' => now(),
                'pod_photo_path' => $podPhotoPath ?: $lockedDelivery->pod_photo_path,
                'pod_notes' => $podNotes ? trim($podNotes) : $lockedDelivery->pod_notes,
            ]);

            $lockedDelivery->events()->create([
                'provider' => OrderDelivery::PROVIDER_IN_HOUSE,
                'event_key' => 'IN_HOUSE_DELIVERED_' . $order->order_number . '_' . Str::uuid(),
                'event_type' => 'DELIVERED',
                'external_order_id' => $lockedDelivery->external_order_id ?: ('LK-INHOUSE-' . $order->order_number),
                'payload' => [
                    'delivered_at' => now()->toIso8601String(),
                    'pod_photo_path' => $podPhotoPath,
                    'pod_notes' => $podNotes,
                    'completed_by_user_id' => $actor->id,
                ],
            ]);

            $order->update([
                'status' => 'Delivered',
                'delivered_at' => now(),
            ]);

            if ($order->user) {
                $order->user->notify(new OrderDeliveryUpdateNotification(
                    $order,
                    'Order delivered successfully',
                    'Your order has been delivered by our studio driver. Please review your parcel and confirm receipt.',
                    route('my-orders.index')
                ));
            }

            return $lockedDelivery;
        });
    }

    private function sendMailSilently(string $recipient, OrderShipped $mailable, string $context, array $extraContext = []): void
    {
        try {
            $mailer = Mail::to($recipient);

            if (app()->environment('production') && config('queue.default') !== 'sync') {
                $mailer->queue($mailable);
            } else {
                $mailer->send($mailable);
            }
        } catch (\Throwable $exception) {
            report($exception);

            Log::error('Transactional mail send failed.', [
                'context' => $context,
                'recipient' => $recipient,
                'message' => $exception->getMessage(),
                ...$extraContext,
            ]);
        }
    }
}

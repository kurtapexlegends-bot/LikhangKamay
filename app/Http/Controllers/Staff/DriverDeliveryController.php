<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\OrderDelivery;
use App\Services\Logistics\InHouseDispatchService;
use App\Services\StaffAttendanceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DriverDeliveryController extends Controller
{
    /**
     * Display the mobile driver console with active and completed deliveries.
     */
    public function index(Request $request, StaffAttendanceService $attendanceService): Response|RedirectResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $seller = $user->getEffectiveSeller();
        if (!$seller) {
            abort(403, 'Workspace access denied.');
        }

        $employee = $user->isStaff() ? $user->employee : null;
        $employeeId = $employee?->id ?? ($user->employee_id ?? null);
        $isOwner = $user->isSellerOwner();

        // Deliveries query
        $baseQuery = OrderDelivery::query()
            ->where('provider', OrderDelivery::PROVIDER_IN_HOUSE)
            ->with(['order.items', 'order.user', 'driverEmployee']);

        if (!$isOwner) {
            $baseQuery->where(function ($q) use ($user, $employeeId) {
                $q->where('driver_user_id', $user->id);
                if ($employeeId) {
                    $q->orWhere('driver_employee_id', $employeeId);
                }
            });
        } else {
            // For studio owner, show all in-house deliveries for their shop
            $baseQuery->whereHas('order', fn($q) => $q->where('artisan_id', $seller->id));
        }

        $activeDeliveries = (clone $baseQuery)
            ->whereIn('status', [
                OrderDelivery::STATUS_ASSIGNING_DRIVER,
                OrderDelivery::STATUS_ON_GOING,
                OrderDelivery::STATUS_PICKED_UP,
            ])
            ->latest('dispatched_at')
            ->get()
            ->map(fn(OrderDelivery $d) => $this->transformDelivery($d));

        $completedToday = (clone $baseQuery)
            ->where('status', OrderDelivery::STATUS_COMPLETED)
            ->whereDate('delivered_at', Carbon::today())
            ->latest('delivered_at')
            ->take(20)
            ->get()
            ->map(fn(OrderDelivery $d) => $this->transformDelivery($d));

        $openSession = $user->isStaff() ? $attendanceService->getOpenSession($user) : null;

        return Inertia::render('Staff/DriverDeliveries', [
            'activeDeliveries' => $activeDeliveries,
            'completedToday' => $completedToday,
            'driverProfile' => [
                'name' => $employee?->name ?: $user->name,
                'vehicle_type' => $employee?->vehicle_type ?: 'Motorcycle',
                'vehicle_plate_number' => $employee?->vehicle_plate_number,
                'is_clocked_in' => $openSession !== null,
                'is_owner_view' => $isOwner,
            ],
            'shopName' => $seller->shop_name ?: $seller->name,
        ]);
    }

    /**
     * Submit Proof-of-Delivery photo and mark delivery as completed.
     */
    public function complete(
        Request $request,
        OrderDelivery $delivery,
        InHouseDispatchService $dispatchService
    ): RedirectResponse {
        $request->validate([
            'pod_photo' => ['required', 'image', 'max:10240'], // max 10MB
            'pod_notes' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $dispatchService->completeDelivery(
                $delivery,
                $request->user(),
                $request->file('pod_photo'),
                $request->input('pod_notes')
            );

            return back()->with('success', 'Delivery completed! Proof photo saved.');
        } catch (\Throwable $e) {
            report($e);

            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Transform an OrderDelivery model into a mobile-friendly payload.
     *
     * @return array<string, mixed>
     */
    private function transformDelivery(OrderDelivery $delivery): array
    {
        $order = $delivery->order;

        return [
            'id' => $delivery->id,
            'order_id' => $order?->id,
            'order_number' => $order?->order_number,
            'status' => $delivery->status,
            'dispatched_at' => $delivery->dispatched_at?->format('M d, Y h:i A'),
            'delivered_at' => $delivery->delivered_at?->format('M d, Y h:i A'),
            'dispatch_notes' => $delivery->dispatch_notes,
            'pod_photo_url' => $delivery->pod_photo_url,
            'pod_notes' => $delivery->pod_notes,
            'customer' => [
                'name' => $order?->shipping_recipient_name ?: ($order?->user?->name ?: 'Customer'),
                'phone' => $order?->shipping_contact_phone,
            ],
            'destination' => [
                'address' => $order?->shipping_address ?: 'Store Pickup',
                'street' => $order?->shipping_street_address,
                'barangay' => $order?->shipping_barangay,
                'city' => $order?->shipping_city,
                'region' => $order?->shipping_region,
                'postal_code' => $order?->shipping_postal_code,
                'latitude' => $order?->shipping_latitude,
                'longitude' => $order?->shipping_longitude,
            ],
            'items' => $order?->items?->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->product_name ?: ($item->product?->name ?? 'Handcrafted Product'),
                    'quantity' => $item->quantity,
                    'variant' => $item->variant_name,
                    'image' => $item->product_image ?: ($item->product?->images[0] ?? null),
                ];
            })->values()->all() ?? [],
        ];
    }
}

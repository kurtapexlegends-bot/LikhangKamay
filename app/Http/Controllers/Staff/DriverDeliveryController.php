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
use App\Services\StorageUrl;
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

        if ($user->isStaff() && !$attendanceService->getOpenSession($user)) {
            return redirect()->route('staff.dashboard');
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
        $compensationType = $employee?->delivery_compensation_type ?: 'salary';
        $feeRate = (float) ($employee?->delivery_fee_rate ?? 0);
        $todayCompletedCount = $completedToday->count();
        $todayDropEarnings = in_array($compensationType, ['per_delivery', 'hybrid'], true)
            ? round($todayCompletedCount * $feeRate, 2)
            : 0;

        $isVehicleVerified = !empty($employee?->vehicle_plate_number)
            && !empty($employee?->driver_license_number)
            && !empty($employee?->driver_license_photo_path);

        return Inertia::render('Staff/DriverDeliveries', [
            'activeDeliveries' => $activeDeliveries,
            'completedToday' => $completedToday,
            'driverProfile' => [
                'name' => $employee?->name ?: $user->name,
                'vehicle_type' => $employee?->vehicle_type ?: 'Motorcycle',
                'vehicle_plate_number' => $employee?->vehicle_plate_number,
                'driver_license_number' => $employee?->driver_license_number,
                'driver_license_photo_url' => $employee?->driver_license_photo_path ? StorageUrl::url($employee->driver_license_photo_path) : null,
                'is_vehicle_verified' => $isVehicleVerified,
                'compensation_type' => $compensationType,
                'delivery_fee_rate' => $feeRate,
                'today_completed_count' => $todayCompletedCount,
                'today_drop_earnings' => $todayDropEarnings,
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
     * Self-verify driver vehicle details and upload driver license or ID photo.
     */
    public function verifyVehicle(Request $request): RedirectResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $employee = $user->isStaff() ? $user->employee : null;
        if (!$employee && $user->employee_id) {
            $employee = Employee::find($user->employee_id);
        }

        if (!$employee && $user->isSellerOwner()) {
            $employee = Employee::where('user_id', $user->id)->first();
        }

        if (!$employee) {
            return back()->with('error', 'Employee record not found for this user account.');
        }

        $validated = $request->validate([
            'vehicle_type' => ['required', 'string', 'in:Motorcycle,Bicycle,Sedan,MPV,Van'],
            'vehicle_plate_number' => ['required', 'string', 'max:20'],
            'driver_license_number' => ['required', 'string', 'max:50'],
            'driver_license_photo' => [
                $employee->driver_license_photo_path ? 'nullable' : 'required',
                'image',
                'mimes:jpeg,png,jpg,webp',
                'max:4096', // 4MB per Vercel serverless limit
            ],
        ]);

        $photoPath = $employee->driver_license_photo_path;
        if ($request->hasFile('driver_license_photo')) {
            $photoPath = $request->file('driver_license_photo')->store('driver_licenses', 'public');
        }

        $employee->update([
            'vehicle_type' => $validated['vehicle_type'],
            'vehicle_plate_number' => strtoupper(trim($validated['vehicle_plate_number'])),
            'driver_license_number' => strtoupper(trim($validated['driver_license_number'])),
            'driver_license_photo_path' => $photoPath,
        ]);

        return back()->with('success', 'Vehicle and driver license details successfully verified!');
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

# Logistics & Fulfillment

This document details shipping and courier delivery mapping, Lalamove order lifecycles, and buyer address tracking.

---

## 1. Domain Models

*   **Order Delivery**: [OrderDelivery.php](file:///c:/laragon/www/LikhangKamay/app/Models/OrderDelivery.php)
    *   Tracks third-party logistics dispatching (exclusively Lalamove).
    *   Fields: `order_id`, `provider`, `status`, `service_type`, `quotation_id`, `external_order_id`, `share_link`, `price_total`, `is_pod_enabled` (Proof of Delivery).
    *   Status constants:
        *   `STATUS_ASSIGNING_DRIVER = 'ASSIGNING_DRIVER'`
        *   `STATUS_ON_GOING = 'ON_GOING'`
        *   `STATUS_PICKED_UP = 'PICKED_UP'`
        *   `STATUS_COMPLETED = 'COMPLETED'`
        *   `STATUS_CANCELED = 'CANCELED'`
        *   `STATUS_REJECTED = 'REJECTED'`
        *   `STATUS_EXPIRED = 'EXPIRED'`
*   **Order Delivery Event**: [OrderDeliveryEvent.php](file:///c:/laragon/www/LikhangKamay/app/Models/OrderDeliveryEvent.php)
    *   Chronological logs mapping courier webhook status changes.
    *   Fields: `order_delivery_id`, `provider`, `event_key`, `event_type`, `payload`.
*   **Order Item**: [OrderItem.php](file:///c:/laragon/www/LikhangKamay/app/Models/OrderItem.php)
    *   Granular line item records mapping products bought within an order.
    *   Fields: `order_id`, `product_id`, `quantity`, `price` (snapshot price at checkout), `metadata`.
*   **User Address**: [UserAddress.php](file:///c:/laragon/www/LikhangKamay/app/Models/UserAddress.php)
    *   Saved buyer shipping locations.
    *   Fields: `user_id`, `address_type` (e.g. Home, Work), `recipient_name`, `phone_number`, `street_address`, `barangay`, `city`, `region`, `postal_code`, `is_default`.

---

## 2. Lalamove Courier Lifecycle

Webhooks from the Lalamove API dispatch events that update the `status` of `OrderDelivery` records.

*   **Logistics Background Jobs**:
    *   [SyncOrderDeliveryJob.php](file:///c:/laragon/www/LikhangKamay/app/Jobs/SyncOrderDeliveryJob.php): A background queue job that triggers on scheduled intervals or manual actions to pull, verify, and synchronize the active status of Lalamove order delivery tracks.
    *   [BookLalamoveDeliveryJob.php](file:///c:/laragon/www/LikhangKamay/app/Jobs/BookLalamoveDeliveryJob.php): A background queue job dispatched during bulk order shipping approvals to handle asynchronous Lalamove courier bookings without blocking web request threads.

### Terminal Failures & Auto-Cancellation
*   **Terminal States**: `CANCELED`, `REJECTED`, or `EXPIRED` triggers are classified under `isTerminalFailure()`.
*   **Auto-Cancel Command**: If a delivery enters a terminal failure state, the system schedules a hold window. After 24 hours of inactivity, a background command triggers:
    1.  Sets the order status to `Cancelled`.
    2.  Restores product inventory stock and decrements sales numbers.
    3.  Initiates online payment refunds if the transaction is non-COD.

### Concurrency & Dispatch Mutex Locking
*   **Courier Dispatch Atomic Mutex**: In [OrderLogisticsService.php](file:///c:/laragon/www/LikhangKamay/app/Services/OrderLogisticsService.php), both `bookLalamoveDelivery` and `bookReplacementExchange` acquire an atomic cache lock (`lalamove_booking:{$order->id}`, 30s) prior to API quotation and booking. Rapid concurrent clicks or retries are rejected with a safe user-facing message, preventing duplicate dispatch orders and double-billing on Lalamove's platform. The `finally` block wraps `$lock->release()` inside `rescue(fn () => $lock->release(), report: false)` so cache connection flickers during release do not trigger unhandled exceptions after a successful booking.
*   **Terminally Failed Delivery Re-Booking**: If a delivery suffers terminal failure (`terminal_failed_at` is set, or status is `CANCELED`, `REJECTED`, or `EXPIRED`), sellers can re-book courier delivery even while the order remains in `Shipped` status. When re-booked, the delivery record is updated with the new Lalamove external order ID and tracking number while `terminal_failed_at`, `auto_cancelled_at`, and `failure_reason` are reset to null.


---

## 3. Shipping Address Rules

*   **Structure Validation**: Addresses are stored as structured columns rather than loose text blocks. They are formatted using `StructuredAddress::formatPhilippineAddress()` before geocoding.
*   **Address Type Selection**: Default and custom address options (Home/Work) are handled on checkout using `UserAddress` models. Malformed or tampered address references trigger validation errors rather than allowing database query crashes.

### Address Validation & Regional Scope
*   **Strict Cavite Scope**: LikhangKamay operations, artisan studios, buyer delivery addresses, and logistics dispatching are strictly restricted to the **Province of Cavite** (23 official cities and municipalities). Addresses outside Cavite are rejected on registration, profile update, address management, and checkout.
*   [CaviteAddress.php](file:///c:/laragon/www/LikhangKamay/app/Support/CaviteAddress.php): Single source of truth defining valid Cavite LGUs, canonical city resolution, and regional validation guards.
*   [StructuredAddress.php](file:///c:/laragon/www/LikhangKamay/app/Support/StructuredAddress.php): Helper class providing standardized formatting methods for structured addresses.
*   [CourierAddressResolver.php](file:///c:/laragon/www/LikhangKamay/app/Support/CourierAddressResolver.php): Helper class resolving address details to Lalamove location payload structures.

### Logistics Domain Services
*   [VehicleTypeResolver.php](file:///c:/laragon/www/LikhangKamay/app/Services/VehicleTypeResolver.php): Dynamically resolves courier vehicle tiers (Motorcycle, Sedan, MPV, Van) based on aggregate order dimensions, weight (grams for retail crafts, kg for wholesale supplies), and volumetric cubic thresholds.
*   [OrderLogisticsService.php](file:///c:/laragon/www/LikhangKamay/app/Services/OrderLogisticsService.php): Manages quotation requests, driver dispatch requests, and cancellation refunds.
*   [CheckoutShippingService.php](file:///c:/laragon/www/LikhangKamay/app/Services/CheckoutShippingService.php): Computes and validates courier fees on checkout.
*   [PickupScheduleService.php](file:///c:/laragon/www/LikhangKamay/app/Services/PickupScheduleService.php): Resolves effective pickup slots, operating days, and booking availability across multi-workshop artisan locations with defensive fallback handling.
*   [LalamoveWebhookService.php](file:///c:/laragon/www/LikhangKamay/app/Services/Logistics/LalamoveWebhookService.php): Translates incoming raw Lalamove REST API payloads into internal domain events.

### Workshop Pickup & Multi-Location Models
*   [SellerPickupSchedule.php](file:///c:/laragon/www/LikhangKamay/app/Models/SellerPickupSchedule.php): Configures weekly operating schedules, slot durations, and capacity per artisan workshop. Uses `PostgresCompatibleBoolean` cast on `is_enabled` and `scopeEnabled` scope for strict cross-DB compatibility, with defensive `->withTrashed()` scoping on artisan and workshop location relations.
*   [PrepareCheckout.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Consumer/PrepareCheckout.php): Orchestrates single and multi-artisan checkout workflows, ensuring null-safe seller resolution and pickup schedule attachment.

### In-House Fleet & Driver Telemetry Security
*   [InHouseDispatchService.php](file:///c:/laragon/www/LikhangKamay/app/Services/Logistics/InHouseDispatchService.php): Manages studio driver dispatching, milestone progression, and POD completion. Enforces strict organizational boundary scoping: only the assigned driver, the verified shop owner (`isSellerOwner()` with matching `artisan_id`), or scoped shop staff can complete deliveries. Cross-shop completion attempts are rejected with `RuntimeException`, and duplicate completion calls are resolved idempotently.
*   [DriverDeliveryController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Staff/DriverDeliveryController.php): Controls the driver deliveries console and live telemetry broadcasts. `updateTelemetry` (`PUT /staff/deliveries/{id}/telemetry`) verifies that the broadcasting user is either the assigned driver or the authenticated shop owner of the specific order, rejecting cross-shop IDOR broadcasts with HTTP 403. Telemetry fetching is restricted to buyer, shop owner, assigned driver, or platform admin.

### Logistics Controllers
*   [LalamoveDeliveryController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/LalamoveDeliveryController.php): Manages explicit seller actions to dispatch Lalamove riders and fetch delivery pricing.
*   [DriverDeliveryController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Staff/DriverDeliveryController.php): Driver portal console for assigned drops, telemetry broadcasts, and vehicle verification.
*   [OrderPrintController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/OrderPrintController.php): Manages PDF generation and formatting for physical shipping waybills.

### Logistics Notifications
*   [OrderDeliveryUpdateNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/OrderDeliveryUpdateNotification.php): Broadcasts alerts to buyers when the Lalamove tracking status updates.

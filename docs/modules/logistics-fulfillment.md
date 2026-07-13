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

---

## 3. Shipping Address Rules

*   **Structure Validation**: Addresses are stored as structured columns rather than loose text blocks. They are formatted using `StructuredAddress::formatPhilippineAddress()` before geocoding.
*   **Address Type Selection**: Default and custom address options (Home/Work) are handled on checkout using `UserAddress` models. Malformed or tampered address references trigger validation errors rather than allowing database query crashes.

### Address Validation Helpers
*   [StructuredAddress.php](file:///c:/laragon/www/LikhangKamay/app/Support/StructuredAddress.php): Helper class providing standardized formatting methods for Philippine addresses.
*   [CourierAddressResolver.php](file:///c:/laragon/www/LikhangKamay/app/Support/CourierAddressResolver.php): Helper class resolving address details to Lalamove location payload structures.

### Logistics Domain Services
*   [OrderLogisticsService.php](file:///c:/laragon/www/LikhangKamay/app/Services/OrderLogisticsService.php): Manages quotation requests, driver dispatch requests, and cancellation refunds.
*   [CheckoutShippingService.php](file:///c:/laragon/www/LikhangKamay/app/Services/CheckoutShippingService.php): Computes and validates courier fees on checkout.
*   [LalamoveWebhookService.php](file:///c:/laragon/www/LikhangKamay/app/Services/Logistics/LalamoveWebhookService.php): Translates incoming raw Lalamove REST API payloads into internal domain events.

### Logistics Controllers
*   [LalamoveDeliveryController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/LalamoveDeliveryController.php): Manages explicit seller actions to dispatch Lalamove riders and fetch delivery pricing.
*   [OrderPrintController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/OrderPrintController.php): Manages PDF generation and formatting for physical shipping waybills.

### Logistics Notifications
*   [OrderDeliveryUpdateNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/OrderDeliveryUpdateNotification.php): Broadcasts alerts to buyers when the Lalamove tracking status updates.

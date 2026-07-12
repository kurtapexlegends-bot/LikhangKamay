# Background Commands & Scheduler

This document maps all Artisan Console Commands (`app/Console/Commands/`) and cron-scheduled background operations executing in LikhangKamay.

---

## 1. Fulfillment & Logistics Daemons

*   **Auto-Cancel Failed Deliveries**:
    *   Command Class: [AutoCancelFailedDeliveries.php](file:///c:/laragon/www/LikhangKamay/app/Console/Commands/AutoCancelFailedDeliveries.php)
    *   Signature: `orders:auto-cancel-failed-deliveries`
    *   Logic: Queries `OrderDelivery` records where `provider` is `lalamove`, `auto_cancelled_at` is null, and `terminal_failed_at` is older than 24 hours (`<= now()->subDay()`). Triggers the cancellation workflow to restore stock and issue refunds.
*   **Sync Lalamove Deliveries**:
    *   Command Class: [SyncLalamoveDeliveries.php](file:///c:/laragon/www/LikhangKamay/app/Console/Commands/SyncLalamoveDeliveries.php)
    *   Signature: `logistics:sync-lalamove`
    *   Logic: Polls active Lalamove deliveries that are in non-terminal states and synchronizes their statuses with the remote API.

---

## 2. Payment & Subscription Reconcilers

*   **Cancel Unpaid Orders**:
    *   Command Class: [CancelUnpaidOrders.php](file:///c:/laragon/www/LikhangKamay/app/Console/Commands/CancelUnpaidOrders.php)
    *   Signature: `orders:cancel-unpaid`
    *   Logic: Cancels checkout orders that remained in `pending` payment status past the session expiration window.
*   **Verify PayMongo Payments**:
    *   Command Class: [VerifyPaymongoPayments.php](file:///c:/laragon/www/LikhangKamay/app/Console/Commands/VerifyPaymongoPayments.php)
    *   Signature: `paymongo:verify`
    *   Logic: Safely verifies unresolved PayMongo sessions for orders and subscription upgrades, transitioning successful ones to `paid` status.
*   **Expire Sponsorships**:
    *   Command Class: [ExpireSponsorships.php](file:///c:/laragon/www/LikhangKamay/app/Console/Commands/ExpireSponsorships.php)
    *   Signature: `sponsorships:expire`
    *   Logic: Automatically sets expired product sponsorships status to `expired` once their duration limit is reached.

---

## 3. Analytics & Auditing Jobs

*   **Generate Analytics Snapshots**:
    *   Command Class: [GenerateAnalyticsSnapshots.php](file:///c:/laragon/www/LikhangKamay/app/Console/Commands/GenerateAnalyticsSnapshots.php)
    *   Signature: `analytics:generate-snapshots`
    *   Logic: Consolidates and logs daily financial records (`revenue`, `cost`, `orders_count`) into `SellerAnalyticsSnapshot` to avoid expensive real-time calculations.
*   **Platform Audit**:
    *   Command Class: [PlatformAuditCommand.php](file:///c:/laragon/www/LikhangKamay/app/Console/Commands/PlatformAuditCommand.php)
    *   Signature: `platform:audit`
    *   Logic: Audits overall workspace health, orphan records, and file logs consistency.
*   **Prune Soft Deleted Items**:
    *   Command Class: [PruneSoftDeletedItems.php](file:///c:/laragon/www/LikhangKamay/app/Console/Commands/PruneSoftDeletedItems.php)
    *   Signature: `db:prune-soft-deleted`
    *   Logic: Purges soft-deleted rows older than the retention threshold from the database.

---

## 4. Notifications & Reminders

*   **Remind Sellers To Ship**:
    *   Command Class: [RemindSellersToShip.php](file:///c:/laragon/www/LikhangKamay/app/Console/Commands/RemindSellersToShip.php)
    *   Signature: `orders:remind-shipment`
    *   Logic: Dispatches reminder emails to sellers with accepted but unshipped orders.
*   **Send Review Reminders**:
    *   Command Class: [SendReviewReminders.php](file:///c:/laragon/www/LikhangKamay/app/Console/Commands/SendReviewReminders.php)
    *   Signature: `orders:send-review-reminders`
    *   Logic: Reminds buyers via email to leave reviews for completed orders.
*   **Send Test Emails (Utility)**:
    *   Command Class: [SendTestEmails.php](file:///c:/laragon/www/LikhangKamay/app/Console/Commands/SendTestEmails.php)
    *   Signature: `mail:test`
    *   Logic: Developer testing utility to verify SMTP credentials and preview layout template rendering.

### Reminder Mails & Notifications
*   [ShipmentDeadlineNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/ShipmentDeadlineNotification.php) | [ShipmentReminder.php](file:///c:/laragon/www/LikhangKamay/app/Mail/ShipmentReminder.php): Broadcasts alerts to sellers to prepare upcoming deliveries.
*   [ReviewReminder.php](file:///c:/laragon/www/LikhangKamay/app/Mail/ReviewReminder.php): Follow-up buyer feedback engagement prompts.

---

## 5. Cron Scheduler Configuration

The background execution intervals are consolidated within the console router: [console.php](file:///c:/laragon/www/LikhangKamay/routes/console.php).

### Inline Closure Commands
*   `orders:auto-complete`: Runs daily to complete orders when the buyer's warranty expiration date passes.
*   `staff:auto-pause-inactive`: Runs every minute to sweep, retroactively cap, and auto-pause stale staff sessions.

### Cron Execution Frequency Matrix
| Command Signature | Cron Interval | target functionality |
| :--- | :--- | :--- |
| `staff:auto-pause-inactive` | `everyMinute()` | Staff timeout cleanup checks |
| `paymongo:verify` | `everyFiveMinutes()` | PayMongo checkout reconciliation checks |
| `orders:sync-lalamove` | `everyFifteenMinutes()` | Lalamove logistics tracker polling checks |
| `orders:auto-cancel-failed-deliveries` | `everyFifteenMinutes()` | Lalamove failed deliveries refund execution checks |
| `orders:cancel-unpaid` | `hourly()` | Unpaid order cleanup sweep checks |
| `orders:auto-complete` | `daily()` | Completed order transitions checks |
| `sponsorships:expire` | `daily()` | Product feature listing checks |
| `system:prune-trash` | `daily()` | Soft-delete rows pruning checks |
| `orders:remind-shipping` | `dailyAt('09:00')` | Shipment emails checks |
| `reviews:remind` | `dailyAt('10:00')` | Buyer review email reminders checks |

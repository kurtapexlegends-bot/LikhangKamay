# Mail Studio & Audience Broadcast

This document details the dynamic system email customization engine, audience broadcast dispatching, and placeholder hydration pipeline in LikhangKamay.

---

## 1. Domain Models & Service Layer

*   **Email Template Model**: [EmailTemplate.php](file:///c:/laragon/www/LikhangKamay/app/Models/EmailTemplate.php)
    *   Stores 20 default system email templates and user-created custom broadcast templates.
    *   Fields: `slug`, `name`, `subject`, `headline`, `body`, `button_label`, `button_url`, `category` (`system` | `custom`), `is_active`, `created_by_user_id`.

*   **Email Template Service**: [EmailTemplateService.php](file:///c:/laragon/www/LikhangKamay/app/Services/EmailTemplateService.php)
    *   Dynamic resolution service invoked by all system Mailables and Notifications.
    *   Checks if a customized `EmailTemplate` record exists for a slug and applies Super Admin edits.
    *   Maintains a fallback dictionary to guarantee zero raw unparsed `{tag}` strings in delivered emails.

---

## 2. Dynamic Variable Hydration Pipeline

The system automatically scans and replaces the following 10 placeholder tags at dispatch time:

| Tag | Replaced With | Context Source |
|---|---|---|
| `{user_name}` | Recipient Full Name | `User->name` or `Order->customer_name` |
| `{shop_name}` | Seller Shop Name | `Artisan->shop_name` or `Order->seller->shop_name` |
| `{order_number}` | Order Reference Code | `Order->order_number` |
| `{tracking_number}` | Shipment Courier Tracking | `Order->tracking_number` |
| `{verification_code}` | Security OTP | `VerifyEmailNotification` payload |
| `{product_name}` | Catalog Item Name | `Product->name` |
| `{rejection_reason}` | Moderation / Return Notes | Event feedback payload |
| `{refund_amount}` | Processed Refund Amount | Order payment transaction |
| `{site_name}` | Brand Name | `LikhangKamay` |
| `{action_url}` | Contextual Link | Route URL / target payload |

---

## 3. Administration & Controller API

Managed in [EmailStudioController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Admin/EmailStudioController.php) and [TestMailDispatchController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Admin/TestMailDispatchController.php):

*   `GET /admin/settings/email-templates`: Returns template library list and user lookup index.
*   `POST /admin/settings/email-templates`: Upserts template records via AJAX, returning JSON responses.
*   `POST /admin/settings/email-templates/dispatch`: Broadcasts customized emails using [CustomDynamicMail.php](file:///c:/laragon/www/LikhangKamay/app/Mail/CustomDynamicMail.php) to specific users, role groups (`all_artisans`, `approved_artisans`, `all_buyers`, `elite_sellers`, `premium_sellers`), or custom external emails.
*   `DELETE /admin/settings/email-templates/{template}`: Deletes custom templates while protecting default system templates.
*   `POST /admin/settings/email-templates/test-dispatch`: [TestMailDispatchController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Admin/TestMailDispatchController.php) sends preview emails for template testing.

---

## 4. Integrated Mailables & Notifications

Wired to `EmailTemplateService::apply()`:
*   **Artisan Onboarding**: [ArtisanApproved.php](file:///c:/laragon/www/LikhangKamay/app/Mail/ArtisanApproved.php), [ArtisanRejected.php](file:///c:/laragon/www/LikhangKamay/app/Mail/ArtisanRejected.php), [NewArtisanApplication.php](file:///c:/laragon/www/LikhangKamay/app/Mail/NewArtisanApplication.php)
*   **Order Fulfillment**: [OrderPlaced.php](file:///c:/laragon/www/LikhangKamay/app/Mail/OrderPlaced.php), [OrderAccepted.php](file:///c:/laragon/www/LikhangKamay/app/Mail/OrderAccepted.php), [OrderShipped.php](file:///c:/laragon/www/LikhangKamay/app/Mail/OrderShipped.php), [OrderDelivered.php](file:///c:/laragon/www/LikhangKamay/app/Mail/OrderDelivered.php), [OrderCancelled.php](file:///c:/laragon/www/LikhangKamay/app/Mail/OrderCancelled.php)
*   **Returns & Disputes**: [ReturnRequested.php](file:///c:/laragon/www/LikhangKamay/app/Mail/ReturnRequested.php), [ReturnRequestRejected.php](file:///c:/laragon/www/LikhangKamay/app/Mail/ReturnRequestRejected.php), [RefundProcessed.php](file:///c:/laragon/www/LikhangKamay/app/Mail/RefundProcessed.php), [DisputeEscalated.php](file:///c:/laragon/www/LikhangKamay/app/Mail/DisputeEscalated.php), [DisputeArbitratedSellerWins.php](file:///c:/laragon/www/LikhangKamay/app/Mail/DisputeArbitratedSellerWins.php)
*   **Catalog & Inventory**: [ProductModerationResult.php](file:///c:/laragon/www/LikhangKamay/app/Mail/ProductModerationResult.php), [LowStockAlert.php](file:///c:/laragon/www/LikhangKamay/app/Mail/LowStockAlert.php), [SponsorshipStatusUpdated.php](file:///c:/laragon/www/LikhangKamay/app/Mail/SponsorshipStatusUpdated.php)
*   **Reminders**: [ReviewReminder.php](file:///c:/laragon/www/LikhangKamay/app/Mail/ReviewReminder.php), [ShipmentReminder.php](file:///c:/laragon/www/LikhangKamay/app/Mail/ShipmentReminder.php)
*   **Auth Notifications**: [VerifyEmailNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/VerifyEmailNotification.php), [ResetPasswordNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/ResetPasswordNotification.php)

---

## 5. Frontend Studio Interface

Component: [EmailStudioForm.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Admin/Layout/SystemConfig/EmailStudioForm.jsx)
*   **Isolated State**: Rendered outside parent form containers to prevent page reloads or tab switches on save.
*   **Compact Combobox Dropdown**: Features a search-filtered popover menu (`max-h-52`) grouped into `✨ Custom Broadcast Templates` and `⚡ System Default Templates`.
*   **Live Render Preview**: Includes a Desktop and Mobile viewport preview modal.

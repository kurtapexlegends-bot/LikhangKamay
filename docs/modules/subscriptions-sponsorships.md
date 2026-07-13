# Subscriptions & Sponsorships

This document details the seller tiers, active product/staff limits, PayMongo subscription upgrade flows, and plan downgrade rules.

---

## 1. Domain Models

*   **User Tier Log**: [UserTierLog.php](file:///c:/laragon/www/LikhangKamay/app/Models/UserTierLog.php)
    *   Audit log tracking changes in seller membership plans.
    *   Fields: `user_id`, `previous_tier`, `new_tier`.
*   **Artisan Status Log**: [ArtisanStatusLog.php](file:///c:/laragon/www/LikhangKamay/app/Models/ArtisanStatusLog.php)
    *   Audit log tracking artisan onboarding and vetting progression statuses (e.g., pending -> approved).
    *   Fields: `user_id`, `previous_status`, `new_status`.
*   **Subscription Transaction**: [SubscriptionTransaction.php](file:///c:/laragon/www/LikhangKamay/app/Models/SubscriptionTransaction.php)
    *   Tracks financial payment sessions for premium tier upgrades.
    *   Fields: `user_id`, `reference_number`, `amount`, `status` (Pending, Paid, Failed), `to_plan`, `metadata`.
*   **Sponsorship Request**: [SponsorshipRequest.php](file:///c:/laragon/www/LikhangKamay/app/Models/SponsorshipRequest.php)
    *   Tracks requests by artisans to feature/promote their products on the homepage carousel.
    *   Fields: `product_id`, `amount`, `duration_days`, `status`, `approved_at`.

---

## 2. Premium Tiers & Limits

LikhangKamay supports three seller levels normalized in [SubscriptionService.php](file:///c:/laragon/www/LikhangKamay/app/Services/SubscriptionService.php):

| Tier Level | System Key | Description / Entitlements |
| :--- | :--- | :--- |
| **Level 1** | `free` / `artisan` | Standard artisan level. Limited active product listings, no additional staff. |
| **Level 2** | `premium` | Elevated listings limit. |
| **Level 3** | `super_premium` | Elite artisan level. Unlimited listings, staff workspace creation, HR, and procurement tools. |

---

## 3. Subscription Upgrade Workflow

1.  **Session Creation**: The seller initiates an upgrade via `upgrade()` in [SubscriptionController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/SubscriptionController.php).
2.  **PayMongo Checkout**: The upgrade action requests a Checkout session from PayMongo Service. The checkout URL is returned, and the seller is redirected.
3.  **Payment Reconcile**:
    Upon returning, or visiting the Subscription dashboard, `reconcilePendingUpgradesForUser` queries PayMongo.
    *   If successful, it runs `activateSubscription()`, updates the user's `premium_tier`, writes to `UserTierLog`, and clears any plan-based staff suspensions (`staff_plan_suspended_at = null`).

---

## 4. Subscription Downgrade Constraints

Handled by the [DowngradeSubscription.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Subscription/DowngradeSubscription.php) action:

*   **Excess Product Drafting**:
    When a seller downgrades to a plan with lower listing limits, the system determines which products to keep active based on sales volume.
    *   Active products are ordered by `sold` count (descending), then by `created_at` (ascending), and capped at the new limit.
    *   Any active product not in this top list has its status updated to `Draft`.
*   **Linked Staff Suspension**:
    Downgrades from `super_premium` (Elite) to `free` (Standard) trigger staff account lockouts:
    `staff_plan_suspended_at` is set to `now()` for all staff members of the seller.
*   **Safe Post-Downgrade Redirect**:
    To prevent routing errors, if the previous URL was inside an ERP/CRM module no longer permitted under the free plan (e.g. `/hr` or `/procurement`), the user is redirected to the standard `/dashboard`.

### Core Business Actions
*   [InitiateSubscriptionUpgrade.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Subscription/InitiateSubscriptionUpgrade.php): Starts checkout sessions on PayMongo and logs pending payment requests.
*   [VerifySubscriptionPayment.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Subscription/VerifySubscriptionPayment.php): Queries PayMongo session state to reconcile pending upgrades.
*   [DowngradeSubscription.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Subscription/DowngradeSubscription.php): Enforces listing capping, staffs suspensions, and safety routing redirects on downgrade.
*   [ApproveArtisan.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Admin/Users/ApproveArtisan.php), [BulkApproveArtisans.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Admin/Users/BulkApproveArtisans.php), [RejectArtisan.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Admin/Users/RejectArtisan.php): Modifies onboarding application status logs.

### Financial Controllers
*   [PaymongoWebhookController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Webhooks/PaymongoWebhookController.php): Processes asynchronous payment success/failure webhooks from the PayMongo API gateway.
*   [SponsorshipController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/SponsorshipController.php): Orchestrates artisan applications to feature and sponsor their product listings.
*   [CatalogController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Admin/CatalogController.php): Manages admin approval queue for product listings and sponsorships.

### Subscription & Sponsorship Services
*   [SellerEntitlementService.php](file:///c:/laragon/www/LikhangKamay/app/Services/SellerEntitlementService.php): Service validating features limits and staff creation availability based on user membership tiers.
*   [SponsorshipAnalyticsService.php](file:///c:/laragon/www/LikhangKamay/app/Services/SponsorshipAnalyticsService.php): Handles tracking visitor views and listing telemetry for featured products.

### Subscription & Sponsorship Mails & Notifications
*   [NewArtisanApplicationNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/NewArtisanApplicationNotification.php) | [NewArtisanApplication.php](file:///c:/laragon/www/LikhangKamay/app/Mail/NewArtisanApplication.php): Alerts admins of new artisan onboarding submissions.
*   [ArtisanApproved.php](file:///c:/laragon/www/LikhangKamay/app/Mail/ArtisanApproved.php) | [ArtisanRejected.php](file:///c:/laragon/www/LikhangKamay/app/Mail/ArtisanRejected.php): Dispatches onboarding review results to applicants.
*   [SponsorshipStatusNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/SponsorshipStatusNotification.php) | [SponsorshipStatusUpdated.php](file:///c:/laragon/www/LikhangKamay/app/Mail/SponsorshipStatusUpdated.php): Dispatches alerts regarding product promotion and sponsorship approvals.

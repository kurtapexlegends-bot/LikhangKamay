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

## 2. Artisan Subscription Tiers & Quota Ladder

LikhangKamay supports three seller levels normalized in [SubscriptionService.php](file:///c:/laragon/www/LikhangKamay/app/Services/SubscriptionService.php):

| Tier Level | System Key | Tier Name | Price (Monthly / Annual) | Active Listing Quota | Staff Seats | Core Features & Entitlements |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Level 1** | `free` / `basic` | **Basic** | **₱349 / mo** (₱279/mo billed annually) | 8 listings | 0 staff | Foundational Cavite workshop access, standard storefront, 14-day free trial on onboarding approval. |
| **Level 2** | `premium` | **Premium** | **₱699 / mo** (₱559/mo billed annually) | 25 listings | 3 staff seats | Bill of Materials (BOM) recipes, In-House driver dispatch, HR payroll & attendance, basic analytics export. |
| **Level 3** | `super_premium` | **Elite** | **₱1,299 / mo** (₱1,039/mo billed annually) | 75 listings | 15 staff seats | Full access: 5 free sponsorship ad credits/month, B2B wholesale supply hub, multi-seat team management, priority discovery. |

---

## 3. Subscription Upgrade Workflow

1.  **Session Creation**: The seller initiates an upgrade via `upgrade()` in [SubscriptionController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/SubscriptionController.php).
2.  **PayMongo Checkout**: The upgrade action requests a Checkout session from PayMongo Service. The checkout URL is returned, and the seller is redirected.
3.  **Payment Reconcile**:
    Upon returning, or visiting the Subscription dashboard, `reconcilePendingUpgradesForUser` queries PayMongo.
    *   If successful, it runs `activateSubscription()`, updates the user's `premium_tier`, writes to `UserTierLog`, and clears any plan-based staff suspensions (`staff_plan_suspended_at = null`).

---

## 4. Subscription Auto-Renewal Cancellation, Scheduled Renewals & Period Entitlements

*   **Period Fields on User Model**:
    *   `subscription_expires_at`: The timestamp when active tier benefits expire (end of paid 30-day billing cycle).
    *   `subscription_cancelled_at`: The timestamp when auto-renewal cancellation was requested.
    *   `pending_downgrade_tier`: Tier level (`free` or `premium`) the user will transition to upon expiration.
*   **Active Entitlements During Period & Prepaid 30-Day Pass**:
    *   Because PayMongo subscriptions function as 30-day (or 365-day annual) prepaid passes, canceling auto-renewal or scheduling a lower tier does **not** immediately cut off access or draft active products.
    *   `getEffectivePremiumTier()` returns `premium_tier` while `subscription_expires_at` is in the future.
    *   `isOnTrial()` returns true when `trial_ends_at` is in the future, providing full Premium feature access during the 14-day introductory period granted upon admin approval.
    *   `SellerEntitlementService` and `HandleInertiaRequests` share `effective_premium_tier`, `is_on_trial`, `trial_ends_at`, and `trial_days_remaining` to the frontend, ensuring [UserAvatar.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/UserAvatar.jsx) renders the gold crown badge and amber ring frame, while [PlanModal.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/PlanModal.jsx) and [PlanPricingCard.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/Subscriptions/Partials/PlanPricingCard.jsx) accurately display the active 14-day trial banner and trial badge instead of showing "Basic - Your Current Plan".
    *   Once `subscription_expires_at` passes, `getEffectivePremiumTier()` transitions to `pending_downgrade_tier` (or `free`), enforcing listing limits and staff suspensions.
*   **Annual Billing Cycle & Discount**:
    *   Sellers can select Monthly or Annual billing in [SubscriptionPlans.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/Settings/SubscriptionPlans.jsx).
    *   Annual subscriptions grant 365 days of tier access with an automatic discount (configured in System Settings, default 20% savings).
*   **Scheduled Renewal Plan Selection**:
    *   `POST /subscription/schedule-renewal` (`seller.subscription.schedule-renewal`) in [SubscriptionController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/SubscriptionController.php) updates `pending_downgrade_tier` without drafting listings or altering the current active tier while days remain.
    *   When expiration arrives, the system smoothly transitions the seller to the scheduled tier.
*   **No-Refund Policy**:
    *   All payments for subscription upgrades are non-refundable upon checkout verification.

---

## 5. Subscription Downgrade & Expiration Constraints

Handled by the [DowngradeSubscription.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Subscription/DowngradeSubscription.php) action and [EnsureSellerWorkspaceAccess.php](file:///c:/laragon/www/LikhangKamay/app/Http/Middleware/EnsureSellerWorkspaceAccess.php) middleware:

*   **Excess Product Drafting**:
    When a seller downgrades to a plan with lower listing limits, the system determines which products to keep active based on sales volume.
    *   Active products are ordered by `sold` count (descending), then by `created_at` (ascending), and capped at the new limit.
    *   Any active product not in this top list has its status updated to `Draft`.
*   **Linked Staff Suspension**:
    Downgrades from `super_premium` (Elite) or `premium` to `free` (Basic) trigger staff account lockouts:
    `staff_plan_suspended_at` is set to `now()` for all staff members of the seller.
*   **Safe Post-Downgrade Redirect**:
    To prevent routing errors, if the previous URL was inside an ERP/CRM module no longer permitted under the Basic plan (e.g. `/hr` or `/procurement`), the user is redirected to the standard `/dashboard`.

---

## 6. Subscription Paywall Gate & Workshop Inactivity Protections

When an artisan's paid subscription or introductory trial expires without renewal:

*   **Seller Workspace Paywall Gate**:
    *   Enforced via [EnsureSellerWorkspaceAccess.php](file:///c:/laragon/www/LikhangKamay/app/Http/Middleware/EnsureSellerWorkspaceAccess.php) and [AuthRedirectService.php](file:///c:/laragon/www/LikhangKamay/app/Services/AuthRedirectService.php).
    *   Artisans attempting to access dashboard, products, orders, or ERP modules are redirected directly to `/subscription` with `is_paywall_locked = true`.
    *   Rendered with dedicated reactivation UI via [SubscriptionPaywallGate.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/Settings/SubscriptionPaywallGate.jsx) and [Subscription.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Pages/Seller/Settings/Subscription.jsx).
    *   [SubscriptionController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/SubscriptionController.php) strictly enforces that visiting `/subscription` never auto-grants subscription duration to unpaid or expired artisans.
*   **Staff Holding Lock Screen & Routing**:
    *   Staff members belonging to an expired artisan are intercepted by [EnsureSellerWorkspaceAccess.php](file:///c:/laragon/www/LikhangKamay/app/Http/Middleware/EnsureSellerWorkspaceAccess.php), [EnsureStaffSecurityGate.php](file:///c:/laragon/www/LikhangKamay/app/Http/Middleware/EnsureStaffSecurityGate.php), [DashboardController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/DashboardController.php), and [StaffSecurityController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Auth/StaffSecurityController.php), redirecting directly to `/staff/subscription-locked` (`staff.subscription.locked`).
    *   Rendered by [StaffDashboardController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/StaffDashboardController.php) and [Holding.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Pages/Staff/Holding.jsx) with `owner_subscription_inactive: true`.
    *   Displays a non-destructive holding state advising staff that workshop membership renewal is pending with the shop owner.
    *   [User.php](file:///c:/laragon/www/LikhangKamay/app/Models/User.php) defines `sellerOwner()` with `->withTrashed()` to defensively resolve deactivated or soft-deleted artisan owners without triggering 403 errors.
*   **Public Catalog & Storefront Filtering**:
    *   Public product discovery in [CatalogService.php](file:///c:/laragon/www/LikhangKamay/app/Services/CatalogService.php) automatically applies `activeSubscription()` scope so products of expired workshops are omitted from consumer browse/search results.
    *   Public shop profiles in [ShopController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/ShopController.php) and [SellerProfile.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Pages/Consumer/Shop/SellerProfile.jsx) present a friendly "Taking a Break" status badge.
*   **Cart & Checkout Protection**:
    *   [CartService.php](file:///c:/laragon/www/LikhangKamay/app/Services/Cart/CartService.php) rejects adding products from expired workshops (`hasActiveSubscription() == false`).
    *   Pre-existing cart items from inactive workshops are highlighted with warning notices.
    *   [QuoteCheckoutShipping.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Consumer/QuoteCheckoutShipping.php) and [PlaceOrder.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Consumer/PlaceOrder.php) validate workshop subscription status, throwing descriptive validation exceptions to prevent orphan order placements.
*   **Performance Composite Index & Migration Backfill**:
    *   Migration [2026_11_17_120000_add_artisan_subscription_index_and_backfill.php](file:///c:/laragon/www/LikhangKamay/database/migrations/2026_11_17_120000_add_artisan_subscription_index_and_backfill.php) provides a composite index `(role, artisan_status, subscription_expires_at)` optimizing high-frequency catalog and auth gate queries, with a 30-day initial access grace period backfilled for legacy approved artisans.

### Core Business Actions
*   [InitiateSubscriptionUpgrade.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Subscription/InitiateSubscriptionUpgrade.php): Starts checkout sessions on PayMongo and logs pending payment requests.
*   [VerifySubscriptionPayment.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Subscription/VerifySubscriptionPayment.php): Reconciles and verifies subscription upgrade payments. Executes external PayMongo checkout session retrieval decoupled from the database transaction, then safely locks the `SubscriptionTransaction` record with `lockForUpdate()`, validates payment and reference matching, and activates the plan.
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

---

## 7. Settings Hub Tier Gating

In the Unified Global Settings Hub ([GlobalSettings.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Pages/Seller/Settings/GlobalSettings.jsx) and [SettingsController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/SettingsController.php)):
*   **Standard / Free Plan**: Only the **Shop Storefront** tab is visible.
*   **Premium / Elite Plan**: Unlocks advanced enterprise tabs including **Workplace Locations** (GPS coordinates and geofences), **People & Payroll** (overtime multipliers, cutoffs, tax rules), and **Finance & Payouts** (banking and automated payout reconciliation).

---

## 8. Default Production Demo Artisan Tier Configuration

To support end-to-end testing and production audit validation of the full ERP suite (HR Roster, Shift Tracking, Payroll, and Accounting Ledger), the default demo artisan (`artisan@likhangkamay.com`) is provisioned as `super_premium` via migration [2026_10_26_080000_enable_erp_modules_for_default_artisan.php](file:///c:/laragon/www/LikhangKamay/database/migrations/2026_10_26_080000_enable_erp_modules_for_default_artisan.php) and catalog seed [2026_10_06_083000_seed_production_landing_catalog.php](file:///c:/laragon/www/LikhangKamay/database/migrations/2026_10_06_083000_seed_production_landing_catalog.php). This unlocks the 15-employee seat quota and all ERP workspace routes (`/accounting`, `/hr`, `/procurement`).

# System Auditing, Compliance & Analytics

This document details the compliance agreement logs, staff access tracking, capital ledger modifications, content flagging, review states, and rollups for seller performance analytics.

---

## 1. Domain Models

### Compliance & Audits
*   **Seller Activity Log**: [SellerActivityLog.php](file:///c:/laragon/www/LikhangKamay/app/Models/SellerActivityLog.php)
    *   Tracks business action occurrences (created, updated, deleted) inside the artisan workspace.
    *   Fields: `seller_owner_id`, `actor_user_id`, `actor_type` (resolved as owner, staff, admin, or buyer), `severity` (info, warning, danger), `title`, `summary`, `occurred_at`.
*   **Staff Access Audit**: [StaffAccessAudit.php](file:///c:/laragon/www/LikhangKamay/app/Models/StaffAccessAudit.php)
    *   Records staff authentication log entries and active session changes.
*   **Seller Compliance Agreement**: [SellerComplianceAgreement.php](file:///c:/laragon/www/LikhangKamay/app/Models/SellerComplianceAgreement.php)
    *   Saves active agreements to terms, platform regulations, and legal updates.
*   **Capital Adjustment**: [CapitalAdjustment.php](file:///c:/laragon/www/LikhangKamay/app/Models/CapitalAdjustment.php)
    *   Logs manual alterations to the seller's `base_funds` capital balance.
*   **Platform Activity**: [PlatformActivity.php](file:///c:/laragon/www/LikhangKamay/app/Models/PlatformActivity.php)
    *   Global system-wide logging.

### Feedback, Analytics & Variables
*   **Review**: [Review.php](file:///c:/laragon/www/LikhangKamay/app/Models/Review.php)
    *   Product reviews, ratings, and seller replies.
*   **Product Resubmission**: [ProductResubmission.php](file:///c:/laragon/www/LikhangKamay/app/Models/ProductResubmission.php)
    *   Logs review rejection histories and edits.
*   **Seller Analytics Snapshot**: [SellerAnalyticsSnapshot.php](file:///c:/laragon/www/LikhangKamay/app/Models/SellerAnalyticsSnapshot.php)
    *   Daily rolling aggregates of financial performance.
    *   Fields: `seller_id`, `snapshot_date`, `revenue`, `cost`, `orders_count`.
*   **Sponsorship Event**: [SponsorshipEvent.php](file:///c:/laragon/www/LikhangKamay/app/Models/SponsorshipEvent.php)
    *   Tracks listing views and customer click events for promoted products.
*   **Platform Variable**: [PlatformVariable.php](file:///c:/laragon/www/LikhangKamay/app/Models/PlatformVariable.php)
    *   Global dynamic configuration settings (e.g. commission fee percentage, base shipping rate factors).

---

## 2. Activity & Audit Rules

### Decoupled Logging Mandate
> [!IMPORTANT]
> To prevent controller bloat, manual logs using `SellerActivityLog::recordEvent` inside controller actions are **permanently banned**. Audit logging and analytics invalidation must be handled asynchronously via Eloquent Model Observers, Event Listeners, or background queue jobs.
*   **Active Observers**:
    *   [ReviewObserver.php](file:///c:/laragon/www/LikhangKamay/app/Observers/ReviewObserver.php): Automatically tracks product reviews ratings updates.
    *   [ReviewDisputeObserver.php](file:///c:/laragon/www/LikhangKamay/app/Observers/ReviewDisputeObserver.php): Audits moderation actions on reported reviews.
*   **Automated Audit Middleware**:
    *   [TrackStaffActivity.php](file:///c:/laragon/www/LikhangKamay/app/Http/Middleware/TrackStaffActivity.php): Tracks and logs staff interaction telemetry inside the workspace.
    *   [UpdateLastSeen.php](file:///c:/laragon/www/LikhangKamay/app/Http/Middleware/UpdateLastSeen.php): Records user activity heartbeat events.

### Capital Audit Trails
Whenever a seller owner changes starting capital balances (`base_funds`), the adjustment must execute inside a database transaction (`DB::transaction`) and write a matching `CapitalAdjustment` row capturing:
*   The old balance value.
*   The new balance value.
*   The authorizing actor user ID.

### Core Security & Presenter Utilities
*   [RichTextSanitizer.php](file:///c:/laragon/www/LikhangKamay/app/Support/RichTextSanitizer.php): Input sanitation filter safeguarding user-generated rich-text descriptions from XSS and injection vulnerabilities.
*   [NotificationPresenter.php](file:///c:/laragon/www/LikhangKamay/app/Support/NotificationPresenter.php): Transforms raw Eloquent notification records into descriptive frontend list objects.

### Core Business Actions
*   [ExportAnalyticsReportCsv.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Analytics/ExportAnalyticsReportCsv.php), [ExportAuditLogCsv.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Audit/ExportAuditLogCsv.php): Handles background generation and stream-downloading of compliance and financial logs.

### Auditing & Analytics Controllers
*   [AnalyticsController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Analytics/AnalyticsController.php), [AuditLogController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/AuditLogController.php), [SettingsController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/SettingsController.php): Manages seller workspace views for ledger, log history, and store configuration.
*   [CatalogController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Consumer/CatalogController.php), [ImpersonationController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Admin/ImpersonationController.php), [PlatformDiagnosticsController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Admin/PlatformDiagnosticsController.php), [SuperAdminController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Admin/SuperAdminController.php), [SystemSettingsController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Admin/SystemSettingsController.php), [FlaggedContentController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Compliance/FlaggedContentController.php), [ValidationController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Compliance/ValidationController.php): Manages super-admin capabilities, platform overrides, user masquerading for support, and global moderation tasks.

### Auditing & Analytics Services
*   [AccountingLedgerService.php](file:///c:/laragon/www/LikhangKamay/app/Services/AccountingLedgerService.php): Calculates current account balance based on starting capital, revenue, stock expenses, and payroll runs.
*   [AuditLogAggregationService.php](file:///c:/laragon/www/LikhangKamay/app/Services/Audit/AuditLogAggregationService.php): Aggregates activity logs for administrative audit reviews.
*   [FinanceBillingAuditLogger.php](file:///c:/laragon/www/LikhangKamay/app/Services/Audit/FinanceBillingAuditLogger.php): Specifically tracks and logs billing changes and platform payout balances.
*   [ShopAnalyticsService.php](file:///c:/laragon/www/LikhangKamay/app/Services/ShopAnalyticsService.php): Service executing the daily analytics snapshots scheduler operations.
*   [ShopAnalyticsMetricsService.php](file:///c:/laragon/www/LikhangKamay/app/Services/Analytics/ShopAnalyticsMetricsService.php): Runs performance, inventory turnover, and sales conversion calculations.
*   [AdminAnalyticsService.php](file:///c:/laragon/www/LikhangKamay/app/Services/Admin/AdminAnalyticsService.php) | [AdminMetricsService.php](file:///c:/laragon/www/LikhangKamay/app/Services/Admin/AdminMetricsService.php): Admin portal aggregation tools measuring platform-wide metrics.

### Moderation & Review Mails & Notifications
*   [NewReviewNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/NewReviewNotification.php): Dispatches push alerts when a seller receives a product review.
*   [ReviewModerationStatusNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/ReviewModerationStatusNotification.php): Alerts user when a reported review is hidden or restored.
*   [DisputeStatusNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/DisputeStatusNotification.php): Pings users on order dispute state changes.
*   [DisputeEscalated.php](file:///c:/laragon/www/LikhangKamay/app/Mail/DisputeEscalated.php) | [DisputeArbitratedSellerWins.php](file:///c:/laragon/www/LikhangKamay/app/Mail/DisputeArbitratedSellerWins.php): Emits formal email arbitration verdicts.

---

## 3. Analytics & Variables Rollups

*   **Average Rating**: Calculated on the `Product` model by selecting the average rating of visible, approved `Review` models:
    `avg('rating') where is_hidden_from_marketplace = false`
*   **Daily Analytics Rollup**:
    To prevent database lock contention during checkout transactions, financial rollups are saved in `SellerAnalyticsSnapshot` as a daily batch snapshot.
*   **Variable Throttling**:
    Global commission calculations lookup variables in `PlatformVariable` which are cached in-memory and invalidated only on change events.

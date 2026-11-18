# Production End-to-End Audit & Verification Matrix

> **Target:** `https://www.likhangkamay.app`  
> **Execution Date:** `2026-11-18T22:11:02.618Z`  
> **Duration:** `526.1s`  
> **Status:** **ATTENTION REQUIRED**

## 1. Executive Summary

| Metric | Value |
| :--- | :--- |
| **Total Scenarios Evaluated** | 165 |
| **Passed Checks** | 163 |
| **Warnings** | 0 |
| **Failed Checks** | 2 |
| **Active Bugs Logged** | 5 |

## 2. Bug & Failure Log

### Bug 1: [HIGH] HTTP 404 Not Found: https://www.likhangkamay.app/vouchers/2
- **Location:** https://www.likhangkamay.app/vouchers/2
- **Description:** Resource returned HTTP 404 Not Found (DELETE)
- **Remediation:** Verify route registration or asset existence.

### Bug 2: [HIGH] HTTP 404 Not Found: https://www.likhangkamay.app/storage/products/cover/synthetic_bamboo.jpg
- **Location:** https://www.likhangkamay.app/storage/products/cover/synthetic_bamboo.jpg
- **Description:** Resource returned HTTP 404 Not Found (GET)
- **Remediation:** Verify route registration or asset existence.

### Bug 3: [HIGH] HTTP 404 Not Found: https://www.likhangkamay.app/storage/products/covers/bTidkz3NCqLS0e1m3bAP8wjljgo6RiwCOIfCU8sV.jpg
- **Location:** https://www.likhangkamay.app/storage/products/covers/bTidkz3NCqLS0e1m3bAP8wjljgo6RiwCOIfCU8sV.jpg
- **Description:** Resource returned HTTP 404 Not Found (GET)
- **Remediation:** Verify route registration or asset existence.

### Bug 4: [HIGH] HTTP 405 Method Not Allowed: https://www.likhangkamay.app/reviews
- **Location:** https://www.likhangkamay.app/reviews
- **Description:** Endpoint returned HTTP 405 Method Not Allowed (DELETE)
- **Remediation:** Verify HTTP method handling and check redirect behavior.

### Bug 5: [HIGH] B2B Sourcing Hub Transaction Relay Failed
- **Location:** https://www.likhangkamay.app/supply-hub
- **Description:** Order #ORD-6AFE22322979B status is 'Shipped', expected 'Completed'.
- **Remediation:** Inspect and resolve finding.


## 3. Detailed Results Matrix

| Phase | Check Description | Status | Details |
| :--- | :--- | :---: | :--- |
| Phase 1 | 1.1 Homepage Load | **PASS** | Title: "LikhangKamay - Artisan Marketplace", Hero visible: true |
| Phase 1 | 1.2 Marketplace Catalog Load | **PASS** | - |
| Phase 1 | 1.2 Search Input & Suggestions | **PASS** | Debounce search executed |
| Phase 1 | 1.2 Sort Dropdown Exists | **PASS** | - |
| Phase 1 | 1.3 Product Detail Media Viewer | **PASS** | Product: "Burnished Clay Water Pitcher & Jar", 2D gallery image verified (3D model not configured on SKU). |
| Phase 1 | 1.3 Recipe Transparency Pill | **PASS** | Artisan craft specifications visible: true |
| Phase 1 | 1.3 Add to Cart Button Rendered | **PASS** | - |
| Phase 1 | 1.4 Artisan Profile Load | **PASS** | Target URL: https://www.likhangkamay.app/shop/silang-terracotta-works-42dewr |
| Phase 1 | 1.5 Register Page Load | **PASS** | - |
| Phase 1 | 1.5 Registration Validation Errors | **PASS** | Form validation errors properly displayed |
| Phase 1 | 1.6 Google OAuth Redirect | **PASS** | Target URL reached: https://accounts.google.com/v3/signin/identifier?opparams=%253F&dsh=S1745803693% |
| Phase 1 | 1.7 Forgot Password Page Load | **PASS** | - |
| Phase 1 | 1.7 Forgot Password Submit | **PASS** | Submission handled |
| Phase 1 | 1.8 Artisan Register Page Load | **PASS** | - |
| Phase 1 | 1.9 Legal Page: /terms | **PASS** | HTTP 200 |
| Phase 1 | 1.9 Legal Page: /privacy | **PASS** | HTTP 200 |
| Phase 1 | 1.9 Legal Page: /seller-agreement | **PASS** | HTTP 200 |
| Phase 1 | 1.9 Legal Page: /seller-privacy | **PASS** | HTTP 200 |
| Phase 1 | 1.10 Public Help Center & FAQ Hub Load | **PASS** | - |
| Phase 1 | 1.10 FAQ Accordion Expand/Collapse Action | **PASS** | - |
| Phase 1 | 1.10 Support Contact Modal & Gmail Web Link | **PASS** | Direct Gmail compose link verified (zero OS Outlook dialog) |
| Phase 2 | 2.1 Buyer Authentication | **PASS** | Current URL: https://www.likhangkamay.app/ |
| Phase 2 | 2.1 Buyer Session Props [Inertia Props] | **PASS** | Verified props [auth.user.email] present |
| Phase 2 | 2.2 Shop Catalog Props [Component: Consumer/Shop/Catalog] | **PASS** | Matched expected component: Catalog |
| Phase 2 | 2.2 Shop Catalog Props [Inertia Props] | **PASS** | Verified props [products] present |
| Phase 2 | 2.2 Product Detail Props [Component: Consumer/Shop/ProductShow] | **PASS** | Matched expected component: ProductShow |
| Phase 2 | 2.2 Product Detail Props [Inertia Props] | **PASS** | Verified props [product.id, product.name, product.price] present |
| Phase 2 | 2.2 Add To Cart Button Clicked | **PASS** | - |
| Phase 2 | 2.2 Cart Page Props [Component: Consumer/Shop/Cart] | **PASS** | Matched expected component: Cart |
| Phase 2 | 2.2 Cart Page Props [Inertia Props] | **PASS** | Verified props [cart] present |
| Phase 2 | 2.3 Profile & Address Book Props [Component: Consumer/Profile/Edit] | **PASS** | Matched expected component: Profile |
| Phase 2 | 2.3 Profile & Address Book Props [Inertia Props] | **PASS** | Verified props [addresses] present |
| Phase 2 | 2.3 Address Section Rendered | **PASS** | - |
| Phase 2 | 2.4 Checkout Inertia Contract [Component: Consumer/Shop/Checkout] | **PASS** | Matched expected component: Checkout |
| Phase 2 | 2.4 Checkout Inertia Contract [Inertia Props] | **PASS** | Verified props [items, pricing] present |
| Phase 2 | 2.4 Checkout Clean Initial State | **PASS** | - |
| Phase 2 | 2.4 Shipping Method Selectors Present | **PASS** | Delivery selector: true, Pickup selector: true |
| Phase 2 | 2.4 Place Order Action Present | **PASS** | Label: "Place Order", Disabled: true |
| Phase 2 | 2.4b Philippine VAT-Inclusive Disclosure Present | **PASS** | 12% VAT inclusive pricing notice verified on Checkout |
| Phase 2 | 2.5 My Orders Inertia Props [Component: Consumer/Buyer/MyOrders] | **PASS** | Matched expected component: Orders |
| Phase 2 | 2.5 My Orders Inertia Props [Inertia Props] | **PASS** | Verified props [orders] present |
| Phase 2 | 2.5 Order Receipt Action Present | **PASS** | - |
| Phase 2 | 2.5b Live Delivery Tracking Component Rendered | **PASS** | Buyer order live tracking card or radar element verified |
| Phase 2 | 2.5c BIR Official Sales Invoice Endpoint Healthy | **PASS** | BIR Receipt URL (/my-orders/118/receipt?download=1) HTTP status: 200 |
| Phase 2 | 2.6 Saved Wishlist Page Load | **PASS** | - |
| Phase 2 | 2.6b Wishlist Heart Toggle & Remove Flow | **PASS** | DOM Toggle On: true, Redirected to /saved: true, DOM Present: true, Click Remove: true |
| Phase 2 | 2.7 Buyer Reviews Page Load | **PASS** | - |
| Phase 2 | 2.7b Customer Review Submitted on Test Order | **PASS** | Review ID: 3, Submitted via DOM: true |
| Phase 2 | 2.8 Buyer Chat Window Load | **PASS** | - |
| Phase 2 | 2.8 Chat Input Field Active | **PASS** | - |
| Phase 2 | 2.8b Chat Inquiry Message Exchange | **FAIL** | Message bubble rendered in DOM: false, timestamp/clock icon verified: true |
| Phase 2 | 2.9 Notifications Page Load | **PASS** | - |
| Phase 2 | 2.10 Buyer Help Center Persona Scoped | **PASS** | Allowed persona: buyer |
| Phase 2 | 2.10 Artisan Guide Tab Hidden for Buyer | **PASS** | - |
| Phase 2 | 2.10 Category Filter Pill Active | **PASS** | - |
| Phase 3 | 3.1 Seller Authentication | **PASS** | Current URL: https://www.likhangkamay.app/dashboard |
| Phase 3 | 3.1 Seller Session Props [Component: Seller/Layout/Dashboard] | **PASS** | Matched expected component: Dashboard |
| Phase 3 | 3.1 Seller Session Props [Inertia Props] | **PASS** | Verified props [auth.user.email] present |
| Phase 3 | 3.2 Seller Dashboard Inertia Contract [Component: Seller/Layout/Dashboard] | **PASS** | Matched expected component: Dashboard |
| Phase 3 | 3.2 Seller Dashboard Load | **PASS** | Found 8 dashboard metric elements |
| Phase 3 | 3.3 Product Catalog Inertia Contract [Component: Seller/Catalog/ProductManager] | **PASS** | Matched expected component: Product |
| Phase 3 | 3.3 Product Catalog Inertia Contract [Inertia Props] | **PASS** | Verified props [products] present |
| Phase 3 | 3.3 Product Catalog Load | **PASS** | - |
| Phase 3 | 3.3 Create Product Action Present | **PASS** | - |
| Phase 3 | 3.3 Product Search & Filter Controls Available | **PASS** | Catalog search/filter input present: true |
| Phase 3 | 3.4 3D Asset Manager Endpoint & Contract | **PASS** | 3D Presign API HTTP status: 200 |
| Phase 3 | 3.5 Marketing Discounts Load | **PASS** | - |
| Phase 3 | 3.5b Temporary Voucher CRUD Created | **PASS** | Created voucher E2E479354 (ID: 2) |
| Phase 3 | 3.5b Temporary Voucher CRUD Deleted | **PASS** | Deleted temporary voucher ID: 2 |
| Phase 3 | 3.6 Sponsorships Page Load | **PASS** | - |
| Phase 3 | 3.7 Orders Fulfillment Load | **PASS** | - |
| Phase 3 | 3.7 Bulk Labels Action Present | **PASS** | Fulfillment queue controls and bulk actions verified |
| Phase 3 | 3.7b Delivery Route Preview Modal Rendered | **PASS** | Interactive Leaflet road route preview modal verified |
| Phase 3 | 3.8.1 B2B Supply Hub Catalog Load [Component: Seller/SupplyHub/Index] | **PASS** | Matched expected component: Seller/SupplyHub/Index |
| Phase 3 | 3.8.1 B2B Supply Hub Catalog Load [Inertia Props] | **PASS** | Verified props [supplies] present |
| Phase 3 | 3.8.1 B2B Supply Hub Load | **PASS** | - |
| Phase 3 | 3.8.2 B2B My Supplies Listings Load [Component: Seller/SupplyHub/MyListings] | **PASS** | Matched expected component: Seller/SupplyHub/MyListings |
| Phase 3 | 3.8.2 B2B My Supplies Listings Load [Inertia Props] | **PASS** | Verified props [products] present |
| Phase 3 | 3.8.2 B2B My Listings Load | **PASS** | - |
| Phase 3 | 3.8.3 B2B Sourcing Cart Load [Component: Seller/SupplyHub/Cart] | **PASS** | Matched expected component: Seller/SupplyHub/Cart |
| Phase 3 | 3.8.3 B2B Cart Load | **PASS** | - |
| Phase 3 | 3.8.4 B2B Sourcing Orders Load [Component: Seller/SupplyHub/SourcingOrders] | **PASS** | Matched expected component: Seller/SupplyHub/SourcingOrders |
| Phase 3 | 3.8.4 B2B Sourcing Orders Load [Inertia Props] | **PASS** | Verified props [orders] present |
| Phase 3 | 3.8.4 B2B Sourcing Orders Load | **PASS** | - |
| Phase 3 | 3.8.4 Sourcing Orders Filter Tab Click | **PASS** | Interactive status filter button clicked successfully |
| Phase 3 | 3.8.5 B2B Wholesale Sales Load [Component: Seller/SupplyHub/WholesaleSales] | **PASS** | Matched expected component: Seller/SupplyHub/WholesaleSales |
| Phase 3 | 3.8.5 B2B Wholesale Sales Load [Inertia Props] | **PASS** | Verified props [orders] present |
| Phase 3 | 3.8.5 B2B Wholesale Sales Load | **PASS** | - |
| Phase 3 | 3.8.5 Wholesale Sales Status Filter Tab Click | **PASS** | Status filter button clicked and state updated |
| Phase 3 | 3.8.5 Wholesale Pricing Accordion Button Click | **PASS** | Pricing breakdown accordion expanded on button click |
| Phase 3 | 3.8.5 Wholesale Timeline Accordion Button Click | **PASS** | Timeline events accordion toggled via button click |
| Phase 3 | 3.8.5 Wholesale Invoice Action Button Validated | **PASS** | Invoice button/link rendered on wholesale order card |
| Phase 3 | 3.8.6 Filter Toolbar Wheel Hitbox Isolation | **PASS** | Validated overscroll-contain and touch-pan-y on horizontal status toolbar container |
| Phase 3 | 3.9 ERP Procurement Load | **PASS** | - |
| Phase 3 | 3.9 Stock Requests Desk Load | **PASS** | - |
| Phase 3 | 3.10 ERP Accounting Load | **PASS** | - |
| Phase 3 | 3.10 Accounting Balance Cards Rendered | **PASS** | - |
| Phase 3 | 3.11 ERP HR & Attendance Load | **PASS** | - |
| Phase 3 | 3.11 Add Employee Action Present | **PASS** | Add employee button verified |
| Phase 3 | 3.11c Temporary Staff Seat Provisioning | **PASS** | Modal opened & provisioned Employee ID: 18 (Code: E2E-515546) |
| Phase 3 | 3.11c Temporary Staff Seat Teardown | **PASS** | Terminated and deleted temporary employee ID: 18 |
| Phase 3 | 3.11b ERP Payroll Desk Load | **PASS** | - |
| Phase 3 | 3.12 Seller Chat CRM Load | **PASS** | - |
| Phase 3 | 3.12 Seller Reviews Inertia Contract [Component: Seller/Chat/Reviews] | **PASS** | Matched expected component: Seller/Chat/Reviews |
| Phase 3 | 3.12 Seller Reviews Inertia Contract [Inertia Props] | **PASS** | Verified props [reviews, products] present |
| Phase 3 | 3.12 Seller Reviews Master-Detail Layout Present | **PASS** | - |
| Phase 3 | 3.12b Seller Customer Review Reply | **PASS** | Review #3 replied with HTTP status: 200 |
| Phase 3 | 3.12b Customer Review Lifecycle Clean Teardown | **PASS** | Review #3 reply and buyer review successfully deleted |
| Phase 3 | 3.13 Team Messages Load | **PASS** | - |
| Phase 3 | 3.14 Subscriptions Page Load | **PASS** | - |
| Phase 3 | 3.14 Shop Settings Page Load | **PASS** | - |
| Phase 3 | 3.14b Seller Global Settings Inertia Contract [Component: Seller/Settings/GlobalSettings] | **PASS** | Matched expected component: GlobalSettings |
| Phase 3 | 3.14b E-Wallet Disbursement Methods Rendered | **PASS** | GCash & Maya e-wallet payout controls verified |
| Phase 3 | 3.14b BIR Tax Profile Card Rendered | **PASS** | BIR Tax Profile and VAT registration card verified |
| Phase 3 | 3.14b Commercial Bank Transfers Deprecated & Absent | **PASS** | Commercial bank transfer options properly purged |
| Phase 3 | 3.15 Seller Audit Log Load | **PASS** | - |
| Phase 3 | 3.16 Artisan Help Center Persona Scoped | **PASS** | Allowed persona: artisan |
| Phase 3 | 3.16 Studio Help Center Title Rendered | **PASS** | Title: Artisan Help Center |
| Phase 3 | 3.16 Buyer Guide Tab Hidden for Artisan | **PASS** | - |
| Phase 3 | 3.16 Studio Orders Route Link Verified | **PASS** | Orders route: https://www.likhangkamay.app/orders |
| Phase 3 | 3.16 Artisan Merchant Desk Modal & Gmail Web Link | **PASS** | Direct Gmail compose link verified |
| Phase 3 | 3.17 Point of Sale (POS) Inertia Contract [Component: Seller/POS/Index] | **PASS** | Matched expected component: Seller/POS/Index |
| Phase 3 | 3.17 Point of Sale (POS) Inertia Contract [Inertia Props] | **PASS** | Verified props [products, categories] present |
| Phase 3 | 3.17 Point of Sale Desk Mounted | **PASS** | POS product grid, register toolbar, and ticket panel rendered |
| Phase 3 | 3.17 POS Walk-in Cart & Total Calculation | **PASS** | Item added to ticket: true, Total calculated: true (Total Due
₱1.00) |
| Phase 4 | 4.1 Staff Unauthenticated Gate Protection | **PASS** | Unauthenticated redirect URL: https://www.likhangkamay.app/login |
| Phase 4 | 4.2 Staff Member Authentication | **PASS** | Logged in URL: https://www.likhangkamay.app/staff/dashboard |
| Phase 4 | 4.3 Staff Dashboard Inertia Contract [Component: Staff/Dashboard] | **PASS** | Matched expected component: Staff/Dashboard |
| Phase 4 | 4.3 Staff Dashboard Inertia Contract [Inertia Props] | **PASS** | Verified props [hub] present |
| Phase 4 | 4.4 Staff Attendance Clock-In Controls | **PASS** | Attendance controls verified (Modal DOM interaction: true, Resume HTTP: 200) |
| Phase 4 | 4.5 Active Staff Heartbeat Ping | **PASS** | Heartbeat HTTP status: 200 |
| Phase 4 | 4.5b Staff Shift Clock-Out & Attendance Teardown | **PASS** | Shift closed and clocked out cleanly with HTTP status: 200 |
| Phase 4 | 4.6 Logistics Rider Authentication | **PASS** | Logged in URL: https://www.likhangkamay.app/staff/deliveries |
| Phase 4 | 4.7 Driver Deliveries Inertia Contract [Component: Staff/DriverDeliveries] | **PASS** | Matched expected component: Staff/DriverDeliveries |
| Phase 4 | 4.7 Driver Deliveries Inertia Contract [Inertia Props] | **PASS** | Verified props [activeDeliveries, completedToday, driverProfile] present |
| Phase 4 | 4.7b Driver Navigation & Telemetry Console Ready | **PASS** | In-house driver navigation and telemetry console state verified |
| Phase 5 | 5.1 SuperAdmin Authentication | **PASS** | URL: https://www.likhangkamay.app/admin/dashboard |
| Phase 5 | 5.2 Executive Dashboard Load | **PASS** | - |
| Phase 5 | 5.3 User Directory Inertia Contract [Component: Admin/Users/UserManager] | **PASS** | Matched expected component: Admin/Users/UserManager |
| Phase 5 | 5.3 User Directory Inertia Contract [Inertia Props] | **PASS** | Verified props [users] present |
| Phase 5 | 5.3 User Directory Active Interactions | **PASS** | User search executed: true, row inspected: true |
| Phase 5 | 5.4 Pending Artisans Desk Load | **PASS** | - |
| Phase 5 | 5.5 Catalog Moderation Inertia Contract [Component: Admin/Catalog/CatalogManager] | **PASS** | Matched expected component: Admin/Catalog/CatalogManager |
| Phase 5 | 5.5 Catalog Moderation Inertia Contract [Inertia Props] | **PASS** | Verified props [products] present |
| Phase 5 | 5.5 Catalog Moderation Active Desk Interactions | **PASS** | Moderation filter toggled: true, Product inspection card interacted: true |
| Phase 5 | 5.6 Disputes Arbitration Inertia Contract [Component: Admin/Disputes/DisputeEscalationDashboard] | **PASS** | Matched expected component: Admin/Disputes/DisputeEscalationDashboard |
| Phase 5 | 5.6 Disputes Arbitration Inertia Contract [Inertia Props] | **PASS** | Verified props [disputes] present |
| Phase 5 | 5.6 Disputes Arbitration Active Interactions | **PASS** | Category pill filter clicked: true, Dispute details/modal inspected: true |
| Phase 5 | 5.7 Compliance & Safety Desk Load | **PASS** | - |
| Phase 5 | 5.8 Payouts Manager Load | **PASS** | - |
| Phase 5 | 5.9 Email Studio Load | **PASS** | - |
| Phase 5 | 5.10 Platform Operations Load | **PASS** | - |
| Phase 5 | 5.11 Monetization Desk Load | **PASS** | - |
| Phase 5 | 5.12 Taxonomy Engine Load | **PASS** | - |
| Phase 5 | 5.13 System Settings Load | **PASS** | - |
| Phase 6 | 6.1 Serverless Warmup /ping | **PASS** | Status: 200, Body: "pong" |
| Phase 6 | 6.2 Presigned Direct Upload Endpoint | **PASS** | HTTP Status: 200 (Presigned direct URL received) |
| Phase 6 | 6.3 Universal Global Search API | **PASS** | Status: 200 |
| Phase 6 | 6.3b Reverse Geocoding API Contract | **PASS** | Status: 200, Within Cavite: true, City: "Silang" |
| Phase 6 | 6.4 Webhook Cron Security Guard | **PASS** | Unauthenticated cron returned HTTP 401 (Expected 401) |
| Phase 6 | 6.5 PayMongo GCash Sandbox Session Lifecycle | **PASS** | PayMongo GCash checkout session created, URL validated, and read-back verified in sandbox. |
| Phase 6 | 6.6 Lalamove Sandbox Quotation, Booking & Webhook Sync | **PASS** | Lalamove sandbox quotation calculated, order booked with ASSIGNING_DRIVER, and webhook transitioned to COMPLETED. |
| Phase 6 | 6.7 Client-Side File Payload Shield Contract (<4MB) | **PASS** | Found 2 DOM file inputs. Canvas photo compressed to 26.1KB (<4MB). Real 5.2MB DOM file input attachment rejected (Cleared: true, Toast: true). |
| Phase 7 | Layer 5 B2C Retail Commercial Pipeline Relay | **PASS** | Order #pow-e6c61bee-1396-443f-9176-0f8099bdb5a1 Completed. SHA-256: bdc6bc6c817c9f68... |
| Phase 8 | Layer 5 B2B Sourcing & Auto-Restock Pipeline | **FAIL** | Order #ORD-6AFE22322979B status is 'Shipped', expected 'Completed'. |
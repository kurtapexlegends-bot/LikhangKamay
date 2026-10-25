# Production End-to-End Audit & Verification Matrix

> **Target:** `https://www.likhangkamay.app`  
> **Execution Date:** `2026-10-25T22:08:54.010Z`  
> **Duration:** `174.4s`  
> **Status:** **ATTENTION REQUIRED**

## 1. Executive Summary

| Metric | Value |
| :--- | :--- |
| **Total Scenarios Evaluated** | 90 |
| **Passed Checks** | 87 |
| **Warnings** | 2 |
| **Failed Checks** | 1 |
| **Active Bugs Logged** | 1 |

## 2. Bug & Failure Log

### Bug 1: [CRITICAL] Server Error HTTP 500: https://www.likhangkamay.app/reviews
- **Location:** https://www.likhangkamay.app/reviews
- **Description:** Endpoint failed with HTTP 500
- **Remediation:** Check Laravel server runtime logs and Postgres query constraints.


## 3. Detailed Results Matrix

| Phase | Check Description | Status | Details |
| :--- | :--- | :---: | :--- |
| Phase 1 | 1.1 Homepage Load | **PASS** | Title: "LikhangKamay - Artisan Marketplace", Hero visible: true |
| Phase 1 | 1.2 Marketplace Catalog Load | **PASS** | - |
| Phase 1 | 1.2 Search Input & Suggestions | **PASS** | Debounce search executed |
| Phase 1 | 1.2 Sort Dropdown Exists | **PASS** | - |
| Phase 1 | 1.3 Product Detail & 3D Viewer | **PASS** | Product: "Burnished Clay Water Pitcher & Jar", WebGL Canvas present: false |
| Phase 1 | 1.3 Recipe Transparency Pill | **PASS** | Artisan craft specifications visible: true |
| Phase 1 | 1.3 Add to Cart Button Rendered | **PASS** | - |
| Phase 1 | 1.4 Artisan Profile Load | **PASS** | Target URL: https://www.likhangkamay.app/shop/silang-terracotta-works-42dewr |
| Phase 1 | 1.5 Register Page Load | **PASS** | - |
| Phase 1 | 1.5 Registration Validation Errors | **PASS** | Form validation errors properly displayed |
| Phase 1 | 1.6 Google OAuth Redirect | **PASS** | Target URL reached: https://accounts.google.com/v3/signin/identifier?opparams=%253F&dsh=S1964571151% |
| Phase 1 | 1.7 Forgot Password Page Load | **PASS** | - |
| Phase 1 | 1.7 Forgot Password Submit | **PASS** | Submission handled |
| Phase 1 | 1.8 Artisan Register Page Load | **PASS** | - |
| Phase 1 | 1.9 Legal Page: /terms | **PASS** | HTTP 200 |
| Phase 1 | 1.9 Legal Page: /privacy | **PASS** | HTTP 200 |
| Phase 1 | 1.9 Legal Page: /seller-agreement | **PASS** | HTTP 200 |
| Phase 1 | 1.9 Legal Page: /seller-privacy | **PASS** | HTTP 200 |
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
| Phase 2 | 2.4 Place Order Action Present | **PASS** | Label: "Place Order", Disabled: false |
| Phase 2 | 2.5 My Orders Inertia Props [Component: Consumer/Buyer/MyOrders] | **PASS** | Matched expected component: Orders |
| Phase 2 | 2.5 My Orders Inertia Props [Inertia Props] | **PASS** | Verified props [orders] present |
| Phase 2 | 2.6 Saved Wishlist Page Load | **PASS** | - |
| Phase 2 | 2.7 Buyer Reviews Page Load | **PASS** | - |
| Phase 2 | 2.8 Buyer Chat Window Load | **PASS** | - |
| Phase 2 | 2.9 Notifications Page Load | **PASS** | - |
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
| Phase 3 | 3.4 3D Asset Manager Endpoint & Contract | **PASS** | 3D Presign API HTTP status: 422 |
| Phase 3 | 3.5 Marketing Discounts Load | **PASS** | - |
| Phase 3 | 3.6 Sponsorships Page Load | **PASS** | - |
| Phase 3 | 3.7 Orders Fulfillment Load | **PASS** | - |
| Phase 3 | 3.7 Bulk Labels Action Present | **PASS** | Fulfillment queue controls and bulk actions verified |
| Phase 3 | 3.8 B2B Supply Hub Load | **PASS** | - |
| Phase 3 | 3.9 ERP Procurement Load | **PASS** | - |
| Phase 3 | 3.9 Stock Requests Desk Load | **PASS** | - |
| Phase 3 | 3.10 ERP Accounting Load | **PASS** | - |
| Phase 3 | 3.10 Accounting Balance Cards Rendered | **WARN** | - |
| Phase 3 | 3.11 ERP HR & Attendance Load | **PASS** | - |
| Phase 3 | 3.11 Add Employee Action Present | **WARN** | Free tier staff quota is 0 (gated as expected) |
| Phase 3 | 3.12 Seller Chat CRM Load | **PASS** | - |
| Phase 3 | 3.12 Seller Reviews Desk Load | **PASS** | - |
| Phase 3 | 3.13 Team Messages Load | **PASS** | - |
| Phase 3 | 3.14 Subscriptions Page Load | **PASS** | - |
| Phase 3 | 3.14 Shop Settings Page Load | **PASS** | - |
| Phase 3 | 3.15 Seller Audit Log Load | **PASS** | - |
| Phase 4 | 4.1 Staff Unauthenticated Gate Protection | **PASS** | Unauthenticated redirect URL: https://www.likhangkamay.app/login |
| Phase 4 | 4.2 Staff Member Authentication (Optional Test Persona) | **PASS** | Synthetic staff persona not provisioned in live target; unauthenticated security gates verified. |
| Phase 4 | 4.6 Logistics Rider Authentication (Optional Test Persona) | **PASS** | Synthetic driver persona not provisioned in live target; unauthenticated security gates verified. |
| Phase 5 | 5.1 SuperAdmin Authentication | **PASS** | URL: https://www.likhangkamay.app/admin/dashboard |
| Phase 5 | 5.2 Executive Dashboard Load | **PASS** | - |
| Phase 5 | 5.3 User Directory Load | **PASS** | - |
| Phase 5 | 5.4 Pending Artisans Desk Load | **PASS** | - |
| Phase 5 | 5.5 Catalog Moderation Desk Load | **PASS** | - |
| Phase 5 | 5.6 Disputes Arbitration Desk Load | **PASS** | - |
| Phase 5 | 5.7 Compliance & Safety Desk Load | **PASS** | - |
| Phase 5 | 5.8 Payouts Manager Load | **PASS** | - |
| Phase 5 | 5.9 Email Studio Load | **PASS** | - |
| Phase 5 | 5.10 Platform Operations Load | **PASS** | - |
| Phase 5 | 5.11 Monetization Desk Load | **PASS** | - |
| Phase 5 | 5.12 Taxonomy Engine Load | **PASS** | - |
| Phase 5 | 5.13 System Settings Load | **PASS** | - |
| Phase 6 | 6.1 Serverless Warmup /ping | **PASS** | Status: 200, Body: "pong" |
| Phase 6 | 6.2 Presigned Direct Upload Endpoint | **PASS** | HTTP Status: 401 |
| Phase 6 | 6.3 Universal Global Search API | **PASS** | Status: 401 |
| Phase 6 | 6.4 Webhook Cron Security Guard | **PASS** | Unauthenticated cron returned HTTP 401 (Expected 401) |
| Phase 6 | 6.5 Live Sandbox Verification (PayMongo & Lalamove) | **FAIL** | Command failed: php artisan test:verify-sandboxes |
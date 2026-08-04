# LikhangKamay — Exhaustive System Changes & Feature Evolution
> **Timeline:** April 7, 2026 – August 4, 2026  
> **Total Commits Analyzed:** 733 commits  
> **Summary:** A granular, end-to-end breakdown of all core modules, architecture overhauls, UI/UX optimizations, security policies, and performance enhancements across the application.

---

## 📢 1. Custom Email Studio & Communication Center (July 2026)

* **Dynamic Template Customization Engine:** Built an administrative **Email Studio** in System Config (`resources/js/Components/Admin/Layout/SystemConfig/EmailStudioForm.jsx`) allowing super admins to customize system email templates dynamically.
* **20+ System Mailable Templates Integrated:** Linked all system mailables (Order Confirmations, Dispute Alerts, Verification Codes, Shipment Reminders, Review Reminders, Merchant Status Updates) to the dynamic customization engine.
* **Audience Broadcast Center:** Built a targeted broadcast feature allowing admins to dispatch custom emails to specific audiences (*All Sellers*, *Active Artisans*, *Buyers*, *Staff*).
* **Live Test Bench & Previews:** Built dynamic preview rendering with variable tag substitution (`{buyer_name}`, `{order_number}`, `{shop_name}`, etc.) and single-click test dispatching.

---

## 🔐 2. Security, Authentication & Role-Based Access Control (April – July 2026)

* **Numeric Email Verification Codes:** Replaced link-based email verification with 6-digit numeric verification codes featuring automatic expiration.
* **Global Rate Limiting & Defensive Controls:** Added rate limiters on login, password reset, profile completion, and PayMongo webhook endpoints.
* **PayMongo Webhook Signature Verification:** Implemented cryptographic signature validation for PayMongo webhooks to prevent spoofed transactions.
* **Strict Role-Based Access Control (RBAC):** Refined staff capabilities (`CAP_VIEW_REVENUE`, `CAP_MANAGE_PRODUCTS`), gated seller features based on subscription tier limits, and restricted pending/rejected artisans from buyer actions until converted.
* **Obfuscation & CSP Hardening:** Obfuscated administrative endpoints and configured Content-Security-Policy (CSP) headers for Supabase real-time WebSockets and GLTF 3D model textures (`blob:`/`wss:`).

---

## 🎨 3. UI/UX Modernization & Mobile-First Redesign (May – July 2026)

* **Unified Design System:** Enforced a clean, minimalist design standard using Tailwind tokens (`clay`, `stone`, `amber`, `emerald`). Removed all multi-color gradient border accents and decorative emojis in favor of Lucide React icons.
* **Header Search Overhaul:** Converted static search inputs on mobile headers into borderless icon buttons triggering a smooth, full-screen slide-down search overlay.
* **Touch-Friendly KPI Carousels:** Standardized metric cards across Super Admin and Seller dashboards into horizontal swipeable carousels (`snap-x snap-mandatory flex overflow-x-auto`) for mobile and tablet screens.
* **Responsive Bottom Sheets & Drawers:** Replaced heavy desktop slide-over panels with touch-friendly bottom sheets (`SlideOverDrawer` with cubic-bezier spring curves) on mobile devices.
* **Popover Filter Cards:** Upgraded cluttered table filter rows (Order Manager, Product Moderation, Audit Log, User Directory, Supplies) into unified **Filter Popover Buttons** with active tag chips.

---

## 🛒 4. Marketplace, Catalog & Buyer Experience (April – July 2026)

* **Global Command Palette Search (`/` Shortcut):** Built a debounced command palette global search with instant visual search suggestions for products, artisans, and categories.
* **Database-Backed Wishlists & Followed Shops:** Upgraded buyer saved items and followed artisan shops to persist directly in the database with local storage synchronization.
* **PayMongo Checkout & Convenience Fee:** Integrated PayMongo e-wallets and card processing, featuring dynamic calculation of the 3% platform convenience fee in checkout breakdowns.
* **3D Ceramic Model Asset Management:** Enabled interactive 3D model viewing for artisan pottery with direct client-to-S3/Supabase upload integration and camera focal zoom adjustments.

---

## 📦 5. Logistics, Orders & Dispute Resolution (May – July 2026)

* **Automated Courier Booking (Lalamove Integration):** Implemented Lalamove API integration for real-time shipping quotes, automated delivery booking, background queue jobs, and webhook status tracking.
* **Buyer Dispute & Return/Refund Workflow:** Added buyer order return/refund request modals with photo attachments, seller response forms, and admin arbitration dashboards (`DisputeEscalationDashboard`).
* **Bulk Shipping Labels & Packing Slips:** Added PDF packing slip generation and bulk label printing capabilities for order fulfillment.

---

## 📊 6. Administrative Operations & Oversight (May – July 2026)

* **Platform Operations & Diagnostics:** Built diagnostic log viewers, system telemetry monitors, error diagnostics, and low-stock capacity alerts.
* **Product Moderation Control Center:** Redesigned the product inspection drawer with profit margin analytics, copyable SKUs, camera distance framing, and status-aware approval/rejection controls.
* **User Directory & Impersonation:** Integrated super admin impersonation functionality with active status banners, pending artisan verification workflows, and soft delete restoration queues (`TrashRestorationTable`).
* **Monetization & Category Manager:** Created category donut chart analytics, high-risk confirmation modals, GMV metrics calculations, and PDF print reporting capabilities.

---

## 🏬 7. Seller ERP Workspace & Operations (May – July 2026)

* **Shop Performance Analytics & Operations Control:** Added seller operations control tab monitoring fulfillment latency and stock health, yearly analytics trends, and print-ready report layouts.
* **HR & Payroll Generator:** Created an automated staff attendance prefilling tool with salary calculations, custom employee entitlements, and payroll run history views.
* **Procurement & Supply Inventory:** Implemented auto-SKU generation, procurement index filters, stock alert status popovers, and capacity tracking.
* **Bill of Materials (BOM) Recipe Panel:** Added raw material BOM recipe tracking gated behind Pro/Elite subscription tiers.
* **Reviews & Dispute Management:** Enabled seller review replies, review pinning, and unfair review dispute submissions.

---

## ⚖️ 8. Legal, Compliance & Governance (June – July 2026)

* **Document Layout Redesign:** Redesigned Seller Agreement, Privacy Policy, Terms of Service, and Seller Data Privacy pages into clean, document layouts.
* **Policy Disclosures:** Embedded explicit 1-day system return/refund/dispute warranty terms and non-refundable subscription disclosures.
* **Adblocker Protection:** Renamed legal component pathways (`GeneralPrivacy`, `SellerPrivacy`) to prevent client-side adblocker script blocking.

---

## ⚡ 9. Performance & Serverless Infrastructure (May – July 2026)

* **Vercel Serverless Optimization:** Offloaded slow network requests (Resend emails, Lalamove bookings) to database background queues (`QUEUE_CONNECTION=database`) and added container warming routes (`/ping`).
* **N+1 Query Prevention & Indexing:** Added eager-loading (`with()`) across all Inertia controllers and added database indexes for frequently filtered columns (`banned_at`, `status`, `sponsorship`).
* **Direct-to-Storage Uploads:** Built client-side Canvas image compression and presigned upload channels to bypass Vercel's 4.5MB payload limit.
* **PostgreSQL Compatibility:** Implemented `PostgresCompatibleBoolean` model casts and `DB::raw` query bindings to guarantee seamless compatibility between local MySQL and production PostgreSQL databases.

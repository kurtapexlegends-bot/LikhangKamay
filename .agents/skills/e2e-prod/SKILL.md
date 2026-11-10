---
name: e2e-prod
description: >-
  Execute live end-to-end browser automation against production, validating Inertia props, intercepting console/runtime errors, benchmarking Vercel limits, and generating Obsidian documentation.
---

# Production End-to-End Test & Verification Suite (`/e2e-prod`)

## 1. Safety, Test Personas & Circuit Breakers
- **Live Environment Awareness:** Tests execute against live production (`https://www.likhangkamay.app`) or local staging (`http://127.0.0.1:8000`).
- **5 Synthetic Personas (`is_test = true`):**
  - Admin: `test.admin@likhangkamay.local`
  - Artisan: `test.artisan@likhangkamay.local` (Cavite workshop with ₱1 synthetic item)
  - Buyer: `test.buyer@likhangkamay.local` (Cavite resident with delivery address)
  - HR & Operations Staff: `test.staff@likhangkamay.local`
  - In-House Logistics Rider: `test.driver@likhangkamay.local`
- **Seed Command:** `php artisan test:seed-personas` (idempotent, safe on both local and production).
- **Circuit Breakers & Financial Safety:** All orders, deliveries, and payrolls initiated by synthetic test users are tagged `is_test = true`. They bypass real PayMongo charges (using COD or test gateway), skip live Lalamove courier dispatch, and are excluded from real artisan accounting balances (`where('is_test', false)`).
- **Non-Destructive Execution:** Zero data wipes or permanent deletions. Emits structured test metrics, HTTP status codes, and browser console stack traces.
- **Deterministic Anti-Hallucination & Anti-Cheating Guardrails (Banned Replay Attacks & Banned API Shortcuts):**
  - **Mandatory Real-Time Execution:** The agent is STRICTLY FORBIDDEN from reporting E2E test results by merely reading an existing `audit_results.json` from disk. You MUST execute both `node tests/e2e/production_audit/run_all.mjs` and `node tests/e2e/production_audit/live_transaction_pipeline.mjs` via `run_command` in the current turn and await completion before clearance.
  - **Freshness Proof (Timestamp Validation):** The output report MUST cite the `timestamp` field from the freshly emitted `audit_results.json`. The timestamp must be within the last 5 minutes of the current invocation. Reading a stale timestamp from a prior commit is considered a falsified test.
  - **Strict UI-Only Clicks (No Raw `fetch` / `axios` Shortcuts):** All business flows (Disputes, Returns, Order Accept, Dispatch, Deliver, Receive, Approvals, Fund Release) must be triggered by locating and clicking rendered DOM buttons and completing active modals. Bypassing UI via console `fetch()` or `window.axios` is permanently banned.
  - **Real Defense Asset Uploads (No Canvas / 1x1 Dummies):** All file inputs must bind real assets from `tests/fixtures/defense_assets/` (e.g. `Proof of Delivery (POD).jpg`, `Product/Blue Feather Vase/Blue Feather Vase.glb`, `products_sample.csv`). Canvas blob forging is banned.
  - **Deterministic Test Email & Attendance Verification:** Fresh test accounts (`@likhangkamay.local` or `is_test = true`) verify instantly with code `000000` on `/verify-email`. Staff and driver attendance clock-in modals accept `000000` for Email Security Code fallback, and `allow_remote_clock_in` avoids geofence blockages for drivers.
  - **Neon PostgreSQL Enum Constraint Parity:** Legacy status check constraints (`stock_requests_status_check` and `sponsorship_requests_status_check`) are permanently dropped via migration `2026_11_09_092000`. Full lifecycle statuses (`accounting_approved`, `ordered`, `partially_received`, `expired`) are valid on both MySQL and PostgreSQL.
  - **Terminal Exit Code Assertion:** The agent must explicitly check and state the process exit code (`Command exited with code 0`). Any process timeout, uncaught node exception, or crash must be reported as a failure, never masked as clean.

---

## 2. The 6-Phase End-to-End Execution Pipeline

### Phase 1: Guest Visitor & Visual Quality Experience
- Navigates `/`, `/shop`, `/categories`, and Product Detail pages.
- Validates 3D WebGL Canvas loading and graceful fallback states.
- Audits DOM for anti-AI slop (gradient card borders), engineering jargon, and decorative emojis.
- Asserts that all public pages return HTTP 200 without React hydration crashes.

### Phase 2: Registered Buyer Journey & Inertia Checkout
- Authenticates with buyer credentials (`ACCOUNTS.buyer`).
- Tests Cart operations: item increment/decrement, item removal, subtotal computation.
- Tests Address Book loading and structured Cavite address form validation.
- Navigates to `/checkout`, asserting that asynchronous shipping quote calculations resolve without swallowing 422 errors or locking buttons in infinite spinners.
- Validates workshop pickup checkout, verifying support for instant online prepayment (GCash/Maya) alongside Cash on Pickup with 4-digit PIN verification.
- Validates Philippine BIR 12% VAT-inclusive pricing disclosures on checkout summary.
- Validates that Inertia shared props (`auth`, `cart`, `flash`) are intact.
- Audits My Orders management, live courier tracking map contracts (`/my-orders/{id}/route-preview`), and verified BIR Computerized Sales Invoice printable HTML generation (`/my-orders/{id}/receipt`, returning `view('pdf.receipt')`).
- Audits My Reviews management portal (`/my-reviews`), verifying visual parity with My Orders, sidebar artisan replies feed, content safety moderation badges (`Public Review`, `Under Moderation Review`, `Passed Safety Review`, `Hidden from Storefront`), review edit modal (`PATCH /reviews/{id}`), review deletion (`DELETE /reviews/{id}`), and notification deep-linking (`/my-reviews?review={id}`).
- Audits Buyer User Menu and navigation bar controls: profile modal navigation (`[Profile]` with User icon), reviews portal shortcut (`[My Reviews]` with Star icon), dynamic email verification status pill (`Security: Verified` in emerald or `Unverified` in amber), and cart persistence hygiene (clearing guest session carts upon checkout/login).
- Audits Notification Dropdown: Facebook-style dual-layer in-dropdown pagination (10 notifications limit before displaying `See previous notifications` trigger), dynamic cursor pagination within popover, filter pills (`All`, `Unread`, contextual tabs), and non-intrusive full-page routing preserved for mobile viewports (`/notifications`).

### Phase 3: Artisan / Seller Studio Operations & Procurement Loop
- Authenticates with seller credentials (`ACCOUNTS.seller`).
- Validates Seller Dashboard loading, workshop pickup schedule configuration, and order management.
- Tests direct S3/R2 presigned upload endpoint (`/api/uploads/presign`) to verify heavy 3D GLB assets (>4.5MB) bypass Vercel serverless payload limits.
- **B2B Supply Hub Wholesale Ecosystem (`/supply-hub`):** Audits raw material wholesale listing (`/supply-hub/my-listings`), MOQ guardrail constraints (blocking < MOQ), B2B sourcing cart (`/supply-hub/cart`), B2B procurement checkout (`/supply-hub/checkout`), inbound sourcing order tracking with buyer delivery confirmation (`/supply-hub/orders`), and B2B wholesale sales management (`/supply-hub/sales`) with status progression (`Needs Decision`, `Accepted`, `In Production / Packing`, `In Transit`), Lalamove courier dispatching with resolved recipient fallbacks and Cavite centroid geocoding, expandable Pricing & Timeline accordions, printable wholesale invoice generation (`/supply-hub/sales/{id}/invoice`), and complete horizontal scroll hitbox isolation on status toolbar containers.
- **Full Supply Procurement Loop (`/procurement`):** Audits staff supply restock request (`POST /procurement/supplies/{id}/request`), PO marked ordered (`POST /procurement/stock-requests/{id}/ordered`), inward goods receiving with stock increments (`POST /procurement/stock-requests/{id}/receive`), and accounting maker-checker stock request rejection (`POST /accounting/reject/{stockRequest}`).
- **Catalog Lifecycle & Product Controls:** Audits SKU archive (`POST /products/{id}/archive`), reactivation (`POST /products/{id}/activate`), and bulk visibility toggling (`POST /products/bulk-status`).
- **Dispute Counter-Rebuttal & Review Disputes:**
  - Audits seller response to active buyer disputes (`POST /disputes/{id}/respond`) with packaging defense proof and rejection/replacement choices.
  - Audits customer review disputes (`POST /reviews/{id}/dispute`) on defamatory/unfair grounds.
- **Tax Profile & Workshop Locations:**
  - Configures GCash/Maya payout mobile numbers (`POST /seller/settings/payout`) and BIR TIN / VAT registration status (`POST /seller/settings/tax`).
  - Audits Philippine statutory deductions toggle (`enable_statutory_deductions`) and interactive Live Wage Simulator (`/shop/settings?tab=payroll`).
  - Audits secondary workshop locations (`/shop-locations`) with Cavite GPS geofencing toggles (`enforce_strict_geofence: true`).
  - Audits monthly BIR 2307 withholding settlement statement export (`GET /accounting/settlement/export`).
- Audits Accounting ledger, FundMetrics KPI cards, statutory summary banner in pending payroll review drawers, and CSV ledger export with employer contribution liabilities.
- Audits Orders Fulfillment Center, bulk label controls, and interactive road route previews (`/orders/{id}/route-preview`) with Nominatim geocoding & Leaflet road routing.
- Audits HR & People portal, including Staff Directory, Employee Form Modal, attendance heatmaps, real-time statutory deduction calculation inspector, and the Payroll Run Show desk (`hr.payroll.show`).
- Validates Customer Reviews desk master-detail layout (`/reviews`) and team messaging.

### Phase 4: Staff Attendance, Provisioning & In-House Logistics
- Authenticates with staff credentials (`ACCOUNTS.staff`).
- Tests Time Card loading and Attendance clock-in modal with camera face check initialization and PIN fallback (`0000`).
- **Off-Site Attendance Flagging & HR Override:** Simulates off-site clock-in coordinates outside Cavite bounds (`is_flagged = true`), verifying that HR receives flagged attendance and can execute override approvals (`POST /hr/attendance-sessions/{id}/approve`).
- **Staff Provisioning Lifecycle & Granular Matrix:** Validates artisan provisioning of apprentice staff accounts (`test.apprentice.lk@gmail.com`) with custom permissions matrix (orders, products, hr), account suspension toggle, and clean seat termination (`DELETE /hr/employees/{id}`) to prevent production seat leaks.
- **Payroll Maker-Checker Rejection Loop:** Tests accountant rejection of draft payroll run batches (`POST /accounting/payroll/{payroll}/reject`) with revision remarks, before HR resubmission and final accounting approval (`POST /accounting/payroll/{payroll}/approve`).
- Validates Driver Logistics dispatch console (`/staff/driver-deliveries` or `/staff/deliveries`), verifying background real-time sync (`activeDeliveries`, `completedToday`) via `useRealtime`, turn-by-turn navigation route modal, real-time GPS telemetry broadcast hook, and delivery transitions. For in-house studio driver deliveries, asserts customer-paid delivery fee is credited to artisan payout balance upon POD completion (`IN_HOUSE_SHIPPING_CREDITED`). Attendance clock-ins and POD completions strictly require native file uploads with real defense image assets (banning 1x1 base64 dummy pixels).
- Asserts that staff/driver test personas authenticate cleanly; any failure to authenticate triggers a hard `FAIL` and halts clearance with exit code 1.

### Phase 5: Super Admin Platform Governance & Moderation
- Authenticates with super admin credentials (`ACCOUNTS.admin`).
- Tests Catalog Approval queues, user role assignment tables, and Dispute Escalation arbitration dashboard.
- **Counter-Evidence Dispute Arbitration:** Arbitrates buyer disputes evaluating both buyer damage evidence and seller packaging rebuttal, with plain-language action labels (`Approve Full Refund`, `50% Partial Refund`, `Decline Claim (Pay Shop)`). For 50% partial refunds, asserts order transitions to `Completed` with `payment_status = 'partially_refunded'` and seller retains 50% net split in accounting revenue.
- **Content Safety & Customer Review Moderation Desk:** Navigates to `/admin/compliance`, asserts empty state displays when no ticket is selected (zero ghost auto-selection), evaluates disputed customer reviews, and executes uphold/dismiss actions (`PATCH /admin/review-moderation/{id}`).
- **Catalog Moderation Queue Takedown:** Tests direct listing takedown (`POST /admin/moderation-queue/{id}/takedown`) from the moderation queue.
- **Transactional Email Studio:** Tests dynamic email template inspection (`/admin/settings/email-templates`), token replacement (`{{buyer_name}}`, `{{order_number}}`), and live test email dispatch (`POST /admin/settings/email-templates/dispatch`).
- Verifies Role-Based Access Control (RBAC): asserts non-admin sessions attempting to access `/admin` receive HTTP 403 or redirect.

### Phase 6: Vercel Serverless Limits, Edge Diagnostics & Live Sandboxes
- **Serverless Cold Start / Warmup:** Pings `/ping` to measure container response latency (<500ms target).
- **Reverse Geocoding Endpoint Contract (`/api/geocode/reverse`):** Verifies Cavite coordinate resolution and boundary detection without CSRF bottlenecks or 500 crashes.
- **Aggregate 4.5MB Edge Guard:** Asserts that multi-file forms and single-file inputs enforce client-side size guards (<4.5MB) before transmission to protect Vercel edge gateways against HTTP 413.
- **Webhook Security:** Queries `/webhooks/cron` without authentication, asserting it returns HTTP 401.
- **Live PayMongo GCash Sandbox:** Verifies checkout session creation (`cs_...`), hosted URL generation, and session retrieval with `sk_test_...`.
- **Live Lalamove Sandbox Lifecycle:** Computes real Cavite motorcycle quotation (`rest.sandbox.lalamove.com`), books order in `ASSIGNING_DRIVER` status, and verifies inbound signed webhook processing transitioning delivery to `COMPLETED` (with 60s timeout headroom).
- **Sandbox Test Tool:** `php artisan test:verify-sandboxes`.

### Layer 5: Live Multi-Persona Transaction Pipeline (Uncheatable Proof-of-Work)
- **Live Browser Persona Automation:** Runs `node tests/e2e/production_audit/live_transaction_pipeline.mjs` across real browser sessions.
- **Cross-Persona Order Lifecycle:**
  1. **Buyer Order Placement via Real DOM Interaction:** Authenticates buyer (`ACCOUNTS.buyer`), loads product catalog, verifies initial inventory stock, navigates to the checkout interface (`/checkout`), asserts that form fields render properly, interacts with the DOM by typing delivery/address details into input fields using Puppeteer, and clicks the actual React `Place Order` button (`button[type="submit"]`), verifying the full Inertia `useForm` lifecycle rather than sending raw `window.axios` requests.
  2. **Inventory Stock Decrement Assertion:** Directly queries and asserts that database product stock decremented by exactly 1 (`initialStock -> initialStock - 1`).
  3. **Seller Order Acceptance:** Authenticates seller (`ACCOUNTS.seller`), loads workshop Orders desk, and accepts order for fulfillment.
  4. **Driver Dispatch & GPS Telemetry:** Authenticates logistics rider (`ACCOUNTS.driver`), claims delivery on `/staff/deliveries`, broadcasts live GPS coordinates via reverse geocoded telemetry hook, and transitions delivery to `delivered`.
  5. **Buyer Confirmation & BIR Sales Invoice Hash:** Authenticates buyer, confirms receipt, triggers BIR 12% sales invoice printable HTML generation (`/my-orders/{id}/receipt`, returning `view('pdf.receipt')`), and computes SHA-256 hash of the generated HTML document.
- **Cryptographic Proof-of-Work Run Manifest:** Emits a timestamped run manifest (`tests/e2e/production_audit/manifests/pow_manifest_*.json`) logging real DB order ID, item slug, initial/final stock, delivery tracking ID, and invoice printable HTML SHA-256 hash.

---

## 3. Automation Scripts & Tools

Executing both master E2E test runners sequentially is MANDATORY before clearance:

```powershell
# 1. Run 6-Phase Synthetic Persona Audit against live production or staging
node tests/e2e/production_audit/run_all.mjs

# 2. Run Layer 5 Live Multi-Persona Transaction Pipeline (Proof-of-Work)
node tests/e2e/production_audit/live_transaction_pipeline.mjs

# Dedicated Feature Verification Tests:
php artisan test --filter=AnalyticsTestOrderIsolationTest
php artisan test --filter=LiveTransactionFlowTest
```

---

## 4. Automated Documentation & Second Brain Sync

Upon test completion, the suite automatically:
1. Emits raw telemetry and network logs to [`tests/e2e/production_audit/audit_results.json`](file:///c:/laragon/www/LikhangKamay/tests/e2e/production_audit/audit_results.json).
2. Emits cryptographic Proof-of-Work Run Manifest to [`tests/e2e/production_audit/manifests/pow_manifest_*.json`](file:///c:/laragon/www/LikhangKamay/tests/e2e/production_audit/manifests/).
3. Generates an executive Markdown report and results matrix at [`docs/architecture/e2e-production-audit.md`](file:///c:/laragon/www/LikhangKamay/docs/architecture/e2e-production-audit.md).
4. Verifies that all tested routes are mapped in the Obsidian Second Brain registry ([`docs/index.md`](file:///c:/laragon/www/LikhangKamay/docs/index.md)).

---

## 5. Expected Output Specification

Return a concise **Production End-to-End Verification Report**:

```markdown
# Production E2E Verification Report (/e2e-prod)

- **Target URL**: https://www.likhangkamay.app
- **Execution Timestamp**: [Exact ISO 8601 timestamp from fresh audit_results.json]
- **Terminal Exit Code**: 0 [Verified via run_command]
- **Execution Duration**: [X]s
- **Total Scenarios Evaluated**: [N]
- **Passed**: [N] | **Warnings**: 0 (Banned / Hard Fail) | **Failed**: [N]

### Layer 5 Proof-of-Work Run Manifest
- **Manifest File**: tests/e2e/production_audit/manifests/pow_manifest_*.json
- **Order ID**: [ID] (is_test: true)
- **Stock Decrement**: [Initial Stock] -> [Final Stock] (-1 verified)
- **Delivery ID**: [ID] (Transitioned to delivered)
- **BIR Invoice (Printable HTML) SHA-256**: [Hash]

### Critical Findings & Bugs Logged
[List of any fatal page errors, unhandled promise rejections, HTTP 500/422 responses, or "Zero bugs found"]

### Artifacts & Documentation
- Raw Telemetry: tests/e2e/production_audit/audit_results.json
- Proof-of-Work Manifest: tests/e2e/production_audit/manifests/
- Obsidian Documentation: docs/architecture/e2e-production-audit.md
```

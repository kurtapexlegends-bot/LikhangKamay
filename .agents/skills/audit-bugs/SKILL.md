---
name: audit-bugs
description: >-
  System-wide audit for functional logic bugs, concurrency races, memory leaks, silent error swallowing, and dual-environment runtime traps (local vs. prod).
---

# System-Wide Functional & Runtime Bug Audit Workflow (`/audit-bugs`)

## 1. Safety & Context Verification
- **Read-Only Audit:** Under no circumstances should this workflow modify, create, or delete application source code files during inspection.
- **Deterministic Proof-of-Work (Banned Naked "PASS"):**
  - The agent is PERMANENTLY BANNED from declaring any bug inspection domain or vector as `PASS` without executing the corresponding terminal inspection command (`git grep`, `Select-String`, AST check) and validating that the output returned zero violations.
  - If a vector was not actively queried with an executed tool command or targeted file read in the active session, it CANNOT be marked clean—it must be marked as `UNAUDITED`.
  - For every verified area or claim of clean status, the agent must quote 1–2 representative lines of code and provide a clickable line-range link (`[FileName.php#L10-L15](file:///...)`) proving that the required safeguard, null check, lock, or error handler is actively present.
  - Banned Hand-Waving: Generic statements like *"I scanned all hooks and all errors are handled"* without showing the exact grep command and terminal output are strictly forbidden.
- **Scope Discipline:** This audit covers the **entire platform** (Consumer, Seller, Admin, Driver/Logistics, HR/Staff, Real-Time Comms, Catalog), not just single features.
- **Dual-Environment Parity (Production Primacy):** Actively hunt for bugs that pass silently in local development (Laragon MySQL :3306 / local PHP-FPM / single-user sandbox) but crash, deadlock, or trap users in production (Vercel Serverless + Neon PostgreSQL + Cloudflare R2 + Supabase Real-Time).

---

## 2. System-Wide Bug Inspection Vectors

### Vector 1: Silent Failures, Swallowed Errors & UX Freezes
Scan all asynchronous operations, API hooks, and form controllers across the system for code that leaves users trapped in unresponsive states:
1. **Swallowed Catch Blocks in Frontend Hooks & Actions:**
   - Scan React custom hooks and services across all modules for `catch (error) {}` blocks that discard error payloads without extracting `error.response?.data?.message` or `errors`.
   - Flag any button or workflow where an error sets a generic `status: 'error'` or stays in a loading state without rendering actionable user feedback, trapping the user behind disabled buttons.
2. **Missing Validation Feedback & Early Server Aborts:**
   - Scan Form Requests and Controller actions for raw `abort(500)` or unhandled exceptions that bypass structured JSON validation.
   - Verify that client-side forms receive and display field-level validation errors rather than generic, silent failures.
3. **External Service Resilience & Logistics Pre-Flights:**
   - Scan third-party integrations (PayMongo, Lalamove, Nominatim, Resend) across orders, payments, logistics, and notifications.
   - Verify all external HTTP calls enforce strict timeouts (3–5s) and provide safe fallback responses instead of causing unhandled 500 server crashes.
   - Verify logistics booking services (`OrderLogisticsService.php`, `OrderWorkflowHelper.php`) execute defensive pre-flight validation with fallback resolution (`Order::getResolvedRecipientName()`, `Order::getResolvedContactPhone()`), preventing courier dispatch crashes on legacy orders or missing address book fields.
   - Verify geocoding services (`AddressGeocodingService.php`) provide municipality centroid fallbacks (`CaviteAddress::findCaviteCityInAddress()`) for unindexed Cavite subdivisions, ensuring courier quotations and route previews never fail on missing OSM nodes, while enforcing non-zero distance (`CourierAddressResolver::isSameCourierLocation()`, min 100m) to prevent Lalamove HTTP 422 rejections when both stops resolve to the same centroid.
4. **Client-Side Aggregate 4.5MB Payload Shield & Image Compression:**
   - Scan every `<input type="file">` and multi-file form (disputes, returns, product media, legal docs).
   - Verify forms calculate cumulative byte size across all attached raw `File` instances (<4MB total aggregate) before invoking Inertia `post()` to prevent edge gateway HTTP 413 drops that crash silently without Inertia error handling.
   - Verify image files use `URL.createObjectURL(file)` with `URL.revokeObjectURL(url)` instead of massive base64 `readAsDataURL` strings that crash mobile memory.

### Vector 2: Data Lifecycle, Soft-Deletes & Orphaned Entity Traps
Audit all domain models and queries for crashes caused by missing, deactivated, or soft-deleted relationships:
1. **Soft-Deleted Entity Access Across All Modules:**
   - Audit critical flows across Consumer (`Cart`, `Checkout`, `Orders`, `Reviews`), Seller (`Catalog`, `Accounting`, `Payouts`), Admin (`Disputes`, `Approvals`), and Logistics (`DriverDeliveries`).
   - Verify queries accessing referenced users, artisans, products, or drivers utilize `->withTrashed()` where historical continuity is required.
   - Ensure soft-deleted or unapproved entities do not trigger fatal `TypeError` 500 exceptions in downstream services.
2. **Unguarded Null Traversal:**
   - Scan controllers, services, and Blade/Inertia props for chained object access (`$order->seller->shop_name`, `$delivery->driver->phone`) without null-safe operators (`?->`) or null checks.
3. **Foreign Key Integrity & Deletion Hazards:**
   - Verify model deletion routines clean up or nullify dependent relationships rather than leaving orphaned records that crash analytical rollups or detail pages.
4. **Content Safety Moderation & Takedown Exclusions:**
   - Scan public catalog, product reviews, and artisan rating aggregates across `ProductReviewService`, `BuyerReviewsController`, and `HomepageMerchandisingService`.
   - Verify public queries strictly filter out reviews flagged as hidden (`where('is_hidden', false)` or `where('moderation_status', 'approved')`), preventing toxic or under-moderation content from leaking to public storefronts or corrupting average star ratings.

### Vector 3: Concurrency, Race Conditions & Transaction Integrity
Audit mutations for multi-user race conditions and partial state writes:
1. **Pessimistic Locking on Shared Resources:**
   - Scan inventory deduction, voucher redemption, driver assignment, and slot booking routines.
   - Flag read-and-update patterns that lack `lockForUpdate()` or atomic operations (e.g. `decrement('stock', $qty)`), which allow double-spending or overselling under concurrent requests.
2. **Atomic `DB::transaction()` Wrapping:**
   - Scan all mutating controller actions and domain services handling multi-table updates (e.g., Order creation + stock deduction + ledger credit, or Payroll approval + payout generation + attendance status).
   - Ensure any operation updating more than one table is wrapped inside `DB::transaction()`.
3. **Double-Submit Prevention:**
   - Verify that submit buttons on all mutating forms across Consumer, Seller, Admin, and HR interfaces enforce `disabled={form.processing}` or loading state locks to prevent duplicate submissions.
4. **Financial Unit Precision:**
   - Check payment, refund, commission, and payout computations for centavo-to-peso conversion mismatches (e.g. passing integer pesos to gateways expecting centavos).
5. **Division-by-Zero Guards in Payroll & Financial Formulas:**
   - Scan arithmetic division operations in domain finance, accounting, and payroll services (e.g. `$salary / $days`, hourly rates, discount percentages).
   - Ensure all denominators enforce strict `> 0` checks or ternary fallback defaults (`$days > 0 ? ... : 0`) to prevent fatal PHP `DivisionByZeroError` (500) during batch computations.
6. **Philippine BIR VAT Engine & E-Wallet Payout Discipline:**
   - Scan `OrderFinanceService` and order placement logic: verify 12% inclusive VAT calculations (`$subtotal - ($subtotal / 1.12)`) never produce negative tax portions and non-VAT orders properly route 100% of merchandise to `vat_exempt_sales`.
   - Verify payout disbursement actions and forms strictly enforce Philippine mobile format (`09XXXXXXXXX`) for GCash & Maya, and reject deprecated commercial bank fields (`bank_name`, `account_number`).
7. **Geographic Boundary & Coordinate Edge Cases:**
   - Scan reverse-geocoding, address parsing, and coordinate handlers (`ReverseGeocodeRequest`, `AddressGeocodingService`, `CaviteAddress`).
   - Verify out-of-province coordinates, Null Island (`0,0`), border locations (Laguna/Batangas), and non-standard OSM admin levels resolve safely to `is_within_cavite: false` with fallback municipal bounds rather than throwing unhandled `TypeError` or 500 exceptions.

8. **Synthetic Test Data & Analytics Isolation (`is_test`):**
   - Scan analytics, GMV, revenue, and order metrics across `app/Services/Analytics/`, `app/Services/Admin/`, and scheduled snapshot commands (`GenerateAnalyticsSnapshots`).
   - Verify every query calculating gross merchandise value (GMV), completed order counts, merchant payouts, or conversion rates explicitly filters `where('is_test', false)`.
   - Prevent synthetic E2E audit orders from contaminating real merchant balances, platform sales rollups, or financial charts.
9. **Payment Verification Reconciliation of Cancelled Orders:**
   - Scan payment verification commands (`VerifyPaymongoPayments`) and webhook handlers.
   - Verify that if PayMongo confirms payment on an order already marked as `Cancelled` (`status === Order::STATUS_CANCELLED`), the system does not silently discard it or leave the customer charged with cancelled resold items. It must update `payment_status` to `'paid'`, record the payment ID, and flag/log for administrator/artisan review (or set a note/dispute flag) for manual reconciliation and customer refund.
10. **Cashless Click & Collect (Workshop Pick-up) & PIN Verification:**
    - Scan pickup order placement and fulfillment flows in `PlaceOrder.php` and `UpdateOrderStatus.php`.
    - Verify orders with `shipping_method === 'Pick Up'` that choose online payment (`GCash`/`Maya`) correctly generate a secure 4-digit pickup PIN (`pickup_pin`), retain cashless status upon creation, and validate against workshop lead-time schedules (`maxLeadTime`) before finalizing the order.

### Vector 4: Real-Time Lifecycle, Subscriptions & Memory Leaks
Audit the frontend React application for memory leaks, zombie listeners, and unhandled connection drops:
1. **Supabase & Echo Channel Cleanup:**
   - Scan all components using Supabase Real-Time (`@supabase/supabase-js`) or Laravel Echo (`resources/js/Pages/Chat`, `SellerHeader`, `BuyerNavbar`, `DriverDeliveries`).
   - Verify every subscription declared in `useEffect` returns a cleanup function calling `supabase.removeChannel(channel)` or `echo.leave(channel)`.
2. **Timer, Interval & Event Listener Teardown:**
   - Scan `useEffect` hooks across all pages for `setInterval`, `setTimeout`, or `window.addEventListener` calls. Verify all timers and window listeners are explicitly cleared on component unmount.
3. **Infinite Re-render Loops & Unstable Dependencies:**
   - Check `useEffect` and `useCallback` dependency arrays for unmemoized object or array literals that trigger continuous re-render cascades.
4. **Camera MediaStream & Geolocation Watcher Teardown:**
   - Scan components accessing mobile hardware or streaming APIs (`navigator.geolocation.watchPosition` in `DriverDeliveries.jsx` and `navigator.mediaDevices.getUserMedia` in attendance/liveness modals).
   - Verify every GPS watcher calls `navigator.geolocation.clearWatch(watchId)` on unmount.
   - Verify every camera stream calls `stream.getTracks().forEach(track => track.stop())` on component unmount or modal close to prevent browser webcam/GPS lockups.

### Vector 5: Inertia SPA Contract & Parameter Mismatches
Audit the interface between Laravel backend controllers and React Inertia frontend components:
1. **Unguarded `usePage().props` Destructuring:**
   - Scan React pages under `resources/js/Pages/` for unguarded destructuring of `usePage().props` (e.g., `const { user, auth } = usePage().props;` without null checks or default values).
2. **Ziggy Route & Parameter Mismatches:**
   - Scan client-side `route('route.name', params)` calls across all components.
   - Verify route names exist and required parameters (e.g. `{id}`, `{order_number}`, `{slug}`) are supplied with matching parameter keys.
3. **Form Request Key Drift:**
   - Verify that keys passed to Inertia `useForm({...})` match the exact request parameters expected by backend Form Requests.
   - In `form.transform()`, verify array fields (e.g. `proof_photos`, `attachments`) are preserved (`curr.proof_photos || []`) rather than accidentally dropped.
4. **Temporal Dead Zone (TDZ) Hook Ordering:**
   - Verify that `useCallback` functions and state helpers are declared above `useEffect` hooks that invoke them to prevent minified production bundle `ReferenceError` crashes.
5. **Modal `preserveScroll: true` & Form Error Reset Hygiene:**
   - Scan Inertia form submissions (`form.post()`, `form.put()`, `form.patch()`, `form.delete()`) inside modals, sheets, and drawers for missing `preserveScroll: true`.
   - Scan modal components (`RequestRestockModal`, `StaffAttendanceModal`, `AddEmployeeModal`, `DisputeModal`) for `form.clearErrors()` and `form.reset()` on dismiss/close to prevent persistent 422 error states when reopening.
6. **Asynchronous Stale Closures in Polling & Supabase Listeners:**
   - Scan interval routines (`setInterval`), geolocation callbacks, and Supabase real-time handlers for closures reading state variables directly rather than via `useRef` or functional state setters (`setState(prev => ...)`).
7. **Inertia Lazy Prop Traps (`Inertia::lazy` / `Inertia::defer`):**
   - Scan React components consuming lazy props (e.g. `notifications`, heavy analytical datasets) for premature empty-array evaluations on initial mount.
   - Verify components do not evaluate `(items || []).length < limit` before the lazy prop is actually fetched, which prematurely flips `hasMore = false` and causes permanent UI dead-ends (such as missing `"See previous notifications"` or broken pagination).
8. **Asynchronous Reload Debounce & Mutex:**
   - Scan interactive controls invoking `router.reload({ only: [...] })`, cursor pagination, or infinite scroll triggers.
   - Verify triggers enforce local `isLoading` or `disabled` guards to block duplicate concurrent requests and avoid UI flicker.

### Vector 6: Background Queues, Observers & Asynchronous Traps
Audit background execution to prevent silent job deaths and serverless timeout locks:
1. **Queued Job Failure Limits & Backoff:**
   - Scan queued Jobs and Listeners (e.g., email notifications, report exports, third-party webhook dispatchers).
   - Verify all jobs declare explicit retry limits (`public $tries = 3;`) and timeout boundaries (`public $timeout = 60;`) to prevent poison pills in queue workers.
2. **Model Observer Recursion:**
   - Scan Eloquent model Observers for mutating operations (e.g., `saved()`, `updated()`) that invoke `$model->save()` without guard flags, preventing infinite event loops.
3. **Synchronous Execution Traps on Serverless:**
   - Scan synchronous controller actions for slow external operations (sending mail, generating heavy PDFs, image processing) that risk hitting Vercel's 15-second execution timeout. Verify these are dispatched to background queues.
4. **Unbounded External API Loops in Scheduled Commands:**
   - Scan scheduled console commands (`VerifyPaymongoPayments`, cron jobs) that invoke external APIs in loops.
   - Verify queries strictly enforce time bounds (e.g. `where('created_at', '>=', now()->subHours(24))`) and small batch chunking (`chunkById(25)`) to prevent unbounded sequential API calls from exceeding serverless execution limits.

---

## 3. Automated Inspection & Verification Pipeline
When executing this audit, run targeted scans alongside deterministic validation commands:

1. **Scan for Swallowed Errors in Frontend Hooks:**
   ```powershell
   git grep -n -E "catch\s*\([a-zA-Z0-9_]+\)\s*\{\s*\}" -- resources/js/
   ```

2. **Scan for Chained Object Calls Without Null-Safety in Blade/PHP:**
   ```powershell
   git grep -n -E "\$[a-zA-Z0-9_]+->[a-zA-Z0-9_]+->[a-zA-Z0-9_]+" -- app/
   ```

3. **Scan for Division Operations in Domain Payroll & Finance Services:**
   ```powershell
   git grep -n -E "\/\s*\$[a-zA-Z0-9_]+" -- app/Services/HR/ app/Services/Accounting/
   ```

4. **Scan for Modal Form Submissions Lacking `preserveScroll: true`:**
   ```powershell
   git grep -n -E "form\.(post|put|patch|delete)\([^)]*\)" -- resources/js/Components/*Modal*.jsx resources/js/Components/*Drawer*.jsx
   ```

5. **Scan for Analytical Order Metrics Missing `is_test` Isolation:**
   ```powershell
   git grep -n -E "where\('status',\s*Order::STATUS_COMPLETED\)" -- app/Services/Analytics/ app/Services/Admin/
   ```

6. **Scan Payment Verification Commands for Cancelled Order Reconciliation:**
   ```powershell
   git grep -n "STATUS_CANCELLED" -- app/Console/Commands/
   ```

7. **Scan Scheduled Commands for Unbounded External API Loops:**
   ```powershell
   git grep -n -E "(retrieveCheckoutSession|createDeliveryOrder)" -- app/Console/Commands/
   ```

8. **Scan for File Upload Forms Enforcing Client-Side 4.5MB Payload Guard:**
   ```powershell
   git grep -n -E "maxSize|size\s*>\s*4" -- resources/js/Pages/ resources/js/Components/
   ```

9. **Scan for Hidden Review Exclusions in Storefront Queries:**
   ```powershell
   git grep -n -E "where\('(is_hidden|status)'" -- app/Services/Review/ app/Services/Product/
   ```

10. **Scan for Lazy Prop Reload Calls with Guarded Reload Flags:**
    ```powershell
    git grep -n -E "router\.reload\(\{\s*only:" -- resources/js/
    ```

11. **Verify AST Reference Integrity (Zero Broken Imports/Hooks):**
   ```powershell
   npm run test:refs
   ```

12. **Verify Production Asset Compilation (Zero Babel/Rollup/TDZ Errors):**
   ```powershell
   npm run build
   ```

13. **Verify Platform & Serverless Integrity:**
    ```powershell
    php artisan platform:audit
    ```

14. **Run Full Backend Test Suite & Isolation Tests:**
   ```powershell
   php artisan test --filter=AnalyticsTestOrderIsolationTest
   php artisan test --filter=LiveTransactionFlowTest
   php artisan test
   ```

---

## 4. Expected Output Specification
Return a high-signal **System-Wide Bug Audit Report** organized by domain impact:

1. **Silent Failures & Swallowed Error Traps** (Unresponsive UI, infinite spinners, dropped 422 messages)
2. **Data Lifecycle & Soft-Delete Hazards** (Fatal TypeErrors, missing withTrashed, unguarded null traversal)
3. **Concurrency, Races & Transaction Integrity** (Missing pessimistic locks, missing DB transactions, double submits)
4. **Real-Time Lifecycle & Memory Leaks** (Uncleaned Supabase/Echo channels, timer leaks)
5. **Inertia Contract & Route Parameter Mismatches** (Broken route bindings, prop destructuring, hook TDZ order)
6. **Queues, Observers & Serverless Timeout Traps** (Missing job retries, observer recursion, synchronous bottlenecks)
7. **Deterministic Pipeline Results** (`npm run test:refs`, `npm run build`, `php artisan platform:audit`, `php artisan test`)

Mark each finding with:
- **CRITICAL**: Breaks critical user journeys, causes application crashes, data corruption, or financial discrepancies in production.
- **WARNING**: Degrades performance, leaks memory, swallows error feedback, or causes intermittent UI locks.
- **PASS**: Domain verified clean with command receipt and code reference.
- **UNAUDITED**: Vector was not actively checked with a terminal tool command or targeted file read in this session.

Every section must include:
- The exact terminal inspection command executed and its result (e.g. `0 matches returned`).
- Clickable file links with line ranges (`[File.php#L10-L15](file:///...)`) and exact code quotations proving the safeguard.
- Zero naked "PASS" assertions without verifiable terminal evidence.

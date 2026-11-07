---
name: e2e-browser
description: >-
  Execute live, uncheatable full-system end-to-end testing across 30+ workflows and every user persona (Buyer, Elite Artisan, Staff, Logistics Rider, Super Admin) on live production using Antigravity's in-built browser in an optimized 3-stream relay pipeline.
---

# High-Efficiency Full-System Production Browser E2E Suite (`/e2e-browser`)

## 1. Safety, Persona Entitlements & Strict Guardrails

### A. Mandatory Production Target & Ground Truth
- **Strict Target Host:** LIVE PRODUCTION ONLY: `https://www.likhangkamay.app`. Testing against local staging or localhost (`http://127.0.0.1:8000`, `likhangkamay.test`) is PERMANENTLY BANNED under `/e2e-browser`. All browser navigations, API contracts, forms, and persona sessions execute against live production.
- **5 Synthetic Personas (`is_test = true`):**
  - Super Admin: `test.admin@likhangkamay.local`
  - Master Artisan (Elite Tier): `test.artisan@likhangkamay.local` (Workshop Studio with Cavite address and ₱1 synthetic item)
  - Verified Buyer: `test.buyer@likhangkamay.local` (Cavite resident with delivery address in Imus)
  - Operations Staff: `test.staff@likhangkamay.local` (Staff permissions: HR, Orders, Products, Team Messages, Reviews)
  - Logistics Rider: `test.driver@likhangkamay.local` (Motorcycle CAV-9876, deliveries console access)
  - Common Password: `LikhangKamayTest2026!`

### B. Strict Production Exclusions & Guardrails (Permanent Bans)
1. **NO Real Webcam Facial Recognition:** Do NOT force hardware camera access; strictly use PIN `0000` or the `"Use Email Code"` fallback rendered by [`LivenessFaceScanner.jsx`](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Staff/Dashboard/LivenessFaceScanner.jsx#L571-L587).
2. **NO Global Admin Settings Manipulation:** Do NOT touch `/admin/settings` (do NOT alter platform fee rates, commission toggles, or platform maintenance mode switches).
3. **NO Social OAuth Redirects:** Do NOT test Google or Facebook OAuth login redirects.
4. **NO Multi-Tab Concurrency / Race Condition Tests:** Do NOT simulate multi-user simultaneous last-unit purchases in browser tabs.
5. **NO Credit Card Testing:** Online payments are strictly limited to PayMongo GCash and Maya sandboxes; do NOT implement credit card 3D Secure checkout paths.
6. **NO Destructive Deletions:** Account deletions (`user->delete()`, delete account buttons in profile) and catalog wipes are permanently banned.

### C. Elite Seller Subscription Tier Mandate
- The seller persona (`test.artisan@likhangkamay.local`) MUST be confirmed as **Elite Tier** (`premium_tier = 'super_premium'`) before running seller tests.
- Elite tier guarantees `allModulesUnlocked = true` in `SellerEntitlementService`, exposing all 16 seller modules:
  `overview`, `products`, `analytics`, `3d`, `orders`, `messages`, `reviews`, `shop_settings`, `sponsorships`, `hr`, `accounting`, `procurement`, `stock_requests`, `team_messages`, `approvals`, `discounts`.

### D. Zero-Tolerance Anti-Laziness & Anti-False-Positive Protocol (Banned Naked "PASS")
The agent and any invoked subagent are STRICTLY FORBIDDEN from reporting any check, phase, or stream as `PASS` without providing active, uncheatable, verifiable proof. The following 8 anti-false-positive directives are non-negotiable:

1. **Active State Mutation Mandate (Ban on Passive Inspection as "PASS"):**
   - Merely asserting that a page loaded, forms render, inputs are visible, or submit buttons exist is strictly classified as **PAGE INSPECTION ONLY**, NOT workflow completion.
   - It is PERMANENTLY FORBIDDEN to claim a checkout, registration, or submission workflow is tested without actually clicking the state-changing submit button (e.g. `Place Order`, `Publish Product`, `Save Changes`), awaiting network resolution, and validating the resulting newly created entity.
2. **Fresh Entity Minting Mandate (Ban on Historical Data Re-Use):**
   - An agent is STRICTLY BANNED from taking credit for historical records, completed orders, closed disputes, or shifts created in prior sessions or manual runs (e.g. inspecting an old order from hours or days ago that already has a POD photo attached).
   - Every tested order, dispute, or shift MUST be **minted fresh in the active test run**. The newly generated entity identifier (e.g. `ORD-XXXXXXXXXXXXX`) MUST be captured from the response and explicitly passed forward to subsequent relay steps.
   - Any report that quotes an entity ID created outside the active run constitutes an immediate FAILING verdict and a protocol breach.
3. **Mandatory MCP Tool Execution in Current Turn (Dual-Engine Parity):** Every phase must actively execute live browser MCP tools in the active turn. Both Antigravity browser engines are officially supported:
   - **Native In-App Browser (`in-built-browser` MCP):** `create_tab`, `navigate_tab_url`, `tab_ax_get_state`, `playwright_locator_click`, `playwright_locator_fill`.
   - **Subagent DevTools (`chrome-devtools` MCP):** `new_page`, `navigate_page`, `take_snapshot`, `click_coordinate`, `fill_form`, `evaluate_script`.
   - **Deterministic Node/Chromium Runner:** If MCP engines are unavailable or running headless automation, the agent MUST run real Chromium commands via `run_command` with full network/DOM verification.
4. **Deterministic Locator & URL Grounding:** For every tested element, the agent MUST quote:
   - The exact selector used (e.g. `button[type="submit"]`, `input#email`, `a[href="/orders"]`).
   - The observed element label/text from the page's AX tree (`tab_ax_get_state`).
   - The resulting URL after navigation.
5. **Real DOM Interactions Only (Banned Synthetic Bypasses):** Text inputs must be populated using `playwright_locator_fill` or `fill_form`. Buttons must be clicked using `playwright_locator_click` or `click`.
   - **Absolute Ban on `fetch()` / `axios` within `evaluate_script`:** Bypassing interactive modals, forms, dispute filings, arbitrations, cancellations, exports, or wishlists via raw `fetch()`, `axios`, or XHR inside `evaluate_script` constitutes an immediate FAILING verdict. The ONLY authorized raw `fetch()` call is the background session teardown `fetch('/logout')`.
   - **Absolute Ban on "Code-Reading" as Workflow Completion:** Inspecting source files (`view_file` on controllers/React views) on disk is permanently banned as a substitute for live browser navigation. The runner must physically navigate the browser to the target route and interact with rendered UI elements.
6. **No Naked Button Clicks (Post-Click Triple Assertion):** After triggering any state-changing action button (`Place Order`, `Accept Order`, `Start Crafting`, `Confirm Studio Dispatch`, `Complete Delivery`, `Submit Review`, `Publish Product`), the runner MUST assert:
   - *Network Resolution:* The request completes with HTTP `200` (or `302 redirect`).
   - *DOM State Mutation:* The target DOM element visually transitions (e.g., status pill badge changes from `Processing` to `Delivered`).
   - *Modal Closure & Toast Banner:* Any active modal dialog cleanly unmounts and a persistent green success toast renders.
7. **Dual-Key Payload & Schema Contract Integrity:**
   - When submitting forms (especially multi-field modals like in-house driver dispatch, inventory restocks, or address books), the frontend payload keys MUST match backend Form Request validation rules exactly.
   - If a frontend component passes `{ driver_id: id }` while the backend validates `'employee_id' => ['required']`, the test must catch, flag, and fail on the HTTP 422 Unprocessable Content error. Both frontend and backend must maintain contract parity.
8. **Subagent Delegation Audit Protocol:**
   - The parent agent MUST NEVER blindly accept a subagent's summary claim of "100% Complete & Verified".
   - The parent agent MUST actively audit the subagent's raw tool execution history:
     a. Did the subagent execute `click` on the state-changing submit button?
     b. Did the subagent extract and forward a freshly minted entity ID (`ORD-XXXXXXXXXXXXX`)?
     c. Did the subagent attach real defense image assets (`Proof of Delivery (POD).jpg`) instead of inspecting old photos?
   - If any subagent report is missing these active mutation proofs, the parent agent MUST immediately reject the subagent's report, identify the skipped steps, and re-run them with strict mutation enforcement.

---

### E. Mandatory State-Mutation Proof-of-Work (PoW) Schema
Every Proof-of-Work report returned by `/e2e-browser` MUST include this explicit table:

| Action Triggered | Button / Selector | Pre-Click State | Post-Click State | Network Status | Fresh Entity ID Minted / Mutated | Evidence Screenshot Path |
|---|---|---|---|---|---|---|
| **Buyer Checkout** | `button:has-text("Place Order")` | Cart / Checkout View | Order Placed Confirmation | `302` $\rightarrow$ `200 OK` | `ORD-XXXXXXXXXXXXX` (Must be fresh) | `path/to/order_placed.png` |
| **Multi-Seller Split** | `button:has-text("Place Order")` | Multi-Workshop Cart (2 makers) | Dual Sub-Orders Minted | `302` $\rightarrow$ `200 OK` | `ORD-SPLIT-A`, `ORD-SPLIT-B` | `path/to/order_split.png` |
| **Artisan Accept** | `button:has-text("Accept")` | `Pending` | `Accepted` | `200 OK` | `ORD-XXXXXXXXXXXXX` | `path/to/order_accepted.png` |
| **Artisan Craft** | `button:has-text("Start Crafting")` | `Accepted` | `Processing` (BOM deducted) | `200 OK` | `ORD-XXXXXXXXXXXXX` | `path/to/order_crafting.png` |
| **Studio Dispatch** | `button:has-text("Confirm Studio Dispatch")` | `Processing` | `Shipped` (Assigned CAV-9876) | `200 OK` | `ORD-XXXXXXXXXXXXX` | `path/to/order_shipped.png` |
| **Driver Deliver** | `button:has-text("Confirm Delivery")` | `Shipped` (In Transit) | `Delivered` (POD attached) | `200 OK` | `ORD-XXXXXXXXXXXXX` | `path/to/order_delivered.png` |
| **Buyer Invoicing** | `/my-orders/{id}/receipt` | `Delivered` Badge | RA 11976 Sales Invoice Rendered | `200 OK` | `ORD-XXXXXXXXXXXXX` | `path/to/order_invoice.png` |
| **4.5MB File Shield** | `input[type="file"]` (5MB buffer) | Idle File Dropzone | Inline Error Notice Rendered | None (0 Net Dispatch) | Client Guard Asserted | `path/to/file_shield.png` |
| **Vacated Shop Guard**| `/checkout` with inactive seller | Inactive Seller Cart Item | Graceful Cart Warning Notice | `302` Redirect | 0 Unhandled 500 Server Errors | `path/to/vacated_shop.png` |
| **WebSocket Fallback** | DevTools Block `wss://*` | Active WebSocket Channel | Inertia HTTP Polling Fallback | Interval `200 OK` | Message / Order State Synced | `path/to/ws_fallback.png` |
| **Buy Again Shortcut**| `button:has-text("Buy Again")` | Delivered Order Card | Item Re-added to Cart | `302` $\rightarrow$ `200 OK` | Cart Item Added | `path/to/buy_again.png` |
| **Follow Shop Toggle**| `button:has-text("Follow")` | Unfollowed State | Following Badge Active $\rightarrow$ Unfollowed | `200 OK` | Shop Follow Record Mutated | `path/to/follow_shop.png` |
| **Inline Quick Restock**| `button[title="Restock"]` | Catalog Product Row | Restock Modal Submit (+5 units) | `200 OK` | Stock Incremented (+5) | `path/to/quick_restock.png` |
| **Inline Quick Deduct** | `button[title="Deduct"]` | Catalog Product Row | Deduct Modal Submit (-5 units) | `200 OK` | Stock Restored to Baseline | `path/to/quick_deduct.png` |
| **Voucher Full CRUD** | `button:has-text("Create Voucher")` | Discount Directory | Created $\rightarrow$ Edited $\rightarrow$ Deleted | `200 OK` | Voucher ID Created & Purged | `path/to/voucher_crud.png` |
| **Canned Chat Snippet**| `button:has-text("Save Template")` | Chat Automation Modal | Template Saved $\rightarrow$ Used $\rightarrow$ Deleted | `200 OK` | Template ID Created & Purged | `path/to/chat_template.png` |
| **Cancel Return Claim**| `button:has-text("Cancel Return")` | Return Under Review | Status Reverts to Completed | `200 OK` | Return Request Cancelled | `path/to/cancel_return.png` |
| **Live Leaflet Route** | `button:has-text("Track Route")` | Order Details View | Leaflet Waypoint Road Route Modal | `200 OK` | Map Polyline Rendered (0 Err) | `path/to/route_preview.png` |
| **Admin Taxonomy CRUD**| `button:has-text("Add Category")` | Categories Tree | Category Created $\rightarrow$ Deleted | `200 OK` | Category Created & Cleaned | `path/to/taxonomy_crud.png` |
| **Admin Tier & Note**  | `/admin/users-manager/{id}` | Elite (`super_premium`) | Disciplinary Note Saved; Tier Mutated & Restored | `200 OK` | Tier Reverted to Elite | `path/to/admin_discipline.png` |
| **Staff Pass Reversion**| `form#password-update` | Staff Password Form | Updated to Temp $\rightarrow$ Reverted to Default | `200 OK` | Reverted to Default Pass | `path/to/staff_password.png` |

If any row in this table is skipped, contains `None`, or references an ID from a previous run, the entire suite is marked **FAIL (INCOMPLETE MUTATION)**.

---

## 2. Modular CLI Invocation Flags

`/e2e-browser` supports targeted execution flags to test specific functional domains in 60–90 seconds without running the entire suite, as well as the full assembly line:

```powershell
# Targeted Domain Executions (Fast, ~60–90s each):
/e2e-browser --phase=relay        # Commercial Happy Path: Storefront, PayMongo GCash, Shift, POD, Sales Invoice (~60s)
/e2e-browser --phase=b2b          # B2B Supply Hub: Raw materials listing, MOQ cart, B2B checkout, invoice (~60s)
/e2e-browser --phase=payroll      # ERP HR & Accounting: Timecards, payroll generation, maker-checker approval (~60s)
/e2e-browser --phase=auth-flow    # Onboarding: Buyer email verification code, Artisan KYC onboarding wizard (~60s)
/e2e-browser --phase=discovery    # Buyer Experience: Faceted filter on /shop, Wishlist toggle to cart, 3D OrbitControls (~60s)
/e2e-browser --phase=subscription # Monetization: Tier upgrade/downgrade, retention modal, ad boost bidding (~60s)
/e2e-browser --phase=cancellation # Resilience: Buyer cancel before acceptance with instant +1 stock rollback (~60s)
/e2e-browser --phase=email-studio # Admin Ops: Dynamic email template builder, {{buyer_name}} preview, test dispatch (~60s)
/e2e-browser --phase=erp          # Deep Elite 16-Module Artisan Studio & ERP (~90s)
/e2e-browser --phase=disputes     # End-to-End Dispute Filing & Admin Arbitration (~60s)
/e2e-browser --phase=payments     # PayMongo GCash/Maya & Lalamove Sandboxes (~60s)
/e2e-browser --phase=admin-gov    # Admin Governance, KYC Zoom, Payout Vouchers & Moderation (~60s)
/e2e-browser --phase=mixed-cart   # Multi-Seller Cart: 2 Cavite workshops, split logistics, dual invoices (~60s)
/e2e-browser --phase=resilience   # Client 4.5MB shield, vacated workshop guard, WebSocket drop fallback (~60s)

# Full 3-Stream Assembly Line Pipeline (Default when no flag is passed):
/e2e-browser --phase=all          # Subagent Isolated 3-Stream Relay with PoW Manifest (~3 mins)
```

---

## 3. Flow Optimization & Anti-Bloat Directives

1. **Single Tab Lifecycle:** Maintain only **one** active browser tab per subagent. Explicitly close any auxiliary tabs before opening new pages to prevent memory leaks and Chromium connection timeouts.
2. **Deterministic State Waits (No Sleep Hack):** Never use arbitrary `sleep` timeouts. Wait deterministically for specific accessibility nodes (`tab_ax_get_state`), network 200 responses, or button enabled states (`button:not([disabled])`).
3. **Session Evacuation Protocol (Anti-Cookie Contamination):** Between persona transitions, execute:
   - **Standard Buyer/Admin/Artisan Teardown:** Navigate to `/logout` or dispatch `POST /logout` via `window.axios.post('/logout')`.
   - **Staff & Rider Fast-Teardown Route:** For Staff and Rider sessions, standard `/logout` triggers the interactive `StaffLogoutDecisionPanel` modal. To ensure deterministic teardown during headless execution, dispatch `POST /staff/logout/direct` (which bypasses modal prompts and cleanly terminates the session).
   - **Purge Client Storage:** Call `playwright_evaluate` with `window.localStorage.clear(); window.sessionStorage.clear();`.
   - **Spawn Clean Tab:** Close the finished tab and call `create_tab({"browser_id": "iab"})` (or `new_page`). Never attempt to log in as a new user in a tab holding an active session.
4. **Standard DOM Selector Discipline (No Non-Standard Pseudo-Selectors):**
   - Strictly avoid non-standard CSS pseudo-selectors like `:has-text(...)` or `:text(...)` in `document.querySelector` or `evaluate_script`.
   - Use standard vanilla JS DOM traversal:
     `Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Confirm & Order'))`
5. **Inertia Response Handling (No Raw `res.json()` on Redirects):**
   - Endpoints in Inertia SPA respond with HTTP 302 redirects with `X-Inertia: true`. Calling `await res.json()` directly will throw `SyntaxError: Unexpected end of JSON input`.
   - Always extract props after navigation via `JSON.parse(document.getElementById('app')?.dataset?.page || '{}').props` or inspect `res.status` and `res.headers.get('x-inertia')`.
6. **B2B Supply Hub Persona Scoping & Catalog Segregation:**
   - Supply Hub ordering and product viewing is strictly reserved for verified Elite artisans (`canAccessSupplyHub()`), and an artisan cannot buy their own products.
   - Active wholesale raw material listings (`/product/{id}`) are accessible to peer artisans who have Supply Hub clearance (`ProductPolicy@view`); unauthenticated visitors and standard retail buyers receive HTTP 404 to maintain strict B2B wholesale isolation.
   - When purchasing items authored by `test.artisan` (Shop ID 21), switch to buyer artisan `artisan.silang@likhangkamay.com` (Password: `LikhangKamay2026!`).

---

## 4. Local Defense Assets & Two-Tier Upload Protocol

Agents are STRICTLY FORBIDDEN from skipping file inputs (`<input type="file">`). The local test environment includes dedicated, high-resolution defense assets.

### A. Local Defense Asset Root Directory
```text
C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\
```

### B. Mandatory Two-Tier File Upload Protocol
When encountering any file dropzone or upload trigger:
1. **Tier 1 (Native Playwright File Chooser):**
   - Identify the input: `input[type="file"]`, `input[accept*="image"]`, `input[accept*=".glb"]`, or `input[accept*=".csv"]`.
   - Bind the local absolute file path using `playwright_file_chooser_set_files` or `setInputFiles(absolutePath)`.
2. **Tier 2 (In-Browser DataTransfer / File Construction Bypass):**
   - *Cross-Workspace Sandbox Bypass:* If Chrome DevTools MCP or the Chromium runner blocks external filesystem paths outside the repository sandbox (e.g. `SecurityError`), the agent MUST inject the file directly into the DOM via `playwright_evaluate`:
   ```javascript
   const dataTransfer = new DataTransfer();
   const response = await fetch(assetUrlOrBase64);
   const blob = await response.blob();
   const file = new File([blob], fileName, { type: mimeType });
   dataTransfer.items.add(file);

   const input = document.querySelector(selector);
   input.files = dataTransfer.files;
   input.dispatchEvent(new Event('change', { bubbles: true }));
   input.dispatchEvent(new Event('input', { bubbles: true }));
   ```
   - This bypasses all OS/Chromium cross-workspace path boundaries deterministically. Never leave upload fields empty or bypass them with dummy strings.

### C. Asset-to-Selector Mapping Table

| Flow / Feature | Relative Asset Path | Absolute Target File | Target Input Selector / Dropzone |
| :--- | :--- | :--- | :--- |
| **Artisan KYC Onboarding** | `Artisan Docx\Business Permit.png` | `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\Artisan Docx\Business Permit.png` | `input[name="permit_photo"]` |
| **Artisan KYC Onboarding** | `Artisan Docx\DTI.png` | `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\Artisan Docx\DTI.png` | `input[name="dti_certificate"]` |
| **Artisan KYC Onboarding** | `Artisan Docx\Tin ID.png` | `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\Artisan Docx\Tin ID.png` | `input[name="tin_photo"]` |
| **Artisan KYC Onboarding** | `Artisan Docx\Valid ID.png` | `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\Artisan Docx\Valid ID.png` | `input[name="valid_id"]` |
| **Storefront Cover Banner** | `Shop Cover Banner (Wide).jpg` | `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\Shop Cover Banner (Wide).jpg` | `input[name="cover_photo"]` in Shop Settings |
| **Product Studio Cover** | `Product\Blue Feather Vase\Main Cover.png` | `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\Product\Blue Feather Vase\Main Cover.png` | `input#cover_image`, `input[name="cover"]` |
| **Product 3D Model** | `Product\Blue Feather Vase\Blue Feather Vase.glb` | `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\Product\Blue Feather Vase\Blue Feather Vase.glb` | `input[accept=".glb,.gltf"]`, `input#model_file` |
| **Bulk Inventory Import** | `products_sample.csv` | `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\products_sample.csv` | `input[type="file"][accept*=".csv"]` in Bulk Modal |
| **Chat Commission Attachment** | `Custom Commission Sketch (Chat Attachment).jpg` | `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\Custom Commission Sketch (Chat Attachment).jpg` | `input[type="file"]` via Chat Paperclip Button |
| **Staff Attendance Face Scan** | `ArtisanStaff\HR.png` | `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\ArtisanStaff\HR.png` | Camera upload trigger / face verification |
| **Driver Proof of Delivery** | `Proof of Delivery (POD).jpg` | `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\Proof of Delivery (POD).jpg` | `input[name="pod_photo"]`, POD Modal File Input |

---

## 5. Pre-Flight Preparation & Persona Seeding

### A. Browser Engine Connection & Remote Debugging Handshake Check
Before executing test steps, the runner MUST verify active connection to either the native in-app browser or Chrome DevTools bridge:

1. **Native In-App Browser (`in-built-browser` MCP):**
   - Execute `call_mcp_tool` with `ServerName: "in-built-browser"`, `ToolName: "list_tabs"`, `Arguments: {"browser_id": "iab"}`.
   - If connection succeeds, proceed to Production Warmup.
   - If tool returns `"This browser tool is unavailable. The plugin may be disabled"`, test the Chrome DevTools bridge below.

2. **Subagent DevTools Bridge (`chrome-devtools` MCP):**
   - If operating in subagent mode or using Chrome DevTools, execute `list_pages` or `take_snapshot`.
   - **Remote Debugging Handshake Protocol:** If initial connection returns `context deadline exceeded` or fails to bind to port 9222, Google Chrome is awaiting OS-level permission. Alert the user once:
     > *"Please click 'Allow' on the Chrome 'Allow remote debugging?' OS prompt to activate the DevTools bridge."*
   - Suspend retries until the remote debugging handshake is approved.

3. **Fallback User Notice:** If neither engine is active, prompt the user:
   > *"Please open or enable the In-Built Browser pane in the Antigravity sidebar (or type `/browser`) to activate the interactive browser tools."*

### B. Production Warmup & Health Check
Verify live production serverless container availability:
```powershell
Invoke-WebRequest -Uri "https://www.likhangkamay.app/ping" -UseBasicParsing | Select-Object -ExpandProperty StatusCode
```
Assert output returns `200`.

### C. Persona Seeding & Elite Tier Mandate
Execute the pre-flight seeding and verification command in terminal:

```powershell
# 1. Seed or update the 5 synthetic test personas (all tagged is_test = true)
php artisan test:seed-personas

# 2. Assert that test.artisan is on super_premium (Elite Tier) and has toggleable modules unlocked
php artisan tinker --execute="`$u = \App\Models\User::where('email', 'test.artisan@likhangkamay.local')->first(); echo 'Artisan: ' . `$u->name . PHP_EOL; echo 'Tier: ' . `$u->premium_tier . ' (' . `$u->getSellerTierLabel() . ')' . PHP_EOL; echo 'Elite Check: ' . (`$u->isEliteTier() ? 'CONFIRMED ELITE' : 'FAILED NOT ELITE') . PHP_EOL; echo 'Stock Bamboo: ' . \App\Models\Product::where('sku', 'TEST-BAMBOO-01')->value('stock') . PHP_EOL;"
```

Assert output confirms `Elite Check: CONFIRMED ELITE`. If not, abort immediately.

---

## 6. The High-Efficiency 3-Stream Relay Architecture

To test all 30+ workflows and 9 subsystem domains without redundant logins or context window bloat, the pipeline is organized into **three sequential transaction streams** with shared state passed forward:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STREAM A: Commercial Core, Locations & Complete Dispute Resolution                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Artisan (Batch 1): Storefront, Tax/Payout, Secondary Studio, SKU Lifecycle, 3D, CSV │
│ 2. Buyer (Batch 1): Addresses, Sketch Chat, Orders A (GCash), B (PIN), C (COD), Review │
│ 3. Artisan (Batch 2): Accept Order A, BOM Deduct, Assign Rider, Lalamove C, CSV Exports │
│ 4. Staff & Rider: Shift Clock-in, Off-Site Flag, Rider Safety, Telemetry, POD Photo A  │
│ 5. Buyer (Batch 2): BIR Sales Invoice, 5-Star Review, File Order C Dispute             │
│ 5.5 Artisan (Batch 3): Counter-Dispute Rebuttal (Packaging Evidence) & Review Dispute  │
│ 6. Admin & Resolution: Arbitrate Dispute C, Moderate Review, Catalog Takedown, RBAC 403│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ STREAM B: Full Procurement Loop, B2B Wholesale & Discovery                              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 7. Staff & Artisan: Restock Request, PO Ordered, Inward Goods (+Stock), Reject Release,│
│    Supply Hub Wholesale Listing, MOQ Cart, B2B Checkout & Wholesale Invoice            │
│ 8. Buyer: Faceted Filter on /shop (Municipality/Material), Wishlist Toggle to Cart, 3D │
│ 9. Buyer: Immediate Order Cancellation (Assert +1 Stock Rollback) & Address Reorder    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ STREAM C: Enterprise Governance, HR Exceptions & Staff Provisioning                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 10. Buyer & Artisan: Email Code Verification & Artisan KYC Setup Wizard with Permits   │
│ 11. HR & Accounting: Staff Seat Provisioning & Teardown, Off-Site Attendance Override, │
│     HR Payroll Gen -> Accounting Rejection -> Final Approval, BIR 2307, Location Purge │
│ 12. Artisan & Admin: Subscription Tiers, Retention Modal, Ad Boost Bids & Email Studio │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Step 1: Artisan (Batch 1) — Storefront, Locations, Tax & Catalog Lifecycle
*Persona:* `test.artisan@likhangkamay.local`  
*Browser Tab:* Open tab on `https://www.likhangkamay.app`.

1. **Authentication:** Log in as `test.artisan@likhangkamay.local` (`LikhangKamayTest2026!`). Assert redirect to `/seller/dashboard`.
2. **Shop Branding & Pickup Schedule (`/shop-settings`):**
   - Upload `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\Shop Cover Banner (Wide).jpg` as cover banner.
   - Update shop bio: `"Authentic Cavite handcrafted pottery and artisan ceramics."`. Save changes.
   - Configure Cavite workshop pickup schedule: uniform mode, 09:00 - 17:00, `max_advance_days: 14` (`/seller/pickup-schedules`). Save schedule.
3. **Disbursement Account & Tax Configuration (`/seller/settings`):**
   - Navigate to `/seller/settings`.
   - **Payout Configuration:** Set GCash payout phone number: `"09171234567"`, Account Name: `"Test Artisan Workshop"` (`POST /seller/settings/payout`). Assert green success toast.
   - **BIR Tax Configuration:** Update BIR Tax Identification Number (TIN): `"123-456-789-000"`, toggle VAT registered status: `true` (`POST /seller/settings/tax`). Assert tax profile updates in state.
   - **Statutory Deductions & Live Wage Simulator (`/shop/settings?tab=payroll`):** Toggle automated Philippine statutory deductions (`enable_statutory_deductions: true`). Verify the interactive **Live Wage Simulator** slider dynamically computes real-time SSS, PhilHealth, Pag-IBIG, and BIR TRAIN Law withholding tax breakdowns across test salary levels.
4. **Secondary Workshop Location & Geofence Perimeter (`/shop-locations`):**
   - Navigate to `/shop-locations`.
   - Click `Add Workshop Location`.
   - Branch Name: `"Silang Ceramic Studio"`.
   - Cavite Coordinates: Latitude `14.2312`, Longitude `120.9744`, Geofence Radius: `100m`.
   - Toggle `enforce_strict_geofence: true` (`POST /shop-locations`).
   - Assert new location renders in workshop locations directory with Cavite badge.
5. **Discount Engine & Lifecycle CRUD (`/discounts`):**
   - Create percentage discount voucher:
     - Code: `TESTSAVE10`
     - Type: Percentage (`10%`)
     - Minimum Spend: `₱100`
     - Max Uses: `100`
   - Click Create Voucher. Assert voucher `TESTSAVE10` renders in active vouchers table.
   - **Discount Full CRUD & Deletion Test:**
     - Create temporary discount voucher: Code `TEMPDELETE15`, Type `15%`, Min Spend `₱200`.
     - Update voucher details (`PATCH /discounts/{id}`): modify minimum spend to `₱250`. Assert table state reflects update.
     - Delete temporary voucher (`DELETE /discounts/{id}`). Assert clean removal with zero orphan constraints.
6. **Active Product Creation with Real 3D Model (`ProductFormModal.jsx` on `/products`):**
   - Click `Add Product` on `/products` to open `ProductFormModal.jsx`.
   - Title: `"Handcrafted Glazed Ceramic Vase"`
   - Category: `"Pottery & Ceramics"`, Base Price: `750`, Stock: `50`.
   - Recipe (BOM): Link material `"Stoneware Clay"` (2kg).
   - Upload Cover: `Product\Blue Feather Vase\Main Cover.png`.
   - Upload 3D Model: `Product\Blue Feather Vase\Blue Feather Vase.glb` (1.16MB) in `input[accept=".glb,.gltf"]`.
   - Click Publish Product. Assert redirect to `/products` with green success notification.
7. **Catalog Lifecycle Controls, Quick Modals & Bulk Status (`/seller/products`):**
   - Locate test product in listing table.
   - **Inline Quick Restock Modal Test:** On product row, click `+ Restock` button (`RestockModal.jsx`): input `5` units, submit (`POST /products/{id}/restock`). Assert stock increments by 5 (`50 -> 55`) with instant green toast.
   - **Inline Quick Deduct Modal Test:** Click `- Deduct` button (`DeductModal.jsx`): input `5` units with note `"Showroom sample"` (`POST /products/{id}/deduct`). Assert stock decrements back to baseline (`55 -> 50`).
   - Test SKU Archive: Click Archive (`POST /products/{id}/archive`). Assert status badge transitions to `Archived`.
   - Test SKU Reactivation: Click Reactivate (`POST /products/{id}/activate`). Assert status badge returns to `Active`.
   - If product has moderation flag, test Resubmit for Review action (`POST /products/{id}/resubmit`).
   - Test Bulk Status Toggle: Select multiple product checkboxes, click Bulk Actions -> `Update Visibility / Status` (`POST /products/bulk-status`). Assert updated toast renders.
8. **Bulk Inventory CSV Import (`/seller/products`):**
   - Click Bulk Import. Attach `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\products_sample.csv`.
   - Confirm import. Assert inventory adds CSV products.
9. **Procurement & Raw Materials (`/procurement`):**
   - Add raw material `"Stoneware Clay"`, unit cost `₱50/kg`, safety stock alert `10kg`.
   - Execute manual write-down: record `2kg` breakage/spoilage. Assert inventory updates.
10. **HR & Staff Administration (`/hr`):**
    - Verify staff records exist (`Test HR Operations Staff` and `Test Logistics Rider`).
    - Confirm driver vehicle is assigned (`Motorcycle CAV-9876`, license `N01-12-345678`).
11. **Session Evacuation:** Execute Section 3 Session Evacuation Protocol.

---

### Step 2: Buyer (Batch 1) — Addresses, Commission Chat, Orders A, B, C
*Persona:* `test.buyer@likhangkamay.local`

1. **Authentication:** Log in as `test.buyer@likhangkamay.local`.
2. **Address Book & Workshop Follow Engagement (`/user-addresses`, `/shop`):**
   - Add secondary Cavite address: `"Block 7 Lot 8 Bucandala III, Imus, Cavite 4103"`.
   - Toggle default address. Test coordinate pin adjustment.
   - **Follow / Unfollow Workshop Test:**
     - Navigate to artisan storefront `/shop/cavite-test-craft-workshop`.
     - Click `Follow Shop` (`POST /buyer/shops/toggle-follow`). Assert button transitions to `"Following"` state with checkmark badge.
     - Click `Following` button to unfollow. Assert reverts cleanly to `"Follow Shop"` state.
3. **Custom Commission Negotiation Loop & Resilience Shields (`/messages`):**
   - Open conversation with `Cavite Test Craft Workshop`.
   - **Client-Side 4.5MB Payload Shield Test:**
     - Attempt to attach a synthetic >4.5MB oversized file buffer (`new File([new Uint8Array(5 * 1024 * 1024)], 'oversized_sketch.jpg', { type: 'image/jpeg' })`).
     - Assert client-side shield immediately intercepts the file: inline error alert renders (`"Files must be 4MB or smaller. Please choose a smaller file."`), file input resets (`value = ''`), and the send button remains disabled. Assert zero HTTP 413 requests reach the Vercel gateway.
   - **WebSocket Drop -> HTTP Polling Degradation Test:**
     - Simulate WebSocket disconnection by executing DevTools network block on `wss://*` (or dispatching channel error).
     - Attach valid defense asset: `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\Custom Commission Sketch (Chat Attachment).jpg`.
     - Message: `"Can you customize this with gold leaf accents for an anniversary commission?"`.
     - Send message. Assert that background Inertia fallback polling (`useRealtime.js` / `Chat.jsx`) automatically triggers, successfully synchronizing the sent bubble and zoom lightbox without manual browser refresh.
4. **Cart Interactivity, Buy-Again & Cleansing Controls:**
   - **"Buy Again" Past Order Test:** Navigate to `/my-orders`. Locate any existing delivered order, click `Buy Again` (`POST /cart/buy-again/{id}`). Assert items immediately populate the active cart with correct pricing.
   - **Single-Click Cart Purge Test:** Navigate to `/cart`. Click `Clear Cart` (`POST /cart/clear`). Assert all cart items are purged and empty state renders cleanly.
   - If wishlist holds items, test single-click wishlist purge (`POST /buyer/wishlist/clear`).
   - Add item to cart. Test `+` increment and `-` decrement. Verify real-time subtotal computation.
   - Remove item. Cart updates cleanly.
   - Re-add ₱1 synthetic item `TEST-BAMBOO-01`.
   - Record baseline product stock (`stock_before`) on product detail page.
5. **Place Order A (Catalog Promotion + PayMongo GCash Sandbox):**
   - Navigate to `/checkout`.
   - Select primary Cavite address.
   - Assert product promotional discount or active sale price renders on order summary.
   - Select **PayMongo GCash** sandbox.
   - Click Place Order. In the PayMongo sandbox authorization view, complete payment approval.
   - Assert redirect to `/payment/success` -> `/my-orders`.
   - **Capture Order ID A (`ORD-A-XXXXX`).** Assert payment status is `Paid`.
6. **Place Order B (In-Store Workshop Pickup & Pickup PIN):**
   - Add an item to cart, navigate to `/checkout`.
   - Select **In-Store Workshop Pickup**. Select pickup schedule slot. Choose either Cash on Pickup or instant GCash/Maya online prepayment.
   - Click Place Order. In `/my-orders`, verify **Pickup PIN** renders on order card with verified payment status.
   - **Capture Order ID B (`ORD-B-XXXXX`).**
7. **Place Order C (Lalamove Courier via COD):**
   - Add an item to cart, navigate to `/checkout`.
   - Select **Delivery via Lalamove** (Cash on Delivery).
   - Click Place Order.
   - **Capture Order ID C (`ORD-C-XXXXX`).** *(This order will be used for the Dispute & Arbitration flow).*
8. **Multi-Seller Mixed Cart Split Orders (`/checkout`):**
   - Add Item 1 from Workshop A (`test.artisan@likhangkamay.local` — e.g. Ceramic Vase).
   - Add Item 2 from Workshop B (Silang or Alfonso artisan workshop — e.g. Bamboo Handicraft).
   - Navigate to `/checkout`.
   - Assert checkout dynamically renders **Multi-Workshop Split Grouping**: separate workshop cards, separate delivery/pickup options per workshop, and combined subtotal.
   - Select Cash on Delivery (COD) and click `Place Order`.
   - Assert redirect to `/my-orders`.
   - **Corroborate Dual Order Minting:** Assert system created **two distinct order numbers** (`ORD-SPLIT-A-XXXXX` and `ORD-SPLIT-B-XXXXX`), each assigned to its respective artisan workshop, each with its own independent status lifecycle and separate statutory BIR Sales Invoice.
   - Capture both Order IDs.
9. **Session Evacuation:** Execute Section 3 Session Evacuation Protocol.

---

### Step 3: Artisan (Batch 2) — Order Acceptance, Dispatch, Packing Slips & Exports
*Persona:* `test.artisan@likhangkamay.local`

1. **Authentication:** Log in as `test.artisan@likhangkamay.local`.
2. **Accept Order A & Deduct BOM Inventory (`/orders`):**
   - Locate `ORD-A-XXXXX`. Click Accept Order. Assert status transitions to `Processing`.
   - Verify BOM raw materials deducted accordingly in `/procurement`.
   - Click `Assign Logistics Driver`. Assign in-house rider (`Test Logistics Rider` / `CAV-9876`). Confirm assignment.
   - **Artisan Order Rejection & Automated Refund Assertion:** When an artisan rejects (`Rejected`) or cancels (`Cancelled`) an already-paid order (`payment_status === 'paid'`), assert `UpdateOrderStatus` sets `payment_status = 'refund_pending'` under database transaction and dispatches `PayMongoService->createRefund()` outside transaction locks, transitioning `payment_status` to `refunded`.
3. **Dispatch Order C via Lalamove Sandbox (`/orders`) — Two-Tier Dispatch Rule:**
   - Locate `ORD-C-XXXXX`.
   - **Tier 1 (Automated Sandbox Booking):** Click `Book Courier Dispatch (Lalamove)`. Assert real-time quotation calculation resolves and Lalamove sandbox booking ID is assigned.
   - **Tier 2 (Third-Party Throttled / Unroutable Fallback):** If `rest.sandbox.lalamove.com` returns HTTP 429 (rate-limited), 500, or routing coordinate mismatch, execute the authorized manual waybill dispatch fallback: enter tracking reference `LLM-SANDBOX-CAVITE` (or `LLM-SANDBOX-XXXX`) and click `Confirm Manual Waybill Dispatch`. Record the fallback in the manifest so external third-party sandbox downtime does not halt clearance.
4. **Bulk Fulfillment Operations & Fleet Dispatch:**
   - Select multiple orders in queue. Click `Bulk Labels` (`/orders/bulk-labels`) and `Bulk Packing Slips` (`/orders/bulk-packing-slips`).
   - Assert printable label and packing slip modals render properly.
   - **Bulk In-House Driver Dispatch Test:** Open `BulkDispatchOrderModal` (`POST /orders/bulk-dispatch-in-house`), select in-house rider (`CAV-9876`), assert bulk route assignment mounts without schema error.
5. **Commission Chat Formal Quote Reply & Automation Templates (`/messages`):**
   - Open buyer chat thread. Reply: `"Formal quote for custom gold-leaf commission: ₱1,200. Prepared and scheduled."`.
   - **Canned Snippet Template CRUD:** Open `ChatAutomationModal.jsx` (`/chat/templates`). Create template: Title `"Delivery Confirmation"`, Content `"Ang inyong order ay naihanda na po para sa delivery."` (`POST /chat/templates`). Assert template renders in snippet picker.
   - Insert template into conversation, then delete template (`DELETE /chat/templates/{id}`) to ensure zero leftover snippet clutter.
   - Verify Auto-Reply / Away configuration toggle (`POST /chat/auto-reply-settings`).
6. **Storefront Review Engagement & Reply Lifecycle (`/reviews`):**
   - Reply to a customer review (`POST /reviews/{id}/reply`). Assert reply renders publicly under the review and dispatches `ArtisanReviewReplyNotification` to the buyer with deep-link URL (`/my-reviews?review={id}`).
   - Test deleting the artisan's public reply (`DELETE /reviews/{id}/reply`). Assert reply cleanly unmounts.
   - Re-reply and click `Pin Featured Review` (`POST /reviews/{id}/toggle-pin`) to pin the top positive review to storefront.
7. **Ledger & Data Exports:**
   - Export Orders CSV: `/orders/export`
   - Export Analytics CSV: `/analytics/export`
   - Export Accounting Ledger CSV: `/accounting/export`
   - Export Audit Log CSV: `/audit-log/export`
   - Assert each export streams without 500 server crash.
8. **Session Evacuation:** Execute Section 3 Session Evacuation Protocol.

---

### Step 4: Staff & Rider — Shift Lifecycle, Safety Check, POD & Off-Site Flag
*Personas:* `test.staff@likhangkamay.local` $\rightarrow$ `test.driver@likhangkamay.local`

1. **Staff Shift Operations (`test.staff@likhangkamay.local`):**
   - Log in. Navigate to `/staff/attendance`.
   - **Simulated Off-Site Clock-in Attempt:** Attempt clock-in with simulated coordinates outside Cavite geofence (e.g. `14.5995, 120.9842`), asserting session records `is_flagged = true` for off-site HR review.
   - Click `Verify & Start Shift Now`. Immediately click `"Use Email Code"` fallback (or enter PIN `0000`).
   - Assert shift status transitions to `Shift Active` and timer ticks.
   - Navigate to `/orders`. Locate `ORD-A-XXXXX`, click `Mark as Packed / Ready for Dispatch`.
   - Navigate to `/team-messages`. Send message in Logistics channel: `"Order ORD-A-XXXXX is packed and ready on dispatch rack."`.
   - Open attendance dock. Click `Take Shift Break` (`POST /staff/attendance/break`). Assert break state.
   - Click `Resume Work`. Assert shift active.
   - Click user dropdown -> `Log Out` -> in `StaffLogoutDecisionPanel` select **Clock Out & Sign Out** (or dispatch `POST /staff/logout/direct` for fast automated teardown). Enter shift handover notes: `"All daily orders packed and inventory restocked."`. Submit.
2. **Session Evacuation:** Execute Section 3 Session Evacuation Protocol.
3. **Logistics Rider Relay (`test.driver@likhangkamay.local`):**
   - Log in. Navigate to `/staff/deliveries`.
   - **Vehicle Safety Check Rejection Test:** Click `Start Delivery Shift`, uncheck critical items (e.g. Brakes), attempt submission -> assert dispatch is blocked with warning.
   - Re-open safety inspection, check all 5 items (Tires, Brakes, Helmet, Fuel, Plate `CAV-9876`), submit. Dispatch cleared.
   - Locate `ORD-A-XXXXX`. Click `Claim & Start Route`. Delivery transitions to `in_transit`.
   - Click `View Route / Route Map`. Assert Leaflet road route modal renders Cavite origin workshop and buyer coordinates. Close modal.
   - **GPS Telemetry Simulation:** Transmit coordinates to `PUT /staff/deliveries/{id}/telemetry` with `{ latitude: 14.4258, longitude: 120.9385 }`. Assert HTTP 200.
   - **Proof of Delivery (POD) Drop-Off:**
     - Click `Complete Delivery`.
     - Recipient Name: `"Test Verified Buyer"`, Relationship: `"Direct Recipient"`.
     - Attach `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\Proof of Delivery (POD).jpg`.
     - Click Confirm Delivery. Assert status transitions to `Delivered` with green checkmark badge. For in-house studio driver dispatches, assert the customer-paid `shipping_fee_amount` is automatically credited to the artisan's `seller_net_amount` with an `IN_HOUSE_SHIPPING_CREDITED` delivery audit event.
4. **Session Evacuation:** Execute Section 3 Session Evacuation Protocol.

---

### Step 5: Buyer (Batch 2) — Receipt, Reviews & Dispute Filing
*Persona:* `test.buyer@likhangkamay.local`

1. **Authentication:** Log in as `test.buyer@likhangkamay.local`. Navigate to `/my-orders`.
2. **BIR Official Sales Invoice Download (`/my-orders`):**
   - Locate `ORD-A-XXXXX`. Confirm status is `Delivered`.
   - Click `Sales Invoice` / `Download Invoice` (`/my-orders/{order_number}/receipt`).
   - Assert BIR Computerized Sales Invoice renders with Cavite TIN, VAT breakdown table, and non-VAT/VAT registration headers.
   - Compute SHA-256 hash of the generated invoice HTML document.
3. **Submit 5-Star Customer Review & Seed Disputed Review:**
   - Return to `/my-orders`. Click `Write Review` on `ORD-A-XXXXX`.
   - Select **5 Stars** rating (`★★★★★`).
   - Feedback: `"Exceptional pottery! Glaze finish is even better in person."`. Submit review.
   - On separate synthetic product/order, submit review with disputed phrasing: `"Unfair claim: artisan was uncooperative and item arrived with flaws."` (seeds the review dispute in Step 5.5).
4. **Buyer Reviews Management Portal (`/my-reviews`) & Cross-Portal Navigation:**
   - Navigate to `/my-reviews` (or click `My Reviews` button with `Star` icon in `/my-orders` header, alongside the `Profile` navigation button with `User` icon).
   - In `/profile`, verify portal parity: buyer identity card with dynamic `Security: Verified / Unverified` badge, direct header navigation pills (`[My Purchases]`, `[My Reviews]`), and streamlined sidebar.
   - Assert visual parity with `/my-orders`: Buyer profile card, 2 summary metric boxes (`Total Reviews`, `Average Rating`), category filter tabs (`All Reviews`, `Artisan Replied`, `Safety / Moderated`, 5 Stars to 1 Star), and compact `Artisan Replies` sidebar list.
   - **Sidebar Artisan Reply Interaction & Smooth Focus:** In the sidebar `Artisan Replies` list, click an artisan reply snippet. Assert page smoothly scrolls to target review card (`#review-{id}`) and applies the temporary `ring-2 ring-clay-500` focus highlight ring.
   - **Content Safety Moderation Badges:** Verify dynamic moderation state badges on review cards:
     - `Public Review` (green/emerald badge) on clean published reviews.
     - `Under Moderation Review` (amber/orange badge) on reviews flagged or disputed by the artisan (`disputes.status in ['pending', 'under_review']`).
     - `Passed Safety Review` (clay/stone badge) on reviews where artisan dispute was dismissed/rejected by admin (`disputes.status === 'rejected'`).
     - `Hidden from Storefront` (rose badge/banner) on reviews suppressed by administration.
   - **Review Edit & Delete Actions:**
     - Click `Edit Review` on an active review card -> opens `EditReviewModal.jsx`. Update star rating and feedback (`PATCH /reviews/{id}`). Assert review card reflects updated values immediately without full-page reload (`preserveScroll: true`).
     - Test client-side rating validation and cancel modal.
     - Click `Delete Review` (`DELETE /reviews/{id}`). Assert confirmation dialog and successful removal.
   - **Notification Deep-Linking & Facebook-Style In-Dropdown Expansion:**
     - Open notification menu (`NotificationDropdown.jsx`). Locate `ArtisanReviewReplyNotification` item (dual-layer badge: `Store` terracotta avatar with overlapping `MessageCircle` badge, bold inline story text, and clay unread indicator).
     - Test in-dropdown pagination: verify dropdown displays 10 notifications on initial open with a `See previous notifications` button at the bottom of the list on desktop/iPad. Click `See previous notifications` -> assert next batch loads asynchronously into the panel without full-page redirect.
     - Click notification -> navigates to `/my-reviews?review={id}`.
     - Assert the URL parameter automatically scrolls to and applies the focus ring highlight on the target review card.
5. **File Return & Dispute on Order C (`/my-orders/{id}/dispute`):**
   - Locate `ORD-C-XXXXX`. Click `Report Issue / File Dispute`.
   - Reason: Select `"Defective or Damaged Item"`.
   - Description: `"Item arrived with hairline crack along base."`.
   - Attach defect photo (`Product\Broken Image.png` or `Proof of Delivery (POD).jpg`).
   - Submit dispute claim. Assert dispute status transitions to `Under Review / Pending Seller Rebuttal`.
6. **Buyer Cancel Return Request & Live Leaflet Route Preview:**
   - **Cancel Return Request Test:** On an order where return was requested, test buyer-initiated withdrawal: click `Cancel Return Request` (`POST /my-orders/{id}/cancel-return`). Assert return status reverts to `Completed` / `Delivered` with zero orphan state.
   - **Live Leaflet Rider Tracking Preview:** Click `Track Delivery` / `View Route` (`GET /my-orders/{id}/route-preview`). Assert `BuyerDeliveryTrackingMap.jsx` modal mounts: verifies Leaflet map canvas initializes, origin workshop and buyer coordinates are pinned, and road polyline resolves without unhandled JavaScript/WebGL errors. Close modal.
7. **Session Evacuation:** Execute Section 3 Session Evacuation Protocol.

---

### Step 5.5: Artisan (Batch 3) — Counter-Dispute Rebuttal & Review Dispute [OPTIMIZED INSERTION]
*Persona:* `test.artisan@likhangkamay.local`

1. **Authentication:** Log in as `test.artisan@likhangkamay.local`.
2. **Artisan Counter-Dispute Rebuttal (`/orders`):**
   - Locate Order `ORD-C-XXXXX` with pending buyer dispute.
   - Click `Respond to Dispute` -> opens `DisputeResponseModal.jsx`.
   - Response Type: Select `reject` (contest the return claim).
   - Rebuttal Argument: `"Item was packaged with multi-layer bubble wrap and fragile warning labels; damage occurred via external courier handling."`.
   - Attach packaging defense proof (`Product\Blue Feather Vase\Main Cover.png`).
   - Submit response (`POST /disputes/{id}/respond`).
   - Assert dispute status transitions from `Pending Seller Rebuttal` to `Pending Admin Arbitration`.
3. **Customer Review Dispute Filing (`/reviews`):**
   - Navigate to `/reviews`.
   - Locate the disputed review seeded in Step 5.
   - Click `Dispute Review`.
   - Grounds: Select `"Defamatory / Unfair Claims"`.
   - Explanation: `"Customer claims artisan was uncooperative despite immediate replacement offers in chat."`.
   - Submit dispute (`POST /reviews/{id}/dispute`).
   - Assert review status badge updates to `Disputed / Under Admin Review`.
4. **Session Evacuation:** Execute Section 3 Session Evacuation Protocol.

---

### Step 6: Admin & Resolution — KYC Zoom, Arbitration, Review Moderation & Takedowns
*Persona:* `test.admin@likhangkamay.local`

1. **Authentication:** Log in as `test.admin@likhangkamay.local`. Assert redirect to `/admin/dashboard`.
2. **KYC Document Viewer & Formal Rejection / Approval (`/admin/users-manager?tab=approvals`):**
   - Open pending artisan application.
   - Assert document modal displays `Business Permit.png` and `DTI.png` in high-resolution zoom viewer.
   - Test approval on verified applicant.
   - Test formal rejection workflow on test applicant with reason: `"Permit document unreadable; please re-upload clear BIR 2303."`.
3. **Dispute Arbitration Desk with Counter-Evidence (`/admin/disputes`):**
   - Locate Order C dispute filed by buyer and contested by artisan from the queue (or use filter pills: `All`, `Escalated`, `In Progress`, `Resolved`).
   - Review order summary, interactive photo comparison slider, and side-by-side claim dossier (customer notes vs shop rebuttal).
   - Issue arbitration ruling: Click `"Approve Full Refund"`, `"50% Partial Refund"`, or `"Decline Claim (Pay Shop)"`. Enter decision notes and submit ruling.
   - Assert dispute status transitions to `Refund Approved` / `Resolved`. When arbitrating a `50% Partial Refund`, assert that the order status transitions to `Completed` with `payment_status = 'partially_refunded'` and that 50% of the seller net amount is preserved in the artisan's withdrawable accounting revenue.
4. **Content Safety & Customer Review Moderation Desk (`/admin/compliance`):**
   - Navigate to `/admin/compliance`.
   - **Empty State & Zero-Ghost-Select Assertion:** With no ticket actively selected, assert that the right-hand panel displays the `"Select a Moderation Ticket"` empty state with zero ghost ticket auto-selection.
   - Filter inbox tickets using pills (`All`, `Active`, `Products`, `Users`, `Disputes`).
   - Locate the review disputed by artisan. Click the ticket from the list to mount the inspection dossier.
   - Review dispute rationale. Execute moderation ruling: Select `Uphold / Remove Review` (`PATCH /admin/review-moderation/{id}`).
   - Assert review is dismissed/removed from public storefront visibility.
5. **Catalog Moderation Takedown (`/admin/moderation-queue`):**
   - Navigate to `/admin/moderation-queue`.
   - Review pending compliance listings.
   - Execute listing takedown action (`POST /admin/moderation-queue/{id}/takedown`).
   - Assert product listing status updates to `Taken Down / Suspended`.
6. **Payout Voucher Generation (`/admin/payouts`):**
   - Locate artisan payout request. Record GCash disbursement reference number.
   - Generate official payout voucher (`/seller/payouts/{id}/voucher`). Assert PDF/voucher preview renders cleanly.
7. **User Directory, Disciplinary System & Tier Override with Atomic Reversion (`/admin/users-manager`):**
   - Locate test user account. Test freeze/suspend toggle and restore active state.
   - **Artisan Disciplinary Warning:** Click `Add Disciplinary Note` (`POST /admin/users-manager/{user}/discipline`): issue formal advisory `"Dispatch schedule advisory"`. Assert logged in audit trail.
   - **Manual Seller Tier Override & Immediate Atomic Reversion:**
     - Click `Change Tier` (`POST /admin/users-manager/{user}/set-tier`), select `premium`. Assert user tier temporarily reflects `premium`.
     - **MANDATORY IMMEDIATE REVERSION:** Immediately re-select `super_premium` (`POST /admin/users-manager/{user}/set-tier`). Assert status confirms `super_premium` (Elite Tier), guaranteeing zero permanent tier corruption for subsequent runs.
8. **Taxonomy & Category Tree CRUD (`/admin/categories`):**
   - Navigate to `/admin/categories` (`/admin/taxonomy`).
   - Create category: Name `"Artisan Studio Tools"`, slug `"artisan-studio-tools"`, description `"Carving and pottery tools"` (`POST /admin/taxonomy`). Assert new category renders.
   - Delete temporary category (`DELETE /admin/taxonomy/{id}`). Assert clean removal with zero orphan records.
9. **Platform Activity Log & Operations History (`/admin/activity-log`):**
   - Navigate to `/admin/activity-log` (`/admin/operations`). Verify administrative action audit stream renders recent approvals, takedowns, and discipline logs with actor attribution.
10. **RBAC Hard Security Barrier Test:**
    - Execute Section 3 Session Evacuation Protocol.
    - Log back in as `test.buyer@likhangkamay.local`.
    - Attempt navigating directly to `/admin/dashboard`.
    - Assert **HARD REDIRECT to `/` or HTTP 403 Forbidden** with zero administrative data exposure. Citing this redirect is MANDATORY.
11. **Session Evacuation:** Execute Section 3 Session Evacuation Protocol.

---

### Step 7: Full Supply Procurement Loop & B2B Wholesale (`/procurement`, `/supply-hub`)
*Personas:* `test.artisan@likhangkamay.local` $\rightarrow$ `test.staff@likhangkamay.local` $\rightarrow$ `test.buyer@likhangkamay.local`

1. **Staff Restock Request (`/procurement`):**
   - Log in as `test.staff@likhangkamay.local`. Navigate to `/procurement`.
   - Submit supply purchase request for raw material `"Stoneware Clay"` (Quantity: `20kg`, Remarks: `"Restock for ceramic vase production"`) (`POST /procurement/supplies/{id}/request`).
   - Assert stock request status transitions to `Pending Workshop Manager Approval`.
2. **PO Marked Ordered & Inward Receiving:**
   - Execute Section 3 Session Evacuation Protocol. Log in as `test.artisan@likhangkamay.local`. Navigate to `/procurement/stock-requests`.
   - Mark stock request as ordered from vendor (`POST /procurement/stock-requests/{id}/ordered`). Status transitions to `Ordered / Awaiting Delivery`.
   - **Goods Inward Receiving:** Click `Receive Inward Goods` (`POST /procurement/stock-requests/{id}/receive`).
   - Assert inventory stock level increments immediately (`+20kg` verified in ledger).
3. **Accounting Maker-Checker Stock Rejection Test:**
   - Navigate to `/accounting` (or `/seller/approvals`).
   - Locate redundant test stock release request.
   - Click `Reject Request` with revision notes: `"Invalid budget allocation; re-submit under Q4 materials fund."` (`POST /accounting/reject/{stockRequest}`).
   - Assert request transitions to `Rejected`.
4. **Artisan Supply Hub Wholesale Listing (`/supply-hub/my-listings`):**
   - Navigate to `/supply-hub/my-listings`.
   - Toggle wholesale availability or add a raw material supply:
     - Title: `"Stoneware Clay Bulk Pack"`
     - Minimum Order Quantity (MOQ): `5`
     - Wholesale Unit Price: `₱45/kg` (vs retail ₱50)
   - Assert listing status renders `Active / Available for Sourcing`.
5. **Buyer Artisan Workshop B2B Sourcing Order (`/supply-hub`):**
   - Execute Section 3 Session Evacuation Protocol. Log in as buyer artisan `artisan.silang@likhangkamay.com` (Password: `LikhangKamay2026!`). Note: B2B Supply Hub requires `canAccessSupplyHub()` entitlement, and artisans cannot buy their own listings.
   - Navigate to `/supply-hub`. Locate `"Stoneware Clay Bulk Pack"` or `"E2E Synthetic ₱1 Bamboo Cup"`.
   - **Product Detail Clearance Test (`/product/{id}`):** Navigate to the B2B supply item's detail page (`/product/{id}`). Assert the authenticated peer artisan with Supply Hub clearance successfully views the product page without HTTP 404 (whereas unauthenticated guests and standard buyers receive 404).
   - **MOQ Guardrail Test:** Attempt adding `3` units (below MOQ of 5) $\rightarrow$ assert client-side validation blocks addition.
   - Adjust quantity to `5` units (meets MOQ). Click `Add to B2B Sourcing Cart`.
   - Navigate to `/supply-hub/cart`. Verify volume pricing calculation: `5 × ₱45 = ₱225`.
   - Proceed to `/supply-hub/checkout`. Select Cavite workshop delivery address. Click `Place B2B Order`.
   - Assert redirect to `/supply-hub/orders` with B2B order number (`B2B-ORD-XXXXX`).
6. **Wholesale Sales Order Management & Invoice (`/supply-hub/sales`):**
   - Execute Section 3 Session Evacuation Protocol. Log back in as `test.artisan@likhangkamay.local`. Navigate to `/supply-hub/sales`.
   - Locate `B2B-ORD-XXXXX`.
   - Transition status to `Confirmed / Preparing Dispatch` (`POST /supply-hub/sales/{id}/status`).
   - Click `Download B2B Wholesale Invoice` (`GET /supply-hub/sales/{id}/invoice`).
   - Assert invoice PDF/HTML streams with wholesale VAT breakdown and Cavite addresses.
7. **Session Evacuation:** Execute Section 3 Session Evacuation Protocol.

---

### Step 8: Buyer Discovery, Faceted Search & Wishlist (`/shop`, `/wishlist`)
*Persona:* `test.buyer@likhangkamay.local`

1. **Faceted Filter Navigation (`/shop`):**
   - Log in as `test.buyer@likhangkamay.local`. Navigate to `/shop`.
   - **Cavite Municipality Filter:** Select `"Imus"` or `"Dasmariñas"`. Assert URL updates (`?municipality=...`) and product grid re-renders with local makers.
   - **Material Filter:** Select `"Clay"` or `"Bamboo"`. Assert multi-filter compounding works seamlessly.
   - **Price Sort:** Toggle `"Price: Low to High"`. Assert synthetic ₱1 item `TEST-BAMBOO-01` appears first.
2. **Product 3D Canvas OrbitControls & Cloud Presign Bypass (`/3d-manager`):**
   - Click on 3D-enabled product (`Handcrafted Glazed Ceramic Vase`).
   - Assert `<canvas>` element mounts without WebGL context loss.
   - Simulate mouse drag / touch rotate on canvas. Assert OrbitControls rotation executes without JavaScript errors.
   - **3D Direct-to-Storage Presign & Detach Lifecycle:** Test S3/Supabase presigned upload URL generation (`POST /3d-manager/presign`) for assets >4.5MB. Test asset detachment/deletion (`DELETE /3d-manager/{product}`) to assert clean 3D lifecycle handling.
3. **Wishlist Heart Toggle & Cart Transfer (`/wishlist`):**
   - On product card or detail view, click the Heart (Wishlist) icon (`POST /buyer/wishlist/toggle`).
   - Assert heart icon transitions to active/filled state with confirmation toast.
   - Navigate to `/wishlist` (or `/profile?tab=wishlist`). Assert favorited item is listed.
   - Click `Move to Cart` from wishlist.
   - Assert item is transferred to active cart and subtotal recalculates.
4. **Session Evacuation:** Execute Section 3 Session Evacuation Protocol.

---

### Step 9: Buyer Order Cancellation & Atomic Stock Rollback (`/my-orders/{id}/cancel`)
*Persona:* `test.buyer@likhangkamay.local`

1. **Baseline Stock Measurement:**
   - Record baseline stock of `TEST-BAMBOO-01` (`stock_baseline`).
2. **Place Immediate Test Order:**
   - Add `TEST-BAMBOO-01` to cart. Checkout with Cash on Delivery (COD) or In-Store Pickup.
   - Place Order. Capture `ORD-CANCEL-XXXXX`.
   - Assert stock immediately decremented by 1 (`stock_baseline - 1`).
3. **Immediate Buyer Order Cancellation (`POST /my-orders/{id}/cancel`):**
   - Navigate to `/my-orders`. Locate `ORD-CANCEL-XXXXX` while status is still `Pending Artisan Acceptance`.
   - Click `Cancel Order`.
   - Select cancellation reason: `"Ordered by mistake / Change of plans"`.
   - Confirm cancellation (`POST /my-orders/{id}/cancel`).
   - Assert order status transitions to `Cancelled` with gray/red cancellation pill badge.
4. **Atomic Stock Rollback Assertion:**
   - Query stock immediately on live database / product page:
   - Assert stock is restored to exactly `stock_baseline` (`+1` inventory restoration verified).
5. **In-Flight Delivery Address Modification Test (`POST /my-orders/{id}/change-address-reorder`):**
   - Test address re-order / modification endpoint on active eligible orders. Verify Cavite address boundaries are enforced without server 500 error.
6. **Dirty Data & Vacated Workshop Guard (`/checkout`):**
   - Add an item to cart from a shop in vacation mode, closed, or deactivated (or simulate checkout with an inactive workshop's item).
   - Attempt navigating to `/checkout`.
   - Assert backend defensive interceptors (`BuyerOrderController.php#L38-L42` and `PlaceOrder.php#L137-L141`) execute:
     - The purchase flow is safely intercepted before transaction processing.
     - System redirects to `/cart` with plain-language warning: `"One or more items in your cart belong to an inactive workshop. Please update your cart to proceed."`.
     - Corroborate **ZERO unhandled 500 server errors** and zero white-screen crashes.
     - Remove inactive item to restore cart hygiene.
7. **Session Evacuation:** Execute Section 3 Session Evacuation Protocol.

---

### Step 10: Full Auth & Artisan KYC Onboarding Wizard (`/artisan/setup`, `/verify-email-code`)
*Personas:* Synthetic New Onboarding User (`test.onboarding@likhangkamay.local` or fresh setup state)

1. **Buyer Email Verification Code Flow (`/verify-email-code`):**
   - Navigate to `/verify-email-code` (or email verification prompt).
   - Assert 6-digit PIN input renders (`VerifyEmailCodeController`).
   - Submit test verification code (`123456` or sandbox override). Assert redirect to welcome onboarding.
2. **Artisan KYC Setup Wizard (`/artisan/setup`):**
   - Navigate to `/artisan/setup`.
   - **Step 1: Workshop Profile:**
     - Workshop Name: `"Cavite Heritage Crafts"`.
     - Bio: `"Traditional weaving and ceramics from Alfonso, Cavite."`.
     - Municipality: `"Alfonso"`, Address: `"Sitio Maligaya, Alfonso, Cavite"`.
   - **Step 2: Upload Legal KYC Documents (Two-Tier Upload with Defense Assets):**
     - Business Permit: `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\Artisan Docx\Business Permit.png` $\rightarrow$ `input[name="permit_photo"]`
     - DTI Certificate: `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\Artisan Docx\DTI.png` $\rightarrow$ `input[name="dti_certificate"]`
     - TIN ID: `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\Artisan Docx\Tin ID.png` $\rightarrow$ `input[name="tin_photo"]`
     - Government Valid ID: `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\Artisan Docx\Valid ID.png` $\rightarrow$ `input[name="valid_id"]`
   - **Step 3: Terms & Agreement:**
     - Accept Artisan Terms (`POST /artisan/accept-terms`).
   - Click `Submit Application`.
   - Assert status updates to `Application Pending Admin Verification` with clean confirmation screen.
3. **Session Evacuation:** Execute Section 3 Session Evacuation Protocol.

---

### Step 11: Staff Provisioning, Attendance Exceptions & Maker-Checker Sign-off (`/hr`, `/accounting`)
*Personas:* `test.artisan@likhangkamay.local` $\rightarrow$ `test.staff@likhangkamay.local` $\rightarrow$ `test.artisan@likhangkamay.local`

1. **Staff Provisioning Lifecycle & Granular Permissions (`/hr`):**
   - Log in as `test.artisan@likhangkamay.local`. Navigate to `/hr`.
   - Click `Add Employee / Staff Seat` -> opens `EmployeeFormModal.jsx`.
   - Name: `"Test Apprentice Potter"`, Role: `"Apprentice"`, Email: `"test.apprentice.lk@gmail.com"`.
   - Toggle `create_login_account: true`.
   - Set Granular Permissions:
     - Orders: `can_view`
     - Products: `can_edit`
     - HR / Payroll: `no_access`
   - Save Employee (`POST /hr/employees`). Assert new staff record renders with custom permission pill badges.
   - **Test Suspension Cycle:** Click `Suspend Account` (`POST /hr/employees/{id}/toggle-suspension`). Status transitions to `Suspended`. Click `Reactivate` to restore active state.
   - **Strict Teardown (Zero Seat Pollution):** Click `Terminate Seat / Delete Record` (`DELETE /hr/employees/{id}`). Assert test apprentice account is removed cleanly, preventing production seat leaks.
   - **Staff Password Reset with Immediate Atomic Reversion (`/staff/password`):**
     - Navigate to `/staff/password` (`StaffPasswordModal.jsx`).
     - Submit password update with `current_password: "LikhangKamayTest2026!"`, `password: "TempPass2026!"`, `password_confirmation: "TempPass2026!"` (`PUT /staff/password`). Assert success toast.
     - **MANDATORY ATOMIC REVERSION:** Immediately submit password update again with `current_password: "TempPass2026!"`, `password: "LikhangKamayTest2026!"`, `password_confirmation: "LikhangKamayTest2026!"` (`PUT /staff/password`). Assert password successfully restored to standard test password.
   - **Custom Team Channels, Reactions & Threads (`/team-messages`):**
     - In `/team-messages`, click `+ Add Channel` (`POST /team-messages/channels`): Name `"pottery-kiln-qc"`, Description `"Kiln firing logs"`. Assert channel renders in channel list.
     - Send message in channel: `"Kiln batch #12 reached 1200C cone 6."`.
     - Add emoji reaction (`POST /team-messages/react`). Assert reaction counter increments.
     - Open thread sidebar (`ThreadSidebar.jsx`): post side-thread reply `"Cone verified."`. Assert thread counter increments.
2. **HR Attendance Exception Approval (`/hr`):**
   - Execute Section 3 Session Evacuation Protocol. Log in as HR staff (`test.staff@likhangkamay.local`). Navigate to `/hr`.
   - Locate the flagged off-site attendance session (seeded in Stream A Step 4).
   - Review geofence discrepancy notes.
   - Click `Approve Attendance Session` (`POST /hr/attendance-sessions/{id}/approve`).
   - Assert session transitions from flagged state to `Approved (HR Override)`.
3. **HR Employee Timecard Audit (`/hr/employees/{id}/time-card`):**
   - Locate employee `Test Logistics Rider`.
   - Click `View Time Card` (`/hr/employees/{employee}/time-card`).
   - Assert audit log displays recent shift clock-in, break intervals, and clock-out timestamps with total hours computed.
4. **HR Payroll Run Generation with Accounting Rejection Loop:**
   - Click `Generate Payroll Batch`.
   - Select pay period: `"Current Bi-Weekly Cycle"`.
   - Click `Calculate & Preview Payslips` (`POST /hr/generate` dry run). Assert gross pay, itemized statutory deductions (SSS capped at ₱30k MSC, PhilHealth 2.5% split, Pag-IBIG capped at ₱200, and BIR TRAIN Law graduated withholding tax), and net take-home pay calculate dynamically.
   - Click `Submit for Accounting Approval` (`POST /hr/payroll/{payroll}/submit`).
   - Assert payroll run status transitions to `Pending Accounting Approval`.
   - **Accounting Rejection Test:**
     - Execute Section 3 Session Evacuation Protocol. Log in as Workshop Owner / Accounting (`test.artisan@likhangkamay.local`).
     - Navigate to `/accounting` (or `/seller/approvals`). Locate the pending payroll run.
     - Click pending payroll record: assert review drawer surfaces the **"BIR / DOLE Compliant"** summary banner with SSS, PhilHealth, Pag-IBIG, and Tax rollups.
     - Click `Reject Payroll Batch` with remarks: `"Verify overtime deduction hours for rider."` (`POST /accounting/payroll/{payroll}/reject`).
     - Assert status returns to `Draft / Revision Required`.
   - **Resubmission & Final Maker-Checker Approval:**
     - HR resubmits batch (`POST /hr/payroll/{payroll}/submit`).
     - Accounting signs off: click `Approve Payroll Batch` (`POST /accounting/payroll/{payroll}/approve`).
     - Assert payroll batch transitions to `Approved / Ready for Disbursement`.
5. **Stock Release Maker-Checker Approval (`/accounting`):**
   - Review pending inventory stock release request from workshop floor.
   - Click `Approve Stock Release` (`POST /accounting/release/{stockRequest}`).
   - Assert inventory release is recorded in procurement ledger.
6. **Monthly Settlement Statement & BIR 2307 Export (`/accounting/settlement`):**
   - Navigate to `/accounting/settlement`.
   - Verify net settlement rollup with BIR 2307 (1% creditable withholding tax) calculation table.
   - Click `Export Statement CSV` (`GET /accounting/settlement/export`).
   - Assert settlement CSV download streams without 500 error.
7. **Clean Teardown of Secondary Location & Platform Trash Recovery (`/shop-locations`, `/admin/trash`):**
   - Navigate to `/shop-locations`.
   - Locate temporary branch `"Silang Ceramic Studio"` (created in Step 1).
   - Click `Delete Location` (`DELETE /shop-locations/{location}`).
   - Assert location is cleanly purged, ensuring zero orphaned coordinate records on production.
   - **Restoration Center (Trash) Test (`/admin/trash`):** Navigate to `/admin/settings?tab=trash` (`/admin/trash`). Verify soft-deleted items render and test restoration control (`POST /admin/trash/restore`) without 500 crash.
8. **Session Evacuation:** Execute Section 3 Session Evacuation Protocol.

---

### Step 12: Monetization & Admin Email Studio (`/subscription`, `/admin/settings/email-templates`)
*Personas:* `test.artisan@likhangkamay.local` $\rightarrow$ `test.admin@likhangkamay.local`

1. **Subscription Tiers & Retention Flow (`/subscription`):**
   - Log in as `test.artisan@likhangkamay.local`. Navigate to `/subscription`.
   - Review subscription tier comparison: Free vs Starter vs Professional vs Elite (`super_premium`).
   - Assert current tier displays `Elite Tier (All 16 Modules Unlocked)`.
   - **Retention Modal Test:**
     - Click `Manage Auto-Renewal` -> `Cancel Auto-Renewal` (`POST /subscription/cancel-auto-renewal`).
     - Assert Retention Modal triggers: displays benefit preservation prompt.
     - Dismiss or confirm toggle cleanly without breaking subscription state.
2. **Product Ad Sponsorships & Boost Bidding (`/sponsorships`):**
   - Navigate to `/sponsorships`.
   - Click `Create Boost Campaign`. Select product `TEST-BAMBOO-01`.
   - Set daily bid: `₱50/day`, duration `7 days`.
   - Click Submit Campaign. Assert campaign enters `Active / Scheduled` queue.
3. **Admin Email Studio Inspection & Test Dispatch (`/admin/settings/email-templates`):**
   - Execute Section 3 Session Evacuation Protocol. Log in as Super Admin (`test.admin@likhangkamay.local`).
   - Navigate to `/admin/settings/email-templates`.
   - Select template: `"Order Confirmation (Buyer)"` or `"Artisan KYC Approved"`.
   - Verify template visual preview mounts with dynamic variable replacement tokens (`{{buyer_name}}`, `{{order_number}}`, `{{total_amount}}`).
   - Test live test dispatch (`POST /admin/settings/email-templates/dispatch`):
     - Target Recipient: `test.buyer@likhangkamay.local`.
     - Click `Send Test Email`.
     - Assert green success banner confirms test dispatch routed via transactional queue without 500 error.
4. **Session Evacuation:** Execute Section 3 Session Evacuation Protocol.

---

## 7. Dual-Plane Production Assertion & Cryptographic Proof-of-Work

### A. Live Production Atomic Verification
1. **Stock Decrement & Restore Assertions:**
   - Assert `TEST-BAMBOO-01` stock decremented by 1 after Order A (`stock_after = stock_before - 1`).
   - Verify stock is restored (+1) if any pending order was cancelled.
2. **Live Production Order & Delivery State:** Assert `ORD-A-XXXXX` transitioned `Processing -> In Transit -> Delivered` with real POD photo attached.
3. **Database Verification (When Neon DB connected):**
   ```powershell
   php artisan tinker --execute="`$buyer = \App\Models\User::where('email', 'test.buyer@likhangkamay.local')->first(); `$order = \App\Models\Order::where('user_id', `$buyer->id)->latest('id')->first(); echo 'ORDER ID: ' . `$order->id . PHP_EOL; echo 'ORDER NUMBER: ' . `$order->order_number . PHP_EOL; echo 'IS_TEST: ' . (`$order->is_test ? 'TRUE (ISOLATED)' : 'FALSE (CORRUPTED)') . PHP_EOL; echo 'ORDER STATUS: ' . `$order->status . PHP_EOL; echo 'PAYMENT STATUS: ' . `$order->payment_status . PHP_EOL; `$item = `$order->items()->first(); echo 'ITEM SKU: ' . `$item->sku . PHP_EOL; echo 'ITEM STOCK: ' . \App\Models\Product::where('sku', `$item->sku)->value('stock') . PHP_EOL; `$delivery = `$order->deliveries()->latest('id')->first(); if (`$delivery) { echo 'DELIVERY ID: ' . `$delivery->id . PHP_EOL; echo 'DELIVERY STATUS: ' . `$delivery->status . PHP_EOL; echo 'TRACKING NUMBER: ' . `$delivery->tracking_number . PHP_EOL; }"
   ```

### B. Emitting the Production Proof-of-Work Manifest
The agent must generate and write an uncheatable JSON run manifest to:
`tests/e2e/production_audit/manifests/pow_iab_[timestamp].json`

> [!IMPORTANT]
> Always write the manifest using native workspace tools (`write_file` / `create_file`) or output the complete JSON report in the response text. Never pass file paths to Chrome DevTools `evaluate_script` parameters (which are sandboxed to Chrome's runtime directory).

**Required JSON Structure:**
```json
{
  "manifest_version": "5.1.0-PROD-3STREAM-POW",
  "run_id": "iab-[uuid]",
  "timestamp": "[ISO-8601-UTC]",
  "host": "https://www.likhangkamay.app",
  "protocol": "3-Stream Assembly Line E2E Browser Suite (Production Ground Truth)",
  "execution_mode": "subagent_isolated",
  "elite_seller_verified": true,
  "defense_assets_verified": true,
  "streams_executed": {
    "stream_a_commercial_core": true,
    "stream_b_b2b_discovery_resilience": true,
    "stream_c_governance_hr_monetization": true
  },
  "commercial_orders": {
    "order_a": {
      "order_number": "ORD-A-XXXXX",
      "payment_method": "paymongo_gcash",
      "voucher_applied": "TESTSAVE10",
      "rider": "CAV-9876",
      "status": "Delivered",
      "in_house_shipping_fee_credited": true,
      "bir_invoice_sha256": "[sha256]"
    },
    "order_b": {
      "order_number": "ORD-B-XXXXX",
      "pickup_mode": "in_store_pickup",
      "pickup_pin_verified": true,
      "cashless_prepayment_supported": true
    },
    "order_c": {
      "order_number": "ORD-C-XXXXX",
      "courier": "lalamove_sandbox",
      "buyer_dispute_filed": true,
      "seller_rebuttal_registered": true,
      "seller_response_type": "reject",
      "dispute_status": "Resolved",
      "admin_arbitration": "Approve Full Refund / 50% Partial Refund / Decline Claim",
      "seller_net_retention_verified": true
    }
  },
  "review_disputes": {
    "review_disputed_by_seller": true,
    "dispute_grounds": "Defamatory / Unfair Claims",
    "admin_moderation_ruling": "Uphold / Removed",
    "artisan_reply_notification_dispatched": true,
    "buyer_portal_deep_link_verified": true
  },
  "procurement_lifecycle": {
    "restock_requested": true,
    "po_ordered": true,
    "goods_received_stock_incremented": true,
    "stock_request_rejection_tested": true
  },
  "seller_tax_and_locations": {
    "payout_account_configured": true,
    "vat_status_updated": true,
    "secondary_location_created": true,
    "geofence_enforced": true,
    "bir_2307_statement_exported": true,
    "secondary_location_cleaned": true
  },
  "b2b_wholesale": {
    "b2b_order_number": "B2B-ORD-XXXXX",
    "raw_material": "Stoneware Clay Bulk Pack",
    "moq_enforced": true,
    "volume_quantity": 5,
    "wholesale_invoice_downloaded": true
  },
  "order_resilience": {
    "cancelled_order_number": "ORD-CANCEL-XXXXX",
    "stock_before": 994,
    "stock_after_order": 993,
    "stock_after_cancel_restored": 994,
    "atomic_rollback_verified": true
  },
  "staff_and_hr_governance": {
    "test_employee_provisioned": true,
    "permissions_matrix_verified": true,
    "suspension_cycle_tested": true,
    "employee_terminated_cleaned": true,
    "offsite_attendance_flagged": true,
    "offsite_attendance_approved": true,
    "payroll_batch_id": "PAYROLL-RUN-XXXXX",
    "prepared_by": "Test HR Operations Staff",
    "accounting_rejection_tested": true,
    "approved_by": "Cavite Test Craft Workshop Owner",
    "maker_checker_separated": true,
    "status": "Approved"
  },
  "admin_governance": {
    "moderation_queue_takedown_tested": true,
    "payout_voucher_generated": true,
    "rbac_hard_barrier_verified": true
  },
  "kyc_onboarding": {
    "applicant_email": "test.onboarding@likhangkamay.local",
    "defense_documents_uploaded": ["Business Permit.png", "DTI.png", "Tin ID.png", "Valid ID.png"],
    "status": "Application Pending Admin Verification"
  },
  "monetization_and_comms": {
    "subscription_tier": "super_premium (Elite)",
    "retention_modal_triggered": true,
    "sponsorship_campaign_active": true,
    "email_studio_test_dispatched": true,
    "email_recipient": "test.buyer@likhangkamay.local"
  },
  "high_value_resilience_workflows": {
    "multi_seller_cart_split": {
      "split_order_a": "ORD-SPLIT-A-XXXXX",
      "split_order_b": "ORD-SPLIT-B-XXXXX",
      "dual_invoices_verified": true
    },
    "client_side_4_5mb_shield": {
      "oversized_file_blocked": true,
      "inline_warning_rendered": true,
      "vercel_edge_413_prevented": true
    },
    "vacated_workshop_guard": {
      "defensive_redirect_verified": true,
      "zero_unhandled_500_errors": true
    },
    "websocket_polling_fallback": {
      "wss_traffic_blocked": true,
      "inertia_polling_fallback_active": true
    }
  },
  "extended_functional_operations": {
    "buyer_subsystems": {
      "buy_again_tested": true,
      "follow_shop_toggled": true,
      "cancel_return_verified": true,
      "leaflet_route_preview_rendered": true,
      "cart_cleared_cleanly": true,
      "buyer_reviews_portal_parity_verified": true,
      "artisan_reply_sidebar_scroll_verified": true,
      "content_safety_badges_audited": true,
      "review_edit_and_delete_verified": true,
      "reply_notification_deep_link_verified": true
    },
    "artisan_studio_ops": {
      "quick_restock_modal_verified": true,
      "quick_deduct_modal_verified": true,
      "voucher_crud_verified": true,
      "canned_chat_template_tested": true,
      "review_reply_deletion_tested": true,
      "bulk_dispatch_modal_verified": true,
      "presigned_3d_endpoint_verified": true
    },
    "governance_and_staff": {
      "taxonomy_category_crud_verified": true,
      "disciplinary_warning_logged": true,
      "tier_override_atomically_reverted": true,
      "staff_password_atomically_reverted": true,
      "team_chat_channel_and_threads_verified": true,
      "trash_center_restoration_verified": true
    }
  },
  "final_verdict": "PASS"
}
```

---

## 8. Summary Reporting Format

The agent's response upon completing `/e2e-browser` must strictly follow this format:

```markdown
### 3-Stream Assembly Line Production E2E Audit (`/e2e-browser`)

**Target Host:** `https://www.likhangkamay.app`  
**PoW Manifest:** `[Link to pow_iab_*.json]`  
**Execution Mode:** `Subagent Isolated (3-Stream Assembly Line)`  
**Elite Seller Status:** `CONFIRMED (super_premium / 16 modules unlocked)`  
**Defense Assets Used:** `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\`  

| Stream / Domain | Actions & Subsystems Covered | Assets / Data Bound | State Mutations Corroborated | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Stream A: Commercial Core & Locations** | Banner, Bio, Tax/Payout, Secondary Studio, SKU Lifecycle, Voucher `TESTSAVE10`, Voucher CRUD/Delete, Quick Restock/Deduct (+5/-5), 3D GLB, CSV, Orders A, B, C, Buy Again, Follow Shop, Buyer Reviews Portal Parity, Artisan Reply Feed & Scroll, Content Safety Badges, Review Edit/Delete, Reply Notification Deep-Link, Lalamove, Off-Site Flag, Rider POD, Review, Delete Reply, Counter-Dispute, Cancel Return, Leaflet Route, Arbitration, Takedown, Taxonomy CRUD, Tier/Discipline Override (Reverted) | `Shop Cover Banner.jpg`, `Blue Feather Vase.glb`, `POD.jpg` | Payout/Tax saved, geofence active, quick restock/deduct passed, voucher created & purged, buyer reviews portal synced, artisan reply scrolled, safety badges verified, POD uploaded, dispute arbitrated, return canceled, route rendered, tier reverted | **PASS** |
| **Multi-Seller Cart Split** | Cart with items from 2 Cavite makers $\rightarrow$ Checkout $\rightarrow$ Place Order | Synthetic multi-maker cart | 2 distinct order numbers minted (`ORD-SPLIT-A`, `ORD-SPLIT-B`), independent fulfillment & invoices | **PASS** |
| **Resilience & Edge Shields** | 4.5MB File Shield, Vacated Shop Guard, WebSocket Drop Fallback | Synthetic 5MB buffer, blocked `wss://*` | Oversized file blocked client-side (0 413 error), inactive seller caught (0 500 error), HTTP polling took over | **PASS** |
| **Stream B: Procurement & Wholesale** | Restock request, PO ordered, Inward goods received (+stock), Stock request rejection, Supply Hub MOQ listing & checkout, Wholesale invoice, Faceted `/shop` search, 3D Cloud Presign & Detach, Wishlist to Cart, Cancellation with +1 rollback | Raw material bulk pack, 3D OrbitControls canvas | Goods inward received (+20kg), stock rejection verified, B2B invoice downloaded, 3D presign active, Wishlist synced, Stock restored (+1) | **PASS** |
| **Stream C: ERP Governance & Teardown** | Email code, KYC Setup Wizard, Staff seat provisioning -> suspension -> clean deletion, Staff password change & atomic revert, Custom team channels & threads, Off-site attendance approval, HR timecards, Payroll gen -> Accounting rejection -> Resubmit & approval, BIR 2307 CSV export, Delete secondary studio, Trash restoration, Subscriptions retention, Email Studio | `Business Permit.png`, `DTI.png`, `Tin ID.png`, `Valid ID.png` | Staff seat terminated (0 leak), staff pass reverted, team channel created, off-site approved, payroll maker-checker rejected & approved, BIR 2307 exported, studio purged, trash verified | **PASS** |
| **Security RBAC Gate** | Buyer directly visits `/admin/dashboard` | None | Hard redirect to `/` or HTTP 403 Forbidden with zero data leaked | **PASS** |
```

If ANY upload fails, any relay step is skipped, any toast throws 500/422, or state mutation fails, mark as **FAIL** with exact selector, URL, and error message. No excuses. No passive skipping.

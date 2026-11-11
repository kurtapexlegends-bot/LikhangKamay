---
name: e2e-browser
description: >-
  Execute live, uncheatable full-system end-to-end testing across 30+ workflows and every user persona (Buyer, Elite Artisan, Staff, Logistics Rider, Super Admin) on live production using Antigravity's visible in-built browser or headed Chrome.
---

# High-Efficiency Live Browser E2E Suite (`/e2e-browser`)

> **Progressive Disclosure Entrypoint:** This skill separates rules/execution from bulky catalogs to cut prompt token burn by **85%+** while preserving **100% visible, uncheatable browser verification** on `https://www.likhangkamay.app`.
> Read only the reference files needed for your active phase:
> - **All 12 Workflow Steps (45 Flows):** [`references/workflows.md`](file:///c:/laragon/www/LikhangKamay/.agents/skills/e2e-browser/references/workflows.md)
> - **Pre-Mapped Selectors & Asset Uploads:** [`references/selectors.md`](file:///c:/laragon/www/LikhangKamay/.agents/skills/e2e-browser/references/selectors.md)
> - **Mandatory Proof-of-Work Table Schema:** [`references/pow_schema.md`](file:///c:/laragon/www/LikhangKamay/.agents/skills/e2e-browser/references/pow_schema.md)

---

## 1. Execution Target, Personas & Exclusions

### A. Live Production Ground Truth & Test Accounts
- **Target Host:** `https://www.likhangkamay.app` (Localhost testing banned under `/e2e-browser`).
- **Common Password:** `LikhangKamayTest2026!` (Peer B2B Artisan `artisan.silang@likhangkamay.com`: `LikhangKamay2026!`)
- **Synthetic Personas (`is_test = true`):**
  - **Super Admin:** `test.admin@likhangkamay.local`
  - **Elite Artisan (Workshop Owner):** `test.artisan@likhangkamay.local` (Must confirm `super_premium` / 16 modules unlocked)
  - **Verified Buyer:** `test.buyer@likhangkamay.local` (Cavite resident, Imus delivery address)
  - **Operations Staff:** `test.staff@likhangkamay.local`
  - **Logistics Rider:** `test.driver@likhangkamay.local` (Motorcycle `CAV-9876`)

### B. Permanent Bans & Guardrails
1. **No Real Webcam Recognition Required for Standard Relays:** Use PIN `0000` or `"Use Email Code"` (`000000` for test accounts); `allow_remote_clock_in` bypasses physical geofences. Synthetic test buyers (`is_test = true`) also bypass the one-time `CheckoutFaceCheckModal` (`User::requiresCheckoutFaceCheck()`), while non-test buyers without a prior live face check are prompted once before COD or online checkout (`POST /profile/verify-face`).
2. **No Global Admin Fee Manipulation:** Never alter platform commission/fee rates or maintenance mode on `/admin/settings`.
3. **No Social OAuth / No Credit Cards / No Destructive Account Deletes:** Online payments strictly test PayMongo GCash/Maya sandboxes.

---

## 2. Low-Token Visible Browser Optimization Protocol (`/browser`)

Users demand **real visible browser action** (zero dark-box headless skipping). Follow these 5 rules to run visibly in `/browser` at **4x–10x speed** and **90% fewer tokens**:

1. **Skip Exploratory AX-Tree Dumps:** Never call `tab_ax_get_state` before every click to "hunt" for selectors. Use the verified selector map in [`references/selectors.md`](file:///c:/laragon/www/LikhangKamay/.agents/skills/e2e-browser/references/selectors.md) directly with `playwright_locator_fill` and `playwright_locator_click` (preserving the visible gliding cursor).
2. **Batch Same-Screen Interactions:** Combine sequential field fills and clicks on the same page in a single multi-tool turn (e.g., fill email + fill password + click Submit in one turn) instead of pausing for LLM reasoning between every field.
3. **Lightweight State Verification:** Confirm DOM transitions using `tabs_content` (clean Markdown, ~300 tokens) or targeted `playwright_evaluate` assertions (checking status text/props, ~100 tokens) instead of dumping 15,000-token accessibility trees or base64 screenshots into chat.
4. **Parallel Persona Tabs (Cut Login Churn):** Open dedicated tabs or isolated contexts per primary actor rather than repeating `/logout` $\rightarrow$ `/login` 8 times on one tab when coordinating relay steps.
5. **Headed Desktop Chrome Runner Option (`--headed`):** If testing long full-system sweeps, you may execute [`tests/e2e/production_audit/headed_live_walkthrough.mjs`](file:///c:/laragon/www/LikhangKamay/tests/e2e/production_audit/headed_live_walkthrough.mjs) or add `--headed` (`headless: false, slowMo: 60`) so Chrome visibly launches on screen without burning LLM tokens between every mouse click.

---

## 3. Anti-Laziness & Uncheatable Verification Rules

1. **Active Mutation Only:** Passive viewing (`page loaded`) is **NOT** a pass. Click real state-changing buttons and verify resulting network responses (`200` / `302`) and newly minted entity IDs (`ORD-XXXXXXXXXXXXX`).
2. **Fresh Entities Only:** Never reuse historical orders or proofs. Capture freshly minted IDs and pass them downstream across personas.
3. **No Synthetic API Bypasses:** Never bypass modals/forms via raw `fetch()` or `axios` inside `evaluate_script` (only `/logout` teardown may use `POST /logout` or `POST /staff/logout/direct`).
4. **Real Binary Uploads Only:** Never generate 1x1 dummy PNGs or canvas rectangles for POD or attendance. Bind real assets from `tests/fixtures/defense_assets/` (see [`references/selectors.md`](file:///c:/laragon/www/LikhangKamay/.agents/skills/e2e-browser/references/selectors.md)).
5. **UI & System Contracts:**
   - **Full-System Real-Time Polling Whitelist:** `useRealtime.js` syncs `activeDeliveries` (`/staff/driver-deliveries`), `metrics` (`/seller/dashboard`), `approvals` (`/seller/approvals`), `requests` (`/seller/stock-requests`), wholesale orders (`/supply-hub/wholesale-sales`), and admin queues (`/admin/disputes`, `/admin/payouts`) every 5s. Assert live DOM transitions via polling without synthetic full-page refreshes.
   - **Streamlined Documents & Biometric KYC Step:** `DocumentsStep.jsx` mounts abort-safe `FileUploadField.jsx` dropzones (`input#business_permit`, `input#dti_registration`, `input#valid_id`, `input#tin_id` with Axios uploads and `Cancel Upload`) alongside `KycFaceAndIdCheckCard.jsx` (`Start Quick Face Check` / manual review fallback) without repetitive "Required" badges or bulky callout boxes.
   - **Targeted Revision Checklists & Drawers:** Rejections across Admin KYC (`ArtisanVerificationDrawer.jsx`), Catalog/Sponsorship moderation (`ModerationRejectModal.jsx`, `SponsorshipDecisionModal.jsx`), Stock Requests, and Payroll use `RevisionChecklistSelector.jsx` (`config/revisions.php`) paired with requester `RevisionFeedbackBanner.jsx` audit memos styled in warm stone/clay (`bg-stone-50/90`, `border-stone-200/90`, `dot: bg-clay-600` instead of harsh pink alert washes). Resubmitted applications and listings in Super Admin drawers display `Resubmitted for Review` top banners with the `Revision Addressed` badge and green `[✓ Updated]` pills (`InlineRevisionCard.jsx`). Restock request tables (`StockRequestsTable.jsx`) and campaign history sidebars (`Sponsorships.jsx`) decouple detailed revision notes into dedicated slide-over drawers (`SlideOverDrawer`) rather than cramming cards into narrow table cells or sidebars.
   - **Welcome Button Token:** Storefront "View All Products" uses `bg-stone-900 hover:bg-stone-800`.
   - **ConfirmationModal:** Target buttons inside `div[role="dialog"]` to avoid mis-clicking card buttons.

---

## 4. Pre-Flight & CLI Execution Flags

### A. Pre-Flight Handshake & Seeding
Before opening routes:
1. **Browser Check:** Call `list_tabs` (`{"browser_id": "iab"}`) for in-app browser, or confirm Chrome DevTools bridge.
2. **Warmup & Seed:**
   ```powershell
   Invoke-WebRequest -Uri "https://www.likhangkamay.app/ping" -UseBasicParsing | Select-Object -ExpandProperty StatusCode
   php artisan test:seed-personas
   php artisan tinker --execute="`$u = \App\Models\User::where('email', 'test.artisan@likhangkamay.local')->first(); echo 'Elite Check: ' . (`$u->isEliteTier() ? 'CONFIRMED ELITE' : 'FAILED NOT ELITE') . PHP_EOL;"
   ```
   *(Abort immediately if `StatusCode != 200` or not Confirmed Elite).*

### B. Supported Phases
- `/e2e-browser --phase=relay`: Steps 2–5.5 (Storefront, Checkout, GCash, POD, Sales Invoice, Dispute)
- `/e2e-browser --phase=b2b`: Step 7 (Wholesale Supply Hub, MOQ, Sourcing Checkout, Dispatch)
- `/e2e-browser --phase=payroll`: Step 11 (HR Provisioning, Timecards, Statutory Payroll Maker-Checker)
- `/e2e-browser --phase=auth-flow`: Step 10 (Email PIN `000000` & KYC Documents)
- `/e2e-browser --phase=discovery`: Step 8 (Faceted Shop Filter, 3D WebGL Canvas, Wishlist)
- `/e2e-browser --phase=admin-gov`: Step 6 (Dispute Arbitration, Review Moderation, Takedown, Email Studio)
- `/e2e-browser fully` / `--phase=all`: **Complete 3-Stream, 12-Step Assembly Line (All 45 Workflows)**. Read [`references/workflows.md`](file:///c:/laragon/www/LikhangKamay/.agents/skills/e2e-browser/references/workflows.md) and execute sequentially.

### C. Clean Session Evacuation Between Personas
Execute between actor switches:
1. Run `POST /logout` (or `POST /staff/logout/direct` for staff/riders).
2. Clear storage (`window.localStorage.clear(); window.sessionStorage.clear();`).
3. Spawn a fresh tab (`create_tab({"browser_id": "iab"})`).

---

## 5. Dual-Plane Verification & Reporting Output

1. Verify stock deltas & test isolation via `php artisan tinker`:
   ```powershell
   php artisan tinker --execute="`$buyer = \App\Models\User::where('email', 'test.buyer@likhangkamay.local')->first(); `$order = \App\Models\Order::where('user_id', `$buyer->id)->latest('id')->first(); echo `$order->order_number . ' | ' . `$order->status . ' | is_test=' . (`$order->is_test ? 'true' : 'false') . PHP_EOL;"
   ```
2. Write cryptographic JSON Proof-of-Work manifest to `tests/e2e/production_audit/manifests/pow_iab_[timestamp].json`.
3. Present final **3-Stream Production E2E Summary** adhering strictly to the schema in [`references/pow_schema.md`](file:///c:/laragon/www/LikhangKamay/.agents/skills/e2e-browser/references/pow_schema.md):

```markdown
### 3-Stream Assembly Line Production E2E Audit (`/e2e-browser`)

**Target Host:** `https://www.likhangkamay.app`
**PoW Manifest:** `[Link to pow_iab_*.json]`
**Execution Mode:** `Visible Browser (/browser)`
**Elite Seller Status:** `CONFIRMED (super_premium / 16 modules unlocked)`

| Stream / Domain | Actions & Subsystems Covered | State Mutations Corroborated | Fresh Entity IDs | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| ... | ... | ... | ... | **PASS / FAIL** |
```

# Full 3-Stream E2E Browser Workflows Catalog (45 Workflows, 5 Personas)

```text
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
   - Upload `tests\fixtures\defense_assets\Shop Cover Banner (Wide).jpg` (or fallback `C:\Users\acost\OneDrive\Pictures\DEFENSE IMAGES\Shop Cover Banner (Wide).jpg`) as cover banner.
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
5. **Product Markdowns (`/discounts`) & Shop Vouchers (`/seller/vouchers`) Lifecycle CRUD:**
   - On `/discounts` (Elite Product Markdowns tab), create/edit/toggle a product markdown campaign (`POST /discounts`, `PUT /discounts/{id}`, `DELETE /discounts/{id}`).
   - Switch to the **Shop Vouchers** tab (`/seller/vouchers` or `/discounts?tab=vouchers`): click `New Voucher`, create percentage voucher `TESTSAVE10` (`10%`, Min Spend `₱100`, Max Uses `100`, `POST /seller/vouchers`). Assert voucher renders in table/cards.
   - Create temporary voucher `TEMPDELETE15` (`15%`, Min Spend `₱200`), update min spend to `₱250` (`PUT /seller/vouchers/{id}`), then deactivate/delete (`DELETE /seller/vouchers/{id}`).
6. **Active Product Creation with Real 3D Model (`ProductFormModal.jsx` on `/products`):**
   - Click `Add Product`. Fill Title: `"Handcrafted Glazed Ceramic Vase"`, Category: `"Pottery & Ceramics"`, Base Price: `750`, Stock: `50`.
   - Recipe (BOM): Link material `"Stoneware Clay"` (2kg).
   - Upload Cover: `Product\Blue Feather Vase\Main Cover.png`.
   - Upload 3D Model: `Product\Blue Feather Vase\Blue Feather Vase.glb` (1.16MB) in `input[accept=".glb,.gltf"]`.
   - Click `Publish Product`. Assert redirect to `/products` with green success notification.
7. **Catalog Lifecycle Controls, Quick Modals & Bulk Status (`/seller/products`):**
   - Inline Quick Restock Modal: click `+ Restock`, input `5` units (`POST /products/{id}/restock`). Assert stock increments (`50 -> 55`).
   - Inline Quick Deduct Modal: click `- Deduct`, input `5` units, note `"Showroom sample"` (`POST /products/{id}/deduct`). Assert stock returns (`55 -> 50`).
   - Test SKU Archive (`POST /products/{id}/archive`), Reactivate (`POST /products/{id}/activate`), Resubmit (`POST /products/{id}/resubmit`), and Bulk Status Toggle (`POST /products/bulk-status`).
8. **Bulk Inventory CSV Import (`/seller/products`):**
   - Click Bulk Import, attach `tests\fixtures\defense_assets\products_sample.csv`. Confirm import.
9. **Procurement & Raw Materials (`/procurement`):**
   - Add raw material `"Stoneware Clay"`, unit cost `₱50/kg`, safety stock alert `10kg`. Record `2kg` manual write-down. Verify top procurement KPI cards sync via `useRealtime`.
10. **HR & Staff Administration (`/hr`):**
    - Verify `Test HR Operations Staff` and `Test Logistics Rider` exist (`Motorcycle CAV-9876`, license `N01-12-345678`).
11. **Session Evacuation:** Execute Session Evacuation Protocol.

---

### Step 2: Buyer (Batch 1) — Addresses, Commission Chat, Orders A, B, C
*Persona:* `test.buyer@likhangkamay.local`

1. **Authentication:** Log in as `test.buyer@likhangkamay.local`.
2. **Address Book & Workshop Follow Engagement (`/profile?tab=addresses`, `/shop`):**
   - Navigate to `/profile?tab=addresses`. Add secondary Cavite address: `"Block 7 Lot 8 Bucandala III, Imus, Cavite 4103"`. Toggle default & pin adjustment.
   - Navigate to `/shop/cavite-test-craft-workshop`. Click `Follow Shop` (`POST /buyer/shops/toggle-follow`), assert `"Following"`, then toggle back to `"Follow Shop"`.
3. **Custom Commission Negotiation Loop & Resilience Shields (`/messages`):**
   - Open conversation with `Cavite Test Craft Workshop`.
   - **Client-Side 4.5MB Payload Shield Test:** Attach synthetic >4.5MB buffer (`new File([new Uint8Array(5 * 1024 * 1024)], 'oversized.jpg')`). Assert inline warning renders (`"Files must be 4MB or smaller."`), input resets, and send button stays disabled (zero HTTP 413 sent).
   - **WebSocket Drop -> HTTP Polling Degradation Test:** Block `wss://*`. Attach `tests\fixtures\defense_assets\Custom Commission Sketch (Chat Attachment).jpg`. Send message: `"Can you customize this with gold leaf accents for an anniversary commission?"`. Assert background Inertia polling updates bubble without page reload.
4. **Cart Interactivity, Buy-Again & Cleansing Controls:**
   - Navigate to `/my-orders`, click `Buy Again` on a delivered order. Navigate to `/cart`, test `+` / `-` and `Clear Cart` (`POST /cart/clear`). Re-add ₱1 synthetic item `TEST-BAMBOO-01`. Record `stock_before`.
5. **Place Order A (Catalog Promotion + PayMongo GCash Sandbox):**
   - Checkout `/checkout`, select primary Cavite address and **PayMongo GCash** sandbox. Approve sandbox payment. Assert redirect to `/payment/success` -> `/my-orders`. Capture **`ORD-A-XXXXX`** (`Paid`).
6. **Place Order B (In-Store Workshop Pickup & Pickup PIN):**
   - Add item, select **In-Store Workshop Pickup**, select slot, checkout. Verify **Pickup PIN** renders in `/my-orders`. Capture **`ORD-B-XXXXX`**.
7. **Place Order C (Lalamove Courier via COD):**
   - Add item, select **Delivery via Lalamove (COD)**, checkout. Capture **`ORD-C-XXXXX`**.
8. **Multi-Seller Mixed Cart Split Orders (`/checkout`):**
   - Add Item 1 from Workshop A (`test.artisan@likhangkamay.local`) and Item 2 from Workshop B. Assert `/checkout` renders **Multi-Workshop Split Grouping**. Checkout via COD. Assert **two distinct order numbers** minted (`ORD-SPLIT-A-XXXXX` and `ORD-SPLIT-B-XXXXX`).
9. **Session Evacuation:** Execute Session Evacuation Protocol.

---

### Step 3: Artisan (Batch 2) — Order Acceptance, Dispatch, Packing Slips & Exports
*Persona:* `test.artisan@likhangkamay.local`

1. **Authentication:** Log in as `test.artisan@likhangkamay.local`. Verify dashboard `metrics` KPI counters update dynamically via `useRealtime`.
2. **Accept Order A & Deduct BOM Inventory (`/orders`):**
   - Accept `ORD-A-XXXXX` (`Processing`). Verify BOM raw material deduction in `/procurement`.
   - Assign in-house rider (`Test Logistics Rider` / `CAV-9876`).
3. **Dispatch Order C via Lalamove Sandbox (`/orders`) & Option 3 Portal Simulator:**
   - Locate `ORD-C-XXXXX`. Attempt `Book Courier Dispatch (Lalamove)` (if throttled 429/routing error, fall back to `LLM-SANDBOX-CAVITE`).
   - Open `https://partnerportal.lalamove.com/records` (`kurtstanleytalastas@gmail.com` / `Kurt09193939832!`, Manila NCR & South Luzon Sandbox). Advance Order C row status to **Completed / Delivered**.
   - Return to buyer `/my-orders`: click `Order Received` on `ORD-C-XXXXX` to mark `Completed`, unlocking the 1-day dispute warranty.
4. **Bulk Fulfillment Operations & Fleet Dispatch:**
   - Test `Bulk Labels` (`/orders/bulk-labels`), `Bulk Packing Slips` (`/orders/bulk-packing-slips`), and `BulkDispatchOrderModal` (`POST /orders/bulk-dispatch-in-house`).
5. **Commission Chat Quote & Templates (`/messages`):**
   - Reply to buyer commission thread: `"Formal quote for custom gold-leaf commission: ₱1,200."`.
   - Open `ChatAutomationModal.jsx` (`/chat/templates`): create, insert, and delete template. Verify Away/Auto-reply toggle.
6. **Review Engagement (`/reviews`):**
   - Reply (`POST /reviews/{id}/reply`), delete reply (`DELETE /reviews/{id}/reply`), re-reply, and pin (`POST /reviews/{id}/toggle-pin`).
7. **Ledger & Data Exports:** Verify CSV exports stream cleanly without 500 error: `/orders/export`, `/analytics/export`, `/accounting/export`, `/audit-log/export`.
8. **Session Evacuation:** Execute Session Evacuation Protocol.

---

### Step 4: Staff & Rider — Shift Lifecycle, Safety Check, POD & Off-Site Flag
*Personas:* `test.staff@likhangkamay.local` $\rightarrow$ `test.driver@likhangkamay.local`

1. **Staff Shift Operations (`test.staff@likhangkamay.local`):**
   - Navigate to `/staff/attendance`. Simulate off-site coordinates (`14.5995, 120.9842`), verify `is_flagged = true`.
   - Verify shift via Email Security Code `000000` (or PIN `0000`) and real attendance photo file from `tests/fixtures/defense_assets/ArtisanStaff/HR.png`.
   - Mark `ORD-A-XXXXX` packed on `/orders`. Post message in `/team-messages` Logistics channel.
   - Test Take Break (`POST /staff/attendance/break`) & Resume Work (`POST /staff/attendance/resume`).
   - Teardown via `StaffLogoutDecisionPanel` (`Clock Out & Sign Out`) or `POST /staff/logout/direct`.
2. **Session Evacuation:** Execute Session Evacuation Protocol.
3. **Logistics Rider Relay (`test.driver@likhangkamay.local`):**
   - Navigate to `/staff/driver-deliveries`. Assert active dispatches auto-sync via `useRealtime` (`activeDeliveries`).
   - Test Vehicle Safety Check rejection (uncheck Brakes -> blocked), then pass all 5 items (`CAV-9876`).
   - Click `Claim & Start Route` on `ORD-A-XXXXX` (`in_transit`). Open `View Route / Route Map` modal -> verify Leaflet route renders.
   - Dispatch GPS telemetry (`PUT /staff/deliveries/{id}/telemetry`).
   - Click `Complete Delivery`: Recipient `"Test Verified Buyer"`, Relationship `"Direct Recipient"`, upload `tests\fixtures\defense_assets\Proof of Delivery (POD).jpg`. Assert status transitions to `Delivered` and in-house shipping fee is credited (`IN_HOUSE_SHIPPING_CREDITED`).
4. **Session Evacuation:** Execute Session Evacuation Protocol.

---

### Step 5: Buyer (Batch 2) — Receipt, Reviews & Dispute Filing
*Persona:* `test.buyer@likhangkamay.local`

1. **BIR Official Sales Invoice (`/my-orders`):**
   - Download `ORD-A-XXXXX` invoice (`/my-orders/{order_number}/receipt`). Assert BIR Computerized Sales Invoice renders with VAT breakdown. Compute SHA-256 hash.
2. **Submit 5-Star Customer Review & Disputed Review Seed:**
   - Write 5-star review on `ORD-A-XXXXX`: `"Exceptional pottery! Glaze finish is even better in person."`.
   - Submit disputed phrasing review on secondary item: `"Unfair claim: artisan was uncooperative and item arrived with flaws."`.
3. **Buyer Reviews Portal (`/my-reviews`):**
   - Verify sidebar `Artisan Replies` click smooth-scrolls to `#review-{id}` with focus ring.
   - Verify Content Safety Badges (`Public Review`, `Under Moderation Review`, `Passed Safety Review`, `Hidden from Storefront`).
   - Test Edit Review (`PATCH /reviews/{id}`), Delete Review (`DELETE /reviews/{id}`), and Notification Dropdown (`See previous notifications` cursor expansion & deep-link `/my-reviews?review={id}`).
4. **File Return/Dispute on Order C (`/my-orders`):**
   - Click `Return` button on completed `ORD-C-XXXXX`. Reason: `"Defective or Damaged Item"`, Description: `"Item arrived with hairline crack along base."`, attach `tests\fixtures\defense_assets\Product\Broken Image.png`. Submit (`POST /my-orders/{id}/dispute`).
5. **Cancel Return & Route Preview:**
   - Test `Cancel Return Request` (`POST /my-orders/{id}/cancel-return`).
   - Test `Track Delivery` (`GET /my-orders/{id}/route-preview`) Leaflet modal.
6. **Session Evacuation:** Execute Session Evacuation Protocol.

---

### Step 5.5: Artisan (Batch 3) — Counter-Dispute Rebuttal & Review Dispute
*Persona:* `test.artisan@likhangkamay.local`

1. **Artisan Counter-Dispute Rebuttal (`/orders`):**
   - Locate `ORD-C-XXXXX` dispute -> click `Respond to Dispute` (`DisputeResponseModal.jsx`). Select `reject`, enter rebuttal argument, attach `Product\Blue Feather Vase\Main Cover.png`, submit (`POST /disputes/{id}/respond`). Status -> `Pending Admin Arbitration`.
2. **Customer Review Dispute (`/reviews`):**
   - Click `Dispute Review` on the seeded review, Grounds: `"Defamatory / Unfair Claims"`, submit (`POST /reviews/{id}/dispute`).
3. **Session Evacuation:** Execute Session Evacuation Protocol.

---

### Step 6: Admin & Resolution — KYC Zoom, Arbitration, Review Moderation & Takedowns
*Persona:* `test.admin@likhangkamay.local`

1. **Authentication:** Log in as `test.admin@likhangkamay.local` (`/admin/dashboard`).
2. **KYC Document Viewer, Biometric Telemetry & Targeted Revision (`/admin/users-manager?tab=approvals`):**
   - Assert `KycVerificationSummaryCard.jsx` renders 100-point composite score, 1:1 face-match indicator, and forensics badges; assert document zoom viewer renders `Business Permit.png` and `DTI.png`. Test rejection using `RevisionChecklistSelector` (checking specific items like `Valid Government ID (Front)` with per-item notes + overall revision summary). If viewing a resubmission, assert top banner displays `Resubmitted Application Under Review` with the `Revision Addressed` badge, and updated documents display the green `[✓ Updated]` pill (`InlineRevisionCard.jsx`).
3. **Dispute Arbitration Desk (`/admin/disputes`):**
   - Issue arbitration ruling (`50% Partial Refund` / `Approve Full Refund` / `Decline Claim`). For `50% Partial Refund`, verify order status transitions to `Completed` (`payment_status = 'partially_refunded'`) and 50% seller net retention.
4. **Content Safety Moderation Desk (`/admin/compliance`):**
   - Verify `"Select a Moderation Ticket"` empty state renders when no ticket is selected. Uphold/remove disputed review (`PATCH /admin/review-moderation/{id}`).
5. **Catalog & Sponsorship Moderation (`/admin/moderation-queue`, `/admin/catalog`, `/admin/sponsorships`):** Test listing rejection (`ModerationRejectModal`) / sponsorship rejection (`SponsorshipDecisionModal`) with itemized revision checklist fields and direct catalog takedown (`POST /admin/moderation-queue/{id}/takedown`). On resubmitted product listings and sponsorships, assert top banner renders `Resubmitted Listing Under Review` with the `Revision Addressed` badge, and revised fields display the green `[✓ Updated]` pill.
6. **Payout Voucher Generation (`/admin/payouts`):** Verify payout voucher preview (`/seller/payouts/{id}/voucher`) and real-time sync.
7. **User Directory & Atomic Tier Reversion (`/admin/users-manager`):**
   - Add disciplinary note. Override tier `super_premium -> premium` then **immediately revert to `super_premium`**.
8. **Taxonomy CRUD (`/admin/categories`):** Create temporary category `"Artisan Studio Tools"`, then delete cleanly.
9. **Platform Activity Log (`/admin/activity-log`):** Verify action audit stream with actor attribution.
10. **RBAC Hard Security Barrier:** Log in as `test.buyer@likhangkamay.local` and attempt visiting `/admin/dashboard` -> assert **hard redirect to `/` or HTTP 403**.

---

### Step 7: Full Supply Procurement Loop & B2B Wholesale (`/procurement`, `/supply-hub`)
*Personas:* `test.artisan@likhangkamay.local` $\rightarrow$ `test.staff@likhangkamay.local` $\rightarrow$ `artisan.silang@likhangkamay.com`

1. **Staff Restock Request (`/procurement`):** Request `20kg` `"Stoneware Clay"` (`POST /procurement/supplies/{id}/request`).
2. **PO Ordered & Inward Receiving:** Mark PO ordered (`POST /procurement/stock-requests/{id}/ordered`) -> Click `Receive Inward Goods` (`POST /procurement/stock-requests/{id}/receive`) -> assert `+20kg` stock increment.
3. **Accounting Maker-Checker Stock Rejection & Drawer Decoupling:** Reject redundant release (`POST /accounting/reject/{stockRequest}`) using `RevisionChecklistSelector` itemized fields + overall revision note. On `/procurement/stock-requests`, verify the table row keeps clean cell height with `• Declined` badge and `View Feedback` action (avoiding crammed table cells), clicking which opens the `SlideOverDrawer` with the request summary and warm stone audit memo banner.
4. **Wholesale Listing (`/supply-hub/my-listings`):** Configure wholesale listing (`MOQ: 5`, `₱45/kg`).
5. **Buyer Artisan B2B Sourcing (`/supply-hub`):** Log in as `artisan.silang@likhangkamay.com` (`LikhangKamay2026!`). Verify `/product/{id}` access clearance (404 for guests/buyers). Test MOQ guardrail (qty `3` blocked, `5` allowed). Add to `/supply-hub/cart`, checkout COD at `/supply-hub/checkout`. Capture `B2B-ORD-XXXXX`.
6. **Wholesale Sales Dispatch (`/supply-hub/sales`):** Switch back to `test.artisan`. Verify `useRealtime` real-time sales sync, expand accordions (`Pricing Details`, `Timeline`), accept & open `DispatchOrderModal`, select rider & click `Confirm Studio Dispatch`, download wholesale invoice (`/supply-hub/sales/{id}/invoice`).
7. **Inbound Delivery Confirmation (`/supply-hub/orders`):** Switch to `artisan.silang`, click `Confirm Delivery`. Assert stock transfers cleanly.
8. **Horizontal Scroll Hitbox Isolation:** Verify wheel events over horizontal tab pills track drive `scrollLeft` without changing `window.scrollY` (`0`).

---

### Step 8: Buyer Discovery, Faceted Search & Wishlist (`/shop`, `/wishlist`)
*Persona:* `test.buyer@likhangkamay.local`

1. **Faceted Search (`/shop`):** Filter by Municipality (`Imus`), Material (`Clay`/`Bamboo`), Sort (`Price: Low to High`). Assert `TEST-BAMBOO-01` renders.
2. **3D Canvas & Presign (`/3d-manager`):** Assert `<canvas>` initializes without WebGL context loss, test OrbitControls drag, test `/3d-manager/presign` & `DELETE /3d-manager/{product}`.
3. **Wishlist Heart Toggle (`/wishlist`):** Toggle heart -> verify `/wishlist` -> click `Move to Cart` -> verify subtotal recalculation.

---

### Step 9: Buyer Order Cancellation & Atomic Stock Rollback (`/my-orders/{id}/cancel`)
*Persona:* `test.buyer@likhangkamay.local`

1. Record baseline stock (`stock_baseline`) of `TEST-BAMBOO-01`.
2. Place immediate COD test order (`ORD-CANCEL-XXXXX`). Assert stock decremented (`stock_baseline - 1`).
3. Cancel order (`POST /my-orders/{id}/cancel`) while `Pending`. Assert stock atomically restored to `stock_baseline`.
4. Test address re-order validation (`POST /my-orders/{id}/change-address-reorder`).
5. **Dirty Data & Vacated Workshop Guard:** Add inactive workshop item, visit `/checkout` -> assert defensive redirect to `/cart` with warning (`"One or more items in your cart belong to an inactive workshop..."`) and zero 500 errors.

---

### Step 10: Full Auth, Face Check Fallback & Artisan KYC Onboarding Wizard (`/register`, `/verify-email`, `/artisan/setup`)
*Personas:* Synthetic New Onboarding User (`test.onboarding@likhangkamay.local` or fresh setup state)

1. **Buyer Registration & Email Verification (`/register`, `/verify-email`):**
   - Verify registration presents `Quick Account Face Check` (`Start Quick Face Check` / `Skip until first order`). If skipped, confirm `requires_checkout_face_check` prompts `CheckoutFaceCheckModal` (`POST /profile/verify-face`) on non-test first checkout (COD and GCash/Maya).
   - Submit test verification code `000000` (or `123456`). Assert redirect to setup wizard for artisans.
2. **Artisan KYC Setup Wizard (`/artisan/setup`):**
   - **Step 1 (Workshop Profile):** Workshop Name `"Cavite Heritage Crafts"`, Bio `"Traditional weaving and ceramics from Alfonso, Cavite."`, Municipality `"Alfonso"`, Address `"Sitio Maligaya, Alfonso, Cavite"`.
   - **Step 2 (Streamlined Legal KYC Documents & Face Check):** Assert clean header (zero redundant subtitle/security callout/required badges, compact 125px `FileUploadField` dropzones with `Cancel Upload` recovery). Bind defense files to exact semantic IDs:
     - `Business Permit.png` $\rightarrow$ `input#business_permit`
     - `DTI.png` $\rightarrow$ `input#dti_registration`
     - `Tin ID.png` $\rightarrow$ `input#tin_id`
     - `Valid ID.png` $\rightarrow$ `input#valid_id`
     - Trigger `KycFaceAndIdCheckCard` (`Start Quick Face Check` or manual review fallback if headless without webcam). If prior application was returned with `RevisionRequest`, verify `RevisionFeedbackBanner` highlights flagged items cleanly, while unflagged approved documents render the `<Lock /> Approved` badge and are strictly locked against modification or deletion.
   - **Step 3 (Terms & Submission):** Accept Artisan Terms (`POST /artisan/accept-terms`) and click `Submit Application`. Assert status updates to `pending` / `Application Pending Admin Verification` and active revisions resolve cleanly (`resolveActiveRevisions()`).

---

### Step 11: Staff Provisioning, Attendance Exceptions & Maker-Checker Sign-off (`/hr`, `/accounting`)
*Personas:* `test.artisan` $\rightarrow$ `test.staff` $\rightarrow$ `test.artisan`

1. **Staff Provisioning & Atomic Cleanup (`/hr`):**
   - Create apprentice seat (`Test Apprentice Potter`, `test.apprentice.lk@gmail.com`) with granular permissions (`Orders: can_view`, `Products: can_edit`, `HR: no_access`).
   - Test Suspend (`POST /hr/employees/{id}/toggle-suspension`), Reactivate, and **Terminate Seat** (`DELETE /hr/employees/{id}`).
2. **Staff Password Reset & Atomic Reversion (`/staff/password`):** Update to `TempPass2026!`, then **immediately revert to `LikhangKamayTest2026!`**.
3. **Team Messages Channels & Threads (`/team-messages`):** Create channel `pottery-kiln-qc`, post message, add emoji reaction, reply in `ThreadSidebar.jsx`.
4. **HR Attendance Approval & Timecard (`/hr`):** Approve flagged off-site attendance session (`POST /hr/attendance-sessions/{id}/approve`). Audit employee timecard (`/hr/employees/{employee}/time-card`).
5. **Payroll Gen -> Accounting Rejection -> Approval:** Generate payroll dry run (assert SSS, PhilHealth, Pag-IBIG, BIR TRAIN deductions), submit for approval (`POST /hr/payroll/{payroll}/submit`), reject from accounting (`POST /accounting/payroll/{payroll}/reject`) with itemized `RevisionChecklistSelector` items, verify `RevisionFeedbackBanner` renders on HR payroll view styled as an earthy warm stone audit memo (`bg-stone-50/90`, `border-stone-200/90`, `dot: bg-clay-600` instead of harsh pink wash), resubmit, and approve (`POST /accounting/payroll/{payroll}/approve`).
6. **Stock Release Approval & BIR 2307 Export:** Approve stock release (`POST /accounting/release/{stockRequest}`) and export BIR 2307 statement (`GET /accounting/settlement/export`).
7. **Location Cleanup & Trash Recovery (`/shop-locations`, `/admin/trash`):** Delete `"Silang Ceramic Studio"`, test trash restoration (`POST /admin/trash/restore`).

---

### Step 12: Monetization & Admin Email Studio (`/subscription`, `/admin/settings/email-templates`)
*Personas:* `test.artisan` $\rightarrow$ `test.admin`

1. **Subscription & Retention (`/subscription`):** Verify `Elite Tier (All 16 Modules Unlocked)`. Trigger retention modal (`Manage Auto-Renewal` -> `Cancel Auto-Renewal`), dismiss cleanly.
2. **Ad Sponsorship Boost & Feedback Drawer (`/sponsorships`):** Create ₱50/day campaign on `TEST-BAMBOO-01`. For declined/returned sponsorships in the campaign history sidebar, assert status displays `Revision requested` + `View Feedback` action (avoiding squished sidebar text), clicking which opens the `SlideOverDrawer` with the product summary card and warm stone audit memo banner.
3. **Admin Email Studio (`/admin/settings/email-templates`):** Inspect variable replacement (`{{buyer_name}}`, `{{order_number}}`), test live email dispatch (`POST /admin/settings/email-templates/dispatch`) to `test.buyer@likhangkamay.local`.

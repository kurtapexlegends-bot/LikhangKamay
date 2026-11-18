# Full 3-Stream E2E Browser Workflows Catalog (45 Workflows, 5 Personas)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STREAM A: Commercial Core, Locations & Complete Dispute Resolution                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Artisan (Batch 1): Storefront, Tax/Payout, Studio, SKU Lifecycle, Help Center, 3D │
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
│ 8. Buyer: Faceted Filter (/shop), Wishlist, 3D Canvas, Help Center & FAQ Hub (/help)   │
│ 9. Buyer: Immediate Order Cancellation (Assert +1 Stock Rollback) & Address Reorder    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ STREAM C: Enterprise Governance, HR Exceptions & Staff Provisioning                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 10. Buyer & Artisan: Email Code Verification & Artisan KYC Setup Wizard with Permits   │
│ 11. HR & Accounting: Staff Seat Provisioning & Teardown, Off-Site Attendance Override, │
│     HR Payroll Gen -> Accounting Rejection -> Final Approval, BIR 2307, Location Purge │
│ 11.5 Team Approvals: Role Scoping (Owner/Manager), Self-Approval Defense, Product Draft│
│      Triggers, Multi-Group Discounts, Compensation Approvals, Batch Processing        │
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
11. **Help Center Studio Escalation & Header Navigation (`/help?tab=artisan`, `SellerHeader.jsx`):**
    - Click user profile avatar dropdown in `SellerHeader.jsx`. Verify `Settings` is placed before `Help Center` with normal (unbolded) font weight.
    - Click `Help Center` (`/help?tab=artisan`).
    - Assert page title: `"Studio Help Center & Artisan FAQ"`.
    - Assert `allowedPersona = 'artisan'`: verify artisan categories are present (`Workshop Setup & Verification`, `POS & Offline Sales`, `Payouts & BIR Taxes`, `Wholesale Supply Hub`), and verify cross-persona switcher tab (`Buyer Guide`) is hidden for non-admins.
    - Test FAQ accordion expand/collapse toggle (`Expand All` / `Collapse All`).
    - Test direct action links: `"Studio Orders & Fulfillment"` routes cleanly to `route('orders.index')` (verifying zero Ziggy route errors).
    - Click `"Artisan Merchant Desk"` button to open `SupportContactModal.jsx` in artisan mode. Verify pre-selected topics (`Shop Verification & Documents`, `Payouts & BIR 2307`, `POS Terminal & Hardware`, `Wholesale Supply Hub`, `Other Studio Inquiry`). Verify direct Gmail Web compose link (`https://mail.google.com/mail/?view=cm...`) and `"Copy Email Address"` action (preventing raw `mailto:` Outlook popups on Windows). Dismiss modal cleanly.
12. **Session Evacuation:** Execute Session Evacuation Protocol.

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
8. **Walk-In POS Terminal, Paginated History & 6-Digit Supervisor Void PIN (`/seller/pos`, `/profile`, `/orders?status=Walk-In`, `/accounting`):**
   - Configure personal 6-digit Void PIN (`PUT /profile/pos-void-pin` via `UpdatePosVoidPinForm.jsx`), verify `/seller/pos` opens smoothly across all subscription tiers (`standard`, `premium`, `super_premium`).
   - Add catalog product (verify promo stock & split-tier pricing if discounted), select `Cash` / `GCash` / `Maya`, click `Charge` -> `Complete Sale` (`POST /seller/pos/checkout`), verify BOM deduction & 80mm receipt modal (`/seller/pos/{order}/receipt`).
   - Open `History` drawer (`PosRecentSalesDrawer.jsx`), assert paginated server fetch (`GET /seller/pos/history`) across `All Payments` (`POS Cash`, `POS GCash`, `POS Maya`), flexible dates (`Yesterday`, `Specific Date`, `Custom Range`), and location isolation (`All Branches` owner-only; branch-scoped for managers/accounting).
   - Authorize void (`POST /seller/pos/{order}/void`) with supervisor dropdown + 6-digit PIN + min 5-char reason; verify stock reversal and `'owner'`/`'artisan'` actor attribution.
   - Verify `/orders` `Walk-In` tab filter (`status=Walk-In` / `payment_method=pos`) and `/accounting` `AccountingFilterPanel` sales channel filters (`Online Store (All)`, `Walk-In POS (All)`, `POS Cash`, `POS GCash`, `POS Maya`) + settlement inclusion.
9. **Session Evacuation:** Execute Session Evacuation Protocol.

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
   - Click `Return` button on completed `ORD-C-XXXXX`. Select eligible claim reason (`input[name="damage_reason_code"]`, e.g., `damaged_in_transit`), enter details `"Item arrived with hairline crack along base."`, attach required photo angles (`Item Defect / Damage Close-up` + `Shipping Packaging & Waybill`) using `tests\fixtures\defense_assets\Product\Broken Image.png` and `tests\fixtures\defense_assets\Proof of Delivery (POD).jpg`, confirm all eligibility checklist checkboxes, and click `Submit Return Request` (`POST /my-orders/{id}/dispute`).
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
2. **KYC Document Viewer, Biometric Telemetry, OCR Signals & Targeted Revision (`/admin/users-manager?tab=approvals`):**
   - Assert `KycVerificationSummaryCard.jsx` renders 100-point composite score, 1:1 face-match indicator, and forensics badges; assert submitted document cards render automated OCR credential tags and extracted pills (`Mayor's Permit Verified`, `DTI Matched`, `TIN Detected`, `Gov ID Detected`); assert `DocumentMagnifierModal.jsx` opens with interactive pan/zoom and toggles the **OCR Signals** inspection bar with confidence score and one-click `Copy` action. Test rejection using `RevisionChecklistSelector` (checking specific items like `Valid Government ID (Front)` with per-item notes + overall revision summary). If viewing a resubmission, assert top banner displays `Resubmitted Application Under Review` with the `Revision Addressed` badge, and updated documents display the green `[✓ Updated]` pill (`InlineRevisionCard.jsx`).
3. **Dispute Arbitration Desk (`/admin/disputes`) & Dynamic Policies (`/admin/settings/policies`):**
   - Verify policy checklist confirmation badges and resolved proof photo thumbnails render cleanly in `DisputeInspectorContent.jsx`. Issue arbitration ruling (`50% Partial Refund` / `Approve Full Refund` / `Decline Claim`). For `50% Partial Refund`, verify order status transitions to `Completed` (`payment_status = 'partially_refunded'`) and 50% seller net retention.
   - Open `/admin/settings/policies`: verify `Return & Refund Criteria` editor, legal policy tabs, and version history (`Publish` / `Activate`) work without dot-notation validation errors.
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

### Step 8: Buyer Discovery, Faceted Search, Wishlist & Help Center (`/shop`, `/wishlist`, `/help`)
*Persona:* `test.buyer@likhangkamay.local`

1. **Faceted Search (`/shop`):** Filter by Municipality (`Imus`), Material (`Clay`/`Bamboo`), Sort (`Price: Low to High`). Assert `TEST-BAMBOO-01` renders.
2. **3D Canvas & Presign (`/3d-manager`):** Assert `<canvas>` initializes without WebGL context loss, test OrbitControls drag, test `/3d-manager/presign` & `DELETE /3d-manager/{product}`.
3. **Wishlist Heart Toggle (`/wishlist`):** Toggle heart -> verify `/wishlist` -> click `Move to Cart` -> verify subtotal recalculation.
4. **Buyer Help Center & Support Contact Modal (`/help`, `BuyerUserMenu.jsx`, `Footer.jsx`):**
   - From header `BuyerUserMenu.jsx` or `Footer.jsx`, navigate to `/help`.
   - Assert page title: `"Help Center & FAQ"`.
   - Assert `allowedPersona = 'buyer'`: verify buyer categories render (`Ordering & Cavite Delivery`, `Pottery Care & Breakage`, `Returns & Disputes`, `Payments & Invoices`, `Account & Biometrics`), and verify cross-persona switcher tab (`Artisan Guide`) is hidden for non-admins.
   - Test category filter pills: click `"Returns & Disputes"`, verify only return-related FAQs are shown; click `"All"`, verify all buyer questions display.
   - Test FAQ accordion expand/collapse: click `"Expand All"`, verify all answers expand; click `"Collapse All"`, verify all answers collapse.
   - Test search input: type `"broken"`, assert `"What should I do if my pottery arrives broken or defective?"` matches; clear search.
   - Click `"Email Platform Support"` button to open `SupportContactModal.jsx`. Verify modal header `"Contact Platform Support"`, select inquiry topic (`Order & Delivery Status`, `Damaged or Broken Pottery`, `Return or Refund Request`, `Payment or GCash Issue`, `General Inquiry`). Verify primary CTA is `"Open in Gmail (Web)"` linking to `https://mail.google.com/mail/?view=cm&fs=1&to=likhangkamay.co@gmail.com...` and secondary CTA is `"Copy Email Address"`. Dismiss modal cleanly.

---

### Step 9: Buyer Order Cancellation & Atomic Stock Rollback (`/my-orders/{id}/cancel`)
*Persona:* `test.buyer@likhangkamay.local`

1. Record baseline stock (`stock_baseline`) of `TEST-BAMBOO-01`.
2. Place immediate COD test order (`ORD-CANCEL-XXXXX`). Assert stock decremented (`stock_baseline - 1`).
3. Cancel order (`POST /my-orders/{id}/cancel`) while `Pending`. Assert stock atomically restored to `stock_baseline`.
4. Test address re-order validation (`POST /my-orders/{id}/change-address-reorder`).
5. **Dirty Data & Vacated Workshop Guard:** Attempt to add an item from an expired artisan (`POST /cart`) -> assert rejection with `"This workshop is currently taking a break"`. For existing cart items, visit `/cart` -> assert cart item renders unavailable status badge (`"Workshop is currently taking a break"`), visit `/checkout` -> assert defensive redirect to `/cart` with warning (`"One or more items in your cart belong to an inactive workshop..."`), and assert `QuoteCheckoutShipping` returns HTTP 422 with zero 500 errors.

---

### Step 10: Full Auth, Face Check Fallback & Artisan KYC Onboarding Wizard (`/register`, `/auth/complete-profile`, `/verify-email`, `/artisan/setup`)
*Personas:* Synthetic New Onboarding User (`test.onboarding@likhangkamay.local` or fresh setup state)

1. **Buyer Registration & Email Verification (`/register`, `/auth/complete-profile`, `/verify-email`):**
   - **Standard Registration (`/register`):** Verify registration presents `Quick Account Face Check` (`Start Quick Face Check` / `Skip until first order`). If skipped, confirm `requires_checkout_face_check` prompts `CheckoutFaceCheckModal` (`POST /profile/verify-face`) on non-test first checkout (COD and GCash/Maya).
   - **Google OAuth Registration (`/auth/complete-profile`):** When registered via Google OAuth, verify `CompleteProfile.jsx` integrates `RegisterFaceCheckCard` with live camera capture (`Start Quick Face Check`) and `"Skip until first order"` fallback, saving liveness metadata and facial descriptor vectors (`POST /auth/complete-profile`).
   - Submit test verification code `000000` (or `123456`). Assert redirect to setup wizard for artisans.
2. **Artisan KYC Setup Wizard (`/artisan/setup`):**
   - **Step 1 (Workshop Profile):** Workshop Name `"Cavite Heritage Crafts"`, Bio `"Traditional weaving and ceramics from Alfonso, Cavite."`, Municipality `"Alfonso"`, Address `"Sitio Maligaya, Alfonso, Cavite"`.
   - **Step 2 (Streamlined Legal KYC Documents, Client-Side OCR & Face Check):** Assert clean header (zero redundant subtitle/security callout/required badges, compact 125px `FileUploadField` dropzones with `Cancel Upload` recovery). Bind defense files to exact semantic IDs and verify instant client-side OCR verification pills (`Mayor's Permit Verified`, `DTI Matched`, `TIN Detected`, `Gov ID Detected`) before saving Step 2 (`POST /artisan/setup` preserves `kyc_verification_meta['ocr']` alongside biometrics):
     - `Business Permit.png` $\rightarrow$ `input#business_permit`
     - `DTI.png` $\rightarrow$ `input#dti_registration`
     - `Tin ID.png` $\rightarrow$ `input#tin_id`
     - `Valid ID.png` $\rightarrow$ `input#valid_id`
     - Trigger `KycFaceAndIdCheckCard` (`Start Quick Face Check` or manual review fallback if headless without webcam). If prior application was returned with `RevisionRequest`, verify `RevisionFeedbackBanner` highlights flagged items cleanly, while unflagged approved documents render the `<Lock /> Approved` badge and are strictly locked against modification or deletion.
   - **Step 3 (Terms & Submission):** Accept Artisan Terms (`POST /artisan/accept-terms`) and click `Submit Application`. Assert status updates to `pending` / `Application Pending Admin Verification` and active revisions resolve cleanly (`resolveActiveRevisions()`).

---

### Step 11: Staff Provisioning, Attendance Exceptions & Maker-Checker Sign-off (`/hr`, `/accounting`)
*Personas:* `test.artisan` $\rightarrow$ `test.staff` $\rightarrow$ `test.artisan`

1. **Staff Provisioning, Private Employee Documents & Atomic Cleanup (`/hr`):**
   - Create apprentice seat (`Test Apprentice Potter`, `test.apprentice.lk@gmail.com`) with granular permissions (`Orders: can_view`, `Products: can_edit`, `HR: no_access`) and staged document attachment (compressed client-side `<400KB` / presigned via `POST /api/uploads/presign` folder `employee_documents`).
   - Verify private document streaming (`GET /hr/employees/{employee}/documents/{document}/file`), inline preview (`blob:` / authenticated URL), attachment download (`?download=1`), and clean document + private storage cleanup upon **Terminate Seat** (`DELETE /hr/employees/{id}`).
2. **Staff Password Reset & Atomic Reversion (`/staff/password`):** Update to `TempPass2026!`, then **immediately revert to `LikhangKamayTest2026!`**.
3. **Team Messages Channels & Threads (`/team-messages`):** Create channel `pottery-kiln-qc`, post message, add emoji reaction, reply in `ThreadSidebar.jsx`.
4. **HR Attendance Approval & Timecard (`/hr`):** Approve flagged off-site attendance session (`POST /hr/attendance-sessions/{id}/approve`). Audit employee timecard (`/hr/employees/{employee}/time-card`).
5. **Payroll Gen -> Accounting Rejection -> Approval:** Generate payroll dry run (assert SSS, PhilHealth, Pag-IBIG, BIR TRAIN deductions), submit for approval (`POST /hr/payroll/{payroll}/submit`), reject from accounting (`POST /accounting/payroll/{payroll}/reject`) with itemized `RevisionChecklistSelector` items, verify `RevisionFeedbackBanner` renders on HR payroll view styled as an earthy warm stone audit memo (`bg-stone-50/90`, `border-stone-200/90`, `dot: bg-clay-600` instead of harsh pink wash), resubmit, and approve (`POST /accounting/payroll/{payroll}/approve`).
6. **Stock Release Approval & BIR 2307 Export:** Approve stock release (`POST /accounting/release/{stockRequest}`) and export BIR 2307 statement (`GET /accounting/settlement/export`).
7. **Location Cleanup & Trash Recovery (`/shop-locations`, `/admin/trash`):** Delete `"Silang Ceramic Studio"`, test trash restoration (`POST /admin/trash/restore`).

---

### Step 11.5: Team Approvals Maker-Checker & Governance Desk (`/seller/approvals`)
*Personas:* `test.staff@likhangkamay.local` $\rightarrow$ `test.artisan@likhangkamay.local`

1. **Role-Based Scope & Access Boundary Isolation:**
   - Authenticate as restricted staff without approval permissions. Navigate to `/seller/approvals` $\rightarrow$ assert clean fallback to `/staff/dashboard` or HTTP 403 (preventing unauthorized operational access).
   - Authenticate as Staff Manager with permissions (`manage_products`, `manage_discounts`, `manage_hr`). Access `/seller/approvals` $\rightarrow$ assert domain filters display scoped accessible domains (`Products`, `Discounts`, `Compensation`, `Returns`).
2. **Self-Approval Prevention Shield (`OwnerApprovalService`):**
   - Attempt to self-approve a request created by the currently authenticated user (`POST /seller/approvals/{id}/approve` or `POST /seller/approvals/batch-approve`).
   - Assert HTTP 403 / validation block with message: `"You cannot approve your own request."` (Preventing maker-checker collision vulnerabilities).
3. **Product Draft Smart Trigger & Inspection:**
   - Staff crafts new product listing or updates sensitive price/title attributes $\rightarrow$ status flags `needs_approval` and pending approval is created.
   - Artisan Workshop Owner opens `/seller/approvals` $\rightarrow$ clicks `Review Details` on the pending product draft.
   - Assert `ApprovalDetailsDrawer` mounts `ApprovalProductDraftBreakdown.jsx` with before/after diff cards and media asset previews.
4. **Staff Discount & HR Compensation Approvals:**
   - Verify pending multi-group staff discounts and compensation adjustments render itemized diff summaries with clean whitespace-nowrap badges.
   - Test single approval (`POST /seller/approvals/{id}/approve`) and decline with reason (`POST /seller/approvals/{id}/decline` via `ApprovalDeclineModal.jsx`).
5. **Product Archival Auto-Cleanup:**
   - Archive product with pending approval (`POST /products/{id}/archive`) $\rightarrow$ assert associated pending approval automatically updates to cancelled status, purging dangling queue items.
6. **Batch Approval Processing:**
   - Select multiple eligible pending requests via checkbox selection $\rightarrow$ click `Approve Selected` (`POST /seller/approvals/batch-approve`). Assert all selected requests transition to approved with green notification toast.

---

### Step 12: Monetization & Admin Email Studio (`/subscription`, `/admin/settings/email-templates`)
*Personas:* `test.artisan` $\rightarrow$ `test.admin`

1. **Subscription Tiers, Billing Cycles & Paywall Gate (`/subscription`, `SubscriptionPaywallGate.jsx`):**
   - **Active Subscription Workspace (`/subscription`):** Verify paid-only tiers: Basic ₱349/mo (₱3,350/yr), Premium ₱699/mo (₱6,710/yr), Elite ₱1,299/mo (₱12,470/yr) with zero active free options. Test smooth commitment toggle between `Monthly Billing` and `Annual Commitment` (verifying `SAVE 20%` badge and dynamic ₱-savings pricing updates). Verify `Elite Tier (All 16 Modules Unlocked)` status for confirmed test artisan. Trigger retention modal (`Manage Auto-Renewal` -> `Cancel Auto-Renewal`), dismiss cleanly.
   - **Expired Artisan Paywall Gate Simulation:** Authenticate as an artisan with `subscription_expires_at` in the past. Attempt navigation to any `/seller/*` route -> assert immediate redirection to `/subscription` rendered under `SubscriptionPaywallGate.jsx` (verifying isolated layout with zero workspace navigation/sidebar leak, `"YOUR PREVIOUS PLAN"` pre-selection pill, and one-click renewal button). Verify logout action terminates session cleanly.
   - **Staff of Inactive Workshop Lock:** Authenticate as staff of an expired artisan. Attempt navigation to `/staff/dashboard` or `/staff` -> assert direct redirect to `route('staff.subscription.locked')` rendering `Holding.jsx` with `"Workshop Subscription Inactive"`.
   - **Public Storefront Inactive State:** Open `/shop/{expired-artisan-slug}` as guest or buyer -> assert `"Workshop Taking a Break"` notice displays and catalog/search controls are cleanly hidden.
2. **Ad Sponsorship Boost & Feedback Drawer (`/sponsorships`):** Create ₱50/day campaign on `TEST-BAMBOO-01`. For declined/returned sponsorships in the campaign history sidebar, assert status displays `Revision requested` + `View Feedback` action (avoiding squished sidebar text), clicking which opens the `SlideOverDrawer` with the product summary card and warm stone audit memo banner.
3. **Admin Email Studio (`/admin/settings/email-templates`):** Inspect variable replacement (`{{buyer_name}}`, `{{order_number}}`), test live email dispatch (`POST /admin/settings/email-templates/dispatch`) to `test.buyer@likhangkamay.local`.

## Production coverage checklist

### Phase 1: Guest Visitor & Visual Quality Experience
- Navigates `/`, `/shop`, `/categories`, `/help`, and Product Detail pages.
- Validates 3D WebGL Canvas loading and graceful fallback states.
- Validates Help Center & FAQ Hub (`/help`) for guest visitors: verifies guest default persona (`buyer`), search input debouncing, category filter pills, accordion expand/collapse, and support contact modal launch.
- Audits DOM for anti-AI slop (gradient card borders), engineering jargon, and decorative emojis.
- Asserts that all public pages return HTTP 200 without React hydration crashes.

### Phase 2: Registered Buyer Journey & Inertia Checkout
- Authenticates with buyer credentials (`ACCOUNTS.buyer`).
- Tests Cart operations: item increment/decrement, item removal, subtotal computation.
- Tests Address Book loading and structured Cavite address form validation.
- Navigates to `/checkout`, asserting that asynchronous shipping quote calculations resolve without swallowing 422 errors or locking buttons in infinite spinners.
- Validates workshop pickup checkout, verifying support for instant online prepayment (GCash/Maya) alongside Cash on Pickup with 4-digit PIN verification.
- Verifies biometric checkout safety gate isolation: synthetic `is_test = true` accounts bypass blocking `CheckoutFaceCheckModal` prompts via `User::requiresCheckoutFaceCheck()`, while unverified non-test buyers without `kyc_liveness_verified_at` must pass `POST /profile/verify-face` (`profile.verify-face`) once before COD or online prepayment checkout.
- Validates Philippine BIR 12% VAT-inclusive pricing disclosures on checkout summary.
- Validates that Inertia shared props (`auth`, `cart`, `flash`) are intact.
- Audits My Orders management, live courier tracking map contracts (`/my-orders/{id}/route-preview`), and verified BIR Computerized Sales Invoice printable HTML generation (`/my-orders/{id}/receipt`, returning `view('pdf.receipt')`).
- Audits My Reviews management portal (`/my-reviews`), verifying visual parity with My Orders, sidebar artisan replies feed, content safety moderation badges (`Public Review`, `Under Moderation Review`, `Passed Safety Review`, `Hidden from Storefront`), review edit modal (`PATCH /reviews/{id}`), review deletion (`DELETE /reviews/{id}`), and notification deep-linking (`/my-reviews?review={id}`).
- Audits Buyer User Menu and navigation bar controls: profile modal navigation (`[Profile]` with User icon), reviews portal shortcut (`[My Reviews]` with Star icon), dynamic email verification status pill (`Security: Verified` in emerald or `Unverified` in amber), and cart persistence hygiene (clearing guest session carts upon checkout/login).
- Audits Buyer Help Center navigation: clicks Help Center in Buyer User Menu (`BuyerUserMenu.jsx`) and footer (`Footer.jsx`), asserting redirect to `/help` with `allowedPersona = 'buyer'`, presence of buyer categories (Cavite delivery, warranty, returns, payments, face check), complete absence of artisan switcher tabs for non-admins, and support modal escalation (`SupportContactModal.jsx`) with direct Gmail Web compose link (`https://mail.google.com/mail/?view=cm...`) and clipboard copy.
- Audits Notification Dropdown: Facebook-style dual-layer in-dropdown pagination (10 notifications limit before displaying `See previous notifications` trigger), dynamic cursor pagination within popover, filter pills (`All`, `Unread`, contextual tabs), and non-intrusive full-page routing preserved for mobile viewports (`/notifications`).

### Phase 3: Artisan / Seller Studio Operations & Procurement Loop
- Authenticates with seller credentials (`ACCOUNTS.seller`).
- Validates Seller Dashboard loading, workshop pickup schedule configuration, and order management.
- Audits Seller Header profile dropdown menu: verifies `Settings` is placed before `Help Center` with normal (unbolded) font weight, and clicking Help Center navigates to `/help?tab=artisan` with `allowedPersona = 'artisan'`, showing studio operational FAQs (verification, POS, payouts, BIR 2307, wholesale) with zero buyer switcher tabs and verified Ziggy route mapping for `orders.index` (`Studio Orders & Fulfillment`).
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
- Audits Accounting ledger, FundMetrics KPI cards, `AccountingFilterPanel` sales channel filters (`Online Store` vs `Walk-In POS` across Cash/GCash/Maya/COD), statutory summary banner in pending payroll review drawers, and CSV ledger export with employer contribution liabilities.
- **Walk-In POS Terminal & Supervisor Void PIN (`/seller/pos`):** Audits tier-universal walk-in POS access (`standard` through `super_premium`), atomic promo-stock split pricing & BOM raw-material deduction (`POST /seller/pos/checkout`), paginated filterable history (`GET /seller/pos/history` with `All Payments`, `Today`/`Yesterday`/`Specific Date`/`Custom Range`, and branch-scoped isolation for managers/accounting vs global visibility for owners), printable 80mm thermal receipts (`/seller/pos/{order}/receipt`), 6-digit per-supervisor Void PIN authorization (`PUT /profile/pos-void-pin` + `POST /seller/pos/{order}/void`), and `/orders?status=Walk-In` filtering.
- Audits Orders Fulfillment Center, bulk label controls, and interactive road route previews (`/orders/{id}/route-preview`) with Nominatim geocoding & Leaflet road routing.
- Audits Employees & Payroll portal, including Staff Directory, Employee Form Modal, private Employee Document vault (`api.uploads.presign` folder `employee_documents` + authenticated `/hr/employees/{employee}/documents/{document}/file` streaming), attendance heatmaps, real-time statutory deduction calculation inspector, and the Payroll Run Show desk (`hr.payroll.show`).
- Validates Customer Reviews desk master-detail layout (`/reviews`) and team messaging.

### Phase 4: Staff Attendance, Provisioning & In-House Logistics
- Authenticates with staff credentials (`ACCOUNTS.staff`).
- Tests Time Card loading and Attendance clock-in modal with camera face check initialization and PIN fallback (`0000`).
- **Off-Site Attendance Flagging & HR Override:** Simulates off-site clock-in coordinates outside Cavite bounds (`is_flagged = true`), verifying that HR receives flagged attendance and can execute override approvals (`POST /hr/attendance-sessions/{id}/approve`).
- **Staff Provisioning Lifecycle & Granular Matrix:** Validates artisan provisioning of apprentice staff accounts (a fresh synthetic address on an approved test domain) with custom permissions matrix (orders, products, hr), account suspension toggle, and clean seat termination (`DELETE /hr/employees/{id}`) to prevent production seat leaks.
- **Payroll Maker-Checker Rejection & Targeted Revision Loop:** Tests accountant rejection of draft payroll run batches (`POST /accounting/payroll/{payroll}/reject`) and stock requests (`POST /accounting/reject/{stockRequest}`) using `RevisionRequest` checklists (`config/revisions.php`), asserting `RevisionFeedbackBanner` rendering as an earthy warm stone audit memo on HR payroll runs. For stock requests and sponsorships, asserts that detailed feedback is decoupled into dedicated slide-over drawers (`SlideOverDrawer`) with clean status badges (`• Declined` / `Revision requested`), keeping data tables and narrow sidebars uncompromised before resubmission clears active revisions and leads to final approval (`POST /accounting/payroll/{payroll}/approve`).
- Validates Driver Logistics dispatch console (`/staff/driver-deliveries` or `/staff/deliveries`), verifying background real-time sync (`activeDeliveries`, `completedToday`) via `useRealtime`, turn-by-turn navigation route modal, real-time GPS telemetry broadcast hook, and delivery transitions. For in-house studio driver deliveries, asserts customer-paid delivery fee is credited to artisan payout balance upon POD completion (`IN_HOUSE_SHIPPING_CREDITED`). Attendance clock-ins and POD completions strictly require native file uploads with real defense image assets (banning 1x1 base64 dummy pixels).
- Asserts that staff/driver test personas authenticate cleanly; any failure to authenticate triggers a hard `FAIL` and halts clearance with exit code 1.

### Phase 5: Super Admin Platform Governance & Moderation
- Authenticates with super admin credentials (`ACCOUNTS.admin`).
- Tests Catalog Approval queues, user role assignment tables, Artisan KYC inspection (`KycVerificationSummaryCard` composite score, 1:1 selfie-to-ID face match, and forensics flags + itemized `RevisionRequest` rejection), and Dispute Escalation arbitration dashboard. On resubmitted entities, validates the `Resubmitted for Review` top banner with the `Revision Addressed` badge and green `[✓ Updated]` pills (`InlineRevisionCard.jsx`) marking revised fields.
- **Counter-Evidence Dispute Arbitration:** Arbitrates buyer disputes evaluating both buyer damage evidence, dynamic `criteria_checklist` confirmation status (`confirmed`), resolved S3 proof URLs (`StorageUrl::url()`), and seller packaging rebuttal, with plain-language action labels (`Approve Full Refund`, `50% Partial Refund`, `Decline Claim (Pay Shop)`). For 50% partial refunds, asserts order transitions to `Completed` with `payment_status = 'partially_refunded'` and seller retains 50% net split in accounting revenue.
- **Dynamic Policy & Consent Governance (`/admin/settings/policies`):** Verifies admin policy management (`Return & Refund Criteria`, `Terms of Service`, `Privacy Policy`, `Seller Agreement`, `Seller Privacy`), draft validation, plus publishing, activation, and return-window changes within an isolated test scope, plain-language validation on empty custom criteria rows, and `user_policy_consents` audit logging across registration, seller terms, and return/dispute flows.
- **Content Safety & Customer Review Moderation Desk:** Navigates to `/admin/compliance`, asserts empty state displays when no ticket is selected (zero ghost auto-selection), evaluates disputed customer reviews, and executes uphold/dismiss actions (`PATCH /admin/review-moderation/{id}`).
- **Catalog Moderation Queue Takedown:** Tests direct listing takedown (`POST /admin/moderation-queue/{id}/takedown`) from the moderation queue.
- **Transactional Email Studio:** Tests dynamic email template inspection (`/admin/settings/email-templates`), token replacement (`{{buyer_name}}`, `{{order_number}}`), and live test email dispatch (`POST /admin/settings/email-templates/dispatch`).
- **Help Center Dual Persona Governance:** Audits `/help` under admin credentials, confirming `allowedPersona = 'all'` unlocks the dual-persona guide switcher (`[Buyer Guide]` and `[Artisan Guide]`) with complete category visibility across all platform topics.
- Verifies Role-Based Access Control (RBAC): asserts non-admin sessions attempting to access `/admin` receive HTTP 403 or redirect.

### Phase 6: Vercel Serverless Limits, Edge Diagnostics & Live Sandboxes
- **Serverless Cold Start / Warmup:** Pings `/ping` to measure container response latency (<500ms target).
- **Reverse Geocoding Endpoint Contract (`/api/geocode/reverse`):** Verifies Cavite coordinate resolution and boundary detection without CSRF bottlenecks or 500 crashes.
- **Aggregate 4.5MB Edge Guard:** Asserts that multi-file forms and single-file inputs enforce client-side size guards (<4.5MB) before transmission to protect Vercel edge gateways against HTTP 413.
- **Webhook Security:** Queries `/webhooks/cron` without authentication, asserting it returns HTTP 401.
- **Live PayMongo GCash Sandbox:** Verifies checkout session creation (`cs_...`), hosted URL generation, and session retrieval with `sk_test_...`.
- **Live Lalamove Sandbox Lifecycle:** Computes real Cavite motorcycle quotation (`rest.sandbox.lalamove.com`), books order in `ASSIGNING_DRIVER` status, and uses the Partner Portal Sandbox simulator to finish that exact courier order, confirms its signed `COMPLETED` event received HTTP 200, and verifies the matching storefront orders reach Delivered.
- The local sandbox command is an integration probe. It calls the webhook service directly and cannot attest to deployed webhook ingress.

### Cross-persona transaction assertions
- Drive this journey with rendered controls and fresh run fixtures. Apply the UI evidence rules in the skill.
- **Cross-Persona Order Lifecycle:**
  1. **Buyer Order Placement via Real DOM Interaction:** Authenticates buyer (`ACCOUNTS.buyer`), loads product catalog, verifies initial inventory stock, navigates to the checkout interface (`/checkout`), asserts that form fields render properly, interacts with the DOM by typing delivery/address details into input fields using Puppeteer, and clicks the actual React `Place Order` button (`button[type="submit"]`), verifying the full Inertia `useForm` lifecycle rather than sending raw `window.axios` requests.
  2. **Inventory Stock Decrement Assertion:** Verifies through the deployed UI or an authorized production read that stock decremented by exactly 1 (`initialStock -> initialStock - 1`).
  3. **Seller Order Acceptance:** Authenticates seller (`ACCOUNTS.seller`), loads workshop Orders desk, and accepts order for fulfillment.
  4. **Driver Dispatch & GPS Telemetry:** Authenticates logistics rider (`ACCOUNTS.driver`), claims delivery on `/staff/deliveries`, broadcasts live GPS coordinates via reverse geocoded telemetry hook, and transitions delivery to `delivered`.
  5. **Buyer Confirmation & BIR Sales Invoice Hash:** Authenticates buyer, confirms receipt, triggers BIR 12% sales invoice printable HTML generation (`/my-orders/{id}/receipt`, returning `view('pdf.receipt')`), and computes SHA-256 hash of the generated HTML document.
- **Cryptographic Proof-of-Work Run Manifest:** Emits a timestamped run manifest (`tests/e2e/production_audit/manifests/pow_manifest_*.json`) logging real DB order ID, item slug, initial/final stock, delivery tracking ID, and invoice printable HTML SHA-256 hash.

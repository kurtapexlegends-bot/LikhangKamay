# LikhangKamay — Comprehensive System Changes Demonstration Flow
> **Purpose:** An exhaustive, step-by-step presentation script and live demonstration walkthrough showcasing 100% of all features, security upgrades, seller tools, and administrative controls implemented between April 7 and August 4, 2026.

---

## 🎬 Act 1: Public Marketplace & Buyer Experience

### Step 1: Responsive Navigation & Instant Global Search
* **Where to go:** Public Homepage (`/`)
* **What to demonstrate:**
  1. Open homepage on desktop and toggle device mode to mobile viewport.
  2. Tap the **Search Icon** in the top navigation bar to trigger the full-screen slide-down search overlay.
  3. Type a query (e.g. `"clay"` or `"pottery"`) to show **debounced search suggestions** with thumbnail previews for products, artisans, and categories.
  4. Press `/` on the keyboard on desktop to open the **Role-Aware Command Palette**.

### Step 2: Catalog Filtering & Persistent Signals
* **Where to go:** Shop Catalog (`/shop`)
* **What to demonstrate:**
  1. Click the **Filter Button** to reveal the collapsible filter popover.
  2. Select category tags, set price ranges, and apply filters — point out the active filter chips bar.
  3. Click the **Heart Icon** on a product and **Follow Shop** on an artisan card to show instant database-backed persistence with client-side fallback synchronization.

### Step 3: Interactive 3D Model Viewer & Checkout
* **Where to go:** Product Show Page (`/product/...`) & Checkout (`/checkout`)
* **What to demonstrate:**
  1. Rotate, zoom, and inspect the interactive **3D Ceramic Model** directly in the browser (demonstrating texture blob loading and camera focal zoom).
  2. Add item to cart and proceed to Checkout (`/checkout`).
  3. Point out the dynamic **3% PayMongo Convenience Fee** calculation in the payment summary box.

### Step 4: Public Legal Documents & Refund Warranty
* **Where to go:** Footer Legal Links (`/terms-of-service`, `/seller-agreement`)
* **What to demonstrate:**
  1. Showcase the redesigned responsive document layouts for Terms of Service and Seller Agreement.
  2. Highlight the explicit **1-day system return/refund/dispute warranty terms** and subscription disclosure notices.

---

## 🏬 Act 2: Seller ERP Workspace & Operations

### Step 5: Responsive Dashboard & Swipeable KPI Metrics
* **Where to go:** Seller Dashboard (`/seller/dashboard`)
* **What to demonstrate:**
  1. Show the horizontal **Swipeable KPI Metric Cards** (`snap-x`) on mobile/tablet viewports.
  2. Click the floating **Action Bar / FAB** for quick product creation access.

### Step 6: Product Management & Bill of Materials (BOM) Recipe
* **Where to go:** Product Manager (`/seller/products`)
* **What to demonstrate:**
  1. Open product form to highlight client-side Canvas image compression (bypassing Vercel 4.5MB limits).
  2. Show the **Raw Material Bill of Materials (BOM) Recipe Panel** (gated for Pro/Elite tiers).
  3. Point out monthly product resubmission limits and status alerts.

### Step 7: Order Fulfillment & Lalamove Courier Booking
* **Where to go:** Order Manager (`/seller/orders`)
* **What to demonstrate:**
  1. Open the **Filter Popover Card** to filter by Payment, Fulfillment, or Dispute statuses.
  2. Click an order to expand customer and logistics details.
  3. Demonstrate single-click **Lalamove Courier Booking** and PDF **Packing Slip Generation**.

### Step 8: HR Payroll Generator & Procurement Inventory
* **Where to go:** Seller HR (`/seller/hr`) & Procurement (`/seller/supplies`)
* **What to demonstrate:**
  1. Demonstrate automated staff attendance prefilling in the **HR Payroll Generator** with payroll run history.
  2. Demonstrate automatic SKU generation and low-stock alert popover filters in Inventory.

### Step 9: Reviews Management & Review Disputes
* **Where to go:** Seller Reviews (`/seller/reviews`)
* **What to demonstrate:**
  1. Showcase seller review replies and review pinning.
  2. Demonstrate the **Dispute Review** feature to flag unfair ratings for admin moderation.

---

## 🛡️ Act 3: Super Admin Governance & Communication Center

### Step 10: System Config & Operational Toggles
* **Where to go:** System Config (`/admin/system-config`)
* **What to demonstrate:**
  1. Show the elevated **Segmented Pill Navigation Tabs** (*System Config*, *Subscription Plans*, *Category Manager*, *Restoration Center*).
  2. Navigate to **Platform Operations** and toggle **Maintenance Mode** or **PayMongo Gateway** using the single-row toggle cards with sliding animations.
  3. Modify a field to trigger the **Sticky Save Action Bar** with live dirty state indicator.

### Step 11: Custom Email Studio & Audience Broadcast
* **Where to go:** Email Studio Sub-Tab (`/admin/system-config?tab=branding&subtab=mail_studio`)
* **What to demonstrate:**
  1. Select a mailable template from the dropdown (e.g. *Order Confirmation* or *Artisan Approval*).
  2. Edit subject lines or body text and click **Update Template**.
  3. Demonstrate the **Live Preview** with variable tag replacement (`{buyer_name}`, `{shop_name}`).
  4. Show the **Audience Broadcast Center** for targeting *All Sellers*, *Active Artisans*, or *Buyers*.

### Step 12: Category Manager & Donut Analytics
* **Where to go:** Category Manager (`/admin/system-config?tab=categories`)
* **What to demonstrate:**
  1. View category taxonomy donut charts and GMV calculations.
  2. Demonstrate high-risk confirmation modals on category edits/deletions.

### Step 13: Product Moderation Control Center
* **Where to go:** Product Moderation (`/admin/catalog/moderation`)
* **What to demonstrate:**
  1. Open the **Product Inspection Drawer** (`SlideOverDrawer`).
  2. Point out profit margin calculations, copyable SKUs, and auto-fitted 3D camera distance.
  3. Showcase one-click **Approve**, **Reject with Feedback**, or **Flag for Review** actions.

### Step 14: User Directory, Impersonation & Soft Delete Restoration
* **Where to go:** User Directory (`/admin/users`) & Restoration Center (`/admin/system-config?tab=restoration`)
* **What to demonstrate:**
  1. Open User Directory filter popover to inspect platform roles and artisan statuses.
  2. Trigger **Super Admin Impersonation** to view the store as a seller (highlighting the top impersonation banner).
  3. Navigate to **Restoration Center** to show soft-deleted user and product recovery.

### Step 15: Dispute Arbitration & System Diagnostics
* **Where to go:** Dispute Console (`/admin/disputes`) & Diagnostics (`/admin/operations/diagnostics`)
* **What to demonstrate:**
  1. Review buyer photo evidence and seller response timelines in the arbitration console.
  2. Execute final resolution (*Buyer Refund* vs. *Seller Payout*).
  3. Open Diagnostics to view system telemetry logs, error traces, and queue statuses.

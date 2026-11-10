# Mandatory State-Mutation Proof-of-Work (PoW) Schema

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
| **B2B Sourcing Order** | `button:has-text("Place B2B Order")` | Sourcing Cart / Checkout | Inbound Sourcing Orders View | `302` $\rightarrow$ `200 OK` | `ORD-B2B-WS-XXXX` (Fresh B2B Order) | `path/to/b2b_placed.png` |
| **B2B Order Dispatch**  | `button:has-text("Mark Dispatched")` | `Needs Decision` / Accepted | In Production / Dispatched | `200 OK` | `ORD-B2B-WS-XXXX` | `path/to/b2b_dispatched.png` |
| **B2B Confirm Delivery**| `button:has-text("Confirm Delivery")` | Sourcing In Transit | Sourcing Delivered | `200 OK` | `ORD-B2B-WS-XXXX` | `path/to/b2b_delivered.png` |
| **B2B Wholesale Invoice**| `/supply-hub/sales/{id}/invoice` | Wholesale Sales Card | Wholesale VAT Invoice Streamed | `200 OK` | `ORD-B2B-WS-XXXX` | `path/to/b2b_invoice.png` |
| **Hitbox Scroll Isolation**| Wheel event over `[class*="overflow-x-auto"]` | Tab Track Hover | Status track scrolled horizontally, screen scroll = 0 | Local DOM | Intercepted & Isolated | `path/to/hitbox_isolation.png` |
| **Wishlist Toggle & Remove** | `button[title="Save for Later"]` | Catalog Product Card | `/saved` DOM Verified $\rightarrow$ Removed | `200 OK` | Wishlist Toggle Synced | `path/to/wishlist_toggle.png` |
| **Live Chat Inquiry Exchange** | `button[type="submit"]` | `/buyer/chat?user_id=X` | Inquiry Message Bubble Rendered | `200 OK` | Direct Message ID Minted | `path/to/chat_bubble.png` |
| **Customer Review Lifecycle** | `button:has-text("Submit Review")` | `/my-orders` $\rightarrow$ `/reviews` | Buyer Review $\rightarrow$ Seller Reply $\rightarrow$ Purged | `200 OK` | Review ID Created & Cleaned | `path/to/review_lifecycle.png` |
| **Staff Shift Teardown** | `button:has-text("Confirm Clock-Out")` | Attendance Dock | Shift Closed Cleanly (Zero Timesheet Spills) | `200 OK` | Shift Attendance Terminated | `path/to/shift_teardown.png` |
| **Staff Seat Provisioning** | `button:has-text("Add Employee")` | `/people` | Apprentice Seat Created $\rightarrow$ Verified $\rightarrow$ Deleted | `200 OK` | Employee ID Minted & Purged | `path/to/staff_seat.png` |

If any row in this table is skipped, contains `None`, or references an ID from a previous run, the entire suite is marked **FAIL (INCOMPLETE MUTATION)**.

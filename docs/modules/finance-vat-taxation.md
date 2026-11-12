# Finance, Philippine BIR VAT & Payout Architecture

## 1. Value-Added Tax (VAT) Architecture
LikhangKamay implements full Philippine Bureau of Internal Revenue (BIR) tax compliance under the National Internal Revenue Code (NIRC) and the Ease of Paying Taxes (EOPT) Act.

### A. Tax Classifications
* **Non-VAT Registered (`vat_exempt`)**:
  Default classification for micro-artisans and cottage workshops with annual gross sales under ₱3,000,000. Customer receipts reflect `VAT-Exempt Sale`. Artisans are not required to provide a TIN, keeping onboarding accessible for informal crafters.
* **VAT-Registered (`vat_inclusive`)**:
  For registered workshops collecting 12% Value-Added Tax. Customer retail prices in the marketplace are legally all-inclusive (RA 7394 Price Tag Law). The 12% tax component is itemized dynamically on computerized sales invoices and seller fulfillment dashboards.

### B. Standard Inclusive Math Formulation
Implemented in [`\App\Services\OrderFinanceService`](file:///c:/laragon/www/LikhangKamay/app/Services/OrderFinanceService.php):
$$\text{Net Merchandise} = \max(0,\ \text{Merchandise Subtotal} - \text{Voucher Discount})$$
$$\text{Vatable Sales} = \frac{\text{Net Merchandise}}{1.12}$$
$$\text{12% Output VAT} = \text{Net Merchandise} - \text{Vatable Sales}$$

### C. Database Persistence & Immutable Tax Snapshot
Captured at order placement via [`\App\Actions\Consumer\PlaceOrder`](file:///c:/laragon/www/LikhangKamay/app/Actions/Consumer/PlaceOrder.php):
* `orders.voucher_id`, `orders.voucher_code`, `orders.voucher_discount_amount`: Applied shop voucher reference and deduction (seller-absorbed; subtracted prior to VAT, `seller_net_amount`, and PayMongo line-item calculation).
* `orders.vat_type`: `'vat_inclusive'` | `'vat_exempt'`
* `orders.vatable_sales`: Net of tax merchandise portion (post-voucher)
* `orders.vat_amount`: 12% output VAT portion (post-voucher)
* `orders.vat_exempt_sales`: 100% of net merchandise (`max(0, subtotal - voucher_discount_amount)`) for Non-VAT sellers
* `orders.vat_rate`: Standard 12.00%
* `users.is_vat_registered`: Artisan VAT registration status (PostgreSQL-safe boolean)
* `users.tin`: Optional 9 or 12-digit Taxpayer Identification Number

### D. Downstream Deductions & Online Payment Guards
* [`PaymentController.php`](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Consumer/PaymentController.php) builds PayMongo line items using centavo-exact net merchandise (`grossItemsCents - voucherDiscountCents`, omitted when `<= 0` while retaining shipping/convenience fees) and enforces PayMongo's ₱20.00 minimum online payment floor alongside [`PaymentMethodSelector.jsx`](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Consumer/Shop/Checkout/PaymentMethodSelector.jsx) and [`Checkout.jsx`](file:///c:/laragon/www/LikhangKamay/resources/js/Pages/Consumer/Shop/Checkout.jsx).
* [`packing-slips.blade.php`](file:///c:/laragon/www/LikhangKamay/resources/views/pdf/packing-slips.blade.php), [`receipt.blade.php`](file:///c:/laragon/www/LikhangKamay/resources/views/pdf/receipt.blade.php), [`buyer-confirmation.blade.php`](file:///c:/laragon/www/LikhangKamay/resources/views/emails/orders/buyer-confirmation.blade.php), [`placed.blade.php`](file:///c:/laragon/www/LikhangKamay/resources/views/emails/orders/placed.blade.php), [`SettlementReportService.php`](file:///c:/laragon/www/LikhangKamay/app/Services/SettlementReportService.php), [`settlement_statement.blade.php`](file:///c:/laragon/www/LikhangKamay/resources/views/pdf/settlement_statement.blade.php), and [`ShopAnalyticsMetricsService.php`](file:///c:/laragon/www/LikhangKamay/app/Services/Analytics/ShopAnalyticsMetricsService.php) consistently deduct `voucher_discount_amount` and honor zero-net VAT boundaries.

---

## 2. Payout & Disbursement System
LikhangKamay enforces direct-to-mobile e-wallet disbursements for all seller earnings:
* **Supported Methods**: Strictly **GCash** and **Maya** mobile numbers (`09XX XXX XXXX`).
* **Commercial Bank Transfers**: Completely removed from platform UI, onboarding wizard, and server validation.
* **Timing & Thresholds**: Disbursements are processed directly upon customer receipt or fulfillment clearance without misleading arbitrary day or threshold restrictions.

---

## 3. Computerized BIR Sales Invoice & EOPT Act (RA 11976)
Rendered via [`receipt.blade.php`](file:///c:/laragon/www/LikhangKamay/resources/views/pdf/receipt.blade.php):
* Standardized to **Sales Invoice** (standardizing commercial terminology pursuant to Republic Act No. 11976 - Ease of Paying Taxes Act).
* Adapts dynamically: hides zero-rated/zero-vat rows for domestic transactions.
* Includes Seller TIN, Registered Business Name, itemized unit prices, and formal BIR Tax Matrix.
* UI consumer actions in [`OrderCardHeader.jsx`](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Consumer/Buyer/MyOrders/OrderListItemCard/OrderCardHeader.jsx) and [`OrderCardActions.jsx`](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Consumer/Buyer/MyOrders/OrderListItemCard/OrderCardActions.jsx) link to computerized commercial sales invoices.

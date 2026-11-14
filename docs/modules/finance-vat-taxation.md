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

---

## 4. Walk-In POS Register, Supervisor Void PIN & Sales Channel Audit
* **Controller & Requests**: [`PosOrderController.php`](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/PosOrderController.php), [`StorePosOrderRequest.php`](file:///c:/laragon/www/LikhangKamay/app/Http/Requests/Seller/StorePosOrderRequest.php), [`UpdatePosQrSettingsRequest.php`](file:///c:/laragon/www/LikhangKamay/app/Http/Requests/Seller/UpdatePosQrSettingsRequest.php).
* **Checkout & Void Service**: [`PosCheckoutService.php`](file:///c:/laragon/www/LikhangKamay/app/Services/PosCheckoutService.php) handles row-locked product/promo-stock allocation (`Discount::lockForUpdate()` with multi-promo fallback), [`BOMDeductionService.php`](file:///c:/laragon/www/LikhangKamay/app/Services/BOMDeductionService.php) raw material deduction/restoration, VAT snapshot persistence, branch-scoped supervisor 6-digit Void PIN verification (`pos_void_pin` / `pos_void_pin_set_at` via [`ProfileController.php`](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Core/ProfileController.php)), and immutable activity logs (`actor_type = 'owner'`).
* **Frontend POS Register & Settings**: [`POS/Index.jsx`](file:///c:/laragon/www/LikhangKamay/resources/js/Pages/Seller/POS/Index.jsx), [`posPricing.js`](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/POS/posPricing.js), [`PosProductGrid.jsx`](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/POS/PosProductGrid.jsx), [`PosCartPanel.jsx`](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/POS/PosCartPanel.jsx), [`PosPaymentModal.jsx`](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/POS/PosPaymentModal.jsx), [`PosQrSetupModal.jsx`](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/POS/PosQrSetupModal.jsx), [`PosReceiptModal.jsx`](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/POS/PosReceiptModal.jsx), [`PosRecentSalesDrawer.jsx`](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/POS/PosRecentSalesDrawer.jsx), [`PosRecentSaleRow.jsx`](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/POS/PosRecentSaleRow.jsx), [`PosVoidAuthorizationBox.jsx`](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/POS/PosVoidAuthorizationBox.jsx), and [`UpdatePosVoidPinForm.jsx`](file:///c:/laragon/www/LikhangKamay/resources/js/Pages/Seller/Profile/Partials/UpdatePosVoidPinForm.jsx).
* **80mm Thermal Receipt**: [`pos_receipt_80mm.blade.php`](file:///c:/laragon/www/LikhangKamay/resources/views/pdf/pos_receipt_80mm.blade.php) renders print-ready 80mm walk-in receipts with cashier, branch, payment method, cash tendered/change, and VAT breakdown.
* **Accounting & Orders Channel Audit**: [`AccountingLedgerService.php`](file:///c:/laragon/www/LikhangKamay/app/Services/AccountingLedgerService.php) and [`SettlementReportService.php`](file:///c:/laragon/www/LikhangKamay/app/Services/SettlementReportService.php) include `pos_cash`, `pos_gcash`, and `pos_maya` revenue splits alongside [`FundRelease.jsx`](file:///c:/laragon/www/LikhangKamay/resources/js/Pages/Seller/Accounting/FundRelease.jsx), [`AccountingFilterPanel.jsx`](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/Accounting/AccountingFilterPanel.jsx), [`TransactionLedgerTable.jsx`](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/Accounting/TransactionLedgerTable.jsx), [`ListSellerOrders.php`](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Orders/ListSellerOrders.php), and [`OrderManager.jsx`](file:///c:/laragon/www/LikhangKamay/resources/js/Pages/Seller/Orders/OrderManager.jsx).
* **Verification Suite**: [`PosWalkInTest.php`](file:///c:/laragon/www/LikhangKamay/tests/Feature/Seller/PosWalkInTest.php).

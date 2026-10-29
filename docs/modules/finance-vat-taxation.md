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
$$\text{Vatable Sales} = \frac{\text{Merchandise Subtotal}}{1.12}$$
$$\text{12% Output VAT} = \text{Merchandise Subtotal} - \text{Vatable Sales}$$

### C. Database Persistence & Immutable Tax Snapshot
Captured at order placement via [`\App\Actions\Consumer\PlaceOrder`](file:///c:/laragon/www/LikhangKamay/app/Actions/Consumer/PlaceOrder.php):
* `orders.vat_type`: `'vat_inclusive'` | `'vat_exempt'`
* `orders.vatable_sales`: Net of tax merchandise portion
* `orders.vat_amount`: 12% output VAT portion
* `orders.vat_exempt_sales`: 100% of merchandise subtotal for Non-VAT sellers
* `orders.vat_rate`: Standard 12.00%
* `users.is_vat_registered`: Artisan VAT registration status (PostgreSQL-safe boolean)
* `users.tin`: Optional 9 or 12-digit Taxpayer Identification Number

---

## 2. Payout & Disbursement System
LikhangKamay enforces direct-to-mobile e-wallet disbursements for all seller earnings:
* **Supported Methods**: Strictly **GCash** and **Maya** mobile numbers (`09XX XXX XXXX`).
* **Commercial Bank Transfers**: Completely removed from platform UI, onboarding wizard, and server validation.
* **Timing & Thresholds**: Disbursements are processed directly upon customer receipt or fulfillment clearance without misleading arbitrary day or threshold restrictions.

---

## 3. Computerized BIR Sales Invoice
Rendered via [`receipt.blade.php`](file:///c:/laragon/www/LikhangKamay/resources/views/pdf/receipt.blade.php):
* Adapts dynamically: hides zero-rated/zero-vat rows for domestic transactions.
* Includes Seller TIN, Registered Business Name, itemized unit prices, and formal BIR Tax Matrix.

# Marketing & Discount Engine

This document details the discount campaign architecture, pricing rules, promo stock quotas, and seller marketing workflows for LikhangKamay.

---

## 1. Discount Campaign Architecture

*   **Model File**: [Discount.php](file:///c:/laragon/www/LikhangKamay/app/Models/Discount.php)
*   **Database Table**: `discounts` (Pivot table: `discount_product`)
*   **Controller**: [DiscountController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/DiscountController.php)
*   **Service Layer**: [DiscountService.php](file:///c:/laragon/www/LikhangKamay/app/Services/DiscountService.php)
*   **Form Request**: [CreateDiscountRequest.php](file:///c:/laragon/www/LikhangKamay/app/Http/Requests/Seller/CreateDiscountRequest.php)

### Key Attributes
*   `name` (string, campaign label e.g., "Flash Sale")
*   `type` (`percentage`, `fixed`)
*   `value` (float, percentage amount or target fixed promo price)
*   `promo_stock` (nullable integer, max quota for campaign items)
*   `promo_sold` (integer, total items purchased under discount)
*   `max_purchase_limit` (nullable integer, maximum discounted quantity per customer order)
*   `start_at`, `end_at` (datetime timestamps)
*   `is_active` (boolean, campaign toggle flag)
*   `is_followers_only` (boolean, restricts promotion to registered buyers following the artisan)

---

## 2. Core Business Rules & Pricing Strategies

1. **Lowest Price Wins**: When a product is attached to multiple overlapping active discounts, the system automatically evaluates and applies the lowest calculated discounted price.
2. **Quota Exhaustion**: If `promo_stock` is set and `promo_sold >= promo_stock`, the discount automatically deactivates for subsequent purchases.
3. **Purchase Limits**: If `max_purchase_limit` is set, a buyer purchasing $N$ units receives the discount on $\min(N, \text{limit})$ units, with additional units charged at base price.
4. **Price Floor Guards**: Validation prevents percentage discounts $\ge 100\%$ or fixed promo prices $\ge \text{base price}$.
5. **Follower-Exclusive Promotions**: When `is_followers_only` is true, promotional pricing and badges highlight follower exclusivity across the catalog and storefront with 1-click follow unlocks.

---

## 3. Follower Notification & Retention Ecosystem

*   **Service**: [FollowerNotificationService.php](file:///c:/laragon/www/LikhangKamay/app/Services/FollowerNotificationService.php)
*   **New Product Release**: [NewProductFromFollowedShopNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/NewProductFromFollowedShopNotification.php) (Queued batch notification sent to shop followers upon admin product approval).
*   **Restock Alert**: [ProductRestockedFromFollowedShopNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/ProductRestockedFromFollowedShopNotification.php) (Dispatched when an active product is restocked).
*   **Seller Analytics**: [ShopAnalyticsMetricsService.php](file:///c:/laragon/www/LikhangKamay/app/Services/Analytics/ShopAnalyticsMetricsService.php) tracks shop follower growth rate, total followers, and month-over-month telemetry.

---

## 4. Storefront UI Components & Badging

*   **Live Countdown Badge**: [DiscountCountdownBadge.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Consumer/DiscountCountdownBadge.jsx) (Renders ticking countdown `Ends in HH:MM:SS` or micro-pill `10d left`).
*   **Seller Marketing Manager**: [DiscountManager.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Pages/Seller/Marketing/DiscountManager.jsx)
*   **Strategy Wizard**: [DiscountModal.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/Catalog/DiscountModal.jsx)
*   **Product Card Integration**: [ProductCard.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Pages/Consumer/Shop/Partials/ProductCard.jsx) & [ProductCard.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Consumer/ProductCard.jsx)
*   **Product Detail View**: [ProductDetailsCard.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Consumer/Shop/ProductShow/ProductDetailsCard.jsx) & [SellerAboutPanel.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Consumer/Shop/ProductShow/SellerAboutPanel.jsx)

---

## 5. Shop Voucher & Promo Code Engine

*   **Models**: [Voucher.php](file:///c:/laragon/www/LikhangKamay/app/Models/Voucher.php), [VoucherRedemption.php](file:///c:/laragon/www/LikhangKamay/app/Models/VoucherRedemption.php)
*   **Database Tables**: `vouchers`, `voucher_redemptions`, plus `orders.voucher_id`, `orders.voucher_code`, `orders.voucher_discount_amount` (migrations `2026_11_11_184500_create_vouchers_and_voucher_redemptions_tables` & `2026_11_11_211500_add_flexibility_and_targeting_to_vouchers_table`)
*   **Controllers**: [VoucherController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/VoucherController.php), [BuyerOrderController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Consumer/BuyerOrderController.php)
*   **Service Layer**: [VoucherService.php](file:///c:/laragon/www/LikhangKamay/app/Services/VoucherService.php)
*   **Form Requests**: [SaveVoucherRequest.php](file:///c:/laragon/www/LikhangKamay/app/Http/Requests/Seller/SaveVoucherRequest.php), [ValidateVoucherRequest.php](file:///c:/laragon/www/LikhangKamay/app/Http/Requests/Consumer/ValidateVoucherRequest.php)
*   **Frontend Components**: [VoucherManagementPanel.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/Marketing/VoucherManagementPanel.jsx), [VoucherModal.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/Marketing/VoucherModal.jsx), [VoucherAudienceAndTimingFields.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/Marketing/VoucherAudienceAndTimingFields.jsx), [VoucherTicketCard.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Common/VoucherTicketCard.jsx), [CheckoutVoucherSection.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Consumer/Shop/Checkout/CheckoutVoucherSection.jsx), [CheckoutVoucherDrawer.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Consumer/Shop/Checkout/CheckoutVoucherDrawer.jsx), [useCheckoutVouchers.js](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Consumer/Shop/Checkout/hooks/useCheckoutVouchers.js)

### Voucher Business Rules & Security Guards
1.  **Tier Quotas**: Standard (`free`) and `premium` sellers are capped at 3 concurrent live/upcoming active vouchers (`is_active = true` and `expires_at` null or in the future); Elite (`super_premium`) sellers have unlimited vouchers. Extending `expires_at` on an expired `is_active = true` voucher enforces the active quota before reactivation.
2.  **Flexible Targeting & Guards**: Supports `scope_type` (`all`, `specific_products`, `category`), `min_requirement_type` (`spend` | `quantity`), `target_audience` (`all`, `new_customers`, `repeat_customers`, `followers`), `max_discount`, `usage_limit_total`, and `usage_limit_per_user`. Audience order history excludes `Cancelled` and `Rejected` orders, and self-redemption by shop owners is blocked.
3.  **UTC Normalization**: [VoucherModal.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/Marketing/VoucherModal.jsx) converts local `datetime-local` strings to UTC ISO timestamps on submit, and [VoucherService.php](file:///c:/laragon/www/LikhangKamay/app/Services/VoucherService.php) normalizes `starts_at`/`expires_at` via `Carbon::parse(...)->utc()`.
4.  **Buyer Prop PII Sanitization**: Buyer checkout summaries (`getAvailableVouchersForCheckout`, `validate-voucher`) project strictly safe shop display columns and omit raw `Voucher` Eloquent models (`includeModel: false`), preventing seller payout/TIN/KYC path disclosure.
5.  **RBAC & Maker-Checker Approval**: Seller voucher routes are gated on `seller.module:vouchers` (`shop_manager` preset includes `vouchers`; `stock_clerk` excludes it). Non-manager staff granted `vouchers:can_edit` create inactive drafts queued under `OwnerApproval::DOMAIN_DISCOUNT` ([OwnerApprovalService.php](file:///c:/laragon/www/LikhangKamay/app/Services/OwnerApprovalService.php)) and cannot directly mutate or delete existing vouchers.
6.  **Cancellation Reversal & Soft-Deleted Product Preservation**: [CancelOrder.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Consumer/CancelOrder.php) automatically reverts `VoucherRedemption` rows and decrements `used_count`. Editing an existing voucher preserves already-attached soft-deleted product IDs owned by the seller while rejecting foreign or newly attached trashed IDs.

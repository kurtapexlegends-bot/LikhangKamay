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

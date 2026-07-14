# Core Domain Entities & Rules

This document details the core Laravel Eloquent models, their database relations, and key business rules for LikhangKamay.

---

## 1. Product Management

*   **Model File**: [Product.php](file:///c:/laragon/www/LikhangKamay/app/Models/Product.php)
*   **Database Table**: `products` (supports Soft Deletes)
*   **Category Model**: [Category.php](file:///c:/laragon/www/LikhangKamay/app/Models/Category.php) (Categorizes products via `category` string column, supports Soft Deletes)

### Key Attributes
*   `sku` (string, unique product identification)
*   `name`, `slug` (auto-generated from name on creation)
*   `status` (Active, pending_review, Draft)
*   `stock` (current inventory count)
*   `sold` (lifetime item sales count)
*   `price`, `cost_price` (currency amount values)
*   `model_3d_path` (path to glb/gltf asset file)

### Core Rules & Hooks
1.  **3D Model Requirement**: Active seller products must have a registered 3D model path (`model_3d_path`), otherwise they are forced to `Draft` status.
2.  **Auto-Slug Generation**: Slugs are generated during the Eloquent `creating` boot event using:
    `Str::slug($product->name . '-' . Str::random(6))`
3.  **Review Gating**: Products created by `artisan` or `staff` users default to `pending_review` status before becoming public.

### Core Business Actions
*   [ActivateProduct.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Catalog/ActivateProduct.php), [ArchiveProduct.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Catalog/ArchiveProduct.php), [BulkActivateProducts.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Catalog/BulkActivateProducts.php), [BulkUpdateProductStatus.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Catalog/BulkUpdateProductStatus.php), [CreateProduct.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Catalog/CreateProduct.php), [ImportProductsCsv.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Catalog/ImportProductsCsv.php), [ManualDeductProduct.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Catalog/ManualDeductProduct.php), [RestockProduct.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Catalog/RestockProduct.php), [ResubmitProduct.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Catalog/ResubmitProduct.php), [SyncProductRecipes.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Catalog/SyncProductRecipes.php), [UpdateProduct.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Catalog/UpdateProduct.php): Execute single-responsibility product management processes.

### Controllers & HTTP Resources
*   [Controller.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Controller.php): Base framework controller class.
*   [BuyerOrderController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Consumer/BuyerOrderController.php), [CartController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Consumer/CartController.php), [GlobalSearchController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Consumer/GlobalSearchController.php), [PaymentController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Consumer/PaymentController.php), [ReviewController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/ReviewController.php), [SearchController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Consumer/SearchController.php): Public marketplace and consumer transaction controllers.
*   [DashboardController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/DashboardController.php), [ProductController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/ProductController.php), [ShopController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/ShopController.php), [ProfileController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Core/ProfileController.php), [NotificationController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Core/NotificationController.php), [ImageProxyController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Core/ImageProxyController.php), [ThreeDManagerController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/ThreeDManagerController.php): Handles seller product management, dashboards, user settings, notifications, Supabase image transformations, and 3D asset bundles.
*   [ProductDetailResource.php](file:///c:/laragon/www/LikhangKamay/app/Http/Resources/Consumer/ProductDetailResource.php), [SellerProductResource.php](file:///c:/laragon/www/LikhangKamay/app/Http/Resources/Seller/SellerProductResource.php): Transforms Eloquent products into JSON formats.

### Product & Catalog Services
*   [CatalogService.php](file:///c:/laragon/www/LikhangKamay/app/Services/CatalogService.php): Orchestrates high-level listing queries, categories filtering, and status gating.
*   [ProductMediaService.php](file:///c:/laragon/www/LikhangKamay/app/Services/Catalog/ProductMediaService.php): Handles supabase file uploads and metadata updates.
*   [ThreeDAssetService.php](file:///c:/laragon/www/LikhangKamay/app/Services/Catalog/ThreeDAssetService.php): Manages GLB/GLTF file checks and validation.
*   [LocalImageTransformer.php](file:///c:/laragon/www/LikhangKamay/app/Services/LocalImageTransformer.php): Image optimization service.

### Product Model Traits
*   [Searchable.php](file:///c:/laragon/www/LikhangKamay/app/Traits/Searchable.php): Implements generic full-text indexing and database query scopes for search endpoints.
*   [HandlesThreeDModelBundles.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Concerns/HandlesThreeDModelBundles.php), [ValidatesThreeDModelUploads.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Concerns/ValidatesThreeDModelUploads.php), [ProductControllerHelpers.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/Concerns/ProductControllerHelpers.php): Shared controller trait utilities for processing GLB/GLTF assets.

### Product Mails & Notifications
*   [ProductModerationNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/ProductModerationNotification.php) | [ProductModerationResult.php](file:///c:/laragon/www/LikhangKamay/app/Mail/ProductModerationResult.php): Informs artisan of product approval or rejection results.
*   [ProductPendingReviewNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/ProductPendingReviewNotification.php): Alerts admin when a new product requires review.

---

## 2. Order Processing

*   **Model File**: [Order.php](file:///c:/laragon/www/LikhangKamay/app/Models/Order.php)
*   **Database Table**: `orders` (supports Soft Deletes)

### Key Attributes
*   `status` (Pending, Accepted, Shipped, Delivered, Completed, Cancelled)
*   `payment_method` (COD, PayMongo Checkout, etc.)
*   `payment_status` (Pending, Paid, Failed)
*   `merchandise_subtotal`, `shipping_fee_amount`, `platform_commission_amount`, `seller_net_amount` (decimal values)

### Core Rules & Hooks
1.  **Stock Restoration on Cancellation**:
    > [!IMPORTANT]
    > When an order status transitions to `Cancelled`, the system must increment the product `stock` count and decrement the product `sold` count by the cancelled item quantities.
2.  **Daily Analytics Invalidation**:
    On order model `saved` or `deleted` events, the daily sales analytics cache for the target artisan is forgotten:
    `seller_{artisan_id}_analytics_daily_rollup_{date}`
3.  **Order Flow Stages**:
    `Pending` ➔ `Accepted` ➔ `Shipped` / `Ready for Pickup` ➔ `Delivered` ➔ `Completed`.

### Core Business Actions
All order operations are processed through dedicated single-responsibility Action classes:
*   [UpdateOrderStatus.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Orders/UpdateOrderStatus.php): Orchestrates order status transitions, stock management triggers, and notification deliveries.
*   [ApproveOrderRefund.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Orders/ApproveOrderRefund.php): Handles refund requests and financial allocations.
*   [ApproveOrderReplacement.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Orders/ApproveOrderReplacement.php): Manages replacement flow approvals.
*   [MarkOrderAsPaid.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Orders/MarkOrderAsPaid.php): Records manual cash payments.
*   [ListSellerOrders.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Orders/ListSellerOrders.php): Fetches and scopes orders for the active seller.
*   [OrderWorkflowHelper.php](file:///c:/laragon/www/LikhangKamay/app/Support/OrderWorkflowHelper.php): Validates and authorizes transitions along the Order status flow stages, acting as the state-machine validator for order modifications.
*   [CancelOrder.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Consumer/CancelOrder.php), [CancelOrderReturn.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Consumer/CancelOrderReturn.php), [GetBuyerOrders.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Consumer/GetBuyerOrders.php), [PlaceOrder.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Consumer/PlaceOrder.php), [PrepareCheckout.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Consumer/PrepareCheckout.php), [QuoteCheckoutShipping.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Consumer/QuoteCheckoutShipping.php), [ReceiveOrder.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Consumer/ReceiveOrder.php), [RequestOrderReturn.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Consumer/RequestOrderReturn.php), [ExportOrdersCsv.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Orders/ExportOrdersCsv.php): Handles end-to-end checkout processing, buyer cancellation flows, and order queries.

### Order Controllers
*   [SellerOrderController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/SellerOrderController.php): Orchestrates seller-side viewing and updating of incoming sales orders.

### Order Form Requests
*   [CheckoutRequest.php](file:///c:/laragon/www/LikhangKamay/app/Http/Requests/CheckoutRequest.php): Sanitizes and verifies buyer checkout parameters.
*   [UpdateOrderStatusRequest.php](file:///c:/laragon/www/LikhangKamay/app/Http/Requests/Seller/UpdateOrderStatusRequest.php): Sanitizes seller status update requests.
*   [QuoteShippingRequest.php](file:///c:/laragon/www/LikhangKamay/app/Http/Requests/Consumer/QuoteShippingRequest.php), [RequestReturnRequest.php](file:///c:/laragon/www/LikhangKamay/app/Http/Requests/Consumer/RequestReturnRequest.php), [ApproveReturnRequest.php](file:///c:/laragon/www/LikhangKamay/app/Http/Requests/Seller/ApproveReturnRequest.php), [UpdatePaymentStatusRequest.php](file:///c:/laragon/www/LikhangKamay/app/Http/Requests/Seller/UpdatePaymentStatusRequest.php): Sanitizes logistics quotations and return request forms.

### Financial & Order Transaction Services
*   [OrderFinanceService.php](file:///c:/laragon/www/LikhangKamay/app/Services/OrderFinanceService.php): Computes net earnings and platform cuts.

### Order Mail & Notifications
*   [OrderPlaced.php](file:///c:/laragon/www/LikhangKamay/app/Mail/OrderPlaced.php) | [OrderAccepted.php](file:///c:/laragon/www/LikhangKamay/app/Mail/OrderAccepted.php): Dispatches buyer transactional update emails.
*   [NewOrderNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/NewOrderNotification.php): Dispatches in-app alerts on new order checkout logs.
*   [PaymentConfirmedNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/PaymentConfirmedNotification.php): Confirms successful checkout capture.
*   [RefundRequestNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/RefundRequestNotification.php) | [RefundProcessed.php](file:///c:/laragon/www/LikhangKamay/app/Mail/RefundProcessed.php): Dispatches refund workflow statuses.
*   [ReplacementResolutionNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/ReplacementResolutionNotification.php) | [ReturnRequested.php](file:///c:/laragon/www/LikhangKamay/app/Mail/ReturnRequested.php) | [ReturnRequestRejected.php](file:///c:/laragon/www/LikhangKamay/app/Mail/ReturnRequestRejected.php): Manages return disputes and workflow alerts.
*   [OrderDelivered.php](file:///c:/laragon/www/LikhangKamay/app/Mail/OrderDelivered.php) | [OrderShipped.php](file:///c:/laragon/www/LikhangKamay/app/Mail/OrderShipped.php) | [OrderCancelled.php](file:///c:/laragon/www/LikhangKamay/app/Mail/OrderCancelled.php): Dispatches logistics progression updates to buyers.

---

## 3. User & Authorization Roles

*   **Model File**: [User.php](file:///c:/laragon/www/LikhangKamay/app/Models/User.php)
*   **Database Table**: `users`

### Roles
*   `artisan`: Sellers creating and managing ceramic products.
*   `buyer`: Consumers browsing the marketplace and purchasing items.
*   `staff`/`admin`: Operators handling moderation, payroll approvals, and stock requests.

### Core Capabilities
*   **Split Names**: Supports `first_name` and `last_name` columns.
*   **Avatar Handling**: Dynamic avatar retrieval with Supabase CDN image width transformation (defaults to webp, 200x200).
*   **Support Utilities**: [PersonName.php](file:///c:/laragon/www/LikhangKamay/app/Support/PersonName.php) helper.
*   **Suspension / Banning**: Enforces direct account bans and disables staff access using the `banned_at` column.

### User & Auth Controllers
*   [ArtisanSetupController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Auth/ArtisanSetupController.php), [AuthenticatedSessionController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Auth/AuthenticatedSessionController.php), [ConfirmablePasswordController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Auth/ConfirmablePasswordController.php), [EmailVerificationNotificationController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Auth/EmailVerificationNotificationController.php), [EmailVerificationPromptController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Auth/EmailVerificationPromptController.php), [NewPasswordController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Auth/NewPasswordController.php), [PasswordController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Auth/PasswordController.php), [PasswordResetLinkController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Auth/PasswordResetLinkController.php), [RegisteredUserController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Auth/RegisteredUserController.php), [SocialAuthController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Auth/SocialAuthController.php), [VerifyEmailCodeController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Auth/VerifyEmailCodeController.php): Manages complete Laravel Breeze/Fortify authentication scaffolding, social logins, and password recovery.
*   [UserAddressController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Consumer/UserAddressController.php): Manages saving address coordinate locations.

### User Form Requests & Model Traits
*   [ProfileUpdateRequest.php](file:///c:/laragon/www/LikhangKamay/app/Http/Requests/ProfileUpdateRequest.php): Validates user setting profile updates.
*   [LoginRequest.php](file:///c:/laragon/www/LikhangKamay/app/Http/Requests/Auth/LoginRequest.php): Validates credentials format.
*   [HasTransformableImages.php](file:///c:/laragon/www/LikhangKamay/app/Traits/HasTransformableImages.php): Eloquent model trait implementing dynamic Supabase URL transformation for user profiles and product models images.
*   [HasArtisanSubscriptions.php](file:///c:/laragon/www/LikhangKamay/app/Models/Traits/HasArtisanSubscriptions.php), [HasStaffCapabilities.php](file:///c:/laragon/www/LikhangKamay/app/Models/Traits/HasStaffCapabilities.php), [HasWorkspaceNotifications.php](file:///c:/laragon/www/LikhangKamay/app/Models/Traits/HasWorkspaceNotifications.php), [ManagesStaffAccountFlags.php](file:///c:/laragon/www/LikhangKamay/app/Models/Traits/ManagesStaffAccountFlags.php), [InteractsWithSellerContext.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Concerns/InteractsWithSellerContext.php): Composable trait utilities separating user membership and staff access responsibilities.

### Auth Mails & Notifications
*   [VerifyEmailNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/VerifyEmailNotification.php): Emits custom branded registration verification loops.
*   [ResetPasswordNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/ResetPasswordNotification.php): Dispatches custom branded password reset loops.

---

## 4. Financial Ledger Formulas

Calculations are orchestrated by [AccountingLedgerService.php](file:///c:/laragon/www/LikhangKamay/app/Services/AccountingLedgerService.php):

*   **Base Funds**: Pre-configured startup capital on the User model (`base_funds`).
*   **Total Revenue**: Sum of `seller_net_amount` on `Completed` status orders.
*   **Stock Expenses**: Sum of `total_cost` on approved/completed `StockRequest` items.
*   **Payroll Expenses**: Sum of `total_amount` on `Paid` payroll entries.
*   **Current Balance Equation**:
    $$\text{Balance} = \text{Base Funds} + \text{Total Revenue} - (\text{Stock Expenses} + \text{Payroll Expenses})$$

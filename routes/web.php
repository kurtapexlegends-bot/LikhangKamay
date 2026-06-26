<?php

use App\Http\Controllers\Seller\HRController;
use App\Http\Controllers\Chat\ChatController;
use App\Http\Controllers\Consumer\PaymentController; // Added
use App\Http\Controllers\Seller\LalamoveDeliveryController;
use App\Http\Controllers\Webhooks\LalamoveWebhookController;
use App\Http\Controllers\Consumer\CatalogController as ConsumerCatalogController;
use App\Http\Controllers\Consumer\CartController; // <--- Make sure this is imported


// use App\Http\Controllers\FinanceController; // Removed

use App\Http\Controllers\Seller\ShopController;
use App\Http\Controllers\Consumer\BuyerOrderController;
use App\Http\Controllers\Seller\SellerOrderController;
use App\Http\Controllers\Core\ProfileController;
use App\Http\Controllers\Seller\ProductController;
use App\Http\Controllers\Consumer\ReviewController;
use App\Http\Controllers\Seller\DashboardController;
use App\Http\Controllers\Analytics\AnalyticsController;
use App\Http\Controllers\Seller\ThreeDManagerController;
use App\Http\Controllers\Seller\ProcurementController;
use App\Http\Controllers\Seller\StockRequestController;
use App\Http\Controllers\Seller\AccountingController; // <--- Added
use App\Http\Controllers\Consumer\UserAddressController;
use App\Http\Controllers\Auth\ArtisanSetupController;
use App\Http\Controllers\Seller\SettingsController;
use App\Http\Controllers\Core\NotificationController;
use App\Http\Controllers\Seller\SubscriptionController;
use App\Http\Controllers\Seller\StaffDashboardController;
use App\Http\Controllers\Seller\TeamMessageController;
use App\Http\Controllers\Seller\AuditLogController;
use App\Http\Controllers\Auth\SocialAuthController;
use App\Http\Controllers\Admin\SuperAdminController;
use App\Http\Controllers\Admin\CatalogController;
use App\Http\Controllers\Admin\ModerationController;
use App\Http\Controllers\Admin\PlatformDiagnosticsController;
use App\Http\Controllers\Core\DisputeController;
use App\Models\Product;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

// --- PUBLIC ROUTES ---
Route::get('/', [ConsumerCatalogController::class, 'home'])->name('home');

Route::get('/shop', [ConsumerCatalogController::class, 'index'])->middleware('throttle:marketplace.search')->name('shop.index');
Route::get('/shop/{user:shop_slug}', [ShopController::class, 'seller'])->name('shop.seller');
Route::get('/product/{product}', [ProductController::class, 'show'])->name('product.show');
Route::post('/sponsorship-events/track', [\App\Http\Controllers\Seller\SponsorshipController::class, 'track'])
    ->middleware('throttle:120,1')
    ->name('sponsorships.track');

Route::post('/validate-constraint', [\App\Http\Controllers\Compliance\ValidationController::class, 'validateConstraint'])
    ->middleware('throttle:60,1')
    ->name('api.validate-constraint');

// --- AUTHENTICATION ---
Route::get('/artisan/register', function () {
    return Inertia::render('Auth/ArtisanRegister');
})->middleware('guest')->name('artisan.register');

// Legal Pages
// Webhooks (Exempt from CSRF in bootstrap/app.php)

Route::get('/terms', function () {
    return Inertia::render('Consumer/Legal/TermsOfService');
})->name('terms');

Route::get('/privacy', function () {
    return Inertia::render('Consumer/Legal/PrivacyPolicy');
})->name('privacy');

Route::get('/seller-agreement', function () {
    return Inertia::render('Consumer/Legal/SellerAgreement');
})->name('seller.agreement');

Route::get('/seller-privacy', function () {
    return Inertia::render('Consumer/Legal/SellerDataPrivacy');
})->name('seller.privacy');

// --- SOCIAL AUTH (Google/Facebook) ---

Route::get('/auth/{provider}', [SocialAuthController::class, 'redirect'])
    ->where('provider', 'google|facebook')
    ->middleware('guest')
    ->name('auth.social');

Route::get('/auth/{provider}/artisan', [SocialAuthController::class, 'redirectArtisan'])
    ->where('provider', 'google|facebook')
    ->middleware('guest')
    ->name('auth.social.artisan');

Route::get('/auth/{provider}/callback', [SocialAuthController::class, 'callback'])
    ->where('provider', 'google|facebook')
    ->middleware('guest');

Route::get('/auth/complete-profile', [SocialAuthController::class, 'showCompleteProfile'])
    ->middleware('guest')
    ->name('auth.complete-profile');

Route::post('/auth/complete-profile', [SocialAuthController::class, 'completeProfile'])
    ->middleware('guest')
    ->name('auth.complete-profile.store');

// --- PROTECTED ROUTES ---
Route::middleware(['auth', 'staff.security', 'verified'])->group(function () {
    
    // DASHBOARD & PROFILE
    Route::get('/dashboard', [DashboardController::class, 'index'])->middleware('staff.attendance')->name('dashboard');
    Route::get('/staff/dashboard', [StaffDashboardController::class, 'index'])->name('staff.dashboard');
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::match(['patch', 'post'], '/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    
    // USER ADDRESSES
    Route::post('/user-addresses', [UserAddressController::class, 'store'])->name('user-addresses.store');
    Route::patch('/user-addresses/{id}', [UserAddressController::class, 'update'])->name('user-addresses.update');
    Route::patch('/user-addresses/{id}/set-default', [UserAddressController::class, 'setDefault'])->name('user-addresses.set-default');
    Route::delete('/user-addresses/{id}', [UserAddressController::class, 'destroy'])->name('user-addresses.destroy');

    // ARTISAN SETUP
    Route::get('/artisan/setup', [ArtisanSetupController::class, 'create'])->name('artisan.setup');
    Route::post('/artisan/setup', [ArtisanSetupController::class, 'store'])->name('artisan.setup.store');
    Route::post('/artisan/welcome-dismiss', [ArtisanSetupController::class, 'dismissWelcome'])->name('artisan.welcome.dismiss');
    Route::post('/artisan/accept-terms', [ArtisanSetupController::class, 'acceptTerms'])->name('artisan.accept-terms');
    
    // ARTISAN PENDING APPROVAL
    Route::get('/artisan/pending', function () {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        if (!$user->isPendingApproval()) {
            return redirect()->route('dashboard');
        }
        return Inertia::render('Auth/PendingApproval', ['user' => $user]);
    })->name('artisan.pending');

    // SELLER ROUTES
    Route::middleware(['seller.workspace', 'staff.attendance', 'seller.compliance'])->group(function () {
        Route::get('/orders', [SellerOrderController::class, 'index'])->middleware('seller.module:orders')->name('orders.index');
        Route::get('/orders/export', [SellerOrderController::class, 'export'])->middleware('seller.module:orders')->name('orders.export'); // <--- Added
        Route::get('/orders/{id}/receipt', [SellerOrderController::class, 'sellerDownloadReceipt'])->middleware('seller.module:orders')->name('orders.receipt');
        Route::post('/orders/{id}/update', [SellerOrderController::class, 'update'])->middleware('seller.module:orders')->name('orders.update');
        Route::post('/orders/{id}/approve-return', [SellerOrderController::class, 'approveReturn'])->middleware('seller.module:orders')->name('orders.approve-return');
        Route::post('/orders/{id}/payment-status', [SellerOrderController::class, 'updatePaymentStatus'])->middleware('seller.module:orders')->name('orders.payment-status');
        Route::post('/orders/{id}/lalamove', [LalamoveDeliveryController::class, 'store'])->middleware('seller.module:orders')->name('orders.lalamove.store');
        Route::post('/orders/bulk-lalamove', [LalamoveDeliveryController::class, 'bulkStore'])->middleware('seller.module:orders')->name('orders.bulk-lalamove');
        Route::get('/orders/bulk-labels', [SellerOrderController::class, 'bulkLabels'])->middleware('seller.module:orders')->name('orders.bulk-labels');
        Route::post('/orders/bulk-packing-slips', [\App\Http\Controllers\Seller\OrderPrintController::class, 'bulkPackingSlips'])->middleware('seller.module:orders')->name('orders.bulk-packing-slips');
        Route::post('/disputes/{id}/respond', [DisputeController::class, 'sellerRespond'])->middleware('seller.module:orders')->name('disputes.respond');
        
        Route::get('/analytics', [AnalyticsController::class, 'index'])->middleware('seller.module:analytics')->name('analytics.index');
        Route::get('/analytics/export', [AnalyticsController::class, 'export'])->middleware('seller.module:analytics')->name('analytics.export'); // <--- Added
        
        Route::get('/products', [ProductController::class, 'index'])->middleware('seller.module:products')->name('products.index');
        Route::get('/products/export-csv', [ProductController::class, 'exportCsv'])->middleware(['seller.module:products', 'throttle:bulk.ops'])->name('products.export-csv');
        Route::post('/products/import-csv', [ProductController::class, 'importCsv'])->middleware(['seller.module:products', 'throttle:bulk.ops'])->name('products.import-csv');
        Route::post('/products', [ProductController::class, 'store'])->middleware('seller.module:products')->name('products.store');
        Route::post('/products/{id}/update', [ProductController::class, 'update'])->middleware('seller.module:products')->name('products.update'); 
        Route::post('/products/{id}/resubmit', [ProductController::class, 'resubmit'])->middleware('seller.module:products')->name('products.resubmit');
        Route::post('/products/bulk-status', [ProductController::class, 'bulkUpdateStatus'])->middleware('seller.module:products')->name('products.bulk-status');
        Route::post('/products/{id}/archive', [ProductController::class, 'archive'])->middleware('seller.module:products')->name('products.archive');
        Route::post('/products/{id}/activate', [ProductController::class, 'activate'])->middleware('seller.module:products')->name('products.activate'); // New
        Route::post('/products/{id}/restock', [ProductController::class, 'restock'])->middleware('seller.module:products')->name('products.restock');
        Route::post('/products/{id}/deduct', [ProductController::class, 'manualDeduct'])->middleware('seller.module:products')->name('products.deduct'); // Phase 1: Manual Deduction
        
        Route::get('/3d-manager', [ThreeDManagerController::class, 'index'])->middleware('seller.module:3d')->name('3d.index');
        Route::post('/3d-manager/upload', [ThreeDManagerController::class, 'upload'])->middleware('seller.module:3d')->name('3d.upload');
        Route::delete('/3d-manager/{product:id}', [ThreeDManagerController::class, 'destroy'])->middleware('seller.module:3d')->name('3d.destroy');

        Route::get('/audit-log', [AuditLogController::class, 'index'])->middleware('artisan')->name('audit-log.index');
        Route::get('/audit-log/export', [AuditLogController::class, 'export'])->middleware('artisan')->name('audit-log.export');

        // SHOP SETTINGS
        Route::get('/shop-settings', [ShopController::class, 'settings'])->middleware('seller.module:shop_settings')->name('shop.settings');
        Route::post('/shop-settings', [ShopController::class, 'updateSettings'])->middleware('seller.module:shop_settings')->name('shop.settings.update');
        Route::get('/shop/analytics/rollup', [ShopController::class, 'analyticsRollup'])->name('shop.analytics.rollup');

        // SUBSCRIPTIONS
        Route::get('/subscription', [SubscriptionController::class, 'index'])->middleware('artisan')->name('seller.subscription');
        Route::post('/subscription/upgrade', [SubscriptionController::class, 'upgrade'])->middleware('artisan')->name('seller.subscription.upgrade');
        Route::post('/subscription/downgrade', [SubscriptionController::class, 'downgrade'])->middleware('artisan')->name('seller.subscription.downgrade');

        // SPONSORSHIPS
        Route::get('/sponsorships', [\App\Http\Controllers\Seller\SponsorshipController::class, 'index'])->middleware(['artisan', 'seller.module:sponsorships'])->name('seller.sponsorships');
        Route::post('/sponsorships', [\App\Http\Controllers\Seller\SponsorshipController::class, 'store'])->middleware(['artisan', 'seller.module:sponsorships'])->name('seller.sponsorships.store');

        // SETTINGS
        Route::post('/settings/modules', [SettingsController::class, 'updateModules'])->middleware('artisan')->name('settings.modules');
    });

    // CHAT SYSTEM & REVIEWS (CRM)
    Route::get('/chat', [ChatController::class, 'index'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:messages'])->name('chat.index'); 
    Route::post('/chat/send', [ChatController::class, 'store'])->name('chat.store');
    Route::post('/chat/seen', [ChatController::class, 'markAsSeen'])->name('chat.seen');
    Route::post('/chat/signal-typing', [ChatController::class, 'signalTyping'])->name('chat.signal-typing');
        
    // Message Templates
    Route::post('/chat/templates', [ChatController::class, 'storeTemplate'])->name('chat.templates.store');
    Route::put('/chat/templates/{id}', [ChatController::class, 'updateTemplate'])->name('chat.templates.update');
    Route::delete('/chat/templates/{id}', [ChatController::class, 'deleteTemplate'])->name('chat.templates.destroy');
    Route::get('/team-messages', [TeamMessageController::class, 'index'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:team_messages'])->name('team-messages.index');
    Route::post('/team-messages/send', [TeamMessageController::class, 'store'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:team_messages'])->name('team-messages.store');
    Route::post('/team-messages/seen', [TeamMessageController::class, 'markAsSeen'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:team_messages'])->name('team-messages.seen');
    Route::post('/team-messages/signal-typing', [TeamMessageController::class, 'signalTyping'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:team_messages'])->name('team-messages.signal-typing');
    Route::post('/team-messages/channels', [TeamMessageController::class, 'createChannel'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:team_messages'])->name('team-messages.channels.store');
    Route::post('/team-messages/channels/seen', [TeamMessageController::class, 'markChannelAsSeen'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:team_messages'])->name('team-messages.channels.seen');
    Route::get('/team-messages/threads/{message}', [TeamMessageController::class, 'showThread'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:team_messages'])->name('team-messages.threads.show');
    Route::post('/team-messages/react', [TeamMessageController::class, 'toggleReaction'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:team_messages'])->name('team-messages.react');
    Route::get('/buyer/chat', [ChatController::class, 'buyerIndex'])->name('buyer.chat');
    
    Route::get('/reviews', [ReviewController::class, 'index'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:reviews'])->name('reviews.index');
    Route::post('/reviews/{id}/reply', [ReviewController::class, 'reply'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:reviews'])->name('reviews.reply');
    Route::delete('/reviews/{id}/reply', [ReviewController::class, 'destroyReply'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:reviews'])->name('reviews.destroy-reply');
    Route::post('/reviews/{id}/dispute', [ReviewController::class, 'dispute'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:reviews'])->name('reviews.dispute');
    Route::patch('/review-disputes/{reviewDispute}', [ReviewController::class, 'updateDispute'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:reviews'])->name('review-disputes.update');
    Route::delete('/review-disputes/{reviewDispute}', [ReviewController::class, 'destroyDispute'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:reviews'])->name('review-disputes.destroy');
    Route::post('/reviews/{id}/toggle-pin', [ReviewController::class, 'togglePin'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:reviews'])->name('reviews.toggle-pin');

    // ERP MODULES
    Route::middleware(['seller.workspace', 'staff.attendance'])->group(function () {
        Route::get('/hr', [HRController::class, 'index'])->middleware('seller.module:hr')->name('hr.index');
        Route::post('/hr/employees', [HRController::class, 'store'])->middleware('seller.module:hr')->name('hr.store');
        Route::patch('/hr/employees/{id}', [HRController::class, 'update'])->middleware('seller.module:hr')->name('hr.update');
        Route::delete('/hr/employees/{id}', [HRController::class, 'destroy'])->middleware('seller.module:hr')->name('hr.destroy');
        Route::post('/hr/generate', [HRController::class, 'generatePayroll'])->middleware('seller.module:hr')->name('hr.generate');
        Route::post('/hr/settings', [HRController::class, 'updateSettings'])->middleware('seller.module:hr')->name('hr.settings');
        Route::get('/hr/payroll/{payroll}', [HRController::class, 'showPayroll'])->middleware('seller.module:hr')->name('hr.payroll.show');
        Route::post('/hr/payroll/{payroll}/submit', [HRController::class, 'submitPayrollRun'])->middleware('seller.module:hr')->name('hr.payroll.submit');
        Route::delete('/hr/payroll/{id}', [HRController::class, 'destroyPayroll'])->middleware('seller.module:hr')->name('hr.payroll.destroy');



        // PROCUREMENT / INVENTORY
        Route::get('/procurement', [ProcurementController::class, 'index'])->middleware('seller.module:procurement')->name('procurement.index');
        Route::post('/procurement/supplies', [ProcurementController::class, 'store'])->middleware('seller.module:procurement')->name('supplies.store');
        Route::post('/procurement/supplies/{supply}/update', [ProcurementController::class, 'update'])->middleware('seller.module:procurement')->name('supplies.update');
        Route::post('/procurement/supplies/{supply}/restock', [ProcurementController::class, 'restock'])->middleware('seller.module:procurement')->name('supplies.restock');
        Route::post('/procurement/supplies/{supply}/request', [ProcurementController::class, 'requestRestock'])->middleware('seller.module:stock_requests')->name('supplies.request'); // <--- Added
        Route::delete('/procurement/supplies/{supply}', [ProcurementController::class, 'destroy'])->middleware('seller.module:procurement')->name('supplies.destroy');

        // PROCUREMENT (Stock Requests)
        Route::get('/procurement/stock-requests', [StockRequestController::class, 'index'])->middleware('seller.module:stock_requests')->name('stock-requests.index'); 
        Route::post('/procurement/stock-requests', [StockRequestController::class, 'store'])->middleware('seller.module:stock_requests')->name('stock-requests.store');
        Route::post('/procurement/stock-requests/{stockRequest}/ordered', [StockRequestController::class, 'markAsOrdered'])->middleware('seller.module:stock_requests')->name('stock-requests.ordered');
        Route::post('/procurement/stock-requests/{stockRequest}/receive', [StockRequestController::class, 'receive'])->middleware('seller.module:stock_requests')->name('stock-requests.receive');
        Route::post('/procurement/stock-requests/{stockRequest}/transfer', [StockRequestController::class, 'transfer'])->middleware('seller.module:stock_requests')->name('stock-requests.transfer');

        // ACCOUNTING (Fund Release)
        Route::get('/accounting', [AccountingController::class, 'index'])->middleware('seller.module:accounting')->name('accounting.index');
        Route::get('/accounting/export', [AccountingController::class, 'export'])->middleware('seller.module:accounting')->name('accounting.export');
        Route::post('/accounting/release/{stockRequest}', [AccountingController::class, 'approveRelease'])->middleware('seller.module:accounting')->name('accounting.approve');
        Route::post('/accounting/reject/{stockRequest}', [AccountingController::class, 'rejectRelease'])->middleware('seller.module:accounting')->name('accounting.reject');
        Route::post('/accounting/update-funds', [AccountingController::class, 'updateBaseFunds'])->middleware('seller.module:accounting')->name('accounting.update-funds'); // <--- Added
        
        // New Payroll Approval Routes
        Route::post('/accounting/payroll/{payroll}/approve', [AccountingController::class, 'approvePayroll'])->middleware('seller.module:accounting')->name('accounting.approvePayroll');
        Route::post('/accounting/payroll/{payroll}/reject', [AccountingController::class, 'rejectPayroll'])->middleware('seller.module:accounting')->name('accounting.rejectPayroll');
        

        // Procurement Completion
        Route::post('/procurement/requests/{stockRequest}/receive', [ProcurementController::class, 'receiveOrder'])->middleware('seller.module:procurement')->name('procurement.receive');
    });
    
    // BUYER: SHOPPING & ORDERS
    Route::get('/checkout', [BuyerOrderController::class, 'create'])->name('checkout.create');
    Route::post('/checkout/shipping-quote', [BuyerOrderController::class, 'quoteShipping'])->name('checkout.shipping-quote');
    Route::post('/checkout', [BuyerOrderController::class, 'store'])->name('checkout.store');
    Route::get('/saved', function () {
        return Inertia::render('Consumer/Buyer/Saved');
    })->name('saved.index');

    // PAYMENT ROUTES
    Route::get('/payment/{orderId}/pay', [PaymentController::class, 'pay'])->name('payment.pay');
    
    Route::get('/my-orders', [BuyerOrderController::class, 'myOrders'])->name('my-orders.index');
    Route::post('/my-orders/{id}/receive', [BuyerOrderController::class, 'buyerReceiveOrder'])->name('my-orders.receive');
    Route::post('/my-orders/{id}/return', [BuyerOrderController::class, 'buyerRequestReturn'])->name('my-orders.return');
    Route::post('/my-orders/{id}/cancel', [BuyerOrderController::class, 'buyerCancelOrder'])->name('my-orders.cancel');
    Route::post('/my-orders/{id}/cancel-return', [BuyerOrderController::class, 'buyerCancelReturn'])->name('my-orders.cancel-return');
    Route::get('/my-orders/{id}/receipt', [BuyerOrderController::class, 'downloadReceipt'])->name('my-orders.receipt');

    // Disputes
    Route::post('/my-orders/{id}/dispute', [DisputeController::class, 'buyerInitiateDispute'])->name('my-orders.dispute');
    Route::post('/disputes/{id}/react', [DisputeController::class, 'buyerReact'])->name('disputes.react');

    // --- CART ROUTES (MISSING PART) ---
    Route::get('/cart', [CartController::class, 'index'])->name('cart.index');
    Route::post('/cart/add', [CartController::class, 'store'])->middleware('throttle:60,1')->name('cart.store');
    Route::patch('/cart/update', [CartController::class, 'update'])->middleware('throttle:60,1')->name('cart.update');
    Route::delete('/cart/remove', [CartController::class, 'destroy'])->name('cart.destroy');
    Route::post('/cart/buy-again/{id}', [CartController::class, 'buyAgain'])->name('cart.buy-again'); // New


    // NOTIFICATIONS
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('/notifications/{id}/unread', [NotificationController::class, 'markAsUnread'])->name('notifications.unread'); // New
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
    Route::delete('/notifications/clear-all', [NotificationController::class, 'destroyAll'])->name('notifications.clear-all'); // New
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy'); // New

    // REVIEWS
    Route::get('/my-reviews', [ReviewController::class, 'buyerIndex'])->name('buyer.reviews');
    Route::post('/reviews', [ReviewController::class, 'store'])->name('reviews.store');
    Route::patch('/reviews/{id}', [ReviewController::class, 'update'])->name('reviews.update');
    Route::delete('/reviews/{id}', [ReviewController::class, 'destroy'])->name('reviews.destroy');

    // GLOBAL SEARCH
    Route::get('/api/global-search', [\App\Http\Controllers\Consumer\GlobalSearchController::class, 'search'])->name('api.global-search');
    Route::get('/api/search/suggestions', [\App\Http\Controllers\Consumer\SearchController::class, 'suggestions'])->name('api.search.suggestions');

    // REPORTING
    Route::post('/report', [\App\Http\Controllers\Compliance\FlaggedContentController::class, 'store'])->name('report.store');
    
});

Route::get('/payment/success', [PaymentController::class, 'success'])->name('payment.success');
Route::get('/payment/cancel', [PaymentController::class, 'cancel'])->name('payment.cancel');
Route::get('/subscription/payment/success', [SubscriptionController::class, 'success'])->middleware('signed')->name('seller.subscription.payment.success');
Route::get('/subscription/payment/cancel', [SubscriptionController::class, 'cancel'])->middleware('signed')->name('seller.subscription.payment.cancel');
Route::post('/webhooks/lalamove', LalamoveWebhookController::class)->middleware('throttle:120,1')->name('webhooks.lalamove');
Route::post('/webhooks/paymongo', [\App\Http\Controllers\Webhooks\PaymongoWebhookController::class, 'handle'])->middleware('throttle:120,1')->name('webhooks.paymongo');
Route::get('/webhooks/cron', function () {
    if (request()->header('X-Vercel-Cron-Secret') !== env('CRON_SECRET')) {
        return response()->json(['error' => 'Unauthorized'], 401);
    }
    \Illuminate\Support\Facades\Artisan::call('schedule:run');
    return response()->json([
        'status' => 'success',
        'output' => \Illuminate\Support\Facades\Artisan::output()
    ]);
})->name('webhooks.cron');

Route::get('/img/proxy', [\App\Http\Controllers\Core\ImageProxyController::class, 'proxy'])->name('img.proxy');

// --- SUPER ADMIN ROUTES ---
Route::middleware(['auth', 'staff.security', 'verified', 'super_admin'])->prefix('admin')->group(function () {
    Route::get('/dashboard', [SuperAdminController::class, 'dashboard'])->name('admin.dashboard');
    
    // System Settings
    Route::get('/settings', [\App\Http\Controllers\Admin\SystemSettingsController::class, 'index'])->name('admin.settings.index');
    Route::post('/settings', [\App\Http\Controllers\Admin\SystemSettingsController::class, 'update'])->name('admin.settings.update');

    Route::get('/monetization', fn() => redirect()->route('admin.settings.index', ['tab' => 'monetization']))->name('admin.monetization');
    Route::get('/insights', [SuperAdminController::class, 'insights'])->name('admin.insights');
    Route::get('/users-manager', [SuperAdminController::class, 'userManager'])->name('admin.users.manager');
    Route::get('/users', fn() => redirect()->route('admin.users.manager', ['tab' => 'directory']))->name('admin.users');
    Route::get('/compliance', [ModerationController::class, 'compliance'])->name('admin.compliance');
    Route::get('/review-moderation', fn() => redirect()->route('admin.compliance', ['tab' => 'disputes']))->name('admin.review-moderation');
    Route::patch('/review-moderation/{reviewDispute}', [ModerationController::class, 'updateReview'])->name('admin.review-moderation.update');
    Route::delete('/review-moderation/{reviewDispute}', [ModerationController::class, 'destroyReview'])->name('admin.review-moderation.destroy');
    Route::get('/pending-artisans', fn() => redirect()->route('admin.users.manager', ['tab' => 'approvals']))->name('admin.pending');
    Route::get('/pending-artisans/{id}', [SuperAdminController::class, 'viewArtisan'])->name('admin.artisan.view');
    Route::post('/pending-artisans/bulk-approve', [SuperAdminController::class, 'bulkApproveArtisans'])->name('admin.artisan.bulk-approve');
    Route::post('/pending-artisans/{id}/documents/viewed', [SuperAdminController::class, 'markArtisanDocumentViewed'])->name('admin.artisan.documents.viewed');
    Route::post('/pending-artisans/{id}/approve', [SuperAdminController::class, 'approveArtisan'])->name('admin.artisan.approve');
    Route::post('/pending-artisans/{id}/reject', [SuperAdminController::class, 'rejectArtisan'])->name('admin.artisan.reject');
    
    // Real-time Validation
    Route::post('/taxonomy/check-name', [CatalogController::class, 'checkCategoryName'])->name('admin.taxonomy.check-name');
    Route::post('/artisan/check-slug', [SuperAdminController::class, 'checkArtisanSlug'])->name('admin.artisan.check-slug');


    
    // Consolidated Product Catalog
    Route::get('/catalog', [CatalogController::class, 'index'])->name('admin.catalog.index');
    Route::post('/catalog/moderate', [CatalogController::class, 'bulkModerateProducts'])->name('admin.catalog.moderate');
    Route::get('/sponsorships', fn() => redirect()->route('admin.catalog.index', ['tab' => 'sponsorships']))->name('admin.sponsorships');
    Route::post('/sponsorships/{sponsorshipRequest}/approve', [CatalogController::class, 'approveSponsorship'])->name('admin.sponsorships.approve');
    Route::post('/sponsorships/{sponsorshipRequest}/reject', [CatalogController::class, 'rejectSponsorship'])->name('admin.sponsorships.reject');

    // Dispute Arbitration
    Route::get('/disputes', [DisputeController::class, 'adminIndex'])->name('admin.disputes.index');
    Route::post('/disputes/{id}/arbitrate', [DisputeController::class, 'adminArbitrate'])->name('admin.disputes.arbitrate');

    // Moderation Queue
    Route::get('/moderation-queue', fn() => redirect()->route('admin.compliance', ['tab' => 'flags']))->name('admin.moderation');
    Route::post('/moderation-queue/{id}/resolve', [ModerationController::class, 'resolveFlag'])->name('admin.moderation.resolve');
    Route::post('/moderation-queue/{id}/takedown', [ModerationController::class, 'takedownProduct'])->name('admin.moderation.takedown');
    Route::post('/moderation-queue/{id}/suspend', [ModerationController::class, 'suspendUser'])->name('admin.moderation.suspend');
    Route::post('/moderation-queue/{id}/dismiss', [ModerationController::class, 'dismissFlag'])->name('admin.moderation.dismiss');

    // Platform Operations Control Center
    Route::get('/operations', [PlatformDiagnosticsController::class, 'operations'])->name('admin.operations');
    Route::get('/activity-log', fn() => redirect()->route('admin.operations', request()->query()))->name('admin.activity.index');
    Route::post('/diagnostics/cache/purge', [PlatformDiagnosticsController::class, 'purgeCache'])->middleware('throttle:admin.heavy')->name('admin.diagnostics.cache.purge');

    // Restoration Center (Trash)
    Route::get('/trash', fn() => redirect()->route('admin.compliance', ['tab' => 'trash']))->name('admin.trash');
    Route::post('/trash/restore', [PlatformDiagnosticsController::class, 'restoreItem'])->name('admin.trash.restore');
    Route::post('/trash/permanent-delete', [PlatformDiagnosticsController::class, 'permanentDeleteItem'])->name('admin.trash.permanent-delete');
    
    // Support Impersonation
    Route::post('/users/{user:id}/impersonate', [\App\Http\Controllers\Admin\ImpersonationController::class, 'impersonate'])->name('admin.impersonate');

    // Global Taxonomy Engine
    Route::get('/taxonomy', fn() => redirect()->route('admin.catalog.index', ['tab' => 'taxonomy']))->name('admin.taxonomy.index');
    Route::post('/taxonomy', [CatalogController::class, 'storeTaxonomy'])->name('admin.taxonomy.store');
    Route::patch('/taxonomy/{category}', [CatalogController::class, 'updateTaxonomy'])->name('admin.taxonomy.update');
    Route::delete('/taxonomy/{category}', [CatalogController::class, 'destroyTaxonomy'])->name('admin.taxonomy.destroy');
});

// Stop Impersonation Route (Protected by standard auth)
Route::post('/impersonation/leave', [\App\Http\Controllers\Admin\ImpersonationController::class, 'leave'])
    ->middleware(['auth'])
    ->name('impersonation.leave');

require __DIR__.'/auth.php';

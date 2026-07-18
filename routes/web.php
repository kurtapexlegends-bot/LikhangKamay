<?php



// use App\Http\Controllers\FinanceController; // Removed

use App\Models\Product;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

// --- PUBLIC ROUTES ---
Route::get('/', [\App\Http\Controllers\Consumer\CatalogController::class, 'home'])->name('home');

Route::get('/shop', [\App\Http\Controllers\Consumer\CatalogController::class, 'index'])->middleware('throttle:marketplace.search')->name('shop.index');
Route::get('/shop/{user:shop_slug}', [\App\Http\Controllers\Seller\ShopController::class, 'seller'])->name('shop.seller');
Route::get('/product/{product}', [\App\Http\Controllers\Seller\ProductController::class, 'show'])->name('product.show');
Route::post('/products/validate-active', [\App\Http\Controllers\Consumer\CatalogController::class, 'validateActive'])
    ->middleware('throttle:60,1')
    ->name('products.validate-active');
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
    return Inertia::render('Consumer/Legal/GeneralPrivacy');
})->name('privacy');

Route::get('/seller-agreement', function () {
    return Inertia::render('Consumer/Legal/SellerAgreement');
})->name('seller.agreement');

Route::get('/seller-privacy', function () {
    return Inertia::render('Consumer/Legal/SellerPrivacy');
})->name('seller.privacy');


// --- SOCIAL AUTH (Google/Facebook) ---

Route::get('/auth/{provider}', [\App\Http\Controllers\Auth\SocialAuthController::class, 'redirect'])
    ->where('provider', 'google|facebook')
    ->middleware('guest')
    ->name('auth.social');

Route::get('/auth/{provider}/artisan', [\App\Http\Controllers\Auth\SocialAuthController::class, 'redirectArtisan'])
    ->where('provider', 'google|facebook')
    ->middleware('guest')
    ->name('auth.social.artisan');

Route::get('/auth/{provider}/callback', [\App\Http\Controllers\Auth\SocialAuthController::class, 'callback'])
    ->where('provider', 'google|facebook')
    ->middleware('guest');

Route::get('/auth/complete-profile', [\App\Http\Controllers\Auth\SocialAuthController::class, 'showCompleteProfile'])
    ->middleware('guest')
    ->name('auth.complete-profile');

Route::post('/auth/complete-profile', [\App\Http\Controllers\Auth\SocialAuthController::class, 'completeProfile'])
    ->middleware(['guest', 'throttle:5,1'])
    ->name('auth.complete-profile.store');

// --- PROTECTED ROUTES ---
Route::middleware(['auth', 'staff.security', 'verified'])->group(function () {
    
    // DASHBOARD & PROFILE
    Route::get('/dashboard', [\App\Http\Controllers\Seller\DashboardController::class, 'index'])->middleware('staff.attendance')->name('dashboard');
    Route::get('/staff/dashboard', [\App\Http\Controllers\Seller\StaffDashboardController::class, 'index'])->name('staff.dashboard');
    Route::get('/profile', [\App\Http\Controllers\Core\ProfileController::class, 'edit'])->name('profile.edit');
    Route::match(['patch', 'post'], '/profile', [\App\Http\Controllers\Core\ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [\App\Http\Controllers\Core\ProfileController::class, 'destroy'])->name('profile.destroy');

    
    // USER ADDRESSES
    Route::post('/user-addresses', [\App\Http\Controllers\Consumer\UserAddressController::class, 'store'])->name('user-addresses.store');
    Route::patch('/user-addresses/{id}', [\App\Http\Controllers\Consumer\UserAddressController::class, 'update'])->name('user-addresses.update');
    Route::patch('/user-addresses/{id}/set-default', [\App\Http\Controllers\Consumer\UserAddressController::class, 'setDefault'])->name('user-addresses.set-default');
    Route::delete('/user-addresses/{id}', [\App\Http\Controllers\Consumer\UserAddressController::class, 'destroy'])->name('user-addresses.destroy');

    // ARTISAN SETUP
    Route::get('/artisan/setup', [\App\Http\Controllers\Auth\ArtisanSetupController::class, 'create'])->name('artisan.setup');
    Route::post('/artisan/setup', [\App\Http\Controllers\Auth\ArtisanSetupController::class, 'store'])->name('artisan.setup.store');
    Route::post('/artisan/setup/document/{type}', [\App\Http\Controllers\Auth\ArtisanSetupController::class, 'uploadSingleDocument'])->name('artisan.setup.upload-document');
    Route::delete('/artisan/setup/document/{type}', [\App\Http\Controllers\Auth\ArtisanSetupController::class, 'deleteDocument'])->name('artisan.setup.delete-document');
    Route::post('/artisan/welcome-dismiss', [\App\Http\Controllers\Auth\ArtisanSetupController::class, 'dismissWelcome'])->name('artisan.welcome.dismiss');
    Route::post('/artisan/accept-terms', [\App\Http\Controllers\Auth\ArtisanSetupController::class, 'acceptTerms'])->name('artisan.accept-terms');
    
    // ARTISAN PENDING APPROVAL
    Route::get('/artisan/pending', function () {
        try {
            /** @var \App\Models\User $user */
            $user = Auth::user();
            if (!$user->isPendingApproval()) {
                return redirect()->route('dashboard');
            }
            return Inertia::render('Auth/PendingApproval', [
                'user' => $user->only(['id', 'shop_name', 'email', 'artisan_status'])
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    })->name('artisan.pending');

    // SELLER ROUTES
    Route::middleware(['seller.workspace', 'staff.attendance', 'seller.compliance'])->group(function () {
        Route::get('/orders', [\App\Http\Controllers\Seller\SellerOrderController::class, 'index'])->middleware('seller.module:orders')->name('orders.index');
        Route::get('/orders/export', [\App\Http\Controllers\Seller\SellerOrderController::class, 'export'])->middleware('seller.module:orders')->name('orders.export'); // <--- Added
        Route::get('/orders/{id}/receipt', [\App\Http\Controllers\Seller\SellerOrderController::class, 'sellerDownloadReceipt'])->middleware('seller.module:orders')->name('orders.receipt');
        Route::post('/orders/{id}/update', [\App\Http\Controllers\Seller\SellerOrderController::class, 'update'])->middleware('seller.module:orders')->name('orders.update');
        Route::post('/orders/{id}/approve-return', [\App\Http\Controllers\Seller\SellerOrderController::class, 'approveReturn'])->middleware('seller.module:orders')->name('orders.approve-return');
        Route::post('/orders/{id}/payment-status', [\App\Http\Controllers\Seller\SellerOrderController::class, 'updatePaymentStatus'])->middleware('seller.module:orders')->name('orders.payment-status');
        Route::post('/orders/{id}/lalamove', [\App\Http\Controllers\Seller\LalamoveDeliveryController::class, 'store'])->middleware('seller.module:orders')->name('orders.lalamove.store');
        Route::post('/orders/bulk-lalamove', [\App\Http\Controllers\Seller\LalamoveDeliveryController::class, 'bulkStore'])->middleware('seller.module:orders')->name('orders.bulk-lalamove');
        Route::get('/orders/bulk-labels', [\App\Http\Controllers\Seller\SellerOrderController::class, 'bulkLabels'])->middleware('seller.module:orders')->name('orders.bulk-labels');
        Route::post('/orders/bulk-packing-slips', [\App\Http\Controllers\Seller\OrderPrintController::class, 'bulkPackingSlips'])->middleware('seller.module:orders')->name('orders.bulk-packing-slips');
        Route::post('/disputes/{id}/respond', [\App\Http\Controllers\Core\DisputeController::class, 'sellerRespond'])->middleware('seller.module:orders')->name('disputes.respond');
        
        Route::get('/analytics', [\App\Http\Controllers\Analytics\AnalyticsController::class, 'index'])->middleware('seller.module:analytics')->name('analytics.index');
        Route::get('/analytics/export', [\App\Http\Controllers\Analytics\AnalyticsController::class, 'export'])->middleware('seller.module:analytics')->name('analytics.export'); // <--- Added
        
        Route::get('/products', [\App\Http\Controllers\Seller\ProductController::class, 'index'])->middleware('seller.module:products')->name('products.index');
        Route::get('/products/export-csv', [\App\Http\Controllers\Seller\ProductController::class, 'exportCsv'])->middleware(['seller.module:products', 'throttle:bulk.ops'])->name('products.export-csv');
        Route::post('/products/import-csv', [\App\Http\Controllers\Seller\ProductController::class, 'importCsv'])->middleware(['seller.module:products', 'throttle:bulk.ops'])->name('products.import-csv');
        Route::post('/products', [\App\Http\Controllers\Seller\ProductController::class, 'store'])->middleware('seller.module:products')->name('products.store');
        Route::post('/products/{id}/update', [\App\Http\Controllers\Seller\ProductController::class, 'update'])->middleware('seller.module:products')->name('products.update'); 
        Route::post('/products/{id}/resubmit', [\App\Http\Controllers\Seller\ProductController::class, 'resubmit'])->middleware('seller.module:products')->name('products.resubmit');
        Route::post('/products/bulk-status', [\App\Http\Controllers\Seller\ProductController::class, 'bulkUpdateStatus'])->middleware('seller.module:products')->name('products.bulk-status');
        Route::post('/products/{id}/archive', [\App\Http\Controllers\Seller\ProductController::class, 'archive'])->middleware('seller.module:products')->name('products.archive');
        Route::post('/products/{id}/activate', [\App\Http\Controllers\Seller\ProductController::class, 'activate'])->middleware('seller.module:products')->name('products.activate'); // New
        Route::post('/products/{id}/restock', [\App\Http\Controllers\Seller\ProductController::class, 'restock'])->middleware('seller.module:products')->name('products.restock');
        Route::post('/products/{id}/deduct', [\App\Http\Controllers\Seller\ProductController::class, 'manualDeduct'])->middleware('seller.module:products')->name('products.deduct'); // Phase 1: Manual Deduction
        
        Route::get('/3d-manager', [\App\Http\Controllers\Seller\ThreeDManagerController::class, 'index'])->middleware('seller.module:3d')->name('3d.index');
        Route::post('/3d-manager/upload', [\App\Http\Controllers\Seller\ThreeDManagerController::class, 'upload'])->middleware('seller.module:3d')->name('3d.upload');
        Route::post('/3d-manager/presign', [\App\Http\Controllers\Seller\ThreeDManagerController::class, 'presign'])->middleware('seller.module:3d')->name('3d.presign');
        Route::put('/3d-manager/local-upload', [\App\Http\Controllers\Seller\ThreeDManagerController::class, 'localUpload'])->middleware('seller.module:3d')->name('3d.local-upload');
        Route::delete('/3d-manager/{product:id}', [\App\Http\Controllers\Seller\ThreeDManagerController::class, 'destroy'])->middleware('seller.module:3d')->name('3d.destroy');

        Route::get('/audit-log', [\App\Http\Controllers\Seller\AuditLogController::class, 'index'])->middleware('artisan')->name('audit-log.index');
        Route::get('/audit-log/export', [\App\Http\Controllers\Seller\AuditLogController::class, 'export'])->middleware('artisan')->name('audit-log.export');

        // SHOP SETTINGS
        Route::get('/shop-settings', [\App\Http\Controllers\Seller\ShopController::class, 'settings'])->middleware('seller.module:shop_settings')->name('shop.settings');
        Route::post('/shop-settings', [\App\Http\Controllers\Seller\ShopController::class, 'updateSettings'])->middleware('seller.module:shop_settings')->name('shop.settings.update');
        Route::get('/shop/analytics/rollup', [\App\Http\Controllers\Seller\ShopController::class, 'analyticsRollup'])->name('shop.analytics.rollup');

        // SUBSCRIPTIONS
        Route::get('/subscription', [\App\Http\Controllers\Seller\SubscriptionController::class, 'index'])->middleware('artisan')->name('seller.subscription');
        Route::post('/subscription/upgrade', [\App\Http\Controllers\Seller\SubscriptionController::class, 'upgrade'])->middleware('artisan')->name('seller.subscription.upgrade');
        Route::post('/subscription/downgrade', [\App\Http\Controllers\Seller\SubscriptionController::class, 'downgrade'])->middleware('artisan')->name('seller.subscription.downgrade');

        // SPONSORSHIPS
        Route::get('/sponsorships', [\App\Http\Controllers\Seller\SponsorshipController::class, 'index'])->middleware(['artisan', 'seller.module:sponsorships'])->name('seller.sponsorships');
        Route::post('/sponsorships', [\App\Http\Controllers\Seller\SponsorshipController::class, 'store'])->middleware(['artisan', 'seller.module:sponsorships'])->name('seller.sponsorships.store');

        // SETTINGS
        Route::post('/settings/modules', [\App\Http\Controllers\Seller\SettingsController::class, 'updateModules'])->middleware('artisan')->name('settings.modules');
    });

    // CHAT SYSTEM & REVIEWS (CRM)
    Route::get('/chat', [\App\Http\Controllers\Chat\ChatController::class, 'index'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:messages'])->name('chat.index'); 
    Route::post('/chat/send', [\App\Http\Controllers\Chat\ChatController::class, 'store'])->name('chat.store');
    Route::post('/chat/seen', [\App\Http\Controllers\Chat\ChatController::class, 'markAsSeen'])->name('chat.seen');
    Route::post('/chat/signal-typing', [\App\Http\Controllers\Chat\ChatController::class, 'signalTyping'])->name('chat.signal-typing');
        
    // Message Templates
    Route::post('/chat/templates', [\App\Http\Controllers\Chat\ChatController::class, 'storeTemplate'])->name('chat.templates.store');
    Route::put('/chat/templates/{id}', [\App\Http\Controllers\Chat\ChatController::class, 'updateTemplate'])->name('chat.templates.update');
    Route::delete('/chat/templates/{id}', [\App\Http\Controllers\Chat\ChatController::class, 'deleteTemplate'])->name('chat.templates.destroy');
    Route::get('/team-messages', [\App\Http\Controllers\Seller\TeamMessageController::class, 'index'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:team_messages'])->name('team-messages.index');
    Route::post('/team-messages/send', [\App\Http\Controllers\Seller\TeamMessageController::class, 'store'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:team_messages'])->name('team-messages.store');
    Route::post('/team-messages/seen', [\App\Http\Controllers\Seller\TeamMessageController::class, 'markAsSeen'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:team_messages'])->name('team-messages.seen');
    Route::post('/team-messages/signal-typing', [\App\Http\Controllers\Seller\TeamMessageController::class, 'signalTyping'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:team_messages'])->name('team-messages.signal-typing');
    Route::post('/team-messages/channels', [\App\Http\Controllers\Seller\TeamMessageController::class, 'createChannel'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:team_messages'])->name('team-messages.channels.store');
    Route::post('/team-messages/channels/seen', [\App\Http\Controllers\Seller\TeamMessageController::class, 'markChannelAsSeen'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:team_messages'])->name('team-messages.channels.seen');
    Route::get('/team-messages/threads/{message}', [\App\Http\Controllers\Seller\TeamMessageController::class, 'showThread'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:team_messages'])->name('team-messages.threads.show');
    Route::post('/team-messages/react', [\App\Http\Controllers\Seller\TeamMessageController::class, 'toggleReaction'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:team_messages'])->name('team-messages.react');
    Route::get('/buyer/chat', [\App\Http\Controllers\Chat\ChatController::class, 'buyerIndex'])->name('buyer.chat');
    
    Route::get('/reviews', [\App\Http\Controllers\Seller\ReviewController::class, 'index'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:reviews'])->name('reviews.index');
    Route::post('/reviews/{id}/reply', [\App\Http\Controllers\Seller\ReviewController::class, 'reply'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:reviews'])->name('reviews.reply');
    Route::delete('/reviews/{id}/reply', [\App\Http\Controllers\Seller\ReviewController::class, 'destroyReply'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:reviews'])->name('reviews.destroy-reply');
    Route::post('/reviews/{id}/dispute', [\App\Http\Controllers\Seller\ReviewController::class, 'dispute'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:reviews'])->name('reviews.dispute');
    Route::patch('/review-disputes/{reviewDispute}', [\App\Http\Controllers\Seller\ReviewController::class, 'updateDispute'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:reviews'])->name('review-disputes.update');
    Route::delete('/review-disputes/{reviewDispute}', [\App\Http\Controllers\Seller\ReviewController::class, 'destroyDispute'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:reviews'])->name('review-disputes.destroy');
    Route::post('/reviews/{id}/toggle-pin', [\App\Http\Controllers\Seller\ReviewController::class, 'togglePin'])->middleware(['seller.workspace', 'staff.attendance', 'seller.module:reviews'])->name('reviews.toggle-pin');

    // ERP MODULES
    Route::middleware(['seller.workspace', 'staff.attendance'])->group(function () {
        Route::get('/hr', [\App\Http\Controllers\Seller\HRController::class, 'index'])->middleware('seller.module:hr')->name('hr.index');
        Route::post('/hr/employees', [\App\Http\Controllers\Seller\HRController::class, 'store'])->middleware('seller.module:hr')->name('hr.store');
        Route::patch('/hr/employees/{id}', [\App\Http\Controllers\Seller\HRController::class, 'update'])->middleware('seller.module:hr')->name('hr.update');
        Route::delete('/hr/employees/{id}', [\App\Http\Controllers\Seller\HRController::class, 'destroy'])->middleware('seller.module:hr')->name('hr.destroy');
        Route::post('/hr/generate', [\App\Http\Controllers\Seller\HRController::class, 'generatePayroll'])->middleware('seller.module:hr')->name('hr.generate');
        Route::post('/hr/settings', [\App\Http\Controllers\Seller\HRController::class, 'updateSettings'])->middleware('seller.module:hr')->name('hr.settings');
        Route::get('/hr/payroll/{payroll}', [\App\Http\Controllers\Seller\HRController::class, 'showPayroll'])->middleware('seller.module:hr')->name('hr.payroll.show');
        Route::post('/hr/payroll/{payroll}/submit', [\App\Http\Controllers\Seller\HRController::class, 'submitPayrollRun'])->middleware('seller.module:hr')->name('hr.payroll.submit');
        Route::delete('/hr/payroll/{id}', [\App\Http\Controllers\Seller\HRController::class, 'destroyPayroll'])->middleware('seller.module:hr')->name('hr.payroll.destroy');



        // PROCUREMENT / INVENTORY
        Route::get('/procurement', [\App\Http\Controllers\Seller\ProcurementController::class, 'index'])->middleware('seller.module:procurement')->name('procurement.index');
        Route::post('/procurement/supplies', [\App\Http\Controllers\Seller\ProcurementController::class, 'store'])->middleware('seller.module:procurement')->name('supplies.store');
        Route::post('/procurement/supplies/{supply}/update', [\App\Http\Controllers\Seller\ProcurementController::class, 'update'])->middleware('seller.module:procurement')->name('supplies.update');
        Route::post('/procurement/supplies/{supply}/restock', [\App\Http\Controllers\Seller\ProcurementController::class, 'restock'])->middleware('seller.module:procurement')->name('supplies.restock');
        Route::post('/procurement/supplies/{supply}/request', [\App\Http\Controllers\Seller\ProcurementController::class, 'requestRestock'])->middleware('seller.module:stock_requests')->name('supplies.request'); // <--- Added
        Route::delete('/procurement/supplies/{supply}', [\App\Http\Controllers\Seller\ProcurementController::class, 'destroy'])->middleware('seller.module:procurement')->name('supplies.destroy');

        // PROCUREMENT (Stock Requests)
        Route::get('/procurement/stock-requests', [\App\Http\Controllers\Seller\StockRequestController::class, 'index'])->middleware('seller.module:stock_requests')->name('stock-requests.index'); 
        Route::post('/procurement/stock-requests', [\App\Http\Controllers\Seller\StockRequestController::class, 'store'])->middleware('seller.module:stock_requests')->name('stock-requests.store');
        Route::post('/procurement/stock-requests/{stockRequest}/ordered', [\App\Http\Controllers\Seller\StockRequestController::class, 'markAsOrdered'])->middleware('seller.module:stock_requests')->name('stock-requests.ordered');
        Route::post('/procurement/stock-requests/{stockRequest}/receive', [\App\Http\Controllers\Seller\StockRequestController::class, 'receive'])->middleware('seller.module:stock_requests')->name('stock-requests.receive');
        Route::post('/procurement/stock-requests/{stockRequest}/transfer', [\App\Http\Controllers\Seller\StockRequestController::class, 'transfer'])->middleware('seller.module:stock_requests')->name('stock-requests.transfer');

        // ACCOUNTING (Fund Release)
        Route::get('/accounting', [\App\Http\Controllers\Seller\AccountingController::class, 'index'])->middleware('seller.module:accounting')->name('accounting.index');
        Route::get('/accounting/export', [\App\Http\Controllers\Seller\AccountingController::class, 'export'])->middleware('seller.module:accounting')->name('accounting.export');
        Route::post('/accounting/release/{stockRequest}', [\App\Http\Controllers\Seller\AccountingController::class, 'approveRelease'])->middleware('seller.module:accounting')->name('accounting.approve');
        Route::post('/accounting/reject/{stockRequest}', [\App\Http\Controllers\Seller\AccountingController::class, 'rejectRelease'])->middleware('seller.module:accounting')->name('accounting.reject');
        Route::post('/accounting/update-funds', [\App\Http\Controllers\Seller\AccountingController::class, 'updateBaseFunds'])->middleware('seller.module:accounting')->name('accounting.update-funds'); // <--- Added
        
        // New Payroll Approval Routes
        Route::post('/accounting/payroll/{payroll}/approve', [\App\Http\Controllers\Seller\AccountingController::class, 'approvePayroll'])->middleware('seller.module:accounting')->name('accounting.approvePayroll');
        Route::post('/accounting/payroll/{payroll}/reject', [\App\Http\Controllers\Seller\AccountingController::class, 'rejectPayroll'])->middleware('seller.module:accounting')->name('accounting.rejectPayroll');
        

        // Procurement Completion
        Route::post('/procurement/requests/{stockRequest}/receive', [\App\Http\Controllers\Seller\ProcurementController::class, 'receiveOrder'])->middleware('seller.module:procurement')->name('procurement.receive');
    });
    
    // BUYER: SHOPPING & ORDERS
    Route::get('/checkout', [\App\Http\Controllers\Consumer\BuyerOrderController::class, 'create'])->name('checkout.create');
    Route::post('/checkout/shipping-quote', [\App\Http\Controllers\Consumer\BuyerOrderController::class, 'quoteShipping'])->name('checkout.shipping-quote');
    Route::post('/checkout', [\App\Http\Controllers\Consumer\BuyerOrderController::class, 'store'])->name('checkout.store');
    Route::get('/saved', function () {
        return Inertia::render('Consumer/Buyer/Saved');
    })->name('saved.index');

    // PAYMENT ROUTES
    Route::get('/payment/{orderId}/pay', [\App\Http\Controllers\Consumer\PaymentController::class, 'pay'])->name('payment.pay');
    
    Route::get('/my-orders', [\App\Http\Controllers\Consumer\BuyerOrderController::class, 'myOrders'])->name('my-orders.index');
    Route::post('/my-orders/{id}/receive', [\App\Http\Controllers\Consumer\BuyerOrderController::class, 'buyerReceiveOrder'])->name('my-orders.receive');
    Route::post('/my-orders/{id}/return', [\App\Http\Controllers\Consumer\BuyerOrderController::class, 'buyerRequestReturn'])->name('my-orders.return');
    Route::post('/my-orders/{id}/cancel', [\App\Http\Controllers\Consumer\BuyerOrderController::class, 'buyerCancelOrder'])->name('my-orders.cancel');
    Route::post('/my-orders/{id}/cancel-return', [\App\Http\Controllers\Consumer\BuyerOrderController::class, 'buyerCancelReturn'])->name('my-orders.cancel-return');
    Route::get('/my-orders/{id}/receipt', [\App\Http\Controllers\Consumer\BuyerOrderController::class, 'downloadReceipt'])->name('my-orders.receipt');

    // Disputes
    Route::post('/my-orders/{id}/dispute', [\App\Http\Controllers\Core\DisputeController::class, 'buyerInitiateDispute'])->name('my-orders.dispute');
    Route::post('/disputes/{id}/react', [\App\Http\Controllers\Core\DisputeController::class, 'buyerReact'])->name('disputes.react');

    // --- CART ROUTES (MISSING PART) ---
    Route::get('/cart', [\App\Http\Controllers\Consumer\CartController::class, 'index'])->name('cart.index');
    Route::post('/cart/add', [\App\Http\Controllers\Consumer\CartController::class, 'store'])->middleware('throttle:60,1')->name('cart.store');
    Route::patch('/cart/update', [\App\Http\Controllers\Consumer\CartController::class, 'update'])->middleware('throttle:60,1')->name('cart.update');
    Route::delete('/cart/remove', [\App\Http\Controllers\Consumer\CartController::class, 'destroy'])->name('cart.destroy');
    Route::post('/cart/buy-again/{id}', [\App\Http\Controllers\Consumer\CartController::class, 'buyAgain'])->name('cart.buy-again'); // New


    // NOTIFICATIONS
    Route::get('/notifications', [\App\Http\Controllers\Core\NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/{id}/read', [\App\Http\Controllers\Core\NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('/notifications/{id}/unread', [\App\Http\Controllers\Core\NotificationController::class, 'markAsUnread'])->name('notifications.unread'); // New
    Route::post('/notifications/read-all', [\App\Http\Controllers\Core\NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
    Route::delete('/notifications/clear-all', [\App\Http\Controllers\Core\NotificationController::class, 'destroyAll'])->name('notifications.clear-all'); // New
    Route::delete('/notifications/{id}', [\App\Http\Controllers\Core\NotificationController::class, 'destroy'])->name('notifications.destroy'); // New

    // REVIEWS
    Route::get('/my-reviews', [\App\Http\Controllers\Consumer\ReviewController::class, 'buyerIndex'])->name('buyer.reviews');
    Route::post('/reviews', [\App\Http\Controllers\Consumer\ReviewController::class, 'store'])->name('reviews.store');
    Route::patch('/reviews/{id}', [\App\Http\Controllers\Consumer\ReviewController::class, 'update'])->name('reviews.update');
    Route::delete('/reviews/{id}', [\App\Http\Controllers\Consumer\ReviewController::class, 'destroy'])->name('reviews.destroy');

    // GLOBAL SEARCH
    Route::get('/api/global-search', [\App\Http\Controllers\Consumer\GlobalSearchController::class, 'search'])->name('api.global-search');
    Route::get('/api/search/suggestions', [\App\Http\Controllers\Consumer\SearchController::class, 'suggestions'])->name('api.search.suggestions');

    // REPORTING
    Route::post('/report', [\App\Http\Controllers\Compliance\FlaggedContentController::class, 'store'])->name('report.store');
    
});

Route::get('/payment/success', [\App\Http\Controllers\Consumer\PaymentController::class, 'success'])->name('payment.success');
Route::get('/payment/cancel', [\App\Http\Controllers\Consumer\PaymentController::class, 'cancel'])->name('payment.cancel');
Route::get('/subscription/payment/success', [\App\Http\Controllers\Seller\SubscriptionController::class, 'success'])->middleware('signed')->name('seller.subscription.payment.success');
Route::get('/subscription/payment/cancel', [\App\Http\Controllers\Seller\SubscriptionController::class, 'cancel'])->middleware('signed')->name('seller.subscription.payment.cancel');
Route::post('/webhooks/lalamove', \App\Http\Controllers\Webhooks\LalamoveWebhookController::class)->middleware('throttle:120,1')->name('webhooks.lalamove');
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

Route::get('/webhooks/cron/queue', function () {
    if (request()->header('X-Vercel-Cron-Secret') !== env('CRON_SECRET')) {
        return response()->json(['error' => 'Unauthorized'], 401);
    }
    \Illuminate\Support\Facades\Artisan::call('queue:work', [
        '--stop-when-empty' => true,
        '--max-time' => 50
    ]);
    return response()->json([
        'status' => 'success',
        'output' => \Illuminate\Support\Facades\Artisan::output()
    ]);
})->name('webhooks.cron.queue');

Route::get('/webhooks/migrate', function () {
    if (request()->query('secret') !== env('CRON_SECRET')) {
        return response()->json(['error' => 'Unauthorized'], 401);
    }
    \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
    return response()->json([
        'status' => 'success',
        'output' => \Illuminate\Support\Facades\Artisan::output()
    ]);
})->name('webhooks.migrate');

Route::get('/debug-db-columns', function () {
    try {
        return response()->json([
            'users_columns' => \Illuminate\Support\Facades\Schema::getColumnListing('users'),
            'payouts_exists' => \Illuminate\Support\Facades\Schema::hasTable('payouts'),
            'database_name' => \Illuminate\Support\Facades\DB::connection()->getDatabaseName()
        ]);
    } catch (\Throwable $e) {
        return response()->json(['error' => $e->getMessage()]);
    }
});

Route::get('/ping', function () {
    return response('pong', 200)->header('Content-Type', 'text/plain');
});

Route::get('/img/proxy', [\App\Http\Controllers\Core\ImageProxyController::class, 'proxy'])->name('img.proxy');

// --- SUPER ADMIN ROUTES ---
Route::middleware(['auth', 'staff.security', 'verified', 'super_admin'])->prefix('admin')->group(function () {
    Route::get('/dashboard', [\App\Http\Controllers\Admin\SuperAdminController::class, 'dashboard'])->name('admin.dashboard');
    
    // System Settings
    Route::get('/settings', [\App\Http\Controllers\Admin\SystemSettingsController::class, 'index'])->name('admin.settings.index');
    Route::post('/settings', [\App\Http\Controllers\Admin\SystemSettingsController::class, 'update'])->name('admin.settings.update');
        Route::get('/monetization', fn() => redirect()->route('admin.settings.index', ['tab' => 'monetization']))->name('admin.monetization');
    Route::get('/insights', [\App\Http\Controllers\Admin\SuperAdminController::class, 'insights'])->name('admin.insights');
    Route::get('/insights/export', [\App\Http\Controllers\Admin\SuperAdminController::class, 'exportInsights'])->name('admin.insights.export');
    Route::get('/settings/monetization/export', [\App\Http\Controllers\Admin\SystemSettingsController::class, 'exportMonetization'])->name('admin.settings.monetization.export');
    Route::get('/users-manager', [\App\Http\Controllers\Admin\SuperAdminController::class, 'userManager'])->name('admin.users.manager');
    Route::post('/users-manager/{user:id}/toggle-status', [\App\Http\Controllers\Admin\SuperAdminController::class, 'toggleUserStatus'])->name('admin.users.toggle-status');
    Route::get('/users', fn() => redirect()->route('admin.users.manager', ['tab' => 'directory']))->name('admin.users');

    // Payout Management
    Route::get('/payouts', [\App\Http\Controllers\Admin\PayoutController::class, 'index'])->name('admin.payouts.index');
    Route::post('/payouts', [\App\Http\Controllers\Admin\PayoutController::class, 'store'])->name('admin.payouts.store');
    
    Route::get('/compliance', [\App\Http\Controllers\Admin\ModerationController::class, 'compliance'])->name('admin.compliance');
    Route::get('/review-moderation', fn() => redirect()->route('admin.compliance', ['tab' => 'disputes']))->name('admin.review-moderation');
    Route::patch('/review-moderation/{reviewDispute}', [\App\Http\Controllers\Admin\ModerationController::class, 'updateReview'])->name('admin.review-moderation.update');
    Route::delete('/review-moderation/{reviewDispute}', [\App\Http\Controllers\Admin\ModerationController::class, 'destroyReview'])->name('admin.review-moderation.destroy');
    Route::get('/pending-artisans', fn() => redirect()->route('admin.users.manager', ['tab' => 'approvals']))->name('admin.pending');
    Route::get('/pending-artisans/{id}', [\App\Http\Controllers\Admin\SuperAdminController::class, 'viewArtisan'])->name('admin.artisan.view');
    Route::post('/pending-artisans/bulk-approve', [\App\Http\Controllers\Admin\SuperAdminController::class, 'bulkApproveArtisans'])->name('admin.artisan.bulk-approve');
    Route::post('/pending-artisans/{id}/documents/viewed', [\App\Http\Controllers\Admin\SuperAdminController::class, 'markArtisanDocumentViewed'])->name('admin.artisan.documents.viewed');
    Route::post('/pending-artisans/{id}/approve', [\App\Http\Controllers\Admin\SuperAdminController::class, 'approveArtisan'])->name('admin.artisan.approve');
    Route::post('/pending-artisans/{id}/reject', [\App\Http\Controllers\Admin\SuperAdminController::class, 'rejectArtisan'])->name('admin.artisan.reject');
    
    // Real-time Validation
    Route::post('/taxonomy/check-name', [\App\Http\Controllers\Admin\CatalogController::class, 'checkCategoryName'])->name('admin.taxonomy.check-name');
    Route::post('/artisan/check-slug', [\App\Http\Controllers\Admin\SuperAdminController::class, 'checkArtisanSlug'])->name('admin.artisan.check-slug');


    
    // Consolidated Product Catalog
    Route::get('/catalog', [\App\Http\Controllers\Admin\CatalogController::class, 'index'])->name('admin.catalog.index');
    Route::post('/catalog/moderate', [\App\Http\Controllers\Admin\CatalogController::class, 'bulkModerateProducts'])->name('admin.catalog.moderate');
    Route::get('/sponsorships', fn() => redirect()->route('admin.catalog.index', ['tab' => 'sponsorships']))->name('admin.sponsorships');
    Route::post('/sponsorships/{sponsorshipRequest}/approve', [\App\Http\Controllers\Admin\CatalogController::class, 'approveSponsorship'])->name('admin.sponsorships.approve');
    Route::post('/sponsorships/{sponsorshipRequest}/reject', [\App\Http\Controllers\Admin\CatalogController::class, 'rejectSponsorship'])->name('admin.sponsorships.reject');

    // Dispute Arbitration
    Route::get('/disputes', [\App\Http\Controllers\Core\DisputeController::class, 'adminIndex'])->name('admin.disputes.index');
    Route::post('/disputes/{id}/arbitrate', [\App\Http\Controllers\Core\DisputeController::class, 'adminArbitrate'])->name('admin.disputes.arbitrate');

    // Moderation Queue
    Route::get('/moderation-queue', fn() => redirect()->route('admin.compliance', ['tab' => 'flags']))->name('admin.moderation');
    Route::post('/moderation-queue/{id}/resolve', [\App\Http\Controllers\Admin\ModerationController::class, 'resolveFlag'])->name('admin.moderation.resolve');
    Route::post('/moderation-queue/{id}/takedown', [\App\Http\Controllers\Admin\ModerationController::class, 'takedownProduct'])->name('admin.moderation.takedown');
    Route::post('/moderation-queue/{id}/suspend', [\App\Http\Controllers\Admin\ModerationController::class, 'suspendUser'])->name('admin.moderation.suspend');
    Route::post('/moderation-queue/{id}/dismiss', [\App\Http\Controllers\Admin\ModerationController::class, 'dismissFlag'])->name('admin.moderation.dismiss');

    // Platform Operations Control Center
    Route::get('/operations', [\App\Http\Controllers\Admin\PlatformDiagnosticsController::class, 'operations'])->name('admin.operations');
    Route::get('/operations/export', [\App\Http\Controllers\Admin\PlatformDiagnosticsController::class, 'export'])->name('admin.activity.export');
    Route::get('/activity-log', fn() => redirect()->route('admin.operations', request()->query()))->name('admin.activity.index');
    Route::post('/diagnostics/cache/purge', [\App\Http\Controllers\Admin\PlatformDiagnosticsController::class, 'purgeCache'])->middleware('throttle:admin.heavy')->name('admin.diagnostics.cache.purge');

    // Restoration Center (Trash)
    Route::get('/trash', fn() => redirect()->route('admin.compliance', ['tab' => 'trash']))->name('admin.trash');
    Route::post('/trash/restore', [\App\Http\Controllers\Admin\PlatformDiagnosticsController::class, 'restoreItem'])->name('admin.trash.restore');
    Route::post('/trash/permanent-delete', [\App\Http\Controllers\Admin\PlatformDiagnosticsController::class, 'permanentDeleteItem'])->name('admin.trash.permanent-delete');
    
    // Support Impersonation
    Route::post('/users/{user:id}/impersonate', [\App\Http\Controllers\Admin\ImpersonationController::class, 'impersonate'])->name('admin.impersonate');

    // Global Taxonomy Engine
    Route::get('/taxonomy', fn() => redirect()->route('admin.settings.index', ['tab' => 'taxonomy']))->name('admin.taxonomy.index');
    Route::post('/taxonomy', [\App\Http\Controllers\Admin\CatalogController::class, 'storeTaxonomy'])->name('admin.taxonomy.store');
    Route::patch('/taxonomy/{category}', [\App\Http\Controllers\Admin\CatalogController::class, 'updateTaxonomy'])->name('admin.taxonomy.update');
    Route::delete('/taxonomy/{category}', [\App\Http\Controllers\Admin\CatalogController::class, 'destroyTaxonomy'])->name('admin.taxonomy.destroy');
});

Route::get('/categories-debug', function() {
    $service = new \App\Services\CatalogService();
    
    $sponsoredError = null;
    $sponsored = [];
    try {
        $sponsored = $service->getSponsoredProducts();
    } catch (\Exception $e) {
        $sponsoredError = $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine();
    }

    $featuredError = null;
    $featured = [];
    try {
        $featured = $service->getFeaturedProducts(collect($sponsored)->pluck('id')->all());
    } catch (\Exception $e) {
        $featuredError = $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine();
    }

    $topSellersError = null;
    $topSellers = [];
    try {
        $topSellers = $service->getTopSellers();
    } catch (\Exception $e) {
        $topSellersError = $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine();
    }

    $categoriesError = null;
    $categories = [];
    try {
        $categories = $service->getCategories();
    } catch (\Exception $e) {
        $categoriesError = $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine();
    }

    return response()->json([
        'sponsored_products' => $sponsored,
        'sponsored_error' => $sponsoredError,
        'featured_products' => $featured,
        'featured_error' => $featuredError,
        'top_sellers' => $topSellers,
        'top_sellers_error' => $topSellersError,
        'categories' => $categories,
        'categories_error' => $categoriesError,
        'all_database_categories' => \App\Models\Category::all()->toArray()
    ]);
});

// Stop Impersonation Route (Protected by standard auth)
Route::post('/impersonation/leave', [\App\Http\Controllers\Admin\ImpersonationController::class, 'leave'])
    ->middleware(['auth'])
    ->name('impersonation.leave');

require __DIR__.'/auth.php';

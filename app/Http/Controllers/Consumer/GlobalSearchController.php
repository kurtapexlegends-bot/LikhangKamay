<?php

namespace App\Http\Controllers\Consumer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Supply;
use App\Models\StockRequest;
use App\Models\Review;
use App\Models\ReviewDispute;
use App\Models\SponsorshipRequest;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\Category;
use App\Models\FlaggedContent;
use App\Models\PlatformActivity;
use App\Models\Dispute;
use App\Models\Discount;
use App\Models\Payout;
use App\Models\EmailTemplate;
use App\Models\TeamChannel;
use App\Models\SellerActivityLog;
use App\Models\StaffAccessAudit;
use App\Models\SellerLocation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GlobalSearchController extends Controller
{
    public function search(Request $request)
    {
        $query = trim((string) $request->input('query'));
        if (empty($query) || strlen($query) < 2) {
            return response()->json(['results' => []]);
        }

        /** @var \App\Models\User $user */
        $user = Auth::user();
        if (!$user) {
            abort(401, 'Unauthorized');
        }

        $like = \Illuminate\Support\Facades\DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'like';

        if ($user->isAdmin()) {
            return response()->json(['results' => $this->adminSearch($query, $like)]);
        }

        if ($user->isArtisan() || $user->isStaff()) {
            return response()->json(['results' => $this->sellerSearch($user, $query, $like)]);
        }

        return response()->json(['results' => []]);
    }

    private function adminSearch(string $query, string $like): array
    {
        return array_merge(
            $this->searchAdminUsers($query, $like),
            $this->searchAdminOrders($query, $like),
            $this->searchAdminProducts($query, $like),
            $this->searchAdminDisputes($query, $like),
            $this->searchAdminReviewDisputes($query, $like),
            $this->searchAdminPayouts($query, $like),
            $this->searchAdminSponsorships($query, $like),
            $this->searchAdminEmailTemplates($query, $like),
            $this->searchAdminCategories($query, $like),
            $this->searchAdminModeration($query, $like),
            $this->searchAdminActivities($query, $like)
        );
    }

    private function searchAdminOrders(string $query, string $like): array
    {
        $cleanSearch = preg_replace('/^ORD-/i', '', $query);

        return Order::select([
                'id', 'order_number', 'customer_name', 'total_amount', 'status', 
                'payment_method', 'payment_status', 'shipping_address', 'tracking_number', 'artisan_id'
            ])
            ->where(function ($q) use ($query, $cleanSearch, $like) {
                $q->where('order_number', $like, "%{$query}%")
                    ->orWhere('order_number', $like, "%{$cleanSearch}%")
                    ->orWhere('customer_name', $like, "%{$query}%")
                    ->orWhere('shipping_recipient_name', $like, "%{$query}%")
                    ->orWhere('shipping_contact_phone', $like, "%{$query}%")
                    ->orWhere('shipping_address', $like, "%{$query}%")
                    ->orWhere('tracking_number', $like, "%{$query}%")
                    ->orWhereHas('items', function ($itemQuery) use ($query, $like) {
                        $itemQuery->where('product_name', $like, "%{$query}%")
                                  ->orWhere('variant', $like, "%{$query}%");
                    })
                    ->orWhereHas('artisan', function ($artisanQuery) use ($query, $like) {
                        $artisanQuery->where('shop_name', $like, "%{$query}%")
                                     ->orWhere('name', $like, "%{$query}%");
                    });
            })
            ->with(['artisan:id,name,shop_name'])
            ->limit(5)
            ->get()
            ->map(fn ($o) => [
                'id' => "admin-order-{$o->id}",
                'title' => "Order: {$o->order_number}",
                'subtitle' => "₱" . number_format((float) $o->total_amount, 2) . " • Customer: {$o->customer_name} • Shop: " . ($o->artisan->shop_name ?? $o->artisan->name ?? 'Artisan') . " • Status: {$o->status}",
                'type' => 'Order',
                'url' => route('admin.disputes.index', ['search' => $o->order_number]),
                'icon' => 'shopping-cart',
            ])->toArray();
    }

    private function searchAdminActivities(string $query, string $like): array
    {
        return PlatformActivity::select(['id', 'user_id', 'action', 'description', 'created_at'])
            ->where('description', $like, "%{$query}%")
            ->orWhere('action', $like, "%{$query}%")
            ->with(['user:id,name,email'])
            ->latest()
            ->limit(3)
            ->get()
            ->map(fn ($a) => [
                'id' => "admin-log-{$a->id}",
                'title' => "Audit: {$a->description}",
                'subtitle' => "Actor: " . ($a->user->name ?? 'System') . " • " . ($a->created_at ? $a->created_at->diffForHumans() : 'Recent'),
                'type' => 'Activity Log',
                'url' => route('admin.operations', ['search' => $a->description]),
                'icon' => 'activity',
            ])->toArray();
    }

    private function searchAdminUsers(string $query, string $like): array
    {
        return User::select(['id', 'name', 'first_name', 'last_name', 'email', 'role', 'shop_name', 'artisan_status', 'premium_tier', 'banned_at'])
            ->where(function ($q) use ($query, $like) {
                $q->where('name', $like, "%{$query}%")
                    ->orWhere('first_name', $like, "%{$query}%")
                    ->orWhere('last_name', $like, "%{$query}%")
                    ->orWhere('email', $like, "%{$query}%")
                    ->orWhere('shop_name', $like, "%{$query}%")
                    ->orWhere('phone_number', $like, "%{$query}%");
            })
            ->limit(6)
            ->get()
            ->map(function ($u) {
                $isPendingArtisan = $u->role === 'artisan' && $u->artisan_status === 'pending';
                
                if ($isPendingArtisan) {
                    return [
                        'id' => "artisan-app-{$u->id}",
                        'title' => "Application: " . ($u->shop_name ?: $u->name),
                        'subtitle' => "Applicant: {$u->name} ({$u->email}) • Status: Pending Verification",
                        'type' => 'Artisan Application',
                        'url' => route('admin.users.manager', ['tab' => 'approvals', 'search' => $u->name]),
                        'icon' => 'award',
                    ];
                }

                $roleLabel = match($u->role) {
                    'artisan' => "Shop: " . ($u->shop_name ?: $u->name) . " (" . ucfirst($u->premium_tier ?? 'free') . ")",
                    'super_admin', 'admin' => 'Administrator',
                    'staff' => 'Seller Staff',
                    default => 'Buyer Customer',
                };

                return [
                    'id' => "user-{$u->id}",
                    'title' => $u->name,
                    'subtitle' => "{$u->email} • {$roleLabel}" . ($u->banned_at ? ' • [BANNED]' : ''),
                    'type' => 'User',
                    'url' => route('admin.users.manager', ['tab' => 'directory', 'search' => $u->email]),
                    'icon' => 'user',
                ];
            })->toArray();
    }

    private function searchAdminProducts(string $query, string $like): array
    {
        return Product::select(['id', 'name', 'sku', 'price', 'stock', 'status', 'category', 'user_id'])
            ->where(function ($q) use ($query, $like) {
                $q->where('name', $like, "%{$query}%")
                    ->orWhere('sku', $like, "%{$query}%")
                    ->orWhere('category', $like, "%{$query}%")
                    ->orWhere('description', $like, "%{$query}%");
            })
            ->with(['user:id,name,shop_name'])
            ->limit(5)
            ->get()
            ->map(fn ($p) => [
                'id' => "admin-prod-{$p->id}",
                'title' => $p->name,
                'subtitle' => "SKU: {$p->sku} • ₱" . number_format((float) $p->price, 2) . " • Shop: " . ($p->user->shop_name ?? $p->user->name ?? 'Artisan') . " • Status: {$p->status}",
                'type' => 'Product',
                'url' => route('admin.catalog.index', ['tab' => 'moderation', 'search' => $p->sku ?: $p->name]),
                'icon' => 'package',
            ])->toArray();
    }

    private function searchAdminDisputes(string $query, string $like): array
    {
        return Dispute::select(['id', 'order_id', 'reason', 'status', 'escalation_reason', 'created_at'])
            ->where(function ($q) use ($query, $like) {
                $q->where('reason', $like, "%{$query}%")
                    ->orWhere('escalation_reason', $like, "%{$query}%")
                    ->orWhereHas('order', function ($oq) use ($query, $like) {
                        $oq->where('order_number', $like, "%{$query}%")
                           ->orWhere('customer_name', $like, "%{$query}%")
                           ->orWhereHas('artisan', function ($aq) use ($query, $like) {
                               $aq->where('name', $like, "%{$query}%")
                                  ->orWhere('shop_name', $like, "%{$query}%");
                           });
                    });
            })
            ->with(['order:id,order_number,customer_name,artisan_id', 'order.artisan:id,name,shop_name'])
            ->limit(4)
            ->get()
            ->map(fn ($d) => [
                'id' => "admin-disp-{$d->id}",
                'title' => "Dispute: Order #" . ($d->order->order_number ?? $d->order_id),
                'subtitle' => "Reason: " . substr($d->reason, 0, 35) . "... • Status: " . ucfirst($d->status),
                'type' => 'Dispute',
                'url' => route('admin.disputes.index', ['search' => $d->order->order_number ?? '']),
                'icon' => 'rotate-ccw',
            ])->toArray();
    }

    private function searchAdminReviewDisputes(string $query, string $like): array
    {
        return ReviewDispute::select(['id', 'review_id', 'seller_owner_id', 'status', 'reason', 'details', 'created_at'])
            ->where(function ($q) use ($query, $like) {
                $q->where('reason', $like, "%{$query}%")
                    ->orWhere('details', $like, "%{$query}%")
                    ->orWhereHas('sellerOwner', function ($sq) use ($query, $like) {
                        $sq->where('name', $like, "%{$query}%")
                           ->orWhere('shop_name', $like, "%{$query}%");
                    });
            })
            ->with(['sellerOwner:id,name,shop_name', 'review:id,rating,product_id', 'review.product:id,name'])
            ->limit(4)
            ->get()
            ->map(fn ($rd) => [
                'id' => "admin-rev-disp-{$rd->id}",
                'title' => "Review Dispute #" . $rd->id . ": " . ($rd->review->product->name ?? 'Product'),
                'subtitle' => "Shop: " . ($rd->sellerOwner->shop_name ?? $rd->sellerOwner->name ?? 'Artisan') . " • Reason: " . substr($rd->reason, 0, 30) . "... • Status: " . ucfirst($rd->status),
                'type' => 'Review Dispute',
                'url' => route('admin.compliance', ['tab' => 'disputes', 'search' => $rd->id]),
                'icon' => 'message-square',
            ])->toArray();
    }

    private function searchAdminPayouts(string $query, string $like): array
    {
        return Payout::select(['id', 'user_id', 'amount', 'reference_number', 'payout_method', 'status', 'created_at'])
            ->where(function ($q) use ($query, $like) {
                $q->where('reference_number', $like, "%{$query}%")
                    ->orWhere('payout_method', $like, "%{$query}%")
                    ->orWhere('status', $like, "%{$query}%")
                    ->orWhereHas('user', function ($uq) use ($query, $like) {
                        $uq->where('name', $like, "%{$query}%")
                           ->orWhere('shop_name', $like, "%{$query}%")
                           ->orWhere('email', $like, "%{$query}%");
                    });
            })
            ->with(['user:id,name,shop_name'])
            ->limit(4)
            ->get()
            ->map(fn ($p) => [
                'id' => "admin-payout-{$p->id}",
                'title' => "Payout: ₱" . number_format((float) $p->amount, 2) . " (" . ($p->reference_number ?: "Ref #{$p->id}") . ")",
                'subtitle' => "Artisan: " . ($p->user->shop_name ?? $p->user->name ?? 'Artisan') . " • Method: {$p->payout_method} • Status: {$p->status}",
                'type' => 'Payout',
                'url' => route('admin.payouts.index', ['search' => $p->reference_number ?: $p->id]),
                'icon' => 'trending-up',
            ])->toArray();
    }

    private function searchAdminSponsorships(string $query, string $like): array
    {
        return SponsorshipRequest::select(['id', 'product_id', 'user_id', 'status', 'created_at'])
            ->whereHas('product', function($q) use ($query, $like) {
                $q->where('name', $like, "%{$query}%");
            })
            ->orWhereHas('user', function($uq) use ($query, $like) {
                $uq->where('name', $like, "%{$query}%")
                   ->orWhere('shop_name', $like, "%{$query}%");
            })
            ->with(['product:id,name', 'user:id,name,shop_name'])
            ->limit(4)
            ->get()
            ->map(fn ($s) => [
                'id' => "spons-{$s->id}",
                'title' => "Sponsorship: " . ($s->product->name ?? 'Product'),
                'subtitle' => "Artisan: " . ($s->user->shop_name ?? $s->user->name ?? 'Artisan') . " • Status: " . ucfirst($s->status),
                'type' => 'Sponsorship',
                'url' => route('admin.catalog.index', ['tab' => 'sponsorships', 'search' => $s->product->name ?? '']),
                'icon' => 'star',
            ])->toArray();
    }

    private function searchAdminEmailTemplates(string $query, string $like): array
    {
        return EmailTemplate::select(['id', 'name', 'subject', 'slug', 'category', 'is_active'])
            ->where('name', $like, "%{$query}%")
            ->orWhere('subject', $like, "%{$query}%")
            ->orWhere('slug', $like, "%{$query}%")
            ->orWhere('category', $like, "%{$query}%")
            ->limit(3)
            ->get()
            ->map(fn ($et) => [
                'id' => "admin-mail-{$et->id}",
                'title' => "Email Template: {$et->name}",
                'subtitle' => "Subject: {$et->subject} • Category: {$et->category}" . ($et->is_active ? ' • Active' : ' • Inactive'),
                'type' => 'Email Template',
                'url' => route('admin.email-templates.index'),
                'icon' => 'mail',
            ])->toArray();
    }

    private function searchAdminCategories(string $query, string $like): array
    {
        return Category::select(['id', 'name', 'slug'])
            ->where('name', $like, "%{$query}%")
            ->limit(3)
            ->get()
            ->map(fn ($c) => [
                'id' => "admin-cat-{$c->id}",
                'title' => "Taxonomy: {$c->name}",
                'subtitle' => "Category Taxonomy & Marketplace Attribute",
                'type' => 'Category',
                'url' => route('admin.settings.index', ['tab' => 'taxonomy', 'search' => $c->name]),
                'icon' => 'folder',
            ])->toArray();
    }

    private function searchAdminModeration(string $query, string $like): array
    {
        return FlaggedContent::select(['id', 'reason', 'status', 'reportable_type', 'reportable_id', 'created_at'])
            ->where('reason', $like, "%{$query}%")
            ->orWhere('status', $like, "%{$query}%")
            ->limit(3)
            ->get()
            ->map(fn ($r) => [
                'id' => "admin-rep-{$r->id}",
                'title' => "Flagged Content #{$r->id}: " . substr($r->reason, 0, 30) . "...",
                'subtitle' => "Status: " . ucfirst($r->status) . " • Type: " . class_basename($r->reportable_type),
                'type' => 'Moderation',
                'url' => route('admin.compliance', ['tab' => 'flags', 'search' => $r->id]),
                'icon' => 'shield',
            ])->toArray();
    }

    private function sellerSearch(User $user, string $query, string $like): array
    {
        $sellerId = $user->getEffectiveSellerId();
        $results = [];

        // 1. Navigation & Settings Shortcuts (Scoped by user privileges)
        $results = array_merge($results, $this->searchSellerNavigationAndSettings($user, $query, $like));

        // 2. Domain Data Models (Strict Multi-Tenant Scoping & Granular RBAC)
        if ($user->canAccessSellerModule('products')) {
            $results = array_merge($results, $this->searchSellerProducts($sellerId, $query, $like));
            $results = array_merge($results, $this->searchSellerDiscounts($sellerId, $query, $like));
        }

        if ($user->canAccessSellerModule('3d') || $user->canAccessSellerModule('products')) {
            $results = array_merge($results, $this->searchSeller3DModels($sellerId, $query, $like));
        }

        if ($user->canAccessSellerModule('orders')) {
            $results = array_merge($results, $this->searchSellerOrders($sellerId, $query, $like));
        }

        if ($user->canAccessSellerModule('procurement')) {
            $results = array_merge($results, $this->searchSellerSupplies($sellerId, $query, $like));
        }

        if ($user->canAccessSellerModule('stock_requests') || $user->canAccessSellerModule('procurement')) {
            $results = array_merge($results, $this->searchSellerStockRequests($sellerId, $query, $like));
        }

        if ($user->canAccessSellerModule('reviews')) {
            $results = array_merge($results, $this->searchSellerReviews($sellerId, $query, $like));
        }

        if ($user->isSellerOwner() && $user->canAccessSellerModule('sponsorships')) {
            $results = array_merge($results, $this->searchSellerSponsorships($sellerId, $query, $like));
        }

        if ($user->canAccessSellerModule('hr')) {
            $results = array_merge($results, $this->searchSellerEmployees($sellerId, $query, $like));
        }

        if ($user->canAccessSellerModule('hr') || $user->canAccessSellerModule('accounting')) {
            $results = array_merge($results, $this->searchSellerPayrolls($sellerId, $query, $like));
        }

        if ($user->canAccessSellerModule('messages')) {
            $results = array_merge($results, $this->searchSellerTeamChannels($sellerId, $query, $like));
        }

        if ($user->isSellerOwner()) {
            $results = array_merge($results, $this->searchSellerLocations($sellerId, $query, $like));
            $results = array_merge($results, $this->searchSellerLogs($sellerId, $query, $like));
            $results = array_merge($results, $this->searchSellerStaffAudits($sellerId, $query, $like));
        }

        return $results;
    }

    private function safeRoute(string $name, array $params = []): string
    {
        try {
            return route($name, $params);
        } catch (\Throwable $e) {
            return url('/seller/dashboard');
        }
    }

    private function searchSellerNavigationAndSettings(User $user, string $query, string $like): array
    {
        $q = strtolower(trim($query));
        $results = [];

        $shopSettingsUrl = $this->safeRoute('shop.settings');
        $hrUrl = $this->safeRoute('hr.index');
        $profileUrl = $this->safeRoute('profile.edit');
        $auditLogUrl = $this->safeRoute('audit-log.index');
        $subscriptionUrl = $this->safeRoute('seller.subscription');
        $productsUrl = $this->safeRoute('products.index');
        $discountsUrl = $this->safeRoute('discounts.index');
        $teamMessagesUrl = $this->safeRoute('team-messages.index');
        $threeDUrl = $this->safeRoute('3d.index');

        $navItems = [
            // 1. Shop Settings Sub-sections (Owner only)
            [
                'keywords' => ['setting', 'settings', 'shop settings', 'configuration', 'store settings', 'storefront', 'shop storefront', 'banner', 'avatar', 'shop name', 'bio', 'branding', 'auto reply'],
                'title' => 'Shop Settings & Storefront',
                'subtitle' => 'Configure storefront branding, banner image, avatar, shop bio, and auto-replies',
                'type' => 'Setting',
                'url' => $shopSettingsUrl,
                'icon' => 'settings',
                'module' => null,
                'owner_only' => true,
            ],
            [
                'keywords' => ['location', 'locations', 'workplace', 'workplace locations', 'geofence', 'gps', 'perimeter', 'strict block', 'clock in location', 'map', 'radius', 'soft audit'],
                'title' => 'Workplace Store Locations & Boundaries',
                'subtitle' => 'Define physical store/workshop GPS perimeters, Leaflet map coordinates, and clock-in rules',
                'type' => 'Setting',
                'url' => $shopSettingsUrl,
                'icon' => 'map-pin',
                'module' => null,
                'owner_only' => true,
            ],
            [
                'keywords' => ['finance & payouts', 'finance', 'payouts', 'paymongo', 'bank', 'bank account', 'withdrawal', 'wallet', 'payment settings', 'e-wallet'],
                'title' => 'Finance & Payouts',
                'subtitle' => 'Manage Paymongo e-wallet connections, bank accounts, and funds withdrawal methods',
                'type' => 'Setting',
                'url' => $shopSettingsUrl,
                'icon' => 'credit-card',
                'module' => null,
                'owner_only' => true,
            ],
            [
                'keywords' => ['shipping', 'delivery', 'lalamove', 'courier', 'logistics', 'pickup'],
                'title' => 'Shipping & Delivery Logistics',
                'subtitle' => 'Configure Lalamove courier integration, delivery options, and shipping rates',
                'type' => 'Setting',
                'url' => $shopSettingsUrl,
                'icon' => 'truck',
                'module' => null,
                'owner_only' => true,
            ],
            // 2. User Account & Security Settings
            [
                'keywords' => ['profile', 'user profile', 'edit profile', 'email', 'change email', 'my account'],
                'title' => 'User Account Profile',
                'subtitle' => 'Update user name, contact email address, and personal account details',
                'type' => 'Setting',
                'url' => $profileUrl,
                'icon' => 'user',
                'module' => null,
                'owner_only' => false,
            ],
            [
                'keywords' => ['security', 'password', 'change password', 'update password', 'two factor', 'auth', 'account security'],
                'title' => 'Account Security & Password',
                'subtitle' => 'Update account login password and authentication security settings',
                'type' => 'Setting',
                'url' => $profileUrl,
                'icon' => 'shield',
                'module' => null,
                'owner_only' => false,
            ],
            [
                'keywords' => ['activity', 'activity history', 'audit log', 'logs', 'login activity', 'access history'],
                'title' => 'Activity History & Audit Log',
                'subtitle' => 'Inspect comprehensive seller activity logs and system security events',
                'type' => 'Setting',
                'url' => $auditLogUrl,
                'icon' => 'clock',
                'module' => null,
                'owner_only' => true,
            ],
            [
                'keywords' => ['subscription', 'billing', 'plan', 'elite plan', 'active products limit', 'upgrade', 'cancel auto renewal'],
                'title' => 'Subscription & Plan Tier',
                'subtitle' => 'View current subscription tier, active product quotas, and plan upgrades',
                'type' => 'Setting',
                'url' => $subscriptionUrl,
                'icon' => 'award',
                'module' => null,
                'owner_only' => true,
            ],
            // 3. Operational & ERP Modules
            [
                'keywords' => ['hr', 'staff', 'employee', 'employees', 'team', 'roster'],
                'title' => 'HR & Staff Management',
                'subtitle' => 'Manage employee profiles, login credentials, and shift roles',
                'type' => 'Module',
                'url' => $hrUrl,
                'icon' => 'users',
                'module' => 'hr',
                'owner_only' => false,
            ],
            [
                'keywords' => ['attendance', 'timecard', 'time card', 'clock in', 'clock out', 'selfie', 'off site'],
                'title' => 'Time Card Audit & Attendance',
                'subtitle' => 'Review staff clock-in records, selfie proofs, and store location exceptions',
                'type' => 'Module',
                'url' => $this->safeRoute('hr.index', ['tab' => 'timecard_audit']),
                'icon' => 'clock',
                'module' => 'hr',
                'owner_only' => false,
            ],
            [
                'keywords' => ['payroll', 'payday', 'salary', 'wages', 'overtime', 'deductions'],
                'title' => 'Payroll Runs & Payouts',
                'subtitle' => 'Compute employee salaries, overtime multipliers, and execute payroll runs',
                'type' => 'Module',
                'url' => $this->safeRoute('hr.index', ['tab' => 'payroll']),
                'icon' => 'trending-up',
                'module' => 'accounting',
                'owner_only' => false,
            ],
            [
                'keywords' => ['3d', 'three d', 'glb', 'model', 'upload 3d'],
                'title' => '3D Model Manager',
                'subtitle' => 'Upload and inspect GLB 3D interactive models for your products',
                'type' => 'Module',
                'url' => $threeDUrl,
                'icon' => 'box',
                'module' => 'products',
                'owner_only' => false,
            ],
            [
                'keywords' => ['discount', 'discounts', 'voucher', 'promo', 'coupon', 'marketing'],
                'title' => 'Discounts & Promotions',
                'subtitle' => 'Create custom product discount campaigns and promotional badges',
                'type' => 'Module',
                'url' => $discountsUrl,
                'icon' => 'tag',
                'module' => 'products',
                'owner_only' => false,
            ],
            [
                'keywords' => ['team messages', 'team chat', 'channel', 'team channels', 'inbox'],
                'title' => 'Team Messages & Channels',
                'subtitle' => 'Internal team communication, group channels, and real-time collaboration',
                'type' => 'Module',
                'url' => $teamMessagesUrl,
                'icon' => 'message-square',
                'module' => 'messages',
                'owner_only' => false,
            ],
        ];

        foreach ($navItems as $item) {
            if ($item['owner_only'] && !$user->isSellerOwner()) {
                continue;
            }
            if ($item['module'] && !$user->canAccessSellerModule($item['module'])) {
                continue;
            }
            foreach ($item['keywords'] as $kw) {
                if (str_contains($kw, $q) || str_contains($q, $kw)) {
                    $results[] = [
                        'id' => "nav-setting-" . md5($item['title']),
                        'title' => $item['title'],
                        'subtitle' => $item['subtitle'],
                        'type' => $item['type'],
                        'url' => $item['url'],
                        'icon' => $item['icon'],
                    ];
                    break;
                }
            }
        }

        return $results;
    }

    private function searchSellerProducts(int $sellerId, string $query, string $like): array
    {
        return Product::select(['id', 'name', 'sku', 'price', 'stock', 'status', 'category'])
            ->where('user_id', $sellerId)
            ->where(function ($q) use ($query, $like) {
                $q->where('name', $like, "%{$query}%")
                    ->orWhere('sku', $like, "%{$query}%")
                    ->orWhere('category', $like, "%{$query}%");
            })
            ->limit(5)
            ->get()
            ->map(fn ($p) => [
                'id' => "prod-{$p->id}",
                'title' => $p->name,
                'subtitle' => "SKU: {$p->sku} • ₱" . number_format((float) $p->price, 2) . " • Stock: {$p->stock} • Status: {$p->status}",
                'type' => 'Product',
                'url' => $this->safeRoute('products.index', ['search' => $p->sku ?: $p->name]),
                'icon' => 'package',
            ])->toArray();
    }

    private function searchSellerDiscounts(int $sellerId, string $query, string $like): array
    {
        return Discount::select(['id', 'user_id', 'name', 'type', 'value', 'is_active', 'start_at', 'end_at', 'promo_stock', 'promo_sold'])
            ->where('user_id', $sellerId)
            ->where(function ($q) use ($query, $like) {
                $q->where('name', $like, "%{$query}%")
                  ->orWhere('type', $like, "%{$query}%");
            })
            ->limit(4)
            ->get()
            ->map(fn ($d) => [
                'id' => "discount-{$d->id}",
                'title' => "Discount: {$d->name}",
                'subtitle' => ($d->type === 'percentage' ? "{$d->value}% Off" : "₱" . number_format((float) $d->value, 2) . " Off") . " • " . ($d->is_currently_active ? 'Active Promo' : 'Inactive/Expired'),
                'type' => 'Discount',
                'url' => $this->safeRoute('discounts.index', ['search' => $d->name]),
                'icon' => 'tag',
            ])->toArray();
    }

    private function searchSeller3DModels(int $sellerId, string $query, string $like): array
    {
        return Product::select(['id', 'name', 'sku', 'model_3d_path'])
            ->where('user_id', $sellerId)
            ->whereNotNull('model_3d_path')
            ->where(function ($q) use ($query, $like) {
                $q->where('name', $like, "%{$query}%")
                    ->orWhere('sku', $like, "%{$query}%");
            })
            ->limit(3)
            ->get()
            ->map(fn ($p) => [
                'id' => "3d-prod-{$p->id}",
                'title' => "3D Model: {$p->name}",
                'subtitle' => "SKU: {$p->sku} • Interactive GLB 3D Asset Ready",
                'type' => '3D Model',
                'url' => $this->safeRoute('3d.index', ['search' => $p->name]),
                'icon' => 'box',
            ])->toArray();
    }

    private function searchSellerOrders(int $sellerId, string $query, string $like): array
    {
        $cleanSearch = preg_replace('/^ORD-/i', '', $query);

        return Order::select([
                'id', 'order_number', 'customer_name', 'total_amount', 'status', 
                'payment_method', 'payment_status', 'shipping_address', 'tracking_number'
            ])
            ->where('artisan_id', $sellerId)
            ->where(function ($q) use ($query, $cleanSearch, $like) {
                $q->where('order_number', $like, "%{$query}%")
                    ->orWhere('order_number', $like, "%{$cleanSearch}%")
                    ->orWhere('customer_name', $like, "%{$query}%")
                    ->orWhere('shipping_recipient_name', $like, "%{$query}%")
                    ->orWhere('shipping_contact_phone', $like, "%{$query}%")
                    ->orWhere('shipping_address', $like, "%{$query}%")
                    ->orWhere('tracking_number', $like, "%{$query}%")
                    ->orWhereHas('items', function ($itemQuery) use ($query, $like) {
                        $itemQuery->where('product_name', $like, "%{$query}%")
                                  ->orWhere('variant', $like, "%{$query}%");
                    })
                    ->orWhereHas('user', function ($userQuery) use ($query, $like) {
                        $userQuery->where('name', $like, "%{$query}%")
                                  ->orWhere('email', $like, "%{$query}%")
                                  ->orWhere('phone_number', $like, "%{$query}%");
                    });
            })
            ->limit(5)
            ->get()
            ->map(fn ($o) => [
                'id' => "order-{$o->id}",
                'title' => "Order: {$o->order_number}",
                'subtitle' => "₱" . number_format((float) $o->total_amount, 2) . " • Customer: {$o->customer_name} • {$o->payment_method} ({$o->payment_status}) • Status: {$o->status}",
                'type' => 'Order',
                'url' => $this->safeRoute('orders.index', ['search' => $o->order_number]),
                'icon' => 'shopping-cart',
            ])->toArray();
    }

    private function searchSellerSupplies(int $sellerId, string $query, string $like): array
    {
        return Supply::select(['id', 'name', 'sku', 'category', 'quantity', 'unit', 'unit_cost'])
            ->where('user_id', $sellerId)
            ->where(function ($q) use ($query, $like) {
                $q->where('name', $like, "%{$query}%")
                  ->orWhere('sku', $like, "%{$query}%")
                  ->orWhere('category', $like, "%{$query}%");
            })
            ->limit(5)
            ->get()
            ->map(fn ($s) => [
                'id' => "supply-{$s->id}",
                'title' => "Supply: {$s->name}",
                'subtitle' => "Stock: {$s->quantity} {$s->unit} • Unit Cost: ₱" . number_format((float) $s->unit_cost, 2) . ($s->sku ? " • SKU: {$s->sku}" : ''),
                'type' => 'Inventory',
                'url' => $this->safeRoute('procurement.index', ['search' => $s->name]),
                'icon' => 'box',
            ])->toArray();
    }

    private function searchSellerStockRequests(int $sellerId, string $query, string $like): array
    {
        return StockRequest::select(['id', 'supply_id', 'user_id', 'quantity', 'total_cost', 'status', 'created_at'])
            ->where('user_id', $sellerId)
            ->whereHas('supply', function($q) use ($query, $like) {
                $q->where('name', $like, "%{$query}%")
                  ->orWhere('sku', $like, "%{$query}%");
            })
            ->with(['supply:id,name,unit'])
            ->limit(4)
            ->get()
            ->map(fn ($sr) => [
                'id' => "sr-{$sr->id}",
                'title' => "Stock Request: " . ($sr->supply->name ?? 'Supply'),
                'subtitle' => "Qty: {$sr->quantity} " . ($sr->supply->unit ?? 'units') . " • Status: " . ucfirst($sr->status) . ($sr->total_cost ? " • ₱" . number_format((float) $sr->total_cost, 2) : ''),
                'type' => 'Stock Request',
                'url' => $this->safeRoute('stock-requests.index', ['search' => $sr->supply->name ?? '']),
                'icon' => 'truck',
            ])->toArray();
    }

    private function searchSellerReviews(int $sellerId, string $query, string $like): array
    {
        return Review::select(['id', 'product_id', 'user_id', 'rating', 'comment', 'created_at'])
            ->whereHas('product', function($q) use ($sellerId) {
                $q->where('user_id', $sellerId);
            })
            ->where(function ($q) use ($query, $like) {
                $q->where('comment', $like, "%{$query}%")
                    ->orWhereHas('user', function($uq) use ($query, $like) {
                        $uq->where('name', $like, "%{$query}%");
                    })
                    ->orWhereHas('product', function($pq) use ($query, $like) {
                        $pq->where('name', $like, "%{$query}%");
                    });
            })
            ->with(['product:id,name', 'user:id,name'])
            ->limit(4)
            ->get()
            ->map(fn ($r) => [
                'id' => "rev-{$r->id}",
                'title' => "Review: " . ($r->product->name ?? 'Product'),
                'subtitle' => "★ {$r->rating}/5 • By " . ($r->user->name ?? 'Buyer') . " • \"" . substr($r->comment ?? '', 0, 35) . "...\"",
                'type' => 'Review',
                'url' => route('reviews.index', ['search' => $r->user->name ?? '']),
                'icon' => 'star',
            ])->toArray();
    }

    private function searchSellerSponsorships(int $sellerId, string $query, string $like): array
    {
        return SponsorshipRequest::select(['id', 'product_id', 'user_id', 'status'])
            ->with(['product:id,name'])
            ->where('user_id', $sellerId)
            ->whereHas('product', function($q) use ($query, $like) {
                $q->where('name', $like, "%{$query}%");
            })
            ->limit(3)
            ->get()
            ->map(fn ($s) => [
                'id' => "sell-spons-{$s->id}",
                'title' => "Sponsorship: " . ($s->product->name ?? 'Product'),
                'subtitle' => "Status: " . ucfirst($s->status),
                'type' => 'Sponsorship',
                'url' => route('seller.sponsorships', ['search' => $s->product->name ?? '']),
                'icon' => 'award',
            ])->toArray();
    }

    private function searchSellerEmployees(int $sellerId, string $query, string $like): array
    {
        return Employee::select(['id', 'employee_id', 'name', 'role', 'status', 'user_id'])
            ->where('user_id', $sellerId)
            ->where(function ($q) use ($query, $like) {
                $q->where('name', $like, "%{$query}%")
                    ->orWhere('employee_id', $like, "%{$query}%")
                    ->orWhere('role', $like, "%{$query}%")
                    ->orWhereHas('loginAccount', function ($sq) use ($query, $like) {
                        $sq->where('email', $like, "%{$query}%")
                           ->orWhere('name', $like, "%{$query}%");
                    });
            })
            ->with(['loginAccount:id,email,name,employee_id'])
            ->limit(4)
            ->get()
            ->map(fn ($e) => [
                'id' => "emp-{$e->id}",
                'title' => $e->name,
                'subtitle' => "ID: {$e->employee_id} • Role: {$e->role} • Status: " . ucfirst($e->status) . ($e->loginAccount ? " • {$e->loginAccount->email}" : ''),
                'type' => 'Employee',
                'url' => route('hr.index', ['search' => $e->name]),
                'icon' => 'users',
            ])->toArray();
    }

    private function searchSellerPayrolls(int $sellerId, string $query, string $like): array
    {
        return Payroll::select(['id', 'user_id', 'month', 'total_amount', 'employee_count', 'status', 'created_at'])
            ->where('user_id', $sellerId)
            ->where('month', $like, "%{$query}%")
            ->limit(3)
            ->get()
            ->map(fn ($p) => [
                'id' => "pay-{$p->id}",
                'title' => "Payroll Run: {$p->month}",
                'subtitle' => "{$p->employee_count} Employees • ₱" . number_format((float) $p->total_amount, 2) . " • Status: {$p->status}",
                'type' => 'Payroll',
                'url' => route('hr.index', ['tab' => 'payroll', 'search' => $p->month]),
                'icon' => 'banknote',
            ])->toArray();
    }

    private function searchSellerTeamChannels(int $sellerId, string $query, string $like): array
    {
        return TeamChannel::select(['id', 'seller_owner_id', 'name', 'description'])
            ->where('seller_owner_id', $sellerId)
            ->where(function ($q) use ($query, $like) {
                $q->where('name', $like, "%{$query}%")
                  ->orWhere('description', $like, "%{$query}%");
            })
            ->limit(3)
            ->get()
            ->map(fn ($tc) => [
                'id' => "channel-{$tc->id}",
                'title' => "Channel: #{$tc->name}",
                'subtitle' => $tc->description ?: 'Internal Team Discussion Channel',
                'type' => 'Team Channel',
                'url' => route('team-messages.index'),
                'icon' => 'message-square',
            ])->toArray();
    }

    private function searchSellerLocations(int $sellerId, string $query, string $like): array
    {
        return SellerLocation::select(['id', 'name', 'address', 'radius_meters', 'enforce_strict_geofence', 'user_id'])
            ->where('user_id', $sellerId)
            ->where(function ($q) use ($query, $like) {
                $q->where('name', $like, "%{$query}%")
                  ->orWhere('address', $like, "%{$query}%");
            })
            ->limit(3)
            ->get()
            ->map(fn ($loc) => [
                'id' => "loc-{$loc->id}",
                'title' => "Location: {$loc->name}",
                'subtitle' => ($loc->address ? "{$loc->address} • " : '') . "{$loc->radius_meters}m Radius • " . ($loc->enforce_strict_geofence ? 'Strict Block' : 'Soft Audit'),
                'type' => 'Workplace Location',
                'url' => $this->safeRoute('shop.settings'),
                'icon' => 'map-pin',
            ])->toArray();
    }

    private function searchSellerLogs(int $sellerId, string $query, string $like): array
    {
        return SellerActivityLog::select(['id', 'seller_owner_id', 'title', 'summary', 'category', 'event_type', 'created_at'])
            ->where('seller_owner_id', $sellerId)
            ->where(function ($q) use ($query, $like) {
                $q->where('title', $like, "%{$query}%")
                  ->orWhere('summary', $like, "%{$query}%")
                  ->orWhere('category', $like, "%{$query}%")
                  ->orWhere('event_type', $like, "%{$query}%");
            })
            ->latest()
            ->limit(3)
            ->get()
            ->map(fn ($l) => [
                'id' => "seller-log-{$l->id}",
                'title' => "Log: " . ($l->title ?? $l->summary ?? 'Activity'),
                'subtitle' => $l->created_at ? $l->created_at->diffForHumans() : 'Recent',
                'type' => 'Activity Log',
                'url' => route('audit-log.index', ['search' => $l->title ?? $l->summary ?? '']),
                'icon' => 'activity',
            ])->toArray();
    }

    private function searchSellerStaffAudits(int $sellerId, string $query, string $like): array
    {
        return StaffAccessAudit::select(['id', 'seller_owner_id', 'summary', 'event', 'created_at'])
            ->where('seller_owner_id', $sellerId)
            ->where(function ($q) use ($query, $like) {
                $q->where('summary', $like, "%{$query}%")
                  ->orWhere('event', $like, "%{$query}%");
            })
            ->latest()
            ->limit(3)
            ->get()
            ->map(fn ($sa) => [
                'id' => "staff-audit-{$sa->id}",
                'title' => "Security: {$sa->summary}",
                'subtitle' => "Event: {$sa->event} • " . ($sa->created_at ? $sa->created_at->diffForHumans() : 'Recent'),
                'type' => 'Staff Audit',
                'url' => route('audit-log.index', ['search' => $sa->summary]),
                'icon' => 'shield',
            ])->toArray();
    }
}

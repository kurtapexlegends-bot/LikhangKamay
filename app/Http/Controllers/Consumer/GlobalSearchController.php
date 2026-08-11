<?php

namespace App\Http\Controllers\Consumer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Supply;
use App\Models\StockRequest;
use App\Models\Review;
use App\Models\SponsorshipRequest;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\Category;
use App\Models\FlaggedContent;
use App\Models\PlatformActivity;
use App\Models\Dispute;
use App\Models\SellerActivityLog;
use App\Models\StaffAccessAudit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GlobalSearchController extends Controller
{
    public function search(Request $request)
    {
        $query = $request->input('query');
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
            $this->searchAdminOrders($query, $like),
            $this->searchAdminActivities($query, $like),
            $this->searchAdminUsers($query, $like),
            $this->searchAdminSponsorships($query, $like),
            $this->searchAdminCategories($query, $like),
            $this->searchAdminModeration($query, $like),
            $this->searchAdminProducts($query, $like),
            $this->searchAdminDisputes($query, $like)
        );
    }

    private function searchAdminOrders(string $query, string $like): array
    {
        $cleanSearch = preg_replace('/^ORD-/i', '', $query);

        return Order::where(function ($q) use ($query, $cleanSearch, $like) {
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
            ->limit(5)
            ->get()
            ->map(fn ($o) => [
                'id' => "admin-order-{$o->id}",
                'title' => "Order: {$o->order_number}",
                'subtitle' => "Customer: {$o->customer_name} • Status: {$o->status}",
                'type' => 'Order',
                'url' => route('admin.disputes.index', ['search' => $o->order_number]),
                'icon' => 'shopping-cart',
            ])->toArray();
    }

    private function searchAdminActivities(string $query, string $like): array
    {
        return PlatformActivity::where('description', $like, "%{$query}%")
            ->orWhere('action', $like, "%{$query}%")
            ->with('user')
            ->latest()
            ->limit(3)
            ->get()
            ->map(fn ($a) => [
                'id' => "admin-log-{$a->id}",
                'title' => "Audit: {$a->description}",
                'subtitle' => "Actor: " . ($a->user->name ?? 'System') . " • " . $a->created_at->diffForHumans(),
                'type' => 'Activity Log',
                'url' => route('admin.activity.index', ['search' => $a->description]),
                'icon' => 'activity',
            ])->toArray();
    }

    private function searchAdminUsers(string $query, string $like): array
    {
        return User::where(function ($q) use ($query, $like) {
                $q->where('name', $like, "%{$query}%")
                    ->orWhere('first_name', $like, "%{$query}%")
                    ->orWhere('last_name', $like, "%{$query}%")
                    ->orWhere('email', $like, "%{$query}%")
                    ->orWhere('shop_name', $like, "%{$query}%")
                    ->orWhere('phone_number', $like, "%{$query}%");
            })
            ->limit(5)
            ->get()
            ->map(fn ($u) => [
                'id' => "user-{$u->id}",
                'title' => $u->name,
                'subtitle' => $u->role === 'artisan' ? "Shop: {$u->shop_name}" : "Role: {$u->role}",
                'type' => 'User',
                'url' => route('admin.users.manager', ['tab' => 'directory', 'search' => $u->email]),
                'icon' => 'user',
            ])->toArray();
    }

    private function searchAdminSponsorships(string $query, string $like): array
    {
        return SponsorshipRequest::whereHas('product', function($q) use ($query, $like) {
                $q->where('name', $like, "%{$query}%");
            })
            ->orWhereHas('user', function($uq) use ($query, $like) {
                $uq->where('name', $like, "%{$query}%")
                   ->orWhere('shop_name', $like, "%{$query}%");
            })
            ->with('product', 'user')
            ->limit(5)
            ->get()
            ->map(fn ($s) => [
                'id' => "spons-{$s->id}",
                'title' => "Sponsorship: " . ($s->product->name ?? 'Product'),
                'subtitle' => "Artisan: " . ($s->user->name ?? 'Artisan') . " • Status: {$s->status}",
                'type' => 'Sponsorship',
                'url' => route('admin.catalog.index', ['tab' => 'sponsorships', 'search' => $s->product->name ?? '']),
                'icon' => 'star',
            ])->toArray();
    }

    private function searchAdminCategories(string $query, string $like): array
    {
        return Category::where('name', $like, "%{$query}%")
            ->limit(3)
            ->get()
            ->map(fn ($c) => [
                'id' => "admin-cat-{$c->id}",
                'title' => $c->name,
                'subtitle' => "Category Management",
                'type' => 'Category',
                'url' => route('admin.settings.index', ['tab' => 'taxonomy', 'search' => $c->name]),
                'icon' => 'folder',
            ])->toArray();
    }

    private function searchAdminModeration(string $query, string $like): array
    {
        return FlaggedContent::where('reason', $like, "%{$query}%")
            ->orWhere('status', $like, "%{$query}%")
            ->limit(3)
            ->get()
            ->map(fn ($r) => [
                'id' => "admin-rep-{$r->id}",
                'title' => "Report #{$r->id}: " . substr($r->reason, 0, 30) . "...",
                'subtitle' => "Status: {$r->status}",
                'type' => 'Moderation',
                'url' => route('admin.compliance', ['tab' => 'flags', 'search' => $r->id]),
                'icon' => 'shield',
            ])->toArray();
    }

    private function searchAdminProducts(string $query, string $like): array
    {
        return Product::where(function ($q) use ($query, $like) {
                $q->where('name', $like, "%{$query}%")
                    ->orWhere('sku', $like, "%{$query}%")
                    ->orWhere('category', $like, "%{$query}%")
                    ->orWhere('description', $like, "%{$query}%");
            })
            ->limit(5)
            ->get()
            ->map(fn ($p) => [
                'id' => "admin-prod-{$p->id}",
                'title' => $p->name,
                'subtitle' => "SKU: {$p->sku} • Status: {$p->status}",
                'type' => 'Product',
                'url' => route('admin.catalog.index', ['tab' => 'moderation', 'search' => $p->sku]),
                'icon' => 'package',
            ])->toArray();
    }

    private function searchAdminDisputes(string $query, string $like): array
    {
        return Dispute::where('status', 'escalated')
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
            ->with(['order'])
            ->limit(5)
            ->get()
            ->map(fn ($d) => [
                'id' => "admin-disp-{$d->id}",
                'title' => "Dispute: Order #" . ($d->order->order_number ?? 'N/A'),
                'subtitle' => "Reason: " . substr($d->reason, 0, 30) . "... • Status: Escalated",
                'type' => 'Dispute',
                'url' => route('admin.disputes.index', ['search' => $d->order->order_number ?? '']),
                'icon' => 'rotate-ccw',
            ])->toArray();
    }

    private function sellerSearch(User $user, string $query, string $like): array
    {
        $sellerId = $user->getEffectiveSellerId();
        $results = [];

        // 1. First priority: Navigation & Settings Tab Shortcuts
        $results = array_merge($results, $this->searchSellerNavigationAndSettings($user, $query, $like));

        // 2. Domain Data Models
        if ($user->canAccessSellerModule('products')) {
            $results = array_merge($results, $this->searchSellerProducts($sellerId, $query, $like));
        }
        if ($user->canAccessSellerModule('orders')) {
            $results = array_merge($results, $this->searchSellerOrders($sellerId, $query, $like));
        }
        if ($user->canAccessSellerModule('procurement')) {
            $results = array_merge($results, $this->searchSellerSupplies($sellerId, $query, $like));
        }
        if ($user->canAccessSellerModule('stock_requests')) {
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
        if ($user->isSellerOwner()) {
            $results = array_merge($results, $this->searchSellerLogs($sellerId, $query, $like));
            $results = array_merge($results, $this->searchSellerStaffAudits($sellerId, $query, $like));
            $results = array_merge($results, $this->searchSellerLocations($sellerId, $query, $like));
        }

        return $results;
    }

    private function searchSellerNavigationAndSettings(User $user, string $query, string $like): array
    {
        $q = strtolower(trim($query));
        $results = [];

        $navItems = [
            [
                'keywords' => ['setting', 'settings', 'shop settings', 'configuration', 'store settings'],
                'title' => 'Shop Settings',
                'subtitle' => 'Configure store identity, branding, and global seller parameters',
                'type' => 'Setting',
                'url' => route('shop.settings.index', ['tab' => 'profile']),
                'icon' => 'settings',
                'module' => null,
            ],
            [
                'keywords' => ['location', 'locations', 'workplace', 'geofence', 'gps', 'perimeter', 'strict block', 'clock in location'],
                'title' => 'Workplace Locations & Geofence',
                'subtitle' => 'Configure physical store/workshop GPS perimeters and clock-in rules',
                'type' => 'Setting',
                'url' => route('shop.settings.index', ['tab' => 'locations']),
                'icon' => 'map-pin',
                'module' => null,
            ],
            [
                'keywords' => ['shipping', 'delivery', 'lalamove', 'courier', 'logistics', 'pickup'],
                'title' => 'Shipping & Delivery Logistics',
                'subtitle' => 'Configure Lalamove courier integration and shipping rates',
                'type' => 'Setting',
                'url' => route('shop.settings.index', ['tab' => 'shipping']),
                'icon' => 'truck',
                'module' => null,
            ],
            [
                'keywords' => ['payout', 'payouts', 'paymongo', 'bank', 'withdrawal', 'wallet', 'payment settings'],
                'title' => 'Payouts & Payment Methods',
                'subtitle' => 'Manage Paymongo e-wallet connections and withdrawal accounts',
                'type' => 'Setting',
                'url' => route('shop.settings.index', ['tab' => 'payouts']),
                'icon' => 'credit-card',
                'module' => null,
            ],
            [
                'keywords' => ['security', 'password', 'two factor', 'auth', 'account security'],
                'title' => 'Security & Password',
                'subtitle' => 'Update seller account password and security credentials',
                'type' => 'Setting',
                'url' => route('shop.settings.index', ['tab' => 'security']),
                'icon' => 'shield',
                'module' => null,
            ],
            [
                'keywords' => ['hr', 'staff', 'employee', 'employees', 'team', 'roster'],
                'title' => 'HR & Staff Management',
                'subtitle' => 'Manage employee profiles, login credentials, and shift roles',
                'type' => 'Module',
                'url' => route('hr.index'),
                'icon' => 'users',
                'module' => 'hr',
            ],
            [
                'keywords' => ['attendance', 'timecard', 'time card', 'clock in', 'clock out', 'selfie', 'off site'],
                'title' => 'Time Card Audit & Attendance',
                'subtitle' => 'Review staff clock-in records, selfie proofs, and geofence exceptions',
                'type' => 'Module',
                'url' => route('hr.index', ['tab' => 'timecard_audit']),
                'icon' => 'clock',
                'module' => 'hr',
            ],
            [
                'keywords' => ['payroll', 'payday', 'salary', 'wages', 'overtime', 'deductions'],
                'title' => 'Payroll Runs & Payouts',
                'subtitle' => 'Compute employee salaries, overtime multipliers, and execute payroll runs',
                'type' => 'Module',
                'url' => route('hr.index', ['tab' => 'payroll']),
                'icon' => 'trending-up',
                'module' => 'accounting',
            ],
            [
                'keywords' => ['3d', 'three d', 'glb', 'model', 'upload 3d'],
                'title' => '3D Model Manager',
                'subtitle' => 'Upload and inspect GLB 3D models for your products',
                'type' => 'Module',
                'url' => route('products.index', ['tab' => '3d_models']),
                'icon' => 'box',
                'module' => 'products',
            ],
            [
                'keywords' => ['discount', 'discounts', 'voucher', 'promo', 'coupon'],
                'title' => 'Discounts & Promotions',
                'subtitle' => 'Create custom product discount campaigns and promotional badges',
                'type' => 'Module',
                'url' => route('products.index', ['tab' => 'discounts']),
                'icon' => 'tag',
                'module' => 'products',
            ],
        ];

        foreach ($navItems as $item) {
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

    private function searchSellerLocations(int $sellerId, string $query, string $like): array
    {
        return \App\Models\SellerLocation::where('user_id', $sellerId)
            ->where(function ($q) use ($query, $like) {
                $q->where('name', $like, "%{$query}%")
                  ->orWhere('address', $like, "%{$query}%");
            })
            ->limit(5)
            ->get()
            ->map(fn ($loc) => [
                'id' => "loc-{$loc->id}",
                'title' => "Location: {$loc->name}",
                'subtitle' => ($loc->address ? "{$loc->address} • " : '') . "{$loc->radius_meters}m Radius • " . ($loc->enforce_strict_geofence ? 'Strict Block' : 'Soft Audit'),
                'type' => 'Workplace Location',
                'url' => route('shop.settings.index', ['tab' => 'locations']),
                'icon' => 'map-pin',
            ])->toArray();
    }

    private function searchSellerProducts(int $sellerId, string $query, string $like): array
    {
        return Product::where('user_id', $sellerId)
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
                'subtitle' => "SKU: {$p->sku} • Stock: {$p->stock}",
                'type' => 'Product',
                'url' => route('products.index', ['search' => $p->name]),
                'icon' => 'package',
            ])->toArray();
    }

    private function searchSellerOrders(int $sellerId, string $query, string $like): array
    {
        $cleanSearch = preg_replace('/^ORD-/i', '', $query);

        return Order::where('artisan_id', $sellerId)
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
                'title' => $o->order_number,
                'subtitle' => "Customer: {$o->customer_name} • Status: {$o->status}",
                'type' => 'Order',
                'url' => route('orders.index', ['search' => $o->order_number]),
                'icon' => 'shopping-cart',
            ])->toArray();
    }

    private function searchSellerSupplies(int $sellerId, string $query, string $like): array
    {
        return Supply::where('user_id', $sellerId)
            ->where('name', $like, "%{$query}%")
            ->limit(5)
            ->get()
            ->map(fn ($s) => [
                'id' => "supply-{$s->id}",
                'title' => "Supply: {$s->name}",
                'subtitle' => "Stock: {$s->quantity} {$s->unit} • Cost: ₱{$s->unit_cost}",
                'type' => 'Inventory',
                'url' => route('procurement.index', ['search' => $s->name]),
                'icon' => 'box',
            ])->toArray();
    }

    private function searchSellerStockRequests(int $sellerId, string $query, string $like): array
    {
        return StockRequest::where('user_id', $sellerId)
            ->whereHas('supply', function($q) use ($query, $like) {
                $q->where('name', $like, "%{$query}%");
            })
            ->with('supply')
            ->limit(5)
            ->get()
            ->map(fn ($sr) => [
                'id' => "sr-{$sr->id}",
                'title' => "Stock Request: {$sr->supply->name}",
                'subtitle' => "Qty: {$sr->quantity} • Status: {$sr->status}",
                'type' => 'Stock Request',
                'url' => route('stock-requests.index', ['search' => $sr->supply->name]),
                'icon' => 'truck',
            ])->toArray();
    }

    private function searchSellerReviews(int $sellerId, string $query, string $like): array
    {
        return Review::whereHas('product', function($q) use ($sellerId) {
                $q->where('user_id', $sellerId);
            })
            ->where(function ($q) use ($query, $like) {
                $q->where('comment', $like, "%{$query}%")
                    ->orWhereHas('user', function($uq) use ($query, $like) {
                        $uq->where('name', $like, "%{$query}%");
                    });
            })
            ->with(['product', 'user'])
            ->limit(5)
            ->get()
            ->map(fn ($r) => [
                'id' => "rev-{$r->id}",
                'title' => "Review for {$r->product->name}",
                'subtitle' => "By: {$r->user->name} • Rating: {$r->rating}/5",
                'type' => 'Review',
                'url' => route('reviews.index', ['search' => $r->user->name]),
                'icon' => 'message-square',
            ])->toArray();
    }

    private function searchSellerSponsorships(int $sellerId, string $query, string $like): array
    {
        return SponsorshipRequest::with(['product:id,name'])
            ->where('user_id', $sellerId)
            ->whereHas('product', function($q) use ($query, $like) {
                $q->where('name', $like, "%{$query}%");
            })
            ->limit(2)
            ->get()
            ->map(fn ($s) => [
                'id' => "sell-spons-{$s->id}",
                'title' => "Sponsorship: {$s->product->name}",
                'subtitle' => "Status: {$s->status}",
                'type' => 'Sponsorship',
                'url' => route('seller.sponsorships', ['search' => $s->product->name]),
                'icon' => 'award',
            ])->toArray();
    }

    private function searchSellerEmployees(int $sellerId, string $query, string $like): array
    {
        return Employee::where('user_id', $sellerId)
            ->where(function ($q) use ($query, $like) {
                $q->where('name', $like, "%{$query}%")
                    ->orWhere('role', $like, "%{$query}%");
            })
            ->limit(3)
            ->get()
            ->map(fn ($e) => [
                'id' => "emp-{$e->id}",
                'title' => $e->name,
                'subtitle' => "Role: {$e->role} • Status: {$e->status}",
                'type' => 'Employee',
                'url' => route('hr.index', ['search' => $e->name]),
                'icon' => 'users',
            ])->toArray();
    }

    private function searchSellerPayrolls(int $sellerId, string $query, string $like): array
    {
        return Payroll::where('user_id', $sellerId)
            ->where('month', $like, "%{$query}%")
            ->limit(2)
            ->get()
            ->map(fn ($p) => [
                'id' => "pay-{$p->id}",
                'title' => "Payroll: {$p->month}",
                'subtitle' => "Status: {$p->status} • Amount: ₱{$p->total_amount}",
                'type' => 'Payroll',
                'url' => route('hr.index', ['tab' => 'payroll', 'search' => $p->month]),
                'icon' => 'banknote',
            ])->toArray();
    }

    private function searchSellerLogs(int $sellerId, string $query, string $like): array
    {
        return SellerActivityLog::where('seller_owner_id', $sellerId)
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
        return StaffAccessAudit::where('seller_owner_id', $sellerId)
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
                'subtitle' => "Event: {$sa->event} • " . $sa->created_at->diffForHumans(),
                'type' => 'Staff Audit',
                'url' => route('audit-log.index', ['search' => $sa->summary]),
                'icon' => 'shield',
            ])->toArray();
    }
}

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
use App\Models\SystemAnnouncement;
use App\Models\Report;
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
        // Administrative Activity Logs (Audit Trail)
        $activities = \App\Models\PlatformActivity::where('description', $like, "%{$query}%")
            ->orWhere('action', $like, "%{$query}%")
            ->with('user')
            ->latest()
            ->limit(3)
            ->get()
            ->map(function ($a) {
                return [
                    'id' => "admin-log-{$a->id}",
                    'title' => "Audit: {$a->description}",
                    'subtitle' => "Actor: " . ($a->user->name ?? 'System') . " • " . $a->created_at->diffForHumans(),
                    'type' => 'Activity Log',
                    'url' => route('admin.activity.index', ['search' => $a->description]),
                    'icon' => 'activity',
                ];
            });

        // Super Admin Search: Users, Shops, and Admin Sponsorships
        $users = User::search($query, ['name', 'email', 'shop_name'])
            ->limit(5)
            ->get()
            ->map(function ($u) {
                return [
                    'id' => "user-{$u->id}",
                    'title' => $u->name,
                    'subtitle' => $u->role === 'artisan' ? "Shop: {$u->shop_name}" : "Role: {$u->role}",
                    'type' => 'User',
                    'url' => route('admin.users', ['search' => $u->email]),
                    'icon' => 'user',
                ];
            });
        
        $sponsorships = SponsorshipRequest::whereHas('product', function($q) use ($query) {
                $q->search($query, ['name']);
            })
            ->with('product', 'user')
            ->limit(5)
            ->get()
            ->map(function ($s) {
                return [
                    'id' => "spons-{$s->id}",
                    'title' => "Sponsorship: {$s->product->name}",
                    'subtitle' => "Artisan: {$s->user->name} • Status: {$s->status}",
                    'type' => 'Sponsorship',
                    'url' => route('admin.sponsorships', ['search' => $s->product->name]),
                    'icon' => 'star',
                ];
            });

        // Category Search (Admin)
        $adminCategories = Category::where('name', $like, "%{$query}%")
            ->limit(3)
            ->get()
            ->map(function ($c) {
                return [
                    'id' => "admin-cat-{$c->id}",
                    'title' => $c->name,
                    'subtitle' => "Category Management",
                    'type' => 'Category',
                    'url' => route('admin.taxonomy.index', ['search' => $c->name]),
                    'icon' => 'folder',
                ];
            });

        // System Announcements (Admin)
        $adminAnnouncements = SystemAnnouncement::where('title', $like, "%{$query}%")
            ->limit(3)
            ->get()
            ->map(function ($a) {
                return [
                    'id' => "admin-ann-{$a->id}",
                    'title' => $a->title,
                    'subtitle' => "Status: " . ($a->is_active ? 'Live' : 'Draft'),
                    'type' => 'Announcement',
                    'url' => route('admin.announcements', ['search' => $a->title]),
                    'icon' => 'megaphone',
                ];
            });

        // Moderation Reports (Admin)
        $adminReports = Report::where('reason', $like, "%{$query}%")
            ->orWhere('status', $like, "%{$query}%")
            ->limit(3)
            ->get()
            ->map(function ($r) {
                return [
                    'id' => "admin-rep-{$r->id}",
                    'title' => "Report #{$r->id}: " . substr($r->reason, 0, 30) . "...",
                    'subtitle' => "Status: {$r->status}",
                    'type' => 'Moderation',
                    'url' => route('admin.moderation', ['search' => $r->id]),
                    'icon' => 'shield',
                ];
            });

        // Product Search (Admin)
        $adminProducts = Product::search($query, ['name', 'sku'])
            ->limit(5)
            ->get()
            ->map(function ($p) {
                return [
                    'id' => "admin-prod-{$p->id}",
                    'title' => $p->name,
                    'subtitle' => "SKU: {$p->sku} • Status: {$p->status}",
                    'type' => 'Product',
                    'url' => route('admin.catalog.index', ['tab' => 'moderation', 'search' => $p->sku]),
                    'icon' => 'package',
                ];
            });

        // Escalated Dispute Search (Admin)
        $adminDisputes = \App\Models\Dispute::where('status', 'escalated')
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
            ->map(function ($d) {
                return [
                    'id' => "admin-disp-{$d->id}",
                    'title' => "Dispute: Order #" . ($d->order->order_number ?? 'N/A'),
                    'subtitle' => "Reason: " . substr($d->reason, 0, 30) . "... • Status: Escalated",
                    'type' => 'Dispute',
                    'url' => route('admin.disputes.index', ['search' => $d->order->order_number ?? '']),
                    'icon' => 'rotate-ccw',
                ];
            });

        return array_merge(
            $activities->toArray(),
            $users->toArray(), 
            $sponsorships->toArray(),
            $adminCategories->toArray(),
            $adminAnnouncements->toArray(),
            $adminReports->toArray(),
            $adminProducts->toArray(),
            $adminDisputes->toArray()
        );
    }

    private function sellerSearch(User $user, string $query, string $like): array
    {
        $sellerId = $user->getEffectiveSellerId();

        // Product Search
        $products = [];
        if ($user->canAccessSellerModule('products')) {
            $products = Product::where('user_id', $sellerId)
                ->search($query, ['name', 'sku'])
                ->limit(5)
                ->get()
                ->map(function ($p) {
                    return [
                        'id' => "prod-{$p->id}",
                        'title' => $p->name,
                        'subtitle' => "SKU: {$p->sku} • Stock: {$p->stock}",
                        'type' => 'Product',
                        'url' => route('products.index', ['search' => $p->sku]),
                        'icon' => 'package',
                    ];
                })->toArray();
        }

        // Order Search
        $orders = [];
        if ($user->canAccessSellerModule('orders')) {
            $orders = Order::where('artisan_id', $sellerId)
                ->where(function ($q) use ($query, $like) {
                    $q->where('order_number', $like, "%{$query}%")
                        ->orWhere('customer_name', $like, "%{$query}%")
                        ->orWhere('tracking_number', $like, "%{$query}%");
                })
                ->limit(5)
                ->get()
                ->map(function ($o) {
                    return [
                        'id' => "order-{$o->id}",
                        'title' => $o->order_number,
                        'subtitle' => "Customer: {$o->customer_name} • Status: {$o->status}",
                        'type' => 'Order',
                        'url' => route('orders.index', ['search' => $o->order_number]),
                        'icon' => 'shopping-cart',
                    ];
                })->toArray();
        }

        // Inventory (Supply) Search
        $supplies = [];
        if ($user->canAccessSellerModule('procurement')) {
            $supplies = Supply::where('user_id', $sellerId)
                ->where('name', $like, "%{$query}%")
                ->limit(5)
                ->get()
                ->map(function ($s) {
                    return [
                        'id' => "supply-{$s->id}",
                        'title' => "Supply: {$s->name}",
                        'subtitle' => "Stock: {$s->quantity} {$s->unit} • Cost: ₱{$s->unit_cost}",
                        'type' => 'Inventory',
                        'url' => route('procurement.index', ['search' => $s->name]),
                        'icon' => 'box',
                    ];
                })->toArray();
        }

        // Stock Request Search
        $stockRequests = [];
        if ($user->canAccessSellerModule('stock_requests')) {
            $stockRequests = StockRequest::where('user_id', $sellerId)
                ->whereHas('supply', function($q) use ($query, $like) {
                    $q->where('name', $like, "%{$query}%");
                })
                ->with('supply')
                ->limit(5)
                ->get()
                ->map(function ($sr) {
                    return [
                        'id' => "sr-{$sr->id}",
                        'title' => "Stock Request: {$sr->supply->name}",
                        'subtitle' => "Qty: {$sr->quantity} • Status: {$sr->status}",
                        'type' => 'Stock Request',
                        'url' => route('stock-requests.index', ['search' => $sr->supply->name]),
                        'icon' => 'truck',
                    ];
                })->toArray();
        }

        // Review Search
        $reviews = [];
        if ($user->canAccessSellerModule('reviews')) {
            $reviews = Review::whereHas('product', function($q) use ($sellerId) {
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
                ->map(function ($r) {
                    return [
                        'id' => "rev-{$r->id}",
                        'title' => "Review for {$r->product->name}",
                        'subtitle' => "By: {$r->user->name} • Rating: {$r->rating}/5",
                        'type' => 'Review',
                        'url' => route('reviews.index', ['search' => $r->user->name]),
                        'icon' => 'message-square',
                    ];
                })->toArray();
        }

        // Sponsorship Search (Seller)
        $sellerSponsorships = [];
        if ($user->isSellerOwner() && $user->canAccessSellerModule('sponsorships')) {
            $sellerSponsorships = SponsorshipRequest::where('user_id', $sellerId)
                ->whereHas('product', function($q) use ($query, $like) {
                    $q->where('name', $like, "%{$query}%");
                })
                ->limit(2)
                ->get()
                ->map(function ($s) {
                    return [
                        'id' => "sell-spons-{$s->id}",
                        'title' => "Sponsorship: {$s->product->name}",
                        'subtitle' => "Status: {$s->status}",
                        'type' => 'Sponsorship',
                        'url' => route('seller.sponsorships', ['search' => $s->product->name]),
                        'icon' => 'award',
                    ];
                })->toArray();
        }

        // Employee (HR) Search
        $employees = [];
        if ($user->canAccessSellerModule('hr')) {
            $employees = Employee::where('user_id', $sellerId)
                ->where(function ($q) use ($query, $like) {
                    $q->where('name', $like, "%{$query}%")
                        ->orWhere('role', $like, "%{$query}%");
                })
                ->limit(3)
                ->get()
                ->map(function ($e) {
                    return [
                        'id' => "emp-{$e->id}",
                        'title' => $e->name,
                        'subtitle' => "Role: {$e->role} • Status: {$e->status}",
                        'type' => 'Employee',
                        'url' => route('hr.index', ['search' => $e->name]),
                        'icon' => 'users',
                    ];
                })->toArray();
        }

        // Payroll Search
        $payrolls = [];
        if ($user->canAccessSellerModule('hr') || $user->canAccessSellerModule('accounting')) {
            $payrolls = Payroll::where('user_id', $sellerId)
                ->where('month', $like, "%{$query}%")
                ->limit(2)
                ->get()
                ->map(function ($p) {
                    return [
                        'id' => "pay-{$p->id}",
                        'title' => "Payroll: {$p->month}",
                        'subtitle' => "Status: {$p->status} • Amount: ₱{$p->total_amount}",
                        'type' => 'Payroll',
                        'url' => route('hr.index', ['tab' => 'payroll', 'search' => $p->month]),
                        'icon' => 'banknote',
                    ];
                })->toArray();
        }

        // Seller Activity Logs & Staff Access Audits (strictly owner-only)
        $sellerLogs = [];
        $staffAudits = [];
        if ($user->isSellerOwner()) {
            $sellerLogs = \App\Models\SellerActivityLog::where('user_id', $sellerId)
                ->where(function ($q) use ($query, $like) {
                    $q->where('description', $like, "%{$query}%")
                      ->orWhere('action', $like, "%{$query}%");
                })
                ->latest()
                ->limit(3)
                ->get()
                ->map(function ($l) {
                    return [
                        'id' => "seller-log-{$l->id}",
                        'title' => "Log: {$l->description}",
                        'subtitle' => $l->created_at->diffForHumans(),
                        'type' => 'Activity Log',
                        'url' => route('audit-log.index', ['search' => $l->description]),
                        'icon' => 'activity',
                    ];
                })->toArray();

            $staffAudits = \App\Models\StaffAccessAudit::where('seller_owner_id', $sellerId)
                ->where(function ($q) use ($query, $like) {
                    $q->where('summary', $like, "%{$query}%")
                      ->orWhere('event', $like, "%{$query}%");
                })
                ->latest()
                ->limit(3)
                ->get()
                ->map(function ($sa) {
                    return [
                        'id' => "staff-audit-{$sa->id}",
                        'title' => "Security: {$sa->summary}",
                        'subtitle' => "Event: {$sa->event} • " . $sa->created_at->diffForHumans(),
                        'type' => 'Staff Audit',
                        'url' => route('audit-log.index', ['search' => $sa->summary]),
                        'icon' => 'shield',
                    ];
                })->toArray();
        }

        return array_merge(
            $products,
            $orders,
            $supplies,
            $stockRequests,
            $reviews,
            $sellerSponsorships,
            $employees,
            $payrolls,
            $sellerLogs,
            $staffAudits
        );
    }
}

<?php

namespace App\Http\Controllers;

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

        $user = Auth::user();

        if ($user->isAdmin()) {
            return response()->json(['results' => $this->adminSearch($query)]);
        }

        if ($user->isArtisan() || $user->isStaff()) {
            return response()->json(['results' => $this->sellerSearch($user, $query)]);
        }

        return response()->json(['results' => []]);
    }

    private function adminSearch(string $query): array
    {
        $results = [];

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
        $adminCategories = Category::where('name', 'ILIKE', "%{$query}%")
            ->limit(3)
            ->get()
            ->map(function ($c) {
                return [
                    'id' => "admin-cat-{$c->id}",
                    'title' => $c->name,
                    'subtitle' => "Category Management",
                    'type' => 'Category',
                    'url' => route('admin.taxonomy', ['search' => $c->name]),
                    'icon' => 'folder',
                ];
            });

        // System Announcements (Admin)
        $adminAnnouncements = SystemAnnouncement::where('title', 'ILIKE', "%{$query}%")
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
        $adminReports = Report::where('reason', 'ILIKE', "%{$query}%")
            ->orWhere('status', 'ILIKE', "%{$query}%")
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

        return array_merge(
            $results, 
            $users->toArray(), 
            $sponsorships->toArray(),
            $adminCategories->toArray(),
            $adminAnnouncements->toArray(),
            $adminReports->toArray()
        );
    }

    private function sellerSearch(User $user, string $query): array
    {
        $sellerId = $user->getEffectiveSellerId();
        $results = [];

        // Product Search
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
            });


        // Order Search
        $orders = Order::where('artisan_id', $sellerId)
            ->where(function ($q) use ($query) {
                $q->where('order_number', 'LIKE', "%{$query}%")
                    ->orWhere('customer_name', 'LIKE', "%{$query}%")
                    ->orWhere('tracking_number', 'LIKE', "%{$query}%");
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
            });

        // Inventory (Supply) Search
        $supplies = Supply::where('user_id', $sellerId)
            ->where('name', 'LIKE', "%{$query}%")
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
            });

        // Stock Request Search
        $stockRequests = StockRequest::where('user_id', $sellerId)
            ->whereHas('supply', function($q) use ($query) {
                $q->where('name', 'LIKE', "%{$query}%");
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
            });

        // Review Search
        $reviews = Review::whereHas('product', function($q) use ($sellerId) {
                $q->where('user_id', $sellerId);
            })
            ->where(function ($q) use ($query) {
                $q->where('comment', 'LIKE', "%{$query}%")
                    ->orWhereHas('user', function($uq) use ($query) {
                        $uq->where('name', 'LIKE', "%{$query}%");
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
            });

        // Sponsorship Search (Seller)
        $sellerSponsorships = SponsorshipRequest::where('user_id', $sellerId)
            ->whereHas('product', function($q) use ($query) {
                $q->where('name', 'LIKE', "%{$query}%");
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
            });

        $results = array_merge(
            $results, 
            $products->toArray(), 
            $orders->toArray(), 
            $supplies->toArray(), 
            $stockRequests->toArray(),
            $reviews->toArray(),
            $sellerSponsorships->toArray()
        );

        // Employee (HR) Search
        $employees = Employee::where('user_id', $sellerId)
            ->where(function ($q) use ($query) {
                $q->where('name', 'LIKE', "%{$query}%")
                    ->orWhere('role', 'LIKE', "%{$query}%");
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
            });

        // Payroll Search
        $payrolls = Payroll::where('user_id', $sellerId)
            ->where('month', 'LIKE', "%{$query}%")
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
            });

        return array_merge($results, $employees->toArray(), $payrolls->toArray());
    }
}

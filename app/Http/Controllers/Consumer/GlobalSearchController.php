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
            $this->searchAdminActivities($query, $like),
            $this->searchAdminUsers($query),
            $this->searchAdminSponsorships($query),
            $this->searchAdminCategories($query, $like),
            $this->searchAdminModeration($query, $like),
            $this->searchAdminProducts($query),
            $this->searchAdminDisputes($query, $like)
        );
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

    private function searchAdminUsers(string $query): array
    {
        return User::search($query, ['name', 'email', 'shop_name'])
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

    private function searchAdminSponsorships(string $query): array
    {
        return SponsorshipRequest::whereHas('product', function($q) use ($query) {
                $q->search($query, ['name']);
            })
            ->with('product', 'user')
            ->limit(5)
            ->get()
            ->map(fn ($s) => [
                'id' => "spons-{$s->id}",
                'title' => "Sponsorship: {$s->product->name}",
                'subtitle' => "Artisan: {$s->user->name} • Status: {$s->status}",
                'type' => 'Sponsorship',
                'url' => route('admin.catalog.index', ['tab' => 'sponsorships', 'search' => $s->product->name]),
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

    private function searchAdminProducts(string $query): array
    {
        return Product::search($query, ['name', 'sku'])
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

        if ($user->canAccessSellerModule('products')) {
            $results = array_merge($results, $this->searchSellerProducts($sellerId, $query));
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
        }

        return $results;
    }

    private function searchSellerProducts(int $sellerId, string $query): array
    {
        return Product::where('user_id', $sellerId)
            ->search($query, ['name', 'sku'])
            ->limit(5)
            ->get()
            ->map(fn ($p) => [
                'id' => "prod-{$p->id}",
                'title' => $p->name,
                'subtitle' => "SKU: {$p->sku} • Stock: {$p->stock}",
                'type' => 'Product',
                'url' => route('products.index', ['search' => $p->sku]),
                'icon' => 'package',
            ])->toArray();
    }

    private function searchSellerOrders(int $sellerId, string $query, string $like): array
    {
        return Order::where('artisan_id', $sellerId)
            ->where(function ($q) use ($query, $like) {
                $q->where('order_number', $like, "%{$query}%")
                    ->orWhere('customer_name', $like, "%{$query}%")
                    ->orWhere('tracking_number', $like, "%{$query}%");
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
        return SellerActivityLog::where('user_id', $sellerId)
            ->where(function ($q) use ($query, $like) {
                $q->where('description', $like, "%{$query}%")
                  ->orWhere('action', $like, "%{$query}%");
            })
            ->latest()
            ->limit(3)
            ->get()
            ->map(fn ($l) => [
                'id' => "seller-log-{$l->id}",
                'title' => "Log: {$l->description}",
                'subtitle' => $l->created_at->diffForHumans(),
                'type' => 'Activity Log',
                'url' => route('audit-log.index', ['search' => $l->description]),
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

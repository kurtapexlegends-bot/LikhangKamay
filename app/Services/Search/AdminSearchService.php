<?php

declare(strict_types=1);

namespace App\Services\Search;

use App\Models\Category;
use App\Models\Dispute;
use App\Models\EmailTemplate;
use App\Models\FlaggedContent;
use App\Models\Order;
use App\Models\Payout;
use App\Models\PlatformActivity;
use App\Models\Product;
use App\Models\ReviewDispute;
use App\Models\SponsorshipRequest;
use App\Models\User;

class AdminSearchService
{
    /**
     * Perform exhaustive admin-level multi-domain search.
     */
    public function search(string $query, string $like): array
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

    public function searchAdminOrders(string $query, string $like): array
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

    public function searchAdminActivities(string $query, string $like): array
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

    public function searchAdminUsers(string $query, string $like): array
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
                    'subtitle' => "{$u->email} • {$roleLabel}" . ($u->banned_at ? ' • [DEACTIVATED]' : ''),
                    'type' => 'User',
                    'url' => route('admin.users.manager', ['tab' => 'directory', 'search' => $u->email]),
                    'icon' => 'user',
                ];
            })->toArray();
    }

    public function searchAdminProducts(string $query, string $like): array
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

    public function searchAdminDisputes(string $query, string $like): array
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

    public function searchAdminReviewDisputes(string $query, string $like): array
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

    public function searchAdminPayouts(string $query, string $like): array
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

    public function searchAdminSponsorships(string $query, string $like): array
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

    public function searchAdminEmailTemplates(string $query, string $like): array
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

    public function searchAdminCategories(string $query, string $like): array
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

    public function searchAdminModeration(string $query, string $like): array
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
}

<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Message;
use App\Models\Order;
use App\Models\Product;
use App\Models\SellerActivityLog;
use App\Models\Supply;
use App\Models\User;
use App\Support\RichTextSanitizer;
use App\Services\Catalog\ThreeDAssetService;
use App\Actions\Seller\Catalog\BulkUpdateProductStatus;
use App\Actions\Seller\Catalog\BulkActivateProducts;
use App\Actions\Seller\Catalog\CreateProduct;
use App\Actions\Seller\Catalog\UpdateProduct;
use App\Actions\Seller\Catalog\ImportProductsCsv;
use App\Actions\Seller\Catalog\ResubmitProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ProductController extends Controller
{
    use InteractsWithSellerContext;

    private const MAX_GALLERY_IMAGES = 5;

    public function index(Request $request)
    {
        /** @var \App\Models\User $seller */
        $seller = $this->sellerOwner();

        $query = Product::where('user_id', $seller->id)
            ->select([
                'id', 'sku', 'name', 'description', 'category', 'status',
                'clay_type', 'glaze_type', 'firing_method', 'food_safe', 'colors',
                'height', 'width', 'weight', 'price', 'cost_price', 'stock',
                'lead_time', 'sold', 'cover_photo_path', 'gallery_paths', 'model_3d_path',
                'track_as_supply', 'production_method', 'rejection_reason', 'created_at', 'updated_at',
            ])
            ->with(['recipes.supply']);

        if ($request->filled('search')) {
            $query->search($request->search, ['name', 'sku', 'category', 'description']);
        }

        if ($request->filled('status') && $request->status !== 'All') {
            if ($request->status === 'Low Stock') {
                $query->where('stock', '<', 10)->where('status', '!=', 'Archived');
            } else {
                $statusMap = [
                    'Pending Review' => 'pending_review',
                    'Rejected' => 'rejected',
                    'Flagged' => 'flagged',
                ];
                $dbStatus = $statusMap[$request->status] ?? $request->status;
                $query->where('status', $dbStatus);
            }
        }

        $sortKey = $request->input('sort_key', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');
        
        $allowedSortKeys = ['name', 'price', 'stock', 'sold', 'created_at', 'sku'];
        if (in_array($sortKey, $allowedSortKeys)) {
            $query->orderBy($sortKey, $sortDir);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $paginator = $query->paginate(20)->withQueryString();

        $paginator->through(function (Product $product) {
            return [
                'id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'description' => $product->description,
                'category' => $product->category,
                'status' => $product->status,
                'clay_type' => $product->clay_type,
                'glaze_type' => $product->glaze_type,
                'firing_method' => $product->firing_method,
                'food_safe' => (bool) $product->food_safe,
                'colors' => $product->colors ?? [],
                'height' => $product->height,
                'width' => $product->width,
                'weight' => $product->weight,
                'price' => $product->price,
                'cost_price' => $product->cost_price,
                'stock' => $product->stock,
                'lead_time' => $product->lead_time,
                'sold' => $product->sold,
                'cover_photo_path' => $product->cover_photo_path,
                'gallery_paths' => $product->gallery_paths ?? [],
                'model_3d_path' => $product->model_3d_path,
                'track_as_supply' => (bool) $product->track_as_supply,
                'production_method' => $product->production_method ?? 'resell',
                'rejection_reason' => $product->rejection_reason,
                'monthly_resubmission_count' => DB::table('product_resubmissions')
                    ->where('product_id', $product->id)
                    ->whereYear('created_at', now()->year)
                    ->whereMonth('created_at', now()->month)
                    ->count(),
                'recipes' => $product->recipes->map(fn($r) => [
                    'id' => $r->id,
                    'supply_id' => $r->supply_id,
                    'supply_name' => $r->supply->name ?? 'Unknown Supply',
                    'quantity_required' => $r->quantity_required,
                    'unit' => $r->supply->unit ?? '',
                ]),
                'img' => $product->cover_photo_path
                    ? '/storage/' . $product->cover_photo_path
                    : '/images/placeholder.svg',
                'has3D' => filled($product->model_3d_path),
            ];
        });

        return Inertia::render('Seller/Catalog/ProductManager', [
            'products' => $paginator,
            'categories' => \App\Models\Category::pluck('name')->toArray(),
            'supplies' => Supply::where('user_id', $seller->id)->where('category', '!=', 'Finished Goods')->get(),
            'subscription' => [
                'plan' => $seller->premium_tier,
                'activeCount' => $seller->products()->where('status', 'Active')->count(),
                'limit' => $seller->getActiveProductLimit(),
            ],
            'metrics' => [
                'lowStockCount' => $seller->products()->where('stock', '<', 10)->where('status', '!=', 'Archived')->count(),
                'incompleteDraftCount' => $seller->products()->where('status', 'Draft')
                    ->where(function($q) {
                        $q->whereNull('cover_photo_path')
                          ->orWhereNull('model_3d_path')
                          ->orWhere(function($sq) {
                              $sq->whereJsonLength('gallery_paths', '<', 3);
                          });
                    })->count(),
            ],
        ]);
    }

    public function store(Request $request, CreateProduct $createProduct, ThreeDAssetService $threeDAssetService)
    {
        /** @var \App\Models\User|null $seller */
        $seller = $request->user()->getEffectiveSeller();
        
        if (!$seller || !$seller->isApproved()) {
            return back()->with('error', 'Your artisan account is not yet approved. You cannot list products.');
        }

        $request->merge([
            'category' => trim((string) $request->input('category')),
        ]);

        $validated = $request->validate([
            'sku' => 'required|unique:products,sku',
            'name' => 'required|string|max:255',
            'category' => ['required', 'string', Rule::in(\App\Models\Category::pluck('name')->toArray())],
            'price' => 'required|numeric|min:0',
            'cost_price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'description' => 'nullable|string',
            'clay_type' => 'nullable|string',
            'glaze_type' => 'nullable|string',
            'firing_method' => 'nullable|string',
            'colors' => 'nullable|array',
            'height' => 'nullable|numeric|min:0',
            'width' => 'nullable|numeric|min:0',
            'weight' => 'nullable|numeric|min:0',
            'lead_time' => 'nullable|integer|min:0',
            'status' => 'required|string',
            'production_method' => 'nullable|string|in:resell,manufactured',
            'recipes' => 'nullable|array',
            'recipes.*.supply_id' => 'required|exists:supplies,id',
            'recipes.*.quantity_required' => 'required|numeric|min:0.01',
            'cover_photo' => 'nullable|image|max:10240',
            'gallery' => 'nullable|array|max:' . self::MAX_GALLERY_IMAGES,
            'gallery.*' => 'nullable|image|max:10240',
            'model_3d' => $threeDAssetService->getUploadRules(),
            ...$threeDAssetService->getAssetRules(),
        ]);

        $result = $createProduct->execute($validated, $request, $this->sellerOwner());
        $isPendingReview = $result['product'] && $result['product']->status === 'pending_review';

        return redirect()->back()->with('success', $isPendingReview
            ? 'Product submitted for review!'
            : ($result['requestedStatus'] === 'Draft' && $validated['status'] === 'Active'
                ? $this->draftActivationRequirementMessage($result['activationReadiness']['missing'])
                : 'Product created successfully!'));
    }

    public function update(Request $request, int|string $id, UpdateProduct $updateProduct, ThreeDAssetService $threeDAssetService)
    {
        $sellerOwner = $this->sellerOwner();
        /** @var \App\Models\Product $product */
        $product = Product::where('user_id', $sellerOwner->id)->findOrFail($id);

        $request->merge([
            'category' => trim((string) $request->input('category')),
        ]);

        $validated = $request->validate([
            'name' => 'required|string',
            'price' => 'required|numeric|min:0',
            'cost_price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'status' => 'required|string',
            'production_method' => 'nullable|string|in:resell,manufactured',
            'recipes' => 'nullable|array',
            'recipes.*.supply_id' => 'required|exists:supplies,id',
            'recipes.*.quantity_required' => 'required|numeric|min:0.01',
            'category' => ['required', 'string', Rule::in(\App\Models\Category::pluck('name')->toArray())],
            'cover_photo' => 'nullable|image|max:10240',
            'gallery' => 'nullable|array|max:' . self::MAX_GALLERY_IMAGES,
            'gallery.*' => 'nullable|image|max:10240',
            'retained_gallery' => 'nullable|array',
            'height' => 'nullable|numeric|min:0',
            'width' => 'nullable|numeric|min:0',
            'weight' => 'nullable|numeric|min:0',
            'lead_time' => 'nullable|integer|min:0',
            'model_3d' => $threeDAssetService->getUploadRules(),
            ...$threeDAssetService->getAssetRules(),
        ]);

        $result = $updateProduct->execute($product, $validated, $request, $sellerOwner);
        $isPendingReview = $result['product']->status === 'pending_review';

        return redirect()->back()->with('success', $isPendingReview
            ? 'Product submitted for review!'
            : ($result['requestedStatus'] === 'Draft' && $validated['status'] === 'Active'
                ? $this->draftActivationRequirementMessage($result['activationReadiness']['missing'])
                : 'Product updated successfully!'));
    }

    public function archive(string|int $id)
    {
        $product = Product::where('user_id', $this->sellerOwnerId())->findOrFail($id);
        $product->update(['status' => 'Archived']);

        SellerActivityLog::recordEvent([
            'seller_owner_id' => $this->sellerOwnerId(),
            'actor_user_id' => Auth::id(),
            'actor_type' => SellerActivityLog::resolveActorType(Auth::user(), 'owner'),
            'category' => 'operations',
            'module' => 'products',
            'event_type' => 'product_archived',
            'severity' => 'warning',
            'status' => 'archived',
            'title' => 'Product Archived',
            'summary' => "{$product->name} was archived from the active catalog.",
            'subject_type' => Product::class,
            'subject_id' => $product->id,
            'subject_label' => $product->name,
            'reference' => $product->sku,
            'target_url' => route('products.index', ['highlight_product' => $product->id]),
            'target_label' => 'Open Products',
        ]);

        return redirect()->back()->with('success', 'Product archived.');
    }

    public function bulkUpdateStatus(
        Request $request,
        BulkUpdateProductStatus $bulkUpdateProductStatus,
        BulkActivateProducts $bulkActivateProducts
    ) {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
            'status' => ['required', Rule::in(['Active', 'Draft', 'Archived'])],
        ]);

        /** @var \App\Models\User $seller */
        $seller = $this->sellerOwner();
        $targetStatus = $validated['status'];

        if ($targetStatus === 'Archived' || $targetStatus === 'Draft') {
            $result = $bulkUpdateProductStatus->execute($seller, $validated['ids'], $targetStatus, $request->user());
            return back()->with($result['status'], $result['message']);
        }

        $result = $bulkActivateProducts->execute($seller, $validated['ids'], $request->user());
        
        return back()->with(
            $result['status'],
            $this->bulkActivationMessage($result['activated'], $result['drafted'], $result['skipped'])
        );
    }

    public function activate(string|int $id)
    {
        $product = Product::where('user_id', $this->sellerOwnerId())->findOrFail($id);
        /** @var \App\Models\User $seller */
        $seller = $this->sellerOwner();
        $activationReadiness = $product->evaluateActivationReadiness();

        if (!$activationReadiness['canBeActive']) {
            $product->update(['status' => 'Draft']);

            return back()->with('error', $this->activationBlockedMessage($activationReadiness['missing']));
        }

        if (!$seller->canAddMoreProducts()) {
            return back()->with('error', 'You have reached your active products limit. Please upgrade your plan.');
        }

        $product->update(['status' => 'Active']);

        SellerActivityLog::recordEvent([
            'seller_owner_id' => $seller->id,
            'actor_user_id' => Auth::id(),
            'actor_type' => SellerActivityLog::resolveActorType(Auth::user(), 'owner'),
            'category' => 'operations',
            'module' => 'products',
            'event_type' => 'product_activated',
            'severity' => 'success',
            'status' => 'active',
            'title' => 'Product Activated',
            'summary' => "{$product->name} is now active in the catalog.",
            'subject_type' => Product::class,
            'subject_id' => $product->id,
            'subject_label' => $product->name,
            'reference' => $product->sku,
            'target_url' => route('products.index', ['highlight_product' => $product->id]),
            'target_label' => 'Open Products',
        ]);

        return redirect()->back()->with('success', 'Product activated.');
    }

    public function restock(Request $request, string|int $id)
    {
        $product = Product::where('user_id', $this->sellerOwnerId())->findOrFail($id);
        $validated = $request->validate([
            'amount' => 'required|integer|min:1',
        ]);

        $amount = $validated['amount'];
        $product->increment('stock', $amount);
        $activationReadiness = $product->evaluateActivationReadiness();
        $product->update([
            'status' => $product->status === 'Archived'
                ? 'Archived'
                : ($activationReadiness['canBeActive'] ? 'Active' : 'Draft'),
        ]);

        if ($product->track_as_supply && $product->supply) {
            $product->supply->update(['quantity' => $product->stock]);
        }

        SellerActivityLog::recordEvent([
            'seller_owner_id' => $this->sellerOwnerId(),
            'actor_user_id' => Auth::id(),
            'actor_type' => SellerActivityLog::resolveActorType(Auth::user(), 'owner'),
            'category' => 'operations',
            'module' => 'products',
            'event_type' => 'product_restocked',
            'severity' => 'success',
            'status' => strtolower($product->status),
            'title' => 'Product Restocked',
            'summary' => "{$product->name} stock increased by {$amount}.",
            'subject_type' => Product::class,
            'subject_id' => $product->id,
            'subject_label' => $product->name,
            'reference' => $product->sku,
            'details' => [
                'lines' => ["Stock is now {$product->fresh()->stock} unit(s)."],
            ],
            'target_url' => route('products.index', ['highlight_product' => $product->id]),
            'target_label' => 'Open Products',
        ]);

        return redirect()->back()->with('success', 'Product stock updated.');
    }

    public function manualDeduct(Request $request, int|string $id)
    {
        $product = Product::where('user_id', $this->sellerOwnerId())->findOrFail($id);

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
            'reason' => 'required|string|max:255',
        ]);

        if ($validated['quantity'] > $product->stock) {
            return back()->with('error', 'Insufficient stock.');
        }

        $product->decrement('stock', $validated['quantity']);
        $product->increment('sold', $validated['quantity']);

        $supply = $this->findSupplyForProduct($product, $this->sellerOwnerId());

        if ($supply) {
            $newQuantity = max(0, $supply->quantity - $validated['quantity']);
            $supply->update(['quantity' => $newQuantity]);
        }

        SellerActivityLog::recordEvent([
            'seller_owner_id' => $this->sellerOwnerId(),
            'actor_user_id' => Auth::id(),
            'actor_type' => SellerActivityLog::resolveActorType(Auth::user(), 'owner'),
            'category' => 'operations',
            'module' => 'products',
            'event_type' => 'product_manual_deduction',
            'severity' => 'warning',
            'status' => strtolower((string) $product->fresh()->status),
            'title' => 'Product Stock Deducted',
            'summary' => "{$validated['quantity']} unit(s) of {$product->name} were deducted from stock.",
            'subject_type' => Product::class,
            'subject_id' => $product->id,
            'subject_label' => $product->name,
            'reference' => $product->sku,
            'details' => [
                'before' => [
                    'stock' => $product->stock + $validated['quantity'],
                ],
                'after' => [
                    'stock' => $product->fresh()->stock,
                ],
                'lines' => ["Reason: {$validated['reason']}"],
            ],
            'target_url' => route('products.index', ['highlight_product' => $product->id]),
            'target_label' => 'Open Products',
        ]);

        return back()->with('success', "Stock updated. Deducted {$validated['quantity']} units for {$validated['reason']}.");
    }

    public function exportCsv()
    {
        /** @var \App\Models\User $seller */
        $seller = $this->sellerOwner();
        $products = Product::where('user_id', $seller->id)->get();

        $filename = "products-export-" . now()->format('Y-m-d-His') . ".csv";
        $headers = [
            "Content-Type" => "text/csv",
            "Content-Disposition" => "attachment; filename=\"$filename\"",
            "Pragma" => "no-cache",
            "Cache-Control" => "must-revalidate, post-check=0, pre-check=0",
            "Expires" => "0"
        ];

        $columns = ['SKU', 'Name', 'Category', 'Price', 'Cost Price', 'Stock', 'Lead Time', 'Status'];

        $callback = function() use ($products, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($products as $product) {
                fputcsv($file, [
                    $product->sku,
                    $product->name,
                    $product->category,
                    $product->price,
                    $product->cost_price,
                    $product->stock,
                    $product->lead_time,
                    $product->status,
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function importCsv(Request $request, ImportProductsCsv $importProductsCsv)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:2048',
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();
        $data = array_map('str_getcsv', file($path));
        $header = array_shift($data);

        $headerMap = array_change_key_case(array_flip(array_map('trim', $header)), CASE_LOWER);

        $skuIdx = $headerMap['sku'] ?? null;
        $nameIdx = $headerMap['name'] ?? null;
        $categoryIdx = $headerMap['category'] ?? null;
        $priceIdx = $headerMap['price'] ?? null;
        $stockIdx = $headerMap['stock'] ?? null;
        $statusIdx = $headerMap['status'] ?? null;

        if (is_null($skuIdx) || is_null($nameIdx) || is_null($categoryIdx) || is_null($priceIdx) || is_null($stockIdx) || is_null($statusIdx)) {
            return back()->with('error', 'Invalid CSV format. Missing required headers: SKU, Name, Category, Price, Stock, Status.');
        }

        try {
            $result = $importProductsCsv->execute($this->sellerOwner(), $data, $headerMap);
            return back()->with('success', $this->bulkActivationMessage(
                $result['count'] - $result['draftedForMissingMedia'] - $result['skippedForLimit'],
                $result['draftedForMissingMedia'],
                $result['skippedForLimit']
            ));
        } catch (\Exception $e) {
            return back()->with('error', 'Error during import: ' . $e->getMessage());
        }
    }

    public function resubmit(Request $request, int|string $id, ResubmitProduct $resubmitProduct)
    {
        $sellerOwner = $this->sellerOwner();
        /** @var \App\Models\Product $product */
        $product = Product::where('user_id', $sellerOwner->id)->findOrFail($id);

        if ($product->status !== 'rejected' && $product->status !== 'flagged') {
            return back()->with('error', 'Only rejected or flagged products can be resubmitted.');
        }

        $monthlyCount = DB::table('product_resubmissions')
            ->where('product_id', $product->id)
            ->whereYear('created_at', now()->year)
            ->whereMonth('created_at', now()->month)
            ->count();

        if ($monthlyCount >= 3) {
            return back()->withErrors(['resubmit' => 'You have reached the monthly limit of 3 resubmissions for this product.']);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        $resubmitProduct->execute($product, $validated);

        return back()->with('success', 'Product resubmitted for review successfully!');
    }

    public function show(Product $product)
    {
        $viewer = Auth::user();
        if ($product->status !== 'Active') {
            $isOwner = $viewer && $viewer->id === $product->user_id;
            $isAdmin = $viewer && $viewer->role === 'super_admin';
            if (!$isOwner && !$isAdmin) {
                abort(404);
            }
        }

        $product->load([
            'user',
            'reviews' => fn ($query) => $query->visibleToMarketplace()->with('user'),
        ]);

        $product->model_url = $product->model_3d_path
            ? asset('storage/' . $product->model_3d_path)
            : null;

        $product->image = $product->img;
        $product->setRelation('reviews', $product->reviews->map(function ($review) {
            $review->seller_reply = RichTextSanitizer::sanitize($review->seller_reply);
            return $review;
        }));
        
        $product->viewer_can_review = $viewer
            ? Order::query()
                ->where('user_id', $viewer->id)
                ->where('status', 'Completed')
                ->whereHas('items', function ($query) use ($product) {
                    $query->where('product_id', $product->id);
                })
                ->exists()
            : false;
        $product->viewer_can_chat_seller = $this->viewerCanChatSeller($viewer, $product->user);

        $sellerLocation = $product->user->city
            ? $product->user->city . ', PH'
            : 'Philippines';

        $product->seller = [
            'id' => $product->user->id,
            'name' => $product->user->name ?? 'Artisan',
            'shop_name' => $product->user->shop_name ?? null,
            'slug' => $product->user->shop_slug,
            'avatar' => $product->user->avatar,
            'location' => $sellerLocation,
            'premium_tier' => $product->user->premium_tier,
        ];

        $relatedProducts = $product->getRelatedProducts();

        return Inertia::render('Consumer/Shop/ProductShow', [
            'product' => $product,
            'relatedProducts' => $relatedProducts,
            'auth' => [
                'user' => Auth::user(),
            ],
        ]);
    }

    private function draftActivationRequirementMessage(array $missingRequirements): string
    {
        return 'Product saved as Draft. Add ' . $this->humanizeRequirementList($missingRequirements) . ' before listing it as Active.';
    }

    private function activationBlockedMessage(array $missingRequirements): string
    {
        return 'This product needs ' . $this->humanizeRequirementList($missingRequirements) . ' before it can be listed as Active. It remains in Draft.';
    }

    private function humanizeRequirementList(array $requirements): string
    {
        $requirements = array_values(array_unique($requirements));
        $count = count($requirements);

        if ($count === 0) {
            return 'the required media';
        }

        if ($count === 1) {
            return $requirements[0];
        }

        if ($count === 2) {
            return $requirements[0] . ' and ' . $requirements[1];
        }

        $lastRequirement = array_pop($requirements);

        return implode(', ', $requirements) . ', and ' . $lastRequirement;
    }

    private function bulkActivationMessage(int $activated, int $drafted, int $skipped): string
    {
        if ($activated === 0 && $skipped > 0 && $drafted === 0) {
            return "No selected products were activated. Your active product limit has already been reached.";
        }

        $message = "{$activated} product(s) were activated.";
        if ($activated === 1) {
            $message = "1 product was activated.";
        } elseif ($activated > 1) {
            $message = "{$activated} products were activated.";
        }

        if ($drafted > 0) {
            $productWord = $drafted === 1 ? 'product' : 'products';
            $message .= " {$drafted} {$productWord} was kept in Draft because required media is incomplete.";
            if ($drafted > 1) {
                $message = str_replace('was kept in Draft', 'were kept in Draft', $message);
            }
        }

        if ($skipped > 0) {
            $productWord = $skipped === 1 ? 'product' : 'products';
            $message .= " {$skipped} {$productWord} were skipped due to plan limits.";
        }

        return trim($message);
    }

    private function viewerCanChatSeller(?User $viewer, ?User $seller): bool
    {
        if (
            !$viewer
            || !$seller
            || $viewer->id === $seller->id
            || !$viewer->isBuyer()
            || !$seller->isArtisan()
        ) {
            return false;
        }

        return Order::query()
            ->where('artisan_id', $seller->id)
            ->where('user_id', $viewer->id)
            ->exists()
            || Message::query()
                ->where(function ($query) use ($viewer, $seller) {
                    $query->where('sender_id', $viewer->id)
                        ->where('receiver_id', $seller->id);
                })
                ->orWhere(function ($query) use ($viewer, $seller) {
                    $query->where('sender_id', $seller->id)
                        ->where('receiver_id', $viewer->id);
                })
                ->exists();
    }

    private function supplyLookupAttributes(Product $product, int $sellerId): array
    {
        return Supply::filterSchemaCompatibleAttributes([
            'user_id' => $sellerId,
            'product_id' => $product->id,
            'name' => $product->name,
            'category' => 'Finished Goods',
        ]);
    }

    private function findSupplyForProduct(Product $product, int $sellerId, ?string $fallbackName = null): ?Supply
    {
        $query = Supply::where('user_id', $sellerId);

        if (Supply::supportsProductIdColumn()) {
            return $query->where('product_id', $product->id)->first();
        }

        $names = collect([$product->name, $fallbackName])
            ->filter()
            ->unique()
            ->values();

        if ($names->isEmpty()) {
            return null;
        }

        return $query
            ->where('category', 'Finished Goods')
            ->whereIn('name', $names->all())
            ->first();
    }
}

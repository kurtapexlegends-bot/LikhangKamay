<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Http\Controllers\Seller\Concerns\ProductControllerHelpers;
use App\Models\Product;
use App\Models\Supply;
use App\Support\RichTextSanitizer;
use App\Services\Catalog\ThreeDAssetService;
use App\Actions\Seller\Catalog\CreateProduct;
use App\Actions\Seller\Catalog\UpdateProduct;
use App\Actions\Seller\Catalog\ArchiveProduct;
use App\Actions\Seller\Catalog\ActivateProduct;
use App\Actions\Seller\Catalog\RestockProduct;
use App\Actions\Seller\Catalog\ManualDeductProduct;
use App\Actions\Seller\Catalog\BulkUpdateProductStatus;
use App\Actions\Seller\Catalog\BulkActivateProducts;
use App\Actions\Seller\Catalog\ImportProductsCsv;
use App\Actions\Seller\Catalog\ResubmitProduct;
use App\Http\Requests\Seller\StoreProductRequest;
use App\Http\Requests\Seller\UpdateProductRequest;
use App\Http\Resources\Seller\SellerProductResource;
use App\Http\Resources\Consumer\ProductDetailResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ProductController extends Controller
{
    use InteractsWithSellerContext;
    use ProductControllerHelpers;

    private const MAX_GALLERY_IMAGES = 5;

    public function index(Request $request)
    {
        Gate::authorize('viewAny', Product::class);
        /** @var \App\Models\User $seller */
        $seller = $this->sellerOwner();

        try {
            $query = Product::where('user_id', $seller->id)
                ->select([
                    'id', 'sku', 'name', 'description', 'category', 'status',
                    'clay_type', 'glaze_type', 'firing_method', 'food_safe', 'colors',
                    'height', 'width', 'weight', 'price', 'cost_price', 'stock',
                    'lead_time', 'sold', 'cover_photo_path', 'gallery_paths', 'model_3d_path',
                    'track_as_supply', 'production_method', 'rejection_reason', 'created_at', 'updated_at',
                ])
                ->with(['recipes.supply', 'discounts'])
                ->withCount(['resubmissions as monthly_resubmission_count' => function ($q) {
                    $q->whereYear('created_at', now()->year)
                      ->whereMonth('created_at', now()->month);
                }]);

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

            $paginator->through(fn (Product $product) => new SellerProductResource($product));

            return Inertia::render('Seller/Catalog/ProductManager', [
                'products' => $paginator,
                'categories' => rescue(fn() => \App\Models\Category::pluck('name')->toArray(), []),
                'supplies' => rescue(fn() => Supply::where('user_id', $seller->id)->where('category', '!=', 'Finished Goods')->get(), collect()),
                'subscription' => [
                    'plan' => $seller->getEffectivePremiumTier(),
                    'planLabel' => $seller->getSellerTierLabel(),
                    'activeCount' => rescue(fn() => $seller->products()->where('status', 'Active')->count(), 0),
                    'limit' => $seller->getActiveProductLimit(),
                    'canAddMore' => $seller->canAddMoreProducts(),
                    'tierLimits' => [
                        'free' => (int) \App\Facades\Settings::get('tier_free_limit', 3),
                        'premium' => (int) \App\Facades\Settings::get('tier_premium_limit', 10),
                        'super_premium' => (int) \App\Facades\Settings::get('tier_super_premium_limit', 50),
                    ],
                ],
                'metrics' => [
                    'lowStockCount' => rescue(fn() => $seller->products()->where('stock', '<', 10)->where('status', '!=', 'Archived')->count(), 0),
                    'incompleteDraftCount' => rescue(fn() => $seller->products()->where('status', 'Draft')
                        ->where(function($q) {
                            $q->whereNull('cover_photo_path')
                              ->orWhereNull('model_3d_path')
                              ->orWhereNull('gallery_paths')
                              ->orWhere(function($sq) {
                                  $sq->whereNotNull('gallery_paths')
                                     ->whereJsonLength('gallery_paths', '<', 3);
                              });
                        })->count(), 0),
                ],
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('ProductController index error: ' . $e->getMessage(), [
                'exception' => $e
            ]);

            return Inertia::render('Seller/Catalog/ProductManager', [
                'products' => new \Illuminate\Pagination\LengthAwarePaginator([], 0, 20),
                'categories' => [],
                'supplies' => collect(),
                'subscription' => [
                    'plan' => $seller->getEffectivePremiumTier(),
                    'planLabel' => $seller->getSellerTierLabel(),
                    'activeCount' => 0,
                    'limit' => $seller->getActiveProductLimit(),
                    'canAddMore' => false,
                    'tierLimits' => [
                        'free' => (int) \App\Facades\Settings::get('tier_free_limit', 3),
                        'premium' => (int) \App\Facades\Settings::get('tier_premium_limit', 10),
                        'super_premium' => (int) \App\Facades\Settings::get('tier_super_premium_limit', 50),
                    ],
                ],
                'metrics' => [
                    'lowStockCount' => 0,
                    'incompleteDraftCount' => 0,
                ],
                'load_error' => 'Unable to load products at this moment.',
            ]);
        }
    }

    public function store(StoreProductRequest $request, CreateProduct $createProduct)
    {
        $validated = $request->validated();
        $result = $createProduct->execute($validated, $request, $this->sellerOwner());
        $isPendingReview = $result['product'] && $result['product']->status === 'pending_review';

        return redirect()->back()->with('success', $isPendingReview
            ? 'Product submitted for review!'
            : ($result['requestedStatus'] === 'Draft' && $validated['status'] === 'Active'
                ? $this->draftActivationRequirementMessage($result['activationReadiness']['missing'])
                : 'Product created successfully!'));
    }

    public function update(UpdateProductRequest $request, int|string $id, UpdateProduct $updateProduct)
    {
        $product = Product::findOrFail($id);
        $validated = $request->validated();

        $result = $updateProduct->execute($product, $validated, $request, $this->sellerOwner());
        $isPendingReview = $result['product']->status === 'pending_review';

        return redirect()->back()->with('success', $isPendingReview
            ? 'Product submitted for review!'
            : ($result['requestedStatus'] === 'Draft' && $validated['status'] === 'Active'
                ? $this->draftActivationRequirementMessage($result['activationReadiness']['missing'])
                : 'Product updated successfully!'));
    }

    public function archive(string|int $id, ArchiveProduct $archiveProduct)
    {
        $product = Product::findOrFail($id);
        Gate::authorize('update', $product);
        $archiveProduct->execute($product, $this->sellerOwnerId());

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

        foreach ($validated['ids'] as $id) {
            $product = Product::findOrFail($id);
            Gate::authorize('update', $product);
        }

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

    public function activate(string|int $id, ActivateProduct $activateProduct)
    {
        $product = Product::findOrFail($id);
        Gate::authorize('update', $product);
        $result = $activateProduct->execute($product, $this->sellerOwner());

        if (!$result['success']) {
            if ($result['reason'] === 'missing_media') {
                return back()->with('error', $this->activationBlockedMessage($result['missing']));
            }
            return back()->with('error', $result['message']);
        }

        return redirect()->back()->with('success', $result['message']);
    }

    public function restock(Request $request, string|int $id, RestockProduct $restockProduct)
    {
        $product = Product::findOrFail($id);
        Gate::authorize('update', $product);
        $validated = $request->validate([
            'amount' => 'required|integer|min:1',
        ]);

        $restockProduct->execute($product, $validated['amount'], $this->sellerOwnerId());

        return redirect()->back()->with('success', 'Product stock updated.');
    }

    public function manualDeduct(Request $request, int|string $id, ManualDeductProduct $manualDeductProduct)
    {
        $product = Product::findOrFail($id);
        Gate::authorize('update', $product);

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
            'reason' => 'required|string|max:255',
        ]);

        $result = $manualDeductProduct->execute($product, $validated['quantity'], $validated['reason'], $this->sellerOwnerId());

        if (!$result['success']) {
            return back()->with('error', $result['message']);
        }

        return back()->with('success', $result['message']);
    }

    public function exportCsv()
    {
        Gate::authorize('viewAny', Product::class);
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
        Gate::authorize('create', Product::class);
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:4096'],
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
        $product = Product::findOrFail($id);
        Gate::authorize('update', $product);

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
        if ($product->status !== 'Active' || $product->is_b2b_supply) {
            if (!$viewer || Gate::denies('view', $product)) {
                abort(404);
            }
        }

        $product->load([
            'user',
            'discounts',
            'reviews' => fn ($query) => $query->visibleToMarketplace()->with('user'),
        ]);

        $relatedProducts = $product->getRelatedProducts();

        return Inertia::render('Consumer/Shop/ProductShow', [
            'product' => new ProductDetailResource($product),
            'relatedProducts' => $relatedProducts,
            'auth' => [
                'user' => Auth::user(),
            ],
        ]);
    }
}

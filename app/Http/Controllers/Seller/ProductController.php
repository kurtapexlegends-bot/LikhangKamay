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

        $query = Product::where('user_id', $seller->id)
            ->select([
                'id', 'sku', 'name', 'description', 'category', 'status',
                'clay_type', 'glaze_type', 'firing_method', 'food_safe', 'colors',
                'height', 'width', 'weight', 'price', 'cost_price', 'stock',
                'lead_time', 'sold', 'cover_photo_path', 'gallery_paths', 'model_3d_path',
                'track_as_supply', 'production_method', 'rejection_reason', 'created_at', 'updated_at',
            ])
            ->with(['recipes.supply'])
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
        Gate::authorize('create', Product::class);
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
        $product = Product::findOrFail($id);
        Gate::authorize('update', $product);

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
        if ($product->status !== 'Active') {
            if (!$viewer || Gate::denies('view', $product)) {
                abort(404);
            }
        }

        $product->load([
            'user',
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

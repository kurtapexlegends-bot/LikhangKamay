<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Http\Controllers\Concerns\HandlesThreeDModelBundles;
use App\Http\Controllers\Concerns\ValidatesThreeDModelUploads;
use App\Models\Message;
use App\Models\Order;
use App\Models\Product;
use App\Models\SellerActivityLog;
use App\Models\Supply;
use App\Models\User;
use App\Support\RichTextSanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Support\Collection;
use Inertia\Inertia;

class ProductController extends Controller
{
    use InteractsWithSellerContext;
    use HandlesThreeDModelBundles;
    use ValidatesThreeDModelUploads;

    private const MAX_THREE_D_STORAGE_BYTES = 524288000;
    private const MIN_ACTIVE_GALLERY_IMAGES = 3;
    private const MAX_GALLERY_IMAGES = 5;

    public function index(Request $request)
    {
        /** @var \App\Models\User $seller */
        $seller = $this->sellerOwner();

        $query = Product::where('user_id', $seller->id)
            ->select([
                'id',
                'sku',
                'name',
                'description',
                'category',
                'status',
                'clay_type',
                'glaze_type',
                'firing_method',
                'food_safe',
                'colors',
                'height',
                'width',
                'weight',
                'price',
                'cost_price',
                'stock',
                'lead_time',
                'sold',
                'cover_photo_path',
                'gallery_paths',
                'model_3d_path',
                'track_as_supply',
                'production_method',
                'rejection_reason',
                'created_at',
                'updated_at',
            ])
            ->with(['recipes.supply']);

        // 1. Search Filter
        if ($request->filled('search')) {
            $query->search($request->search, ['name', 'sku', 'category', 'description']);
        }

        // 2. Status Filter
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

        // 3. Sorting
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

    public function store(Request $request)
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
            'model_3d' => $this->threeDModelUploadRules(),
            ...$this->threeDModelAssetRules(),
        ]);

        /** @var \App\Models\User $seller */
        $seller = $this->sellerOwner();
        $activationReadiness = $this->evaluateActivationReadiness(
            $request->hasFile('cover_photo'),
            count($request->file('gallery', [])),
            $request->hasFile('model_3d')
        );
        $requestedStatus = $this->normalizeStatusForActivationRequirements(
            $validated['status'],
            $activationReadiness['canBeActive']
        );

        if ($requestedStatus === 'Active' && !$seller->canAddMoreProducts()) {
            return back()->withErrors(['limit' => 'You have reached your active products limit. Please upgrade your plan to add more active products.']);
        }

        $coverPath = null;
        if ($request->hasFile('cover_photo')) {
            $coverPath = $this->resizeAndSave($request->file('cover_photo'), 'products/covers');
        }

        $modelPath = null;
        if ($request->hasFile('model_3d')) {
            $this->validateThreeDModelBundle($request);
            $incomingModelBytes = $this->getThreeDModelUploadSizeBytes($request);

            if (!$this->canStoreThreeDModel($seller->id, $incomingModelBytes)) {
                return back()
                    ->withErrors(['model_3d' => 'Uploading this 3D model would exceed your 500MB 3D storage limit.'])
                    ->withInput();
            }

            $modelPath = $this->storeThreeDModelBundle($request);
        }

        $galleryPaths = [];
        if ($request->hasFile('gallery')) {
            foreach ($request->file('gallery') as $file) {
                $galleryPaths[] = $this->resizeAndSave($file, 'products/gallery');
            }
        }

        $sellerId = $seller->id;

          $product = DB::transaction(function () use ($validated, $request, $modelPath, $coverPath, $galleryPaths, $sellerId, $requestedStatus) {
              $product = Product::create([
                'user_id' => $sellerId,
                'sku' => $validated['sku'],
                'name' => $validated['name'],
                'description' => $validated['description'] ?? '',
                'category' => $validated['category'],
                'price' => $validated['price'],
                'cost_price' => $validated['cost_price'] ?? 0,
                'stock' => $validated['stock'],
                'lead_time' => $validated['lead_time'] ?? 3,
                'status' => $requestedStatus,
                'clay_type' => $validated['clay_type'] ?? null,
                'glaze_type' => $validated['glaze_type'] ?? null,
                'firing_method' => $validated['firing_method'] ?? null,
                'food_safe' => $request->boolean('food_safe'),
                'colors' => $validated['colors'] ?? [],
                'height' => $validated['height'] ?? 0,
                'width' => $validated['width'] ?? 0,
                'weight' => $validated['weight'] ?? 0,
                'model_3d_path' => $modelPath,
                'cover_photo_path' => $coverPath,
                'gallery_paths' => $galleryPaths,
                'track_as_supply' => true,
                'production_method' => $validated['production_method'] ?? 'resell',
            ]);

            if (($validated['production_method'] ?? 'resell') === 'manufactured' && !empty($validated['recipes'])) {
                foreach ($validated['recipes'] as $recipe) {
                    $product->recipes()->create([
                        'supply_id' => $recipe['supply_id'],
                        'quantity_required' => $recipe['quantity_required'],
                    ]);
                }
            }

              Supply::create(Supply::filterSchemaCompatibleAttributes([
                'user_id' => $sellerId,
                'product_id' => $product->id,
                'name' => $validated['name'],
                'category' => 'Finished Goods',
                'quantity' => $validated['stock'],
                'unit' => 'pcs',
                'min_stock' => 5,
                'max_stock' => 500,
                'unit_cost' => $validated['cost_price'] ?? 0,
                'supplier' => 'Self/External',
                'notes' => 'Auto-generated from Product: ' . $validated['sku'],
              ]));

              SellerActivityLog::recordEvent([
                  'seller_owner_id' => $sellerId,
                  'actor_user_id' => Auth::id(),
                  'actor_type' => SellerActivityLog::resolveActorType(Auth::user(), 'owner'),
                  'category' => 'operations',
                  'module' => 'products',
                  'event_type' => 'product_created',
                  'severity' => 'success',
                  'status' => strtolower($requestedStatus),
                  'title' => 'Product Created',
                  'summary' => "{$product->name} was added to the catalog.",
                  'subject_type' => Product::class,
                  'subject_id' => $product->id,
                  'subject_label' => $product->name,
                  'reference' => $product->sku,
                  'amount_label' => 'PHP ' . number_format((float) $product->price, 2),
                  'details' => [
                      'after' => [
                          'status' => $product->status,
                          'stock' => $product->stock,
                          'price' => (float) $product->price,
                          'category' => $product->category,
                      ],
                      'lines' => array_values(array_filter([
                          $requestedStatus === 'Draft' && $validated['status'] === 'Active'
                              ? 'Saved as Draft because activation requirements are incomplete'
                              : 'Saved with requested status',
                      ])),
                  ],
                  'target_url' => route('products.index', ['highlight_product' => $product->id]),
                  'target_label' => 'Open Products',
              ]);

              return $product;
          });

        $isPendingReview = $product && $product->status === 'pending_review';

        return redirect()->back()->with('success', $isPendingReview
            ? 'Product submitted for review!'
            : ($requestedStatus === 'Draft' && $validated['status'] === 'Active'
                ? $this->draftActivationRequirementMessage($activationReadiness['missing'])
                : 'Product created successfully!'));
    }

      public function update(Request $request, int|string $id)
      {
          $sellerId = $this->sellerOwnerId();
          /** @var \App\Models\Product $product */
          $product = Product::where('user_id', $sellerId)->findOrFail($id);
          $before = [
              'name' => $product->name,
              'status' => $product->status,
              'stock' => $product->stock,
              'price' => (float) $product->price,
              'category' => $product->category,
          ];

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
            'model_3d' => $this->threeDModelUploadRules(),
            ...$this->threeDModelAssetRules(),
        ]);

        /** @var \App\Models\User $seller */
        $seller = $this->sellerOwner();
        $existingModelPath = $product->model_3d_path;
        $retainedGallery = $request->input('retained_gallery', []);
        $activationReadiness = $this->evaluateActivationReadiness(
            $request->hasFile('cover_photo') || filled($product->cover_photo_path),
            count($retainedGallery) + count($request->file('gallery', [])),
            $request->hasFile('model_3d') || filled($product->model_3d_path)
        );
        $requestedStatus = $this->normalizeStatusForActivationRequirements(
            $validated['status'],
            $activationReadiness['canBeActive']
        );

        if ($requestedStatus === 'Active' && $product->status !== 'Active' && !$seller->canAddMoreProducts()) {
            return back()->withErrors(['limit' => 'You have reached your active products limit. Please upgrade your plan to activate more products.']);
        }

        if ($request->hasFile('model_3d')) {
            $this->validateThreeDModelBundle($request);
            $incomingModelBytes = $this->getThreeDModelUploadSizeBytes($request);

            if (!$this->canStoreThreeDModel($seller->id, $incomingModelBytes, $existingModelPath)) {
                return back()
                    ->withErrors(['model_3d' => 'Uploading this 3D model would exceed your 500MB 3D storage limit.'])
                    ->withInput();
            }
        }

        if ($request->hasFile('cover_photo')) {
            if ($product->cover_photo_path) {
                Storage::disk('public')->delete($product->cover_photo_path);
            }
            $product->cover_photo_path = $this->resizeAndSave($request->file('cover_photo'), 'products/covers');
        }

        if ($request->hasFile('model_3d')) {
            if ($product->model_3d_path) {
                $this->deleteStoredThreeDModel($product->model_3d_path);
            }
            $product->model_3d_path = $this->storeThreeDModelBundle($request);
        }

        $oldGallery = $product->gallery_paths ?? [];
        $deletedGallery = array_diff($oldGallery, $retainedGallery);
        foreach ($deletedGallery as $deletedPath) {
            Storage::disk('public')->delete($deletedPath);
        }

        $galleryPaths = $retainedGallery;
        if ($request->hasFile('gallery')) {
            foreach ($request->file('gallery') as $file) {
                $galleryPaths[] = $this->resizeAndSave($file, 'products/gallery');
            }
        }
        $product->gallery_paths = $galleryPaths;

        $existingSupplyLookupName = $product->name;

        $product->update([
            'name' => $request->name,
            'description' => $request->description,
            'category' => $request->category,
            'price' => $request->price,
            'cost_price' => $request->cost_price ?? 0,
            'stock' => $request->stock,
            'status' => $requestedStatus,
            'clay_type' => $request->clay_type,
            'glaze_type' => $request->glaze_type,
            'firing_method' => $request->firing_method,
            'colors' => $request->colors,
            'food_safe' => $request->boolean('food_safe'),
            'height' => $request->height,
            'width' => $request->width,
            'weight' => $request->weight,
            'track_as_supply' => true,
            'production_method' => $validated['production_method'] ?? $product->production_method,
        ]);

        if ($request->hasFile('cover_photo') || $request->hasFile('model_3d')) {
            $product->save();
        }

        if (($validated['production_method'] ?? $product->production_method) === 'manufactured') {
            $product->recipes()->delete();
            if (!empty($validated['recipes'])) {
                foreach ($validated['recipes'] as $recipe) {
                    $product->recipes()->create([
                        'supply_id' => $recipe['supply_id'],
                        'quantity_required' => $recipe['quantity_required'],
                    ]);
                }
            }
        } else {
            $product->recipes()->delete();
        }

        $supply = $this->findSupplyForProduct($product, $sellerId, $existingSupplyLookupName);

        if (!$supply) {
            $supply = new Supply($this->supplyLookupAttributes($product, $sellerId));
        }

          $supply->fill(Supply::filterSchemaCompatibleAttributes([
            'name' => $product->name,
            'category' => 'Finished Goods',
            'quantity' => $product->stock,
            'unit' => 'pcs',
            'min_stock' => 5,
            'max_stock' => 500,
            'unit_cost' => $request->cost_price ?? 0,
            'supplier' => 'Self/External',
            'notes' => 'Auto-generated from Product: ' . $product->sku,
          ]));
          $supply->save();

          SellerActivityLog::recordEvent([
              'seller_owner_id' => $sellerId,
              'actor_user_id' => Auth::id(),
              'actor_type' => SellerActivityLog::resolveActorType(Auth::user(), 'owner'),
              'category' => 'operations',
              'module' => 'products',
              'event_type' => 'product_updated',
              'severity' => 'info',
              'status' => strtolower($product->status),
              'title' => 'Product Updated',
              'summary' => "{$product->name} details were updated.",
              'subject_type' => Product::class,
              'subject_id' => $product->id,
              'subject_label' => $product->name,
              'reference' => $product->sku,
              'amount_label' => 'PHP ' . number_format((float) $product->price, 2),
              'details' => [
                  'before' => $before,
                  'after' => [
                      'name' => $product->name,
                      'status' => $product->status,
                      'stock' => $product->stock,
                      'price' => (float) $product->price,
                      'category' => $product->category,
                  ],
                  'lines' => array_values(array_filter([
                      $request->hasFile('cover_photo') ? 'Updated cover image' : null,
                      $request->hasFile('gallery') ? 'Updated gallery images' : null,
                      $request->hasFile('model_3d') ? 'Updated 3D model bundle' : null,
                  ])),
              ],
              'target_url' => route('products.index', ['highlight_product' => $product->id]),
              'target_label' => 'Open Products',
          ]);

        $product->refresh();
        $isPendingReview = $product->status === 'pending_review';

        return redirect()->back()->with('success', $isPendingReview
            ? 'Product submitted for review!'
            : ($requestedStatus === 'Draft' && $validated['status'] === 'Active'
                ? $this->draftActivationRequirementMessage($activationReadiness['missing'])
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

    public function bulkUpdateStatus(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
            'status' => ['required', Rule::in(['Active', 'Draft', 'Archived'])],
        ]);

        /** @var \App\Models\User $seller */
        $seller = $this->sellerOwner();
        $selectedIds = collect($validated['ids'])->map(fn ($id) => (int) $id)->unique()->values();

        $products = Product::query()
            ->where('user_id', $seller->id)
            ->whereIn('id', $selectedIds)
            ->get();

        if ($products->isEmpty()) {
            return back()->with('error', 'No matching products were found.');
        }

        $targetStatus = $validated['status'];

        return DB::transaction(function () use ($seller, $products, $targetStatus, $selectedIds) {
            if ($targetStatus === 'Archived' || $targetStatus === 'Draft') {
                Product::query()
                    ->where('user_id', $seller->id)
                    ->whereIn('id', $products->pluck('id'))
                    ->update(['status' => $targetStatus]);

                SellerActivityLog::recordEvent([
                    'seller_owner_id' => $seller->id,
                    'actor_user_id' => Auth::id(),
                    'actor_type' => SellerActivityLog::resolveActorType(Auth::user(), 'owner'),
                    'category' => 'operations',
                    'module' => 'products',
                    'event_type' => 'product_bulk_status',
                    'severity' => $targetStatus === 'Archived' ? 'warning' : 'info',
                    'status' => strtolower($targetStatus),
                    'title' => 'Bulk Product Status Applied',
                    'summary' => "{$products->count()} product(s) were moved to {$targetStatus}.",
                    'subject_label' => 'Bulk product update',
                    'details' => [
                        'lines' => ["Updated {$products->count()} selected product(s) to {$targetStatus}."],
                    ],
                    'target_url' => route('products.index'),
                    'target_label' => 'Open Products',
                ]);

                return back()->with('success', $this->bulkStatusMessage($products->count(), strtolower($targetStatus)));
            }

            // Handle Bulk Activation with Limits
            $remainingActivationSlots = max(0, $seller->getActiveProductLimit() - $seller->products()->where('status', 'Active')->count());
            $activated = 0;
            $draftedForMissingMedia = 0;
            $skippedForLimit = 0;

            foreach ($selectedIds as $selectedId) {
                /** @var \App\Models\Product|null $product */
                $product = $products->firstWhere('id', $selectedId);
                if (!$product || $product->status === 'Active') continue;

                $activationReadiness = $this->evaluateActivationReadiness(
                    filled($product->cover_photo_path),
                    count($product->gallery_paths ?? []),
                    filled($product->model_3d_path)
                );

                if (!$activationReadiness['canBeActive']) {
                    $product->update(['status' => 'Draft']);
                    $draftedForMissingMedia++;
                    continue;
                }

                if ($remainingActivationSlots <= 0) {
                    $skippedForLimit++;
                    continue;
                }

                $product->update([
                    'status' => 'pending_review',
                    'rejection_reason' => null
                ]);
                $remainingActivationSlots--;
                $activated++;
            }

            SellerActivityLog::recordEvent([
                'seller_owner_id' => $seller->id,
                'actor_user_id' => Auth::id(),
                'actor_type' => SellerActivityLog::resolveActorType(Auth::user(), 'owner'),
                'category' => 'operations',
                'module' => 'products',
                'event_type' => 'product_bulk_status',
                'severity' => $skippedForLimit > 0 || $draftedForMissingMedia > 0 ? 'warning' : 'info',
                'status' => 'active',
                'title' => 'Bulk Product Activation',
                'summary' => "{$activated} product(s) were activated.",
                'subject_label' => 'Bulk product update',
                'details' => [
                    'lines' => array_values(array_filter([
                        "Activated {$activated} selected product(s).",
                        $draftedForMissingMedia > 0 ? "{$draftedForMissingMedia} product(s) remained Draft due to missing media requirements." : null,
                        $skippedForLimit > 0 ? "{$skippedForLimit} product(s) were skipped because your current plan limit is full." : null,
                    ])),
                ],
                'target_url' => route('products.index'),
                'target_label' => 'Open Products',
            ]);

            $sessionKey = ($activated === 0 && ($draftedForMissingMedia > 0 || $skippedForLimit > 0)) ? 'error' : 'success';
            return back()->with($sessionKey, $this->bulkActivationMessage($activated, $draftedForMissingMedia, $skippedForLimit));
        });
    }

    public function activate(string|int $id)
      {
          $product = Product::where('user_id', $this->sellerOwnerId())->findOrFail($id);
          /** @var \App\Models\User $seller */
        $seller = $this->sellerOwner();
        $activationReadiness = $this->evaluateActivationReadiness(
            filled($product->cover_photo_path),
            count($product->gallery_paths ?? []),
            filled($product->model_3d_path)
        );

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
        $activationReadiness = $this->evaluateActivationReadiness(
            filled($product->cover_photo_path),
            count($product->gallery_paths ?? []),
            filled($product->model_3d_path)
        );
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

    private function normalizeStatusForActivationRequirements(string $requestedStatus, bool $canBeActive): string
    {
        if ($requestedStatus === 'Active' && !$canBeActive) {
            return 'Draft';
        }

        return $requestedStatus;
    }

    /**
     * @return array{canBeActive: bool, missing: array<int, string>}
     */
    private function evaluateActivationReadiness(bool $hasCoverPhoto, int $galleryImageCount, bool $hasThreeDModel): array
    {
        $missing = [];

        if (!$hasCoverPhoto) {
            $missing[] = 'a cover image';
        }

        if (
            $galleryImageCount < self::MIN_ACTIVE_GALLERY_IMAGES
            || $galleryImageCount > self::MAX_GALLERY_IMAGES
        ) {
            $missing[] = '3 to 5 gallery images';
        }

        if (!$hasThreeDModel) {
            $missing[] = 'a 3D model';
        }

        return [
            'canBeActive' => empty($missing),
            'missing' => $missing,
        ];
    }

    /**
     * @param  array<int, string>  $missingRequirements
     */
    private function draftActivationRequirementMessage(array $missingRequirements): string
    {
        return 'Product saved as Draft. Add ' . $this->humanizeRequirementList($missingRequirements) . ' before listing it as Active.';
    }

    private function bulkStatusMessage(int $count, string $action): string
    {
        return $count . ' product' . ($count === 1 ? ' was ' : 's were ') . $action . '.';
    }

    /**
     * @param  array<int, string>  $missingRequirements
     */
    private function activationBlockedMessage(array $missingRequirements): string
    {
        return 'This product needs ' . $this->humanizeRequirementList($missingRequirements) . ' before it can be listed as Active. It remains in Draft.';
    }

    /**
     * @param  array<int, string>  $requirements
     */
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

    private function resizeAndSave(\Illuminate\Http\UploadedFile $file, string $path)
    {
        try {
            // Offload resizing to Supabase Transformations.
            // We just store the original file to save server memory/CPU.
            return $file->store($path, 'public');
        } catch (\Exception $e) {
            Log::error("Image storage failed: " . $e->getMessage());
            // Fallback: return the path where it WOULD have been stored if it failed silently
            return $file->store($path, 'public');
        }
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

        $relatedProducts = $this->buildRelatedProducts($product);

        return Inertia::render('Consumer/Shop/ProductShow', [
            'product' => $product,
            'relatedProducts' => $relatedProducts,
            'auth' => [
                'user' => Auth::user(),
            ],
        ]);
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

    private function canStoreThreeDModel(int $sellerId, int $incomingBytes, ?string $replacedPath = null): bool
    {
        $currentUsage = Product::where('user_id', $sellerId)
            ->whereNotNull('model_3d_path')
            ->get()
            ->sum(fn (Product $product) => $this->getStoredFileSizeBytes($product->model_3d_path));

        if ($replacedPath) {
            $currentUsage -= $this->getStoredFileSizeBytes($replacedPath);
        }

        return ($currentUsage + $incomingBytes) <= self::MAX_THREE_D_STORAGE_BYTES;
    }

    /**
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private function buildRelatedProducts(Product $product): Collection
    {
        $preferredMatches = Product::query()
            ->where('status', 'Active')
            ->where('id', '!=', $product->id)
            ->where('category', $product->category)
            ->with('user')
            ->orderByRaw("
                CASE
                    WHEN user_id = ? THEN 1
                    WHEN clay_type IS NOT NULL AND clay_type = ? THEN 2
                    WHEN glaze_type IS NOT NULL AND glaze_type = ? THEN 3
                    WHEN firing_method IS NOT NULL AND firing_method = ? THEN 4
                    ELSE 5
                END
            ", [
                $product->user_id,
                $product->clay_type,
                $product->glaze_type,
                $product->firing_method,
            ])
            ->orderByDesc('sold')
            ->orderByDesc('rating')
            ->orderByDesc('reviews_count')
            ->latest()
            ->take(4)
            ->get();

        $fallbackProducts = collect();

        if ($preferredMatches->count() < 4) {
            $fallbackProducts = Product::query()
                ->where('status', 'Active')
                ->where('id', '!=', $product->id)
                ->whereNotIn('id', $preferredMatches->pluck('id'))
                ->with('user')
                ->orderByRaw("
                    CASE
                        WHEN category = ? THEN 1
                        WHEN user_id = ? THEN 2
                        ELSE 3
                    END
                ", [$product->category, $product->user_id])
                ->orderByDesc('sold')
                ->orderByDesc('rating')
                ->orderByDesc('reviews_count')
                ->latest()
                ->take(4 - $preferredMatches->count())
                ->get();
        }

        return $preferredMatches
            ->concat($fallbackProducts)
            ->take(4)
            ->map(function (Product $relatedProduct) {
                return [
                    'id' => $relatedProduct->id,
                    'name' => $relatedProduct->name,
                    'slug' => $relatedProduct->slug,
                    'price' => $relatedProduct->price,
                    'image' => $relatedProduct->img,
                    'rating' => (float) ($relatedProduct->rating ?? 0),
                    'sold' => $relatedProduct->sold,
                    'location' => $relatedProduct->user->city ?? 'PH',
                ];
            })
            ->values();
    }

    private function getStoredFileSizeBytes(?string $path): int
    {
        return $this->getStoredThreeDModelSizeBytes($path);
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

    public function importCsv(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:2048',
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();
        $data = array_map('str_getcsv', file($path));
        $header = array_shift($data);

        // Map column headers dynamically to support flexible CSV formatting
        $headerMap = array_change_key_case(array_flip(array_map('trim', $header)), CASE_LOWER);

        $skuIdx = $headerMap['sku'] ?? null;
        $nameIdx = $headerMap['name'] ?? null;
        $categoryIdx = $headerMap['category'] ?? null;
        $priceIdx = $headerMap['price'] ?? null;
        $costPriceIdx = $headerMap['cost price'] ?? $headerMap['cost_price'] ?? null;
        $stockIdx = $headerMap['stock'] ?? null;
        $leadTimeIdx = $headerMap['lead time'] ?? $headerMap['lead_time'] ?? null;
        $statusIdx = $headerMap['status'] ?? null;

        if (is_null($skuIdx) || is_null($nameIdx) || is_null($categoryIdx) || is_null($priceIdx) || is_null($stockIdx) || is_null($statusIdx)) {
            return back()->with('error', 'Invalid CSV format. Missing required headers: SKU, Name, Category, Price, Stock, Status.');
        }

        /** @var \App\Models\User $seller */
        $seller = $this->sellerOwner();
        $count = 0;
        $draftedForMissingMedia = 0;
        $skippedForLimit = 0;

        $activeProductCount = Product::where('user_id', $seller->id)->where('status', 'Active')->count();
        $productLimit = $seller->getActiveProductLimit();

        DB::beginTransaction();
        try {
            foreach ($data as $row) {
                // Safely fetch by mapped header indices
                $sku = $row[$skuIdx] ?? null;
                $name = $row[$nameIdx] ?? null;
                $category = $row[$categoryIdx] ?? null;
                $price = isset($row[$priceIdx]) ? (float) $row[$priceIdx] : 0.0;
                $costPrice = isset($row[$costPriceIdx]) ? (float) $row[$costPriceIdx] : 0.0;
                $stock = isset($row[$stockIdx]) ? (int) $row[$stockIdx] : 0;
                $leadTime = isset($row[$leadTimeIdx]) ? (int) $row[$leadTimeIdx] : null;
                $status = $row[$statusIdx] ?? 'Draft';

                if (empty($sku) || empty($name)) continue;

                // Find existing product first to check original status and track_as_supply
                $existingProduct = Product::where('user_id', $seller->id)->where('sku', $sku)->first();
                $originalStatus = $existingProduct ? $existingProduct->status : 'Draft';
                $trackAsSupply = $existingProduct ? (bool)$existingProduct->track_as_supply : true;

                $product = Product::updateOrCreate(
                    ['user_id' => $seller->id, 'sku' => $sku],
                    [
                        'name' => $name,
                        'category' => $category,
                        'price' => $price,
                        'cost_price' => $costPrice,
                        'stock' => $stock,
                        'lead_time' => $leadTime,
                        'status' => $status,
                        'track_as_supply' => $trackAsSupply,
                    ]
                );

                // Enforce quality media controls and subscription limits for Active status
                $finalStatus = $status;
                if ($status === 'Active') {
                    $activationReadiness = $this->evaluateActivationReadiness(
                        filled($product->cover_photo_path),
                        count($product->gallery_paths ?? []),
                        filled($product->model_3d_path)
                    );

                    if (!$activationReadiness['canBeActive']) {
                        $finalStatus = 'Draft';
                        $draftedForMissingMedia++;
                    } else {
                        $currentlyActive = $originalStatus === 'Active';
                        if (!$currentlyActive) {
                            if ($activeProductCount >= $productLimit) {
                                $finalStatus = 'Draft';
                                $skippedForLimit++;
                            } else {
                                $activeProductCount++;
                            }
                        }
                    }
                }

                if ($product->status !== $finalStatus) {
                    $product->update(['status' => $finalStatus]);
                }

                // Sync Finished Goods supply record
                if ($product->track_as_supply) {
                    $supply = $this->findSupplyForProduct($product, $seller->id);
                    if (!$supply) {
                        $supply = new Supply($this->supplyLookupAttributes($product, $seller->id));
                    }
                    $supply->fill(Supply::filterSchemaCompatibleAttributes([
                        'name' => $product->name,
                        'category' => 'Finished Goods',
                        'quantity' => $product->stock,
                        'unit' => 'pcs',
                        'min_stock' => 5,
                        'max_stock' => 500,
                        'unit_cost' => $product->cost_price ?? 0,
                        'supplier' => 'Self/External',
                        'notes' => 'Auto-generated from Product SKU: ' . $product->sku,
                    ]));
                    $supply->save();
                }

                $count++;
            }

            // Record activity log for bulk import
            if ($count > 0) {
                SellerActivityLog::recordEvent([
                    'seller_owner_id' => $seller->id,
                    'actor_user_id' => Auth::id(),
                    'actor_type' => SellerActivityLog::resolveActorType(Auth::user(), 'owner'),
                    'category' => 'operations',
                    'module' => 'products',
                    'event_type' => 'product_bulk_status',
                    'severity' => 'info',
                    'status' => 'active',
                    'title' => 'Bulk Product CSV Import',
                    'summary' => "Imported/updated {$count} products from CSV.",
                    'details' => [
                        'lines' => array_values(array_filter([
                            "Successfully parsed and processed {$count} product(s) from CSV upload.",
                            $draftedForMissingMedia > 0 ? "{$draftedForMissingMedia} product(s) were forced to Draft due to incomplete media requirements (missing cover, gallery, or 3D models)." : null,
                            $skippedForLimit > 0 ? "{$skippedForLimit} product(s) were forced to Draft because the active product limit of {$productLimit} has been reached." : null,
                        ])),
                    ],
                    'target_url' => route('products.index'),
                    'target_label' => 'Open Products',
                ]);
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Error during import: ' . $e->getMessage());
        }

        return back()->with('success', $this->bulkActivationMessage($count - $draftedForMissingMedia - $skippedForLimit, $draftedForMissingMedia, $skippedForLimit));
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

    public function resubmit(Request $request, int|string $id)
    {
        $sellerId = $this->sellerOwnerId();
        /** @var \App\Models\Product $product */
        $product = Product::where('user_id', $sellerId)->findOrFail($id);

        if ($product->status !== 'rejected' && $product->status !== 'flagged') {
            return back()->with('error', 'Only rejected or flagged products can be resubmitted.');
        }

        // Count resubmissions this calendar month
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

        DB::transaction(function () use ($product, $validated) {
            // Log resubmission
            \App\Models\ProductResubmission::create([
                'product_id' => $product->id,
                'notes' => strip_tags($validated['notes'] ?? ''),
                'rejection_reason' => $product->rejection_reason,
            ]);

            Product::$bypassReview = true;
            $product->update([
                'status' => 'pending_review',
                'rejection_reason' => null,
            ]);
            Product::$bypassReview = false;

            // Notify super admins
            User::query()
                ->where('role', 'super_admin')
                ->each(function (User $admin) use ($product) {
                    $admin->notify(new \App\Notifications\ProductPendingReviewNotification($product));
                });

            // Log seller activity
            SellerActivityLog::recordEvent([
                'seller_owner_id' => $product->user_id,
                'actor_user_id' => Auth::id(),
                'actor_type' => SellerActivityLog::resolveActorType(Auth::user(), 'owner'),
                'category' => 'operations',
                'module' => 'products',
                'event_type' => 'product_resubmitted',
                'severity' => 'info',
                'status' => 'pending_review',
                'title' => 'Product Resubmitted',
                'summary' => "{$product->name} was resubmitted for review.",
                'subject_type' => Product::class,
                'subject_id' => $product->id,
                'subject_label' => $product->name,
                'reference' => $product->sku,
                'target_url' => route('products.index', ['highlight_product' => $product->id]),
                'target_label' => 'Open Products',
            ]);
        });

        return back()->with('success', 'Product resubmitted for review successfully!');
    }
}

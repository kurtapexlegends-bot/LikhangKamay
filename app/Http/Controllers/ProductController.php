<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Http\Controllers\Concerns\HandlesThreeDModelBundles;
use App\Http\Controllers\Concerns\ValidatesThreeDModelUploads;
use App\Models\Message;
use App\Models\Order;
use App\Models\Product;
use App\Models\Supply;
use App\Models\User;
use App\Support\RichTextSanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
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

    const VALID_CATEGORIES = [
        'Tableware',
        'Drinkware',
        'Vases & Jars',
        'Planters & Pots',
        'Home Decor',
        'Kitchenware',
        'Artisan Sets',
    ];

    public function index()
    {
        $seller = $this->sellerOwner();

        $products = Product::where('user_id', $seller->id)
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
                'created_at',
                'updated_at',
            ])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function (Product $product) {
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
                    'img' => $product->cover_photo_path
                        ? '/storage/' . $product->cover_photo_path
                        : '/images/placeholder.svg',
                    'has3D' => filled($product->model_3d_path),
                ];
            })
            ->values();

        return Inertia::render('Seller/ProductManager', [
            'products' => $products,
            'categories' => self::VALID_CATEGORIES,
            'subscription' => [
                'plan' => $seller->premium_tier,
                'activeCount' => $seller->products()->where('status', 'Active')->count(),
                'limit' => $seller->getActiveProductLimit(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $request->merge([
            'category' => trim((string) $request->input('category')),
        ]);

        $validated = $request->validate([
            'sku' => 'required|unique:products,sku',
            'name' => 'required|string|max:255',
            'category' => ['required', 'string', Rule::in(self::VALID_CATEGORIES)],
            'price' => 'required|numeric',
            'cost_price' => 'nullable|numeric',
            'stock' => 'required|integer',
            'description' => 'nullable|string',
            'clay_type' => 'nullable|string',
            'glaze_type' => 'nullable|string',
            'firing_method' => 'nullable|string',
            'colors' => 'nullable|array',
            'height' => 'nullable|numeric',
            'width' => 'nullable|numeric',
            'weight' => 'nullable|numeric',
            'lead_time' => 'nullable|integer',
            'status' => 'required|string',
            'cover_photo' => 'nullable|image|max:10240',
            'gallery' => 'nullable|array|max:' . self::MAX_GALLERY_IMAGES,
            'gallery.*' => 'nullable|image|max:10240',
            'model_3d' => $this->threeDModelUploadRules(),
            ...$this->threeDModelAssetRules(),
        ]);

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

        DB::transaction(function () use ($validated, $request, $modelPath, $coverPath, $galleryPaths, $sellerId, $requestedStatus) {
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
            ]);

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
        });

        return redirect()->back()->with('success', $requestedStatus === 'Draft' && $validated['status'] === 'Active'
            ? $this->draftActivationRequirementMessage($activationReadiness['missing'])
            : 'Product created successfully!');
    }

    public function update(Request $request, $id)
    {
        $sellerId = $this->sellerOwnerId();
        $product = Product::where('user_id', $sellerId)->findOrFail($id);

        $request->merge([
            'category' => trim((string) $request->input('category')),
        ]);

        $validated = $request->validate([
            'name' => 'required|string',
            'price' => 'required|numeric',
            'cost_price' => 'nullable|numeric',
            'stock' => 'required|integer',
            'status' => 'required|string',
            'category' => ['required', 'string', Rule::in(self::VALID_CATEGORIES)],
            'cover_photo' => 'nullable|image|max:10240',
            'gallery' => 'nullable|array|max:' . self::MAX_GALLERY_IMAGES,
            'gallery.*' => 'nullable|image|max:10240',
            'retained_gallery' => 'nullable|array',
            'model_3d' => $this->threeDModelUploadRules(),
            ...$this->threeDModelAssetRules(),
        ]);

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
        ]);

        if ($request->hasFile('cover_photo') || $request->hasFile('model_3d')) {
            $product->save();
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

        return redirect()->back()->with('success', $requestedStatus === 'Draft' && $validated['status'] === 'Active'
            ? $this->draftActivationRequirementMessage($activationReadiness['missing'])
            : 'Product updated successfully!');
    }

    public function archive($id)
    {
        $product = Product::where('user_id', $this->sellerOwnerId())->findOrFail($id);
        $product->update(['status' => 'Archived']);

        return redirect()->back()->with('success', 'Product archived.');
    }

    public function bulkUpdateStatus(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
            'status' => ['required', Rule::in(['Active', 'Draft', 'Archived'])],
        ]);

        $seller = $this->sellerOwner();
        $selectedIds = collect($validated['ids'])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $products = Product::query()
            ->where('user_id', $seller->id)
            ->whereIn('id', $selectedIds)
            ->get();

        if ($products->isEmpty()) {
            return back()->with('error', 'No matching products were found for the selected bulk action.');
        }

        $targetStatus = $validated['status'];

        if ($targetStatus === 'Archived') {
            Product::query()
                ->where('user_id', $seller->id)
                ->whereIn('id', $products->pluck('id'))
                ->update(['status' => 'Archived']);

            return back()->with('success', $this->bulkStatusMessage($products->count(), 'archived'));
        }

        if ($targetStatus === 'Draft') {
            Product::query()
                ->where('user_id', $seller->id)
                ->whereIn('id', $products->pluck('id'))
                ->update(['status' => 'Draft']);

            return back()->with('success', $this->bulkStatusMessage($products->count(), 'saved as Draft'));
        }

        $remainingActivationSlots = max(0, $seller->getActiveProductLimit() - $seller->products()->where('status', 'Active')->count());
        $activated = 0;
        $draftedForMissingMedia = 0;
        $skippedForLimit = 0;

        foreach ($selectedIds as $selectedId) {
            $product = $products->firstWhere('id', $selectedId);

            if (!$product) {
                continue;
            }

            if ($product->status === 'Active') {
                continue;
            }

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

            $product->update(['status' => 'Active']);
            $remainingActivationSlots--;
            $activated++;
        }

        if ($activated === 0 && $draftedForMissingMedia === 0) {
            return back()->with('error', 'No selected products were activated. Your active product limit has already been reached.');
        }

        $parts = [];

        if ($activated > 0) {
            $parts[] = $this->bulkStatusMessage($activated, 'activated');
        }

        if ($draftedForMissingMedia > 0) {
            $parts[] = $this->bulkStatusMessage($draftedForMissingMedia, 'kept in Draft because required media is incomplete');
        }

        if ($skippedForLimit > 0) {
            $parts[] = $this->bulkStatusMessage($skippedForLimit, 'skipped because your active product limit is already full');
        }

        return back()->with('success', implode(' ', $parts));
    }

    public function activate($id)
    {
        $product = Product::where('user_id', $this->sellerOwnerId())->findOrFail($id);
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

        return redirect()->back()->with('success', 'Product activated.');
    }

    public function restock(Request $request, $id)
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

    private function resizeAndSave($file, $path)
    {
        if (!function_exists('imagecreatefromstring')) {
            return $file->store($path, 'public');
        }

        $sourceImage = imagecreatefromstring(file_get_contents($file->getRealPath()));
        if (!$sourceImage) {
            return $file->store($path, 'public');
        }

        $width = imagesx($sourceImage);
        $height = imagesy($sourceImage);
        $maxDim = 1200;

        if ($width <= $maxDim && $height <= $maxDim) {
            imagedestroy($sourceImage);

            return $file->store($path, 'public');
        }

        if ($width > $maxDim || $height > $maxDim) {
            $ratio = $width / $height;
            if ($width > $height) {
                $newWidth = $maxDim;
                $newHeight = $maxDim / $ratio;
            } else {
                $newHeight = $maxDim;
                $newWidth = $maxDim * $ratio;
            }
            $newImage = imagescale($sourceImage, (int) $newWidth, (int) $newHeight);
            $sourceImage = $newImage;
        }

        ob_start();
        imagejpeg($sourceImage, null, 85);
        $imageData = ob_get_clean();

        $filename = $file->hashName();
        $filename = pathinfo($filename, PATHINFO_FILENAME) . '.jpg';
        $fullPath = $path . '/' . $filename;
        Storage::disk('public')->put($fullPath, $imageData);
        imagedestroy($sourceImage);

        return $fullPath;
    }

    public function show(Product $product)
    {
        $product->load(['user', 'reviews.user']);
        $viewer = Auth::user();

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

        return Inertia::render('Shop/ProductShow', [
            'product' => $product,
            'relatedProducts' => $relatedProducts,
            'auth' => [
                'user' => Auth::user(),
            ],
        ]);
    }

    public function manualDeduct(Request $request, $id)
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
            ->withAvg('reviews', 'rating')
            ->withCount('reviews')
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
            ->orderByDesc('reviews_avg_rating')
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
                ->withAvg('reviews', 'rating')
                ->withCount('reviews')
                ->orderByRaw("
                    CASE
                        WHEN category = ? THEN 1
                        WHEN user_id = ? THEN 2
                        ELSE 3
                    END
                ", [$product->category, $product->user_id])
                ->orderByDesc('sold')
                ->orderByDesc('reviews_avg_rating')
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
                    'rating' => (float) ($relatedProduct->reviews_avg_rating ?? $relatedProduct->rating ?? 0),
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
}

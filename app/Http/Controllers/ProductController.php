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
use Inertia\Inertia;

class ProductController extends Controller
{
    use InteractsWithSellerContext;
    use HandlesThreeDModelBundles;
    use ValidatesThreeDModelUploads;

    private const MAX_THREE_D_STORAGE_BYTES = 524288000;

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
            ->orderBy('created_at', 'desc')
            ->get();

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
            'gallery.*' => 'nullable|image|max:10240',
            'model_3d' => $this->threeDModelUploadRules(),
            ...$this->threeDModelAssetRules(),
        ]);

        $seller = $this->sellerOwner();
        $requestedStatus = $this->normalizeStatusForThreeDRequirement(
            $validated['status'],
            $request->hasFile('model_3d')
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
            ? 'Product saved as Draft. Upload a 3D model before listing it as Active.'
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
            'gallery.*' => 'nullable|image|max:10240',
            'retained_gallery' => 'nullable|array',
            'model_3d' => $this->threeDModelUploadRules(),
            ...$this->threeDModelAssetRules(),
        ]);

        $seller = $this->sellerOwner();
        $existingModelPath = $product->model_3d_path;
        $requestedStatus = $this->normalizeStatusForThreeDRequirement(
            $validated['status'],
            $request->hasFile('model_3d') || filled($product->model_3d_path)
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

        $retainedGallery = $request->input('retained_gallery', []);
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
            ? 'Product saved as Draft. Upload a 3D model before listing it as Active.'
            : 'Product updated successfully!');
    }

    public function archive($id)
    {
        $product = Product::where('user_id', $this->sellerOwnerId())->findOrFail($id);
        $product->update(['status' => 'Archived']);

        return redirect()->back()->with('success', 'Product archived.');
    }

    public function activate($id)
    {
        $product = Product::where('user_id', $this->sellerOwnerId())->findOrFail($id);
        $seller = $this->sellerOwner();

        if (!$product->model_3d_path) {
            $product->update(['status' => 'Draft']);

            return back()->with('error', 'Products need a 3D model before they can be listed as Active. It remains in Draft.');
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
        $product->update([
            'status' => $product->model_3d_path ? 'Active' : 'Draft',
        ]);

        if ($product->track_as_supply && $product->supply) {
            $product->supply->update(['quantity' => $product->stock]);
        }

        return redirect()->back()->with('success', 'Product stock updated.');
    }

    private function normalizeStatusForThreeDRequirement(string $requestedStatus, bool $hasThreeDModel): string
    {
        if ($requestedStatus === 'Active' && !$hasThreeDModel) {
            return 'Draft';
        }

        return $requestedStatus;
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

        $relatedProducts = Product::where('category', $product->category)
            ->where('id', '!=', $product->id)
            ->where('status', 'Active')
            ->with('user')
            ->inRandomOrder()
            ->take(4)
            ->get()
            ->map(function ($relatedProduct) {
                return [
                    'id' => $relatedProduct->id,
                    'name' => $relatedProduct->name,
                    'slug' => $relatedProduct->slug,
                    'price' => $relatedProduct->price,
                    'image' => $relatedProduct->img,
                    'rating' => $relatedProduct->rating,
                    'sold' => $relatedProduct->sold,
                    'location' => $relatedProduct->user->city ?? 'PH',
                ];
            });

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

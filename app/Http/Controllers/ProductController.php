<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ProductController extends Controller
{
    use InteractsWithSellerContext;

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
            'model_3d' => 'required|file|max:51200',
        ]);

        $seller = $this->sellerOwner();
        if ($validated['status'] === 'Active' && !$seller->canAddMoreProducts()) {
            return back()->withErrors(['limit' => 'You have reached your active products limit. Please upgrade your plan to add more active products.']);
        }

        $coverPath = null;
        if ($request->hasFile('cover_photo')) {
            $coverPath = $this->resizeAndSave($request->file('cover_photo'), 'products/covers');
        }

        $modelPath = null;
        if ($request->hasFile('model_3d')) {
            $modelPath = $request->file('model_3d')->store('products/models', 'public');
        }

        $galleryPaths = [];
        if ($request->hasFile('gallery')) {
            foreach ($request->file('gallery') as $file) {
                $galleryPaths[] = $this->resizeAndSave($file, 'products/gallery');
            }
        }

        $sellerId = $seller->id;

        DB::transaction(function () use ($validated, $request, $modelPath, $coverPath, $galleryPaths, $sellerId) {
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
                'status' => $validated['status'],
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

            \App\Models\Supply::create([
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
            ]);
        });

        return redirect()->back()->with('success', 'Product created successfully!');
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
            'model_3d' => $product->model_3d_path ? 'nullable|file|max:51200' : 'required|file|max:51200',
        ]);

        $seller = $this->sellerOwner();
        if ($validated['status'] === 'Active' && $product->status !== 'Active' && !$seller->canAddMoreProducts()) {
            return back()->withErrors(['limit' => 'You have reached your active products limit. Please upgrade your plan to activate more products.']);
        }

        if ($request->hasFile('cover_photo')) {
            if ($product->cover_photo_path) {
                Storage::disk('public')->delete($product->cover_photo_path);
            }
            $product->cover_photo_path = $this->resizeAndSave($request->file('cover_photo'), 'products/covers');
        }

        if ($request->hasFile('model_3d')) {
            if ($product->model_3d_path) {
                Storage::disk('public')->delete($product->model_3d_path);
            }
            $product->model_3d_path = $request->file('model_3d')->store('products/models', 'public');
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

        $product->update([
            'name' => $request->name,
            'description' => $request->description,
            'category' => $request->category,
            'price' => $request->price,
            'cost_price' => $request->cost_price ?? 0,
            'stock' => $request->stock,
            'status' => $request->status,
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

        $supply = \App\Models\Supply::firstOrCreate(
            [
                'user_id' => $sellerId,
                'product_id' => $product->id,
            ],
            [
                'name' => $product->name,
                'category' => 'Finished Goods',
                'quantity' => $product->stock,
                'unit' => 'pcs',
                'min_stock' => 5,
                'max_stock' => 500,
                'unit_cost' => $request->cost_price ?? 0,
                'supplier' => 'Self/External',
                'notes' => 'Auto-generated from Product: ' . $product->sku,
            ]
        );

        $supply->update([
            'quantity' => $product->stock,
            'unit_cost' => $request->cost_price ?? 0,
        ]);

        return redirect()->back()->with('success', 'Product updated successfully!');
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
        $product->update(['status' => 'Active']);

        if ($product->track_as_supply && $product->supply) {
            $product->supply->update(['quantity' => $product->stock]);
        }

        return redirect()->back()->with('success', 'Product stock updated.');
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

        $product->model_url = $product->model_3d_path
            ? asset('storage/' . $product->model_3d_path)
            : null;

        $product->image = $product->img;

        $sellerLocation = $product->user->city
            ? $product->user->city . ', PH'
            : 'Philippines';

        $product->seller = [
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

        $supply = \App\Models\Supply::where('user_id', $this->sellerOwnerId())
            ->where('product_id', $product->id)
            ->first();

        if ($supply) {
            $newQuantity = max(0, $supply->quantity - $validated['quantity']);
            $supply->update(['quantity' => $newQuantity]);
        }

        return back()->with('success', "Stock updated. Deducted {$validated['quantity']} units for {$validated['reason']}.");
    }
}

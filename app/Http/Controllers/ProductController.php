<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ProductController extends Controller
{
    // Standardized Categories
    const VALID_CATEGORIES = [
        'Tableware', 
        'Drinkware', 
        'Vases & Jars', 
        'Planters & Pots', 
        'Home Decor', 
        'Kitchenware', 
        'Artisan Sets'
    ];

    public function index()
    {
        // Fetch only products belonging to the logged-in artisan
        $products = Product::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Seller/ProductManager', [
            'products' => $products,
            'categories' => self::VALID_CATEGORIES, // Pass detailed list to frontend
            'active_products_count' => Auth::user()->products()->where('status', 'Active')->count(),
            'product_limit' => Auth::user()->getProductLimit()
        ]);
    }

    // POST: /products (Create New)
    public function store(Request $request)
    {
        $user = $request->user();
        if (strtolower($request->input('status', '')) === 'active') {
            $activeCount = $user->products()->whereRaw('LOWER(status) = ?', ['active'])->count();
            if ($activeCount >= $user->getProductLimit()) {
                return back()->withErrors(['limit' => 'You have reached your active product limit']);
            }
        }

        $validated = $request->validate([
            'sku' => 'required|unique:products,sku',
            'name' => 'required|string|max:255',
            'category' => 'required|string|in:' . implode(',', self::VALID_CATEGORIES),
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
            // Files - Increased to 10MB as requested
            'cover_photo' => 'nullable|image|max:10240', 
            'gallery.*' => 'nullable|image|max:10240',
            'model_3d' => 'required|file|max:51200', // 50MB (Mandatory)
        ]);

        // 1. Handle File Uploads (Resized)
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

        // 2. Create Product
        Product::create([
            'user_id' => Auth::id(),
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
            'track_as_supply' => true, // Always true
        ]);

        // 3. Auto-Sync to Procurement (Always)
        $product = Product::where('user_id', Auth::id())->where('sku', $validated['sku'])->first();
        \App\Models\Supply::create([
            'user_id' => Auth::id(),
            'product_id' => $product?->id,
            'name' => $validated['name'], // Use Product Name directly
            'category' => 'Finished Goods',
            'quantity' => $validated['stock'],
            'unit' => 'pcs',
            'min_stock' => 5,
            'max_stock' => 500, // Phase 1: Default
            'unit_cost' => $validated['cost_price'] ?? 0,
            'supplier' => 'Self/External',
            'notes' => 'Auto-generated from Product: ' . $validated['sku']
        ]);

        return redirect()->back()->with('success', 'Product created successfully!');
    }

    // POST: /products/{id}/update
    public function update(Request $request, $id)
    {
        $product = Product::where('user_id', Auth::id())->findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string',
            'price' => 'required|numeric',
            'cost_price' => 'nullable|numeric',
            'stock' => 'required|integer',
            'status' => 'required|string',
            'category' => 'required|string|in:' . implode(',', self::VALID_CATEGORIES),
            'cover_photo' => 'nullable|image|max:10240',
            'gallery.*' => 'nullable|image|max:10240',
            'retained_gallery' => 'nullable|array',
            // Require 3D model if not already uploaded
            'model_3d' => $product->model_3d_path ? 'nullable|file|max:51200' : 'required|file|max:51200',
        ]);

        // Handle Cover Photo Replacement
        if ($request->hasFile('cover_photo')) {
            if ($product->cover_photo_path) Storage::disk('public')->delete($product->cover_photo_path);
            $product->cover_photo_path = $this->resizeAndSave($request->file('cover_photo'), 'products/covers');
        }

        // Handle 3D Model Replacement
        if ($request->hasFile('model_3d')) {
            if ($product->model_3d_path) Storage::disk('public')->delete($product->model_3d_path);
            $product->model_3d_path = $request->file('model_3d')->store('products/models', 'public');
        }

        // Handle Gallery Images
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

        // Update Text Fields
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

            'track_as_supply' => true, // Always true
        ]);

        if ($request->has('cover_photo') || $request->has('model_3d')) {
            $product->save(); // ensure paths are saved
        }

        // 3. Auto-Sync to Procurement (Always) - Update
        $supply = \App\Models\Supply::firstOrCreate(
            [
                'user_id' => Auth::id(),
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
                'notes' => 'Auto-generated from Product: ' . $product->sku
            ]
        );
        // Keep supply quantity and cost in sync with product
        $supply->update([
            'quantity' => $product->stock,
            'unit_cost' => $request->cost_price ?? 0
        ]);

        return redirect()->back()->with('success', 'Product updated successfully!');
    }

    public function archive($id)
    {
        $product = Product::where('user_id', Auth::id())->findOrFail($id);
        $product->update(['status' => 'Archived']);
        return redirect()->back()->with('success', 'Product archived.');
    }

    // POST: /products/{id}/activate (Unarchive)
    public function activate($id)
    {
        $product = Product::where('user_id', Auth::id())->findOrFail($id);
        $product->update(['status' => 'Active']);
        return redirect()->back()->with('success', 'Product activated.');
    }
    
    // POST: /products/{id}/restock
    public function restock(Request $request, $id)
    {
        $product = Product::where('user_id', Auth::id())->findOrFail($id);
        $amount = $request->input('amount', 0);
        
        $product->increment('stock', $amount);
        $product->update(['status' => 'Active']); // Auto activate on restock
        
        return redirect()->back()->with('success', 'Product stock updated.');
    }

    /**
     * Resizes an image to max 1200px width/height and saves it.
     */
    private function resizeAndSave($file, $path)
    {
        // Check if GD extension is available
        if (!function_exists('imagecreatefromstring')) {
            // GD not available, just store original file
            return $file->store($path, 'public');
        }

        // 1. Load Image
        $sourceImage = imagecreatefromstring(file_get_contents($file->getRealPath()));
        if (!$sourceImage) {
            // Fallback if GD fails: just store original
            return $file->store($path, 'public');
        }

        // 2. Calculate New Dimensions
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
            $newImage = imagescale($sourceImage, (int)$newWidth, (int)$newHeight);
            // imagedestroy($sourceImage); // Deprecated in PHP 8.0
            $sourceImage = $newImage;
        }

        // 3. Save to Buffer (JPEG, 85% Quality)
        ob_start();
        imagejpeg($sourceImage, null, 85);
        $imageData = ob_get_clean();
        // imagedestroy($sourceImage);

        // 4. Store using Flysystem
        $filename = $file->hashName(); // e.g., 'abc1234.jpg' (auto-generated)
        // Force .jpg extension since we converted it
        $filename = pathinfo($filename, PATHINFO_FILENAME) . '.jpg';
        
        $fullPath = $path . '/' . $filename;
        Storage::disk('public')->put($fullPath, $imageData);

        return $fullPath;
    }

    // NEW: Display Single Product Page
    public function show(Product $product)
    {
        $product->load(['user', 'reviews.user']);

        // Append 'model_url' for 3D viewer if path exists
        $product->model_url = $product->model_3d_path 
            ? asset('storage/' . $product->model_3d_path) 
            : null;
        
        // Add explicit image attribute for frontend
        $product->image = $product->img; // Uses the accessor
        $product->is_sponsored = $product->is_sponsored && $product->sponsored_until > now();
            
        // Add seller info format with dynamic location
        $sellerLocation = $product->user->city 
            ? $product->user->city . ', PH'
            : 'Philippines';
            
        $product->seller = [
            'name' => $product->user->name ?? 'Artisan',
            'shop_name' => $product->user->shop_name ?? null,
            'slug' => $product->user->shop_slug, // Add Slug
            'avatar' => $product->user->avatar,
            'location' => $sellerLocation,
            'subscription_tier' => $product->user->subscription_tier ?? 'standard',
        ];

        // Fetch Related Products (Same category, exclude current, random 4)
        $relatedProducts = Product::where('category', $product->category)
            ->where('id', '!=', $product->id)
            ->where('status', 'Active')
            ->inRandomOrder()
            ->take(4)
            ->get()
            ->map(function ($p) {
                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'slug' => $p->slug,
                    'price' => $p->price,
                    'image' => $p->img, // Accessor
                    'rating' => $p->rating,
                    'sold' => $p->sold,
                    'location' => $p->user->city ?? 'PH',
                    'is_sponsored' => $p->is_sponsored && $p->sponsored_until > now(),
                ];
            });

        return Inertia::render('Shop/ProductShow', [
            'product' => $product,
            'relatedProducts' => $relatedProducts,
            'auth' => [
                'user' => Auth::user(),
            ]
        ]);
    }
    // NEW: Phase 1 - Manual Stock Deduction (Physical Store Sales)
    public function manualDeduct(Request $request, $id)
    {
        $product = Product::where('user_id', Auth::id())->findOrFail($id);
        
        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
            'reason' => 'required|string|max:255',
        ]);

        if ($validated['quantity'] > $product->stock) {
            return back()->with('error', 'Insufficient stock.');
        }

        // Deduct from Product
        $product->decrement('stock', $validated['quantity']);
        $product->increment('sold', $validated['quantity']); // Track as sale

        // Sync Linked Supply (Always)
        $supply = \App\Models\Supply::where('product_id', $product->id)->first();
        if ($supply) {
            $supply->decrement('quantity', $validated['quantity']);
        }

        return back()->with('success', "Stock updated. Deducted {$validated['quantity']} units for {$validated['reason']}.");
    }
}
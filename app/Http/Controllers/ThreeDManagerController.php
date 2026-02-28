<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ThreeDManagerController extends Controller
{
    /**
     * Display the 3D Asset Manager
     */
    public function index()
    {
        $userId = Auth::id();

        // Get all products with 3D models
        $models = Product::where('user_id', $userId)
            ->whereNotNull('model_3d_path')
            ->where('model_3d_path', '!=', '')
            ->select('id', 'name', 'model_3d_path', 'cover_photo_path', 'status', 'updated_at')
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function ($product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'url' => asset('storage/' . $product->model_3d_path),
                    'thumbnail' => $product->cover_photo_path 
                        ? asset('storage/' . $product->cover_photo_path) 
                        : null,
                    'status' => $product->status,
                    'date' => $product->updated_at->format('M d, Y'),
                    'size' => $this->getFileSize($product->model_3d_path),
                ];
            });

        // Storage stats
        $totalSize = Product::where('user_id', $userId)
            ->whereNotNull('model_3d_path')
            ->get()
            ->sum(function ($p) {
                return $this->getFileSizeBytes($p->model_3d_path);
            });

        $maxStorage = 500 * 1024 * 1024; // 500MB limit
        $usagePercent = min(100, ($totalSize / $maxStorage) * 100);

        // Products without 3D models (for upload modal)
        $availableProducts = Product::where('user_id', $userId)
            ->where(function ($q) {
                $q->whereNull('model_3d_path')
                  ->orWhere('model_3d_path', '');
            })
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        return Inertia::render('Seller/ThreeDManager', [
            'models' => $models,
            'products' => $availableProducts,
            'storage' => [
                'used' => $this->formatBytes($totalSize),
                'max' => '500MB',
                'percent' => round($usagePercent),
            ],
        ]);
    }

    /**
     * Upload a 3D model and attach to a product
     */
    public function upload(Request $request)
    {
        $request->validate([
            'model' => 'required|file|mimes:glb,gltf|max:51200', // 50MB max
            'product_id' => 'required|exists:products,id',
        ]);

        $product = Product::where('id', $request->product_id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        // Delete old model if exists
        if ($product->model_3d_path) {
            Storage::disk('public')->delete($product->model_3d_path);
        }

        // Store new model
        $path = $request->file('model')->store('models-3d', 'public');

        $product->update(['model_3d_path' => $path]);

        return back()->with('success', '3D model uploaded successfully!');
    }

    /**
     * Delete a 3D model from a product
     */
    public function destroy(Product $product)
    {
        if ($product->user_id !== Auth::id()) {
            abort(403);
        }

        if ($product->model_3d_path) {
            Storage::disk('public')->delete($product->model_3d_path);
            $product->update(['model_3d_path' => null]);
        }

        return back()->with('success', '3D model removed.');
    }

    /**
     * Get file size in human-readable format
     */
    private function getFileSize($path)
    {
        $bytes = $this->getFileSizeBytes($path);
        return $this->formatBytes($bytes);
    }

    private function getFileSizeBytes($path)
    {
        if (!$path) return 0;
        $fullPath = storage_path('app/public/' . $path);
        return file_exists($fullPath) ? filesize($fullPath) : 0;
    }

    private function formatBytes($bytes)
    {
        if ($bytes >= 1048576) {
            return round($bytes / 1048576, 1) . 'MB';
        } elseif ($bytes >= 1024) {
            return round($bytes / 1024, 1) . 'KB';
        }
        return $bytes . 'B';
    }
}
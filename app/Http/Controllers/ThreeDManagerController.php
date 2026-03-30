<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ThreeDManagerController extends Controller
{
    use InteractsWithSellerContext;

    private const MAX_STORAGE_BYTES = 524288000;

    public function index()
    {
        $sellerId = $this->sellerOwnerId();

        $models = Product::where('user_id', $sellerId)
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

        $totalSize = Product::where('user_id', $sellerId)
            ->whereNotNull('model_3d_path')
            ->get()
            ->sum(function ($product) {
                return $this->getFileSizeBytes($product->model_3d_path);
            });

        $usagePercent = min(100, ($totalSize / self::MAX_STORAGE_BYTES) * 100);

        $availableProducts = Product::where('user_id', $sellerId)
            ->select('id', 'name', 'model_3d_path')
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

    public function upload(Request $request)
    {
        $request->validate([
            'model' => 'required|file|mimes:glb,gltf|max:51200',
            'product_id' => 'required|exists:products,id',
        ]);

        $product = Product::where('id', $request->product_id)
            ->where('user_id', $this->sellerOwnerId())
            ->firstOrFail();
        $incomingBytes = $request->file('model')->getSize();
        $existingBytes = $this->getFileSizeBytes($product->model_3d_path);
        $currentUsage = Product::where('user_id', $this->sellerOwnerId())
            ->whereNotNull('model_3d_path')
            ->get()
            ->sum(fn (Product $existingProduct) => $this->getFileSizeBytes($existingProduct->model_3d_path));

        if (($currentUsage - $existingBytes + $incomingBytes) > self::MAX_STORAGE_BYTES) {
            return back()->withErrors([
                'model' => 'Uploading this 3D model would exceed your 500MB 3D storage limit.',
            ]);
        }

        if ($product->model_3d_path) {
            Storage::disk('public')->delete($product->model_3d_path);
        }

        $path = $request->file('model')->store('models-3d', 'public');
        $product->update(['model_3d_path' => $path]);

        return back()->with('success', '3D model uploaded successfully!');
    }

    public function destroy(Product $product)
    {
        $this->authorizeSellerOwnership($product->user_id);
        $wasActive = $product->status === 'Active';

        if ($product->model_3d_path) {
            Storage::disk('public')->delete($product->model_3d_path);
            $product->update([
                'model_3d_path' => null,
                'status' => $wasActive ? 'Draft' : $product->status,
            ]);
        }

        return back()->with('success', $wasActive
            ? '3D model removed. The product was moved to Draft until a new 3D model is uploaded.'
            : '3D model removed.');
    }

    private function getFileSize($path)
    {
        $bytes = $this->getFileSizeBytes($path);

        return $this->formatBytes($bytes);
    }

    private function getFileSizeBytes($path)
    {
        if (!$path) {
            return 0;
        }

        $fullPath = storage_path('app/public/' . $path);

        return file_exists($fullPath) ? filesize($fullPath) : 0;
    }

    private function formatBytes($bytes)
    {
        if ($bytes >= 1048576) {
            return round($bytes / 1048576, 1) . 'MB';
        }

        if ($bytes >= 1024) {
            return round($bytes / 1024, 1) . 'KB';
        }

        return $bytes . 'B';
    }
}

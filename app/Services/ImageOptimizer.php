<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageOptimizer
{
    /**
     * Store and optimize an avatar upload (max 320x320, clean compression).
     */
    public static function storeAvatar(UploadedFile $file, string $disk = 'public'): string
    {
        return self::storeOptimized($file, 'avatars', 320, 85, $disk);
    }

    /**
     * Store and optimize an uploaded image with maximum dimensions.
     */
    public static function storeOptimized(
        UploadedFile $file,
        string $folder = 'uploads',
        int $maxDim = 1200,
        int $quality = 85,
        string $disk = 'public'
    ): string {
        $ext = strtolower($file->getClientOriginalExtension());
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp']) || !extension_loaded('gd')) {
            return $file->store($folder, $disk);
        }

        $realPath = $file->getRealPath();
        $src = null;
        if ($ext === 'png') {
            $src = @imagecreatefrompng($realPath);
        } elseif (in_array($ext, ['jpg', 'jpeg'])) {
            $src = @imagecreatefromjpeg($realPath);
        } elseif ($ext === 'webp') {
            $src = @imagecreatefromwebp($realPath);
        }

        if (!$src) {
            return $file->store($folder, $disk);
        }

        $origWidth = imagesx($src);
        $origHeight = imagesy($src);

        if ($origWidth <= $maxDim && $origHeight <= $maxDim) {
            // Already within limits, store normally
            imagedestroy($src);
            return $file->store($folder, $disk);
        }

        if ($origWidth > $origHeight) {
            $newWidth = $maxDim;
            $newHeight = (int) round(($origHeight / $origWidth) * $maxDim);
        } else {
            $newHeight = $maxDim;
            $newWidth = (int) round(($origWidth / $origHeight) * $maxDim);
        }

        $dest = imagecreatetruecolor($newWidth, $newHeight);

        if ($ext === 'png') {
            imagealphablending($dest, false);
            imagesavealpha($dest, true);
            imagecopyresampled($dest, $src, 0, 0, 0, 0, $newWidth, $newHeight, $origWidth, $origHeight);
            ob_start();
            imagepng($dest, null, 7);
            $stream = ob_get_clean();
        } else {
            imagecopyresampled($dest, $src, 0, 0, 0, 0, $newWidth, $newHeight, $origWidth, $origHeight);
            ob_start();
            imagejpeg($dest, null, $quality);
            $stream = ob_get_clean();
        }

        imagedestroy($dest);
        imagedestroy($src);

        $filename = Str::random(40) . '.' . $ext;
        $path = trim($folder, '/') . '/' . $filename;

        Storage::disk($disk)->put($path, $stream);

        return $path;
    }
}

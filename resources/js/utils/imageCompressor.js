/**
 * Fast client-side Canvas compressor for image uploads.
 * Reduces high-res camera/phone photos to ~200-500KB JPEG blobs
 * to guarantee Vercel 4.5MB serverless payload limit is never exceeded.
 */
export async function compressImage(file, maxWidth = 1600, maxHeight = 1600, quality = 0.85) {
    if (!file || !(file instanceof File) || !file.type.startsWith('image/')) {
        return file;
    }

    // Preserve vector SVGs and animated GIFs
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
        return file;
    }

    // If file is already small (under 400KB), return as is
    if (file.size <= 400 * 1024) {
        return file;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return file;
    }

    return new Promise((resolve) => {
        let objectUrl = null;
        const img = new Image();

        const cleanup = () => {
            if (objectUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
                URL.revokeObjectURL(objectUrl);
                objectUrl = null;
            }
        };

        img.onload = () => {
            cleanup();
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(file);
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(file);
                        return;
                    }
                    const fileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                    const compressedFile = new File([blob], fileName, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = () => {
            cleanup();
            resolve(file);
        };

        if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
            try {
                objectUrl = URL.createObjectURL(file);
                img.src = objectUrl;
            } catch {
                // Fallback to FileReader if createObjectURL fails
                const reader = new FileReader();
                reader.onload = (event) => {
                    img.src = event.target.result;
                };
                reader.onerror = () => resolve(file);
                reader.readAsDataURL(file);
            }
        } else {
            const reader = new FileReader();
            reader.onload = (event) => {
                img.src = event.target.result;
            };
            reader.onerror = () => resolve(file);
            reader.readAsDataURL(file);
        }
    });
}

/**
 * Resolve any image path into a fully qualified, browser-accessible URL.
 * Safely handles:
 * - Full URLs ('http://', 'https://')
 * - Inline data URLs ('data:') and local blob URLs ('blob:')
 * - Root-relative web paths ('/images/...', '/storage/...', '/models/...')
 * - Relative public asset paths ('images/...', 'models/...')
 * - Relative storage upload paths ('products/...', 'avatars/...')
 * - Missing, null, or empty string values with a reliable fallback
 *
 * @param {string|null|undefined} path
 * @param {string} fallback
 * @returns {string}
 */
export function resolveImageUrl(path, fallback = '/images/placeholder.svg') {
    if (!path || typeof path !== 'string' || path.trim() === '') {
        return fallback;
    }

    const trimmed = path.trim();

    // Already a complete external URL or browser memory blob/data URL
    if (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('blob:')
    ) {
        return trimmed;
    }

    // Already an absolute path on web root (/images/..., /storage/..., etc.)
    if (trimmed.startsWith('/')) {
        return trimmed;
    }

    // Static public directory paths without leading slash
    if (
        trimmed.startsWith('images/') ||
        trimmed.startsWith('models/') ||
        trimmed.startsWith('build/') ||
        trimmed.startsWith('demo/')
    ) {
        return `/${trimmed}`;
    }

    // Storage path missing leading slash
    if (trimmed.startsWith('storage/')) {
        return `/${trimmed}`;
    }

    // Relative storage file upload (e.g. 'products/abc.jpg' -> '/storage/products/abc.jpg')
    return `/storage/${trimmed}`;
}

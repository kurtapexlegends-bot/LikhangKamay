const WISHLIST_KEY = 'lk_buyer_wishlist_products';
const FOLLOWED_SHOPS_KEY = 'lk_buyer_followed_shops';
const RECENTLY_VIEWED_KEY = 'lk_buyer_recently_viewed_products';
const MAX_RECENTLY_VIEWED = 8;
const MAX_WISHLIST_ITEMS = 40;
const MAX_FOLLOWED_SHOPS = 30;

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readJson = (key, fallback) => {
    if (!canUseStorage()) return fallback;

    try {
        const raw = window.localStorage.getItem(key);

        return raw ? JSON.parse(raw) : fallback;
    } catch (_error) {
        return fallback;
    }
};

const writeJson = (key, value) => {
    if (!canUseStorage()) return;

    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (_error) {
        // Ignore storage write failures and keep the UI functional.
    }
};

const normalizeStoredId = (value) => {
    const id = Number(value);
    return Number.isFinite(id) && id > 0 ? id : null;
};

const sanitizeWishlistProduct = (product) => {
    const id = normalizeStoredId(product?.id);

    if (!id || !product?.slug) {
        return null;
    }

    return {
        id,
        slug: product.slug,
        name: product.name || 'Product',
        image: product.image || product.img || '/images/no-image.png',
        price: Number(product.price || 0),
        sellerName: product.seller?.shop_name || product.seller?.name || product.sellerName || 'Artisan',
        sellerSlug: product.seller?.slug || product.seller_slug || null,
        category: product.category || null,
    };
};

const sanitizeFollowedShop = (shop) => {
    const id = normalizeStoredId(shop?.id);

    if (!id || !(shop?.slug || shop?.shop_slug)) {
        return null;
    }

    return {
        id,
        slug: shop.slug || shop.shop_slug,
        name: shop.name || shop.shop_name || 'Artisan Shop',
        avatar: shop.avatar || null,
        location: shop.location || 'Philippines',
        joinedAt: shop.joined_at || null,
    };
};

const sanitizeRecentlyViewedProduct = (product) => {
    const id = normalizeStoredId(product?.id);

    if (!id || !product?.slug) {
        return null;
    }

    return {
        id,
        slug: product.slug,
        name: product.name || 'Product',
        image: product.image || product.img || '/images/no-image.png',
        price: Number(product.price || 0),
        sellerName: product.seller?.shop_name || product.seller?.name || product.sellerName || 'Artisan',
    };
};

const normalizeWishlistedProducts = (rawEntries) => {
    if (!Array.isArray(rawEntries)) {
        return [];
    }

    return rawEntries
        .map((entry) => {
            if (typeof entry === 'number' || typeof entry === 'string') {
                const id = normalizeStoredId(entry);

                return id ? { id } : null;
            }

            return sanitizeWishlistProduct(entry) || { id: normalizeStoredId(entry?.id) };
        })
        .filter((entry) => normalizeStoredId(entry?.id))
        .reduce((carry, entry) => {
            if (!carry.some((existing) => existing.id === entry.id)) {
                carry.push(entry);
            }

            return carry;
        }, [])
        .slice(0, MAX_WISHLIST_ITEMS);
};

const normalizeFollowedShops = (rawEntries) => {
    if (!Array.isArray(rawEntries)) {
        return [];
    }

    return rawEntries
        .map((entry) => {
            if (typeof entry === 'number' || typeof entry === 'string') {
                const id = normalizeStoredId(entry);

                return id ? { id } : null;
            }

            return sanitizeFollowedShop(entry) || { id: normalizeStoredId(entry?.id) };
        })
        .filter((entry) => normalizeStoredId(entry?.id))
        .reduce((carry, entry) => {
            if (!carry.some((existing) => existing.id === entry.id)) {
                carry.push(entry);
            }

            return carry;
        }, [])
        .slice(0, MAX_FOLLOWED_SHOPS);
};

export const getWishlistedProducts = () =>
    normalizeWishlistedProducts(readJson(WISHLIST_KEY, [])).filter((entry) => entry.slug);

export const getWishlistedProductIds = () =>
    normalizeWishlistedProducts(readJson(WISHLIST_KEY, [])).map((entry) => entry.id);

export const isProductWishlisted = (productId) => getWishlistedProductIds().includes(Number(productId));

export const toggleWishlistedProduct = (product) => {
    const productId = normalizeStoredId(product?.id);

    if (!productId) {
        return false;
    }

    const current = normalizeWishlistedProducts(readJson(WISHLIST_KEY, []));
    const exists = current.some((entry) => entry.id === productId);
    const next = exists
        ? current.filter((entry) => entry.id !== productId)
        : [sanitizeWishlistProduct(product), ...current].filter(Boolean).slice(0, MAX_WISHLIST_ITEMS);

    writeJson(WISHLIST_KEY, next);

    return !exists;
};

export const getFollowedShops = () =>
    normalizeFollowedShops(readJson(FOLLOWED_SHOPS_KEY, [])).filter((entry) => entry.slug);

export const getFollowedShopIds = () =>
    normalizeFollowedShops(readJson(FOLLOWED_SHOPS_KEY, [])).map((entry) => entry.id);

export const isShopFollowed = (shopId) => getFollowedShopIds().includes(Number(shopId));

export const toggleFollowedShop = (shop) => {
    const shopId = normalizeStoredId(shop?.id);

    if (!shopId) {
        return false;
    }

    const current = normalizeFollowedShops(readJson(FOLLOWED_SHOPS_KEY, []));
    const exists = current.some((entry) => entry.id === shopId);
    const next = exists
        ? current.filter((entry) => entry.id !== shopId)
        : [sanitizeFollowedShop(shop), ...current].filter(Boolean).slice(0, MAX_FOLLOWED_SHOPS);

    writeJson(FOLLOWED_SHOPS_KEY, next);

    return !exists;
};

export const getRecentlyViewedProducts = () => readJson(RECENTLY_VIEWED_KEY, []);

export const rememberViewedProduct = (product) => {
    const sanitizedProduct = sanitizeRecentlyViewedProduct(product);

    if (!sanitizedProduct) {
        return;
    }

    const next = [
        sanitizedProduct,
        ...getRecentlyViewedProducts().filter((entry) => Number(entry?.id) !== sanitizedProduct.id),
    ].slice(0, MAX_RECENTLY_VIEWED);

    writeJson(RECENTLY_VIEWED_KEY, next);
};

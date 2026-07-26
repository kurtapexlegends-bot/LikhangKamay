import axios from 'axios';

const WISHLIST_KEY = 'lk_buyer_wishlist_products';
const FOLLOWED_SHOPS_KEY = 'lk_buyer_followed_shops';
const RECENTLY_VIEWED_KEY = 'lk_buyer_recently_viewed_products';
const MAX_RECENTLY_VIEWED = 8;
const MAX_WISHLIST_ITEMS = 40;
const MAX_FOLLOWED_SHOPS = 30;

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readJson = (key, fallback) => {
    if (!canUseStorage() || !key) return fallback;

    try {
        const raw = window.localStorage.getItem(key);

        return raw ? JSON.parse(raw) : fallback;
    } catch (_error) {
        return fallback;
    }
};

const writeJson = (key, value) => {
    if (!canUseStorage() || !key) return;

    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (_error) {
        // Ignore storage write failures and keep the UI functional.
    }
};

const getEffectiveWishlistKey = (userId) => {
    if (!userId) return null;
    const userKey = `${WISHLIST_KEY}_${userId}`;
    if (canUseStorage() && !window.localStorage.getItem(userKey)) {
        const legacy = window.localStorage.getItem(WISHLIST_KEY);
        if (legacy) {
            window.localStorage.setItem(userKey, legacy);
            window.localStorage.removeItem(WISHLIST_KEY);
        }
    }
    return userKey;
};

const getEffectiveFollowedShopsKey = (userId) => {
    if (!userId) return null;
    const userKey = `${FOLLOWED_SHOPS_KEY}_${userId}`;
    if (canUseStorage() && !window.localStorage.getItem(userKey)) {
        const legacy = window.localStorage.getItem(FOLLOWED_SHOPS_KEY);
        if (legacy) {
            window.localStorage.setItem(userKey, legacy);
            window.localStorage.removeItem(FOLLOWED_SHOPS_KEY);
        }
    }
    return userKey;
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

export const syncSignalsWithServer = async (userId) => {
    if (!userId || !canUseStorage()) return;

    const legacyWishlist = readJson(WISHLIST_KEY, []);
    const legacyFollowed = readJson(FOLLOWED_SHOPS_KEY, []);

    const productIds = legacyWishlist.map((item) => Number(item?.id || item)).filter(Boolean);
    const shopIds = legacyFollowed.map((item) => Number(item?.id || item)).filter(Boolean);

    try {
        if (productIds.length > 0 || shopIds.length > 0) {
            const response = await axios.post(route('buyer.signals.sync'), {
                product_ids: productIds,
                shop_ids: shopIds,
            });

            if (response.data?.success) {
                writeJson(WISHLIST_KEY, []);
                writeJson(FOLLOWED_SHOPS_KEY, []);
                if (response.data.wishlist) {
                    writeJson(`${WISHLIST_KEY}_${userId}`, response.data.wishlist);
                }
                if (response.data.followedShops) {
                    writeJson(`${FOLLOWED_SHOPS_KEY}_${userId}`, response.data.followedShops);
                }
                window.dispatchEvent(new Event('storage'));
            }
        } else {
            const response = await axios.get(route('buyer.signals.index'));
            if (response.data) {
                if (response.data.wishlist) {
                    writeJson(`${WISHLIST_KEY}_${userId}`, response.data.wishlist);
                }
                if (response.data.followedShops) {
                    writeJson(`${FOLLOWED_SHOPS_KEY}_${userId}`, response.data.followedShops);
                }
                window.dispatchEvent(new Event('storage'));
            }
        }
    } catch (_error) {
        // Fallback to local storage if offline
    }
};

export const getWishlistedProducts = (userId) => {
    const key = getEffectiveWishlistKey(userId);
    return normalizeWishlistedProducts(readJson(key, [])).filter((entry) => entry.slug);
};

export const getWishlistedProductIds = (userId) => {
    const key = getEffectiveWishlistKey(userId);
    return normalizeWishlistedProducts(readJson(key, [])).map((entry) => entry.id);
};

export const isProductWishlisted = (productId, userId) => {
    if (!userId) return false;
    return getWishlistedProductIds(userId).includes(Number(productId));
};

export const toggleWishlistedProduct = (product, userId) => {
    const productId = normalizeStoredId(product?.id);
    if (!productId || !userId) {
        return false;
    }

    const key = getEffectiveWishlistKey(userId);
    if (!key) return false;

    const current = normalizeWishlistedProducts(readJson(key, []));
    const exists = current.some((entry) => entry.id === productId);
    const next = exists
        ? current.filter((entry) => entry.id !== productId)
        : [sanitizeWishlistProduct(product), ...current].filter(Boolean).slice(0, MAX_WISHLIST_ITEMS);

    writeJson(key, next);
    window.dispatchEvent(new Event('storage'));

    axios.post(route('buyer.wishlist.toggle'), { product_id: productId }).catch(() => {});

    return !exists;
};

export const getFollowedShops = (userId) => {
    const key = getEffectiveFollowedShopsKey(userId);
    return normalizeFollowedShops(readJson(key, [])).filter((entry) => entry.slug);
};

export const getFollowedShopIds = (userId) => {
    const key = getEffectiveFollowedShopsKey(userId);
    return normalizeFollowedShops(readJson(key, [])).map((entry) => entry.id);
};

export const isShopFollowed = (shopId, userId) => {
    if (!userId) return false;
    return getFollowedShopIds(userId).includes(Number(shopId));
};

export const toggleFollowedShop = (shop, userId) => {
    const shopId = normalizeStoredId(shop?.id);
    if (!shopId || !userId) {
        return false;
    }

    const key = getEffectiveFollowedShopsKey(userId);
    if (!key) return false;

    const current = normalizeFollowedShops(readJson(key, []));
    const exists = current.some((entry) => entry.id === shopId);
    const next = exists
        ? current.filter((entry) => entry.id !== shopId)
        : [sanitizeFollowedShop(shop), ...current].filter(Boolean).slice(0, MAX_FOLLOWED_SHOPS);

    writeJson(key, next);
    window.dispatchEvent(new Event('storage'));

    axios.post(route('buyer.shops.toggle-follow'), { shop_id: shopId }).catch(() => {});

    return !exists;
};

export const getRecentlyViewedProducts = () => readJson(RECENTLY_VIEWED_KEY, []);

export const clearRecentlyViewedProducts = () => {
    writeJson(RECENTLY_VIEWED_KEY, []);
    window.dispatchEvent(new Event('storage'));
};

export const clearWishlistedProducts = (userId) => {
    const key = getEffectiveWishlistKey(userId);
    if (key) writeJson(key, []);
    window.dispatchEvent(new Event('storage'));

    if (userId) {
        axios.delete(route('buyer.wishlist.clear')).catch(() => {});
    }
};

export const clearFollowedShops = (userId) => {
    const key = getEffectiveFollowedShopsKey(userId);
    if (key) writeJson(key, []);
    window.dispatchEvent(new Event('storage'));

    if (userId) {
        axios.delete(route('buyer.shops.clear-followed')).catch(() => {});
    }
};

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

export const pruneInactiveProducts = (activeIds, userId) => {
    if (!canUseStorage() || !Array.isArray(activeIds) || !userId) return;

    const numericActiveIds = activeIds.map(Number);
    const key = getEffectiveWishlistKey(userId);

    // Prune Wishlist
    const wishlist = getWishlistedProducts(userId);
    const cleanWishlist = wishlist.filter((entry) => numericActiveIds.includes(Number(entry?.id)));
    if (cleanWishlist.length !== wishlist.length && key) {
        writeJson(key, cleanWishlist);
    }

    // Prune Recently Viewed
    const recentlyViewed = getRecentlyViewedProducts();
    const cleanRecentlyViewed = recentlyViewed.filter((entry) => numericActiveIds.includes(Number(entry?.id)));
    if (cleanRecentlyViewed.length !== recentlyViewed.length) {
        writeJson(RECENTLY_VIEWED_KEY, cleanRecentlyViewed);
    }

    window.dispatchEvent(new Event('storage'));
};

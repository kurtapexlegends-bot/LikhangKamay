/* global route */
import { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';

const STORAGE_KEY = 'lk_cart_backup';
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function useCartPersistence(cartItems = []) {
    const [savedBackup, setSavedBackup] = useState(() => {
        if (typeof window === 'undefined') return null;
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;

            const parsed = JSON.parse(raw);
            if (
                parsed &&
                Array.isArray(parsed.items) &&
                parsed.items.length > 0 &&
                Date.now() - (parsed.savedAt || 0) < EXPIRY_MS
            ) {
                return parsed;
            }
            window.localStorage.removeItem(STORAGE_KEY);
            return null;
        } catch {
            return null;
        }
    });
    const [isRestoring, setIsRestoring] = useState(false);

    // Synchronize current cart items to localStorage whenever cart has items
    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (cartItems.length > 0) {
            try {
                const payload = {
                    savedAt: Date.now(),
                    items: cartItems.map((item) => ({
                        id: item.id,
                        qty: item.qty || 1,
                        variant: item.variant || 'Standard',
                        name: item.name || 'Craft Product',
                        price: item.price || 0,
                        img: item.img || null,
                        shop_name: item.shop_name || item.seller || 'Artisan Studio',
                    })),
                };
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
            } catch {
                // Ignore localStorage quota errors silently
            }
        }
    }, [cartItems]);

    const visibleBackup = cartItems.length === 0 ? savedBackup : null;

    const restoreCart = useCallback(() => {
        if (!savedBackup || !savedBackup.items || isRestoring) return;

        setIsRestoring(true);
        router.post(
            route('cart.restore'),
            {
                items: savedBackup.items.map((item) => ({
                    id: item.id,
                    qty: item.qty,
                    variant: item.variant,
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSavedBackup(null);
                },
                onFinish: () => {
                    setIsRestoring(false);
                },
            }
        );
    }, [savedBackup, isRestoring]);

    const dismissBackup = useCallback(() => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch {
            // ignore
        }
        setSavedBackup(null);
    }, []);

    return {
        savedBackup: visibleBackup,
        isRestoring,
        restoreCart,
        dismissBackup,
    };
}

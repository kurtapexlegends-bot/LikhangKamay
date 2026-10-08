import { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';

export default function useCheckoutCart(incomingItems = [], addToast) {
    const [checkoutItems, setCheckoutItems] = useState(incomingItems);
    const [updatingItemId, setUpdatingItemId] = useState(null);
    const [removingItemId, setRemovingItemId] = useState(null);
    const qtyTimersRef = useRef({});
    const previousQtyRef = useRef({});

    useEffect(() => {
        return () => {
            Object.values(qtyTimersRef.current).forEach(clearTimeout);
        };
    }, []);

    useEffect(() => {
        setCheckoutItems(incomingItems);
    }, [incomingItems]);

    const handleUpdateQty = (item, change) => {
        const minQty = item.is_b2b_supply ? (item.moq || 1) : 1;
        const newQty = item.qty + change;
        const itemKey = item.cart_key || item.id;

        if (newQty < minQty) {
            handleRemoveItem(item);
            return;
        }

        if (previousQtyRef.current[itemKey] === undefined) {
            previousQtyRef.current[itemKey] = item.qty;
        }

        setCheckoutItems((prev) =>
            prev.map((it) => {
                if ((it.cart_key || it.id) === itemKey) {
                    return { ...it, qty: newQty };
                }
                return it;
            })
        );

        if (qtyTimersRef.current[itemKey]) {
            clearTimeout(qtyTimersRef.current[itemKey]);
        }

        qtyTimersRef.current[itemKey] = setTimeout(async () => {
            try {
                const response = await window.axios.patch(route('cart.update'), {
                    id: itemKey,
                    qty: newQty,
                });

                delete previousQtyRef.current[itemKey];

                if (response.data?.cart?.[itemKey]) {
                    const serverItem = response.data.cart[itemKey];
                    if (serverItem.price !== undefined) {
                        setCheckoutItems((prev) =>
                            prev.map((it) => {
                                if ((it.cart_key || it.id) === itemKey) {
                                    return { ...it, price: Number(serverItem.price) };
                                }
                                return it;
                            })
                        );
                    }
                }

                if (typeof response.data?.cart_count === 'number') {
                    localStorage.setItem('lk_cart_count', response.data.cart_count);
                }
            } catch (error) {
                const revertQty = previousQtyRef.current[itemKey] ?? item.qty;
                delete previousQtyRef.current[itemKey];

                setCheckoutItems((prev) =>
                    prev.map((it) => {
                        if ((it.cart_key || it.id) === itemKey) {
                            return { ...it, qty: revertQty };
                        }
                        return it;
                    })
                );

                const errorMsg = error.response?.data?.message || 'Could not update item quantity.';
                if (addToast) addToast(errorMsg, 'error');
            } finally {
                delete qtyTimersRef.current[itemKey];
            }
        }, 350);
    };

    const handleRemoveItem = async (item) => {
        const itemKey = item.cart_key || item.id;

        if (qtyTimersRef.current[itemKey]) {
            clearTimeout(qtyTimersRef.current[itemKey]);
            delete qtyTimersRef.current[itemKey];
        }
        delete previousQtyRef.current[itemKey];

        const nextItems = checkoutItems.filter((it) => (it.cart_key || it.id) !== itemKey);
        setCheckoutItems(nextItems);

        if (nextItems.length === 0) {
            router.delete(route('cart.destroy'), {
                data: { id: itemKey },
                preserveScroll: false,
                onSuccess: () => {
                    window.location.href = route('cart.index');
                },
            });
            return;
        }

        setRemovingItemId(itemKey);
        try {
            const response = await window.axios.delete(route('cart.destroy'), {
                data: { id: itemKey },
            });
            if (typeof response.data?.cart_count === 'number') {
                localStorage.setItem('lk_cart_count', response.data.cart_count);
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Failed to remove item from cart.';
            if (addToast) addToast(errorMsg, 'error');
        } finally {
            setRemovingItemId(null);
        }
    };

    const clearPendingTimers = () => {
        Object.values(qtyTimersRef.current).forEach(clearTimeout);
        qtyTimersRef.current = {};
    };

    return {
        checkoutItems,
        setCheckoutItems,
        updatingItemId,
        removingItemId,
        handleUpdateQty,
        handleRemoveItem,
        clearPendingTimers,
    };
}

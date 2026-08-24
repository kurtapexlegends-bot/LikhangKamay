import React, { useState, useEffect } from 'react';
import { router, Link } from '@inertiajs/react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import { 
    ShoppingCart, Trash2, Plus, Minus, ArrowRight, 
    Store, ShieldCheck, MapPin, Truck, Car, Bike, AlertCircle, Package, ArrowUpRight 
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ProcurementCartDrawer({
    show = false,
    onClose,
    initialCart = {},
}) {
    const { addToast } = useToast();
    const [cartItems, setCartItems] = useState(Object.values(initialCart || {}));
    const [loading, setLoading] = useState(false);
    const [updatingKey, setUpdatingKey] = useState(null);

    useEffect(() => {
        if (initialCart) {
            setCartItems(Object.values(initialCart));
        }
    }, [initialCart]);

    const fetchCart = async () => {
        setLoading(true);
        try {
            const res = await window.axios.get(route('cart.index'), {
                headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
            });
            if (res.data && res.data.cart) {
                setCartItems(Object.values(res.data.cart));
            }
        } catch {
            // Fallback
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (show) {
            fetchCart();
        }
    }, [show]);

    const handleUpdateQty = async (item, newQty) => {
        const key = item.cart_key || String(item.id);
        const min = item.moq || 1;
        const clamped = Math.max(min, newQty);
        setUpdatingKey(key);

        try {
            await window.axios.patch(route('cart.update'), {
                id: item.id,
                cart_key: key,
                quantity: clamped,
            });
            setCartItems(prev => prev.map(it => (it.cart_key === key || it.id === item.id) ? { ...it, qty: clamped } : it));
            window.dispatchEvent(new Event('cart-updated'));
        } catch {
            addToast({ type: 'error', message: 'Failed to update item quantity.' });
        } finally {
            setUpdatingKey(null);
        }
    };

    const handleRemove = async (item) => {
        const key = item.cart_key || String(item.id);
        setUpdatingKey(key);

        try {
            await window.axios.delete(route('cart.destroy'), {
                data: { id: item.id, cart_key: key }
            });
            setCartItems(prev => prev.filter(it => (it.cart_key !== key && it.id !== item.id)));
            window.dispatchEvent(new Event('cart-updated'));
            addToast({ type: 'success', message: `Removed "${item.name}" from cart.` });
        } catch {
            addToast({ type: 'error', message: 'Failed to remove item.' });
        } finally {
            setUpdatingKey(null);
        }
    };

    // Calculate totals
    const totalAmount = cartItems.reduce((sum, it) => {
        const unitPrice = (it.wholesale_price && it.wholesale_min_qty && it.qty >= it.wholesale_min_qty)
            ? it.wholesale_price
            : (it.effective_price || it.price);
        return sum + (unitPrice * it.qty);
    }, 0);

    const totalWeight = cartItems.reduce((sum, it) => {
        const unitW = Number(it.weight || 1.0);
        return sum + (it.qty * unitW * 1.10);
    }, 0);

    const roundedWeight = Math.round(totalWeight * 10) / 10;

    const vehicleLabel = roundedWeight > 300
        ? 'Large Van 1000kg'
        : roundedWeight > 200
            ? 'MPV 300kg'
            : roundedWeight > 20
                ? '4-Wheel Sedan'
                : 'Motorcycle';

    // Group items by supplier
    const groupedBySupplier = cartItems.reduce((acc, it) => {
        const supplier = it.shop_name || it.seller || 'Artisan Supplier';
        if (!acc[supplier]) acc[supplier] = [];
        acc[supplier].push(it);
        return acc;
    }, {});

    return (
        <SlideOverDrawer
            show={show}
            onClose={onClose}
            title="Procurement Cart (B2B Sourcing)"
            position="right"
            widthClass="max-w-lg"
            footer={
                cartItems.length > 0 ? (
                    <div className="space-y-3">
                        {/* Summary Block */}
                        <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between text-stone-500">
                                <span>Estimated Total Weight:</span>
                                <span className="font-bold text-stone-800 flex items-center gap-1">
                                    <Truck size={13} className="text-clay-600" />
                                    {roundedWeight} kg ({vehicleLabel})
                                </span>
                            </div>
                            <div className="flex justify-between items-baseline pt-1 border-t border-stone-200">
                                <span className="font-bold text-stone-900 text-sm">Merchandise Total:</span>
                                <span className="font-black text-clay-700 text-base">{formatCurrency(totalAmount)}</span>
                            </div>
                        </div>

                        {/* Checkout CTA */}
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                router.visit(route('checkout.create'));
                            }}
                            className="w-full rounded-xl bg-clay-600 py-3 text-xs font-bold text-white shadow-md hover:bg-clay-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <span>Proceed to Sourcing Checkout</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                ) : null
            }
        >
            <div className="space-y-5 text-xs">
                {cartItems.length === 0 ? (
                    <div className="py-16 text-center space-y-3">
                        <Package size={36} className="mx-auto text-stone-300" />
                        <h4 className="font-bold text-stone-800 text-sm">Your Procurement Cart is Empty</h4>
                        <p className="text-xs text-stone-500 max-w-xs mx-auto">
                            Browse peer artisan supplies and add raw materials, timber, or clay sacks to your cart.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {Object.entries(groupedBySupplier).map(([supplier, items]) => (
                            <div key={supplier} className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-2xs">
                                {/* Supplier Header */}
                                <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-150 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 font-bold text-stone-900">
                                        <Store size={13} className="text-clay-600" />
                                        <span>{supplier}</span>
                                    </div>
                                    <span className="text-[10px] text-stone-400 font-mono">
                                        {items.length} {items.length === 1 ? 'item' : 'items'}
                                    </span>
                                </div>

                                {/* Items list */}
                                <div className="divide-y divide-stone-150 p-3 space-y-3">
                                    {items.map((it) => {
                                        const key = it.cart_key || String(it.id);
                                        const hasDiscount = it.wholesale_price && it.wholesale_min_qty && it.qty >= it.wholesale_min_qty;
                                        const unitPrice = hasDiscount ? it.wholesale_price : (it.effective_price || it.price);
                                        const itemSubtotal = unitPrice * it.qty;

                                        return (
                                            <div key={key} className="flex gap-3 pt-3 first:pt-0">
                                                {/* Photo */}
                                                <div className="h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-stone-100 border border-stone-200">
                                                    <img
                                                        src={it.image || it.img || it.cover_photo_path || '/images/placeholder.svg'}
                                                        alt={it.name}
                                                        className="h-full w-full object-cover"
                                                        onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                                                    />
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h5 className="font-bold text-stone-900 text-xs line-clamp-1">{it.name}</h5>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemove(it)}
                                                            disabled={updatingKey === key}
                                                            className="text-stone-400 hover:text-red-600 transition-colors p-0.5"
                                                            title="Remove item"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-baseline gap-2">
                                                        <span className="font-extrabold text-stone-900">
                                                            {formatCurrency(unitPrice)}
                                                        </span>
                                                        {hasDiscount && (
                                                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                                                                Wholesale tier applied
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Stepper */}
                                                    <div className="flex items-center justify-between pt-1">
                                                        <div className="flex items-center rounded-lg border border-stone-200 bg-stone-50">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUpdateQty(it, it.qty - 1)}
                                                                disabled={updatingKey === key || it.qty <= (it.moq || 1)}
                                                                className="px-2 py-1 text-stone-600 hover:bg-stone-100 disabled:opacity-30"
                                                            >
                                                                <Minus size={11} />
                                                            </button>
                                                            <span className="px-2 text-xs font-bold text-stone-900 w-6 text-center">{it.qty}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUpdateQty(it, it.qty + 1)}
                                                                disabled={updatingKey === key}
                                                                className="px-2 py-1 text-stone-600 hover:bg-stone-100 disabled:opacity-30"
                                                            >
                                                                <Plus size={11} />
                                                            </button>
                                                        </div>

                                                        <span className="font-bold text-clay-700 text-xs">
                                                            {formatCurrency(itemSubtotal)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </SlideOverDrawer>
    );
}

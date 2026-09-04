import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import CartSupplierGroup from '@/Components/Seller/SupplyHub/CartSupplierGroup';
import CartOrderSummary from '@/Components/Seller/SupplyHub/CartOrderSummary';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { ShoppingCart, Store, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Cart({
    cart: initialCart = {},
    pricing = {},
}) {
    const { addToast } = useToast() || { addToast: () => {} };
    const { openSidebar } = useSellerWorkspaceShell();
    const [cart, setCart] = useState(initialCart);
    const [selectedItems, setSelectedItems] = useState(() => {
        // By default select all items in cart
        const initialSelected = {};
        Object.entries(initialCart).forEach(([key, it]) => {
            initialSelected[key] = true;
        });
        return initialSelected;
    });
    const [isProcessing, setIsProcessing] = useState(false);

    // Group cart items by supplier
    const supplierGroups = useMemo(() => {
        const groups = {};
        Object.entries(cart).forEach(([cartKey, item]) => {
            const sellerId = item.seller_id || item.artisan_id || 'unknown';
            if (!groups[sellerId]) {
                groups[sellerId] = {
                    sellerId,
                    sellerName: item.seller_name || item.shop_name || 'Artisan Workshop',
                    city: item.seller_city || item.city || '',
                    items: [],
                };
            }
            groups[sellerId].items.push({
                ...item,
                cartKey,
            });
        });
        return groups;
    }, [cart]);

    const totalItemsInCart = Object.keys(cart).length;

    // Vehicle sizing helper
    const vehicleResolver = (weightKg) => {
        if (weightKg <= 20.0) {
            return { service_type: 'MOTORCYCLE', label: 'Motorcycle', reason: `Standard courier (${roundNumber(weightKg, 1)} kg tare).` };
        }
        if (weightKg <= 200.0) {
            return { service_type: 'SEDAN', label: '4-Wheel Sedan', reason: `Upgraded to Sedan: ${roundNumber(weightKg, 1)} kg exceeds 20 kg motorcycle capacity.` };
        }
        if (weightKg <= 300.0) {
            return { service_type: 'MPV_300', label: 'MPV (300 kg)', reason: `Upgraded to MPV: ${roundNumber(weightKg, 1)} kg total package weight.` };
        }
        return { service_type: 'VAN_1000', label: 'Van / Light Truck', reason: `Upgraded to 1,000 kg Light Cargo Van for bulk artisan materials.` };
    };

    // Calculate selected totals
    const { selectedCount, selectedTotalAmount, totalWeightKg, hasMoqViolations, highestWeight } = useMemo(() => {
        let count = 0;
        let totalAmt = 0;
        let totalWt = 0;
        let moqViolated = false;
        let maxGroupWt = 0;

        Object.values(supplierGroups).forEach(group => {
            let groupWt = 0;
            group.items.forEach(item => {
                if (selectedItems[item.cartKey]) {
                    count++;
                    const qty = Math.max(1, Number(item.qty) || 1);
                    const moq = Math.max(1, Number(item.moq) || 1);
                    if (qty < moq) {
                        moqViolated = true;
                    }

                    const basePrice = Number(item.price) || 0;
                    const wholesalePrice = item.wholesale_price ? Number(item.wholesale_price) : null;
                    const wholesaleMinQty = item.wholesale_min_qty ? Number(item.wholesale_min_qty) : null;
                    const unitPrice = (wholesalePrice && wholesaleMinQty && qty >= wholesaleMinQty) ? wholesalePrice : basePrice;

                    totalAmt += (unitPrice * qty);
                    const itemTareWeight = ((Number(item.weight) || 1.0) * qty * 1.10);
                    totalWt += itemTareWeight;
                    groupWt += itemTareWeight;
                }
            });
            if (groupWt > maxGroupWt) {
                maxGroupWt = groupWt;
            }
        });

        return {
            selectedCount: count,
            selectedTotalAmount: totalAmt,
            totalWeightKg: totalWt,
            hasMoqViolations: moqViolated,
            highestWeight: maxGroupWt,
        };
    }, [supplierGroups, selectedItems]);

    const highestVehicle = highestWeight > 0 ? vehicleResolver(highestWeight) : null;

    const handleToggleItem = (cartKey) => {
        setSelectedItems(prev => ({
            ...prev,
            [cartKey]: !prev[cartKey],
        }));
    };

    const handleToggleSupplier = (sellerId) => {
        const group = supplierGroups[sellerId];
        if (!group) return;

        const isAllSelected = group.items.every(item => !!selectedItems[item.cartKey]);
        setSelectedItems(prev => {
            const next = { ...prev };
            group.items.forEach(item => {
                next[item.cartKey] = !isAllSelected;
            });
            return next;
        });
    };

    const handleSelectAll = () => {
        const isAll = Object.keys(cart).length > 0 && Object.keys(cart).every(k => !!selectedItems[k]);
        const next = {};
        Object.keys(cart).forEach(k => {
            next[k] = !isAll;
        });
        setSelectedItems(next);
    };

    const handleUpdateQuantity = (cartKey, newQty) => {
        const item = cart[cartKey];
        if (!item) return;

        const updateEndpoint = typeof route === 'function' && route().has('cart.update') ? route('cart.update') : '/cart/update';

        window.axios.patch(updateEndpoint, {
            id: cartKey,
            cart_key: cartKey,
            qty: newQty,
            quantity: newQty,
        })
        .then(res => {
            if (res.data?.success && res.data.cart) {
                setCart(res.data.cart);
            } else {
                router.reload({ only: ['cart'] });
            }
        })
        .catch(err => {
            addToast(err.response?.data?.message || 'Failed to update quantity', 'error');
        });
    };

    const handleRemoveItem = (cartKey) => {
        const removeEndpoint = typeof route === 'function' && route().has('cart.destroy') ? route('cart.destroy') : '/cart/remove';

        window.axios.delete(removeEndpoint, {
            data: { id: cartKey, cart_key: cartKey }
        })
        .then(res => {
            if (res.data?.success && res.data.cart) {
                setCart(res.data.cart);
                setSelectedItems(prev => {
                    const copy = { ...prev };
                    delete copy[cartKey];
                    return copy;
                });
                addToast('Removed material from cart', 'success');
            } else {
                router.reload({ only: ['cart'] });
            }
        })
        .catch(err => {
            addToast(err.response?.data?.message || 'Failed to remove material', 'error');
        });
    };

    const handleClearCart = () => {
        const clearEndpoint = typeof route === 'function' && route().has('cart.clear') ? route('cart.clear') : '/cart/clear';

        window.axios.post(clearEndpoint)
        .then(res => {
            setCart({});
            setSelectedItems({});
            addToast('Cart cleared', 'success');
        })
        .catch(() => addToast('Failed to clear cart', 'error'));
    };

    const handleProceedToCheckout = () => {
        if (selectedCount === 0) {
            addToast('Please select at least one material to proceed.', 'error');
            return;
        }

        const selectedKeys = Object.keys(selectedItems).filter(k => !!selectedItems[k]);
        router.get(route('seller.supply-hub.checkout'), {
            selected_items: selectedKeys.join(','),
        });
    };

    const isAllGloballySelected = totalItemsInCart > 0 && Object.keys(cart).every(k => !!selectedItems[k]);

    return (
        <>
            <Head title="View Cart | LikhangKamay" />

            <SellerHeader
                title="View Cart"
                subtitle="Review material quantities, wholesale volume rates, and delivery details before ordering."
                onMenuClick={openSidebar}
                badge={{ label: 'Wholesale Supplies', iconColor: 'text-clay-500' }}
            />

            <div className="p-3 sm:p-6 lg:p-8 space-y-3 sm:space-y-4 lg:space-y-6 pb-24 lg:pb-16">
                {/* Top Action Bar */}
                <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5">
                    <Link
                        href={route('seller.supply-hub.index')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition shadow-2xs"
                    >
                        <ArrowLeft size={13} />
                        <span>Continue Browsing</span>
                    </Link>
                </div>

                {totalItemsInCart > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
                        {/* Cart Items List */}
                        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                            {/* Global Select All Bar */}
                            <div className="flex items-center justify-between p-2.5 sm:p-3.5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
                                <label className="flex items-center gap-2.5 text-xs font-bold text-stone-800 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isAllGloballySelected}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 rounded border-stone-300 text-clay-600 focus:ring-clay-500 cursor-pointer"
                                    />
                                    <span>Select All ({totalItemsInCart})</span>
                                </label>

                                <button
                                    type="button"
                                    onClick={handleClearCart}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-400 hover:text-rose-600 transition cursor-pointer"
                                >
                                    <Trash2 size={12} />
                                    <span>Clear Cart</span>
                                </button>
                            </div>

                            {/* Supplier Groups */}
                            {Object.entries(supplierGroups).map(([sellerId, group]) => (
                                <CartSupplierGroup
                                    key={sellerId}
                                    sellerId={sellerId}
                                    group={group}
                                    selectedItems={selectedItems}
                                    onToggleItem={handleToggleItem}
                                    onToggleSupplier={handleToggleSupplier}
                                    onUpdateQuantity={handleUpdateQuantity}
                                    onRemoveItem={handleRemoveItem}
                                    vehicleResolver={vehicleResolver}
                                />
                            ))}
                        </div>

                        {/* Order Summary Sidebar (Desktop Only) */}
                        <div className="hidden lg:block lg:col-span-1">
                            <CartOrderSummary
                                selectedCount={selectedCount}
                                selectedTotalAmount={selectedTotalAmount}
                                totalWeightKg={totalWeightKg}
                                highestVehicle={highestVehicle}
                                onProceedToCheckout={handleProceedToCheckout}
                                isProcessing={isProcessing}
                                hasMoqViolations={hasMoqViolations}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-2xs">
                        <WorkspaceEmptyState
                            icon={ShoppingCart}
                            title="Your cart is empty"
                            description="Browse the Supply Hub to find pottery clay, timber, glazes, and raw materials directly from verified workshops."
                            actionLabel="Browse Supplies"
                            onAction={() => router.visit(route('seller.supply-hub.index'))}
                        />
                    </div>
                )}

                {/* Mobile Sticky Checkout Bar */}
                {totalItemsInCart > 0 && (
                    <div className="block lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t border-stone-200/90 p-3 shadow-lg">
                        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
                            <div className="space-y-0.5">
                                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">
                                    {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
                                </span>
                                <span className="text-base font-black text-clay-700 block leading-none">
                                    {formatCurrency(selectedTotalAmount)}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={handleProceedToCheckout}
                                disabled={selectedCount === 0 || hasMoqViolations || isProcessing}
                                className="flex-1 max-w-[200px] flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-clay-600 hover:bg-clay-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-clay-200 transition-all active:scale-95 cursor-pointer"
                            >
                                <span>Proceed to Checkout</span>
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

Cart.layout = (page) => <SellerWorkspaceLayout active="supply-hub">{page}</SellerWorkspaceLayout>;

function roundNumber(num, dec) {
    return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
}

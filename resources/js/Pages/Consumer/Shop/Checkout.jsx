import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, Info, ShieldCheck, Store, Truck, ChevronUp, Check, MapPin, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import { formatStructuredAddress } from '@/lib/addressFormatting';
import StickyActionBar from '@/Components/StickyActionBar';
import SlideOverDrawer from '@/Components/SlideOverDrawer';

// Extracted Subcomponents
import ShippingMethodSelector from '@/Components/Consumer/Shop/Checkout/ShippingMethodSelector';
import ShippingAddressSelector from '@/Components/Consumer/Shop/Checkout/ShippingAddressSelector/ShippingAddressSelector';
import PaymentMethodSelector from '@/Components/Consumer/Shop/Checkout/PaymentMethodSelector';
import OrderPricingSummary from '@/Components/Consumer/Shop/Checkout/OrderPricingSummary';
import StorePickupScheduler from '@/Components/Consumer/Shop/Checkout/StorePickupScheduler';

const TYPES = [{ value: 'home', label: 'Home' }, { value: 'office', label: 'Office' }, { value: 'other', label: 'Other' }];
const peso = (value) => `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const typeLabel = (value) => TYPES.find((type) => type.value === value)?.label || 'Other';
const resolveAddressDisplay = (address) => address?.full_address || formatStructuredAddress({
    street_address: address?.street_address,
    barangay: address?.barangay,
    city: address?.city,
    region: address?.region,
    postal_code: address?.postal_code,
});

export default function Checkout({ auth, pricing }) {
    const { flash, items: incomingItems = [], pickupConfigs = {} } = usePage().props;
    const { addToast } = useToast();
    const isArtisan = auth?.user?.role === 'artisan';
    const isPendingArtisan = auth?.user?.role === 'artisan' && auth?.user?.artisan_status === 'pending';
    const isAdmin = auth?.user?.role === 'super_admin' || auth?.user?.role === 'admin';

    const convenienceFeeRate = pricing?.convenience_fee_rate ?? 0.03;
    const defaultAddress = auth?.user?.addresses?.find((address) => address.is_default) || null;
    const [quoteRetryNonce, setQuoteRetryNonce] = useState(0);
    const [showMobileSummary, setShowMobileSummary] = useState(false);
    const [showNotes, setShowNotes] = useState(false);

    // Dynamic items state allowing + / - quantity and remove from checkout
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

    const [shippingQuote, setShippingQuote] = useState({
        status: 'idle',
        totalShippingFee: 0,
        groups: {},
    });
    const quoteRequestRef = useRef(0);
    useFlashToast(flash, addToast);

    const grouped = useMemo(() => checkoutItems.reduce((groups, item) => {
        const sellerId = item.artisan_id || 'unknown';
        if (!groups[sellerId]) {
            groups[sellerId] = {
                sellerId,
                shopName: item.shop_name || item.seller || 'Shop',
                location: item.seller_city || item.location || '',
                items: [],
                subtotal: 0,
            };
        }
        groups[sellerId].items.push(item);
        groups[sellerId].subtotal += item.price * item.qty;
        return groups;
    }, {}), [checkoutItems]);

    const sellerGroups = Object.values(grouped);
    const totalSellers = sellerGroups.length;

    const primarySellerId = sellerGroups[0]?.sellerId;
    const primaryPickupConfig = pickupConfigs?.[String(primarySellerId)] || Object.values(pickupConfigs || {})[0] || null;

    // Multi-workshop pickup active tab
    const [activeWorkshopSellerId, setActiveWorkshopSellerId] = useState(primarySellerId);

    useEffect(() => {
        if (!sellerGroups.some((g) => String(g.sellerId) === String(activeWorkshopSellerId))) {
            setActiveWorkshopSellerId(primarySellerId);
        }
    }, [sellerGroups, activeWorkshopSellerId, primarySellerId]);

    // Initialize pickupSchedules for all sellers
    const [pickupSchedules, setPickupSchedules] = useState(() => {
        const initial = {};
        sellerGroups.forEach((group) => {
            const config = pickupConfigs?.[String(group.sellerId)];
            if (config && config.pickup_enabled !== false) {
                const firstSelectable = config.days?.find((d) => d.is_selectable);
                const firstSlot = firstSelectable?.slots?.find((s) => s.is_available);
                initial[String(group.sellerId)] = {
                    date: firstSelectable?.date || '',
                    formattedDate: firstSelectable?.formatted || '',
                    time_slot: firstSlot?.label || '09:00 AM - 12:00 PM',
                };
            }
        });
        return initial;
    });

    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
        items: checkoutItems,
        selected_address_id: defaultAddress?.id || 'new',
        address_label: defaultAddress?.label || typeLabel(defaultAddress?.address_type || 'home'),
        shipping_address: resolveAddressDisplay(defaultAddress) || auth.user.saved_address || auth.user.street_address || '',
        shipping_address_type: defaultAddress?.address_type || 'home',
        shipping_street_address: defaultAddress?.street_address || auth.user.street_address || '',
        shipping_barangay: defaultAddress?.barangay || auth.user.barangay || '',
        shipping_city: defaultAddress?.city || auth.user.city || '',
        shipping_region: defaultAddress?.region || auth.user.region || '',
        shipping_postal_code: defaultAddress?.postal_code || auth.user.zip_code || '',
        recipient_name: defaultAddress?.recipient_name || auth.user.name || '',
        phone_number: defaultAddress?.phone_number || auth.user.phone_number || '',
        shipping_notes: '',
        payment_method: 'COD',
        shipping_method: 'Delivery',
        pickup_schedules: pickupSchedules,
        pickup_date: pickupSchedules[String(primarySellerId)]?.date || '',
        pickup_time_slot: pickupSchedules[String(primarySellerId)]?.time_slot || '',
        save_address: false,
        total: 0,
    });

    // Synchronize data.items with checkoutItems
    useEffect(() => {
        setData('items', checkoutItems);
    }, [checkoutItems, setData]);

    // Synchronize pickup_schedules with data form
    useEffect(() => {
        setData((current) => ({
            ...current,
            pickup_schedules: pickupSchedules,
            pickup_date: pickupSchedules[String(primarySellerId)]?.date || current.pickup_date,
            pickup_time_slot: pickupSchedules[String(primarySellerId)]?.time_slot || current.pickup_time_slot,
        }));
    }, [pickupSchedules, primarySellerId, setData]);

    const structuredShippingPreview = useMemo(() => formatStructuredAddress({
        street_address: data.shipping_street_address,
        barangay: data.shipping_barangay,
        city: data.shipping_city,
        region: data.shipping_region,
        postal_code: data.shipping_postal_code,
    }), [
        data.shipping_barangay,
        data.shipping_city,
        data.shipping_postal_code,
        data.shipping_region,
        data.shipping_street_address,
    ]);

    const isNewAddress = data.selected_address_id === 'new' || !auth.user.addresses?.length;
    const activeShippingAddress = isNewAddress ? structuredShippingPreview : data.shipping_address;

    useEffect(() => {
        if (data.shipping_method !== 'Delivery') {
            setShippingQuote({
                status: 'ready',
                totalShippingFee: 0,
                groups: {},
            });
            return undefined;
        }

        if (!activeShippingAddress.trim() || checkoutItems.length === 0) {
            setShippingQuote({
                status: 'idle',
                totalShippingFee: 0,
                groups: {},
            });
            return undefined;
        }

        const requestId = quoteRequestRef.current + 1;
        quoteRequestRef.current = requestId;
        const timeoutId = window.setTimeout(async () => {
            setShippingQuote((current) => ({ ...current, status: 'loading' }));

            try {
                const response = await window.axios.post(route('checkout.shipping-quote'), {
                    items: checkoutItems.map((item) => ({
                        id: item.id,
                        qty: item.qty,
                        variant: item.variant ?? 'Standard',
                    })),
                    shipping_method: data.shipping_method,
                    selected_address_id: data.selected_address_id,
                    shipping_address: data.shipping_address,
                    shipping_address_type: data.shipping_address_type,
                    shipping_street_address: data.shipping_street_address,
                    shipping_barangay: data.shipping_barangay,
                    shipping_city: data.shipping_city,
                    shipping_region: data.shipping_region,
                    shipping_postal_code: data.shipping_postal_code,
                });

                const groupsBySellerId = (response.data.groups || []).reduce((map, group) => {
                    map[String(group.seller_id)] = Number(group.shipping_fee_amount || 0);
                    return map;
                }, {});

                const vehiclesBySellerId = (response.data.groups || []).reduce((map, group) => {
                    if (group.vehicle_info) {
                        map[String(group.seller_id)] = group.vehicle_info;
                    }
                    return map;
                }, {});

                if (quoteRequestRef.current !== requestId) return;

                setShippingQuote({
                    status: 'ready',
                    totalShippingFee: Number(response.data.total_shipping_fee || 0),
                    groups: groupsBySellerId,
                    vehicles: vehiclesBySellerId,
                });
            } catch {
                if (quoteRequestRef.current !== requestId) return;

                setShippingQuote({
                    status: 'error',
                    totalShippingFee: 0,
                    groups: {},
                    vehicles: {},
                });
            }
        }, 350);

        return () => window.clearTimeout(timeoutId);
    }, [
        activeShippingAddress,
        data.shipping_address,
        data.shipping_address_type,
        data.shipping_barangay,
        data.shipping_city,
        data.shipping_method,
        data.shipping_postal_code,
        data.shipping_region,
        data.shipping_street_address,
        checkoutItems,
        quoteRetryNonce,
        data.selected_address_id,
    ]);

    const summary = useMemo(() => {
        const merchandiseSubtotal = sellerGroups.reduce((sum, group) => sum + group.subtotal, 0);
        const platformFeeForSubtotal = (subtotal) => Number((subtotal * convenienceFeeRate).toFixed(2));
        const platformFeeTotal = data.shipping_method === 'Delivery'
            ? Number(sellerGroups.reduce((sum, group) => sum + platformFeeForSubtotal(group.subtotal), 0).toFixed(2))
            : 0;
        const shippingFeeTotal = data.shipping_method === 'Delivery'
            ? Number(shippingQuote.totalShippingFee || 0)
            : 0;
        return {
            merchandiseSubtotal,
            platformFeeTotal,
            shippingFeeTotal,
            grandTotal: Number((merchandiseSubtotal + platformFeeTotal + shippingFeeTotal).toFixed(2)),
            groups: sellerGroups.map((group) => ({
                ...group,
                platformFee: data.shipping_method === 'Delivery' ? platformFeeForSubtotal(group.subtotal) : 0,
                shippingFee: data.shipping_method === 'Delivery'
                    ? Number(shippingQuote.groups[String(group.sellerId)] || 0)
                    : 0,
                vehicleInfo: data.shipping_method === 'Delivery'
                    ? (shippingQuote.vehicles?.[String(group.sellerId)] || null)
                    : null,
                pickupSchedule: data.shipping_method === 'Pick Up'
                    ? (pickupSchedules[String(group.sellerId)] || null)
                    : null,
                total: Number((
                    data.shipping_method === 'Delivery'
                        ? group.subtotal
                            + platformFeeForSubtotal(group.subtotal)
                            + Number(shippingQuote.groups[String(group.sellerId)] || 0)
                        : group.subtotal
                ).toFixed(2)),
            })),
        };
    }, [convenienceFeeRate, data.shipping_method, sellerGroups, shippingQuote.groups, shippingQuote.totalShippingFee, shippingQuote.vehicles, pickupSchedules]);

    const showAggregateBreakdown = totalSellers > 1;

    useEffect(() => {
        setData('total', summary.grandTotal);
    }, [setData, summary.grandTotal]);

    useEffect(() => {
        if (data.selected_address_id !== 'new') return;
        if (data.shipping_address !== structuredShippingPreview) {
            setData('shipping_address', structuredShippingPreview);
        }
    }, [data.shipping_address, data.selected_address_id, setData, structuredShippingPreview]);

    const handleUpdateQty = (item, change) => {
        const minQty = item.is_b2b_supply ? (item.moq || 1) : 1;
        const newQty = item.qty + change;
        const itemKey = item.cart_key || item.id;

        if (newQty < minQty) {
            handleRemoveItem(item);
            return;
        }

        // Keep track of the original quantity before this change batch
        if (previousQtyRef.current[itemKey] === undefined) {
            previousQtyRef.current[itemKey] = item.qty;
        }

        // 1. Optimistic synchronous update (0ms UI latency)
        setCheckoutItems((prev) =>
            prev.map((it) => {
                if ((it.cart_key || it.id) === itemKey) {
                    return { ...it, qty: newQty };
                }
                return it;
            })
        );

        // 2. Debounce backend cart session synchronization
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

                // Rollback optimistic update on failure
                setCheckoutItems((prev) =>
                    prev.map((it) => {
                        if ((it.cart_key || it.id) === itemKey) {
                            return { ...it, qty: revertQty };
                        }
                        return it;
                    })
                );

                const errorMsg = error.response?.data?.message || 'Could not update item quantity.';
                addToast(errorMsg, 'error');
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
            addToast(errorMsg, 'error');
        } finally {
            setRemovingItemId(null);
        }
    };

    const needsDeliveryContactDetails = data.shipping_method === 'Delivery' && (!data.recipient_name.trim() || !data.phone_number.trim());

    const submitDisabled = processing;

    const submitCheckout = (event) => {
        event.preventDefault();

        if (processing) return;

        // Clear any pending debounced timers
        Object.values(qtyTimersRef.current).forEach(clearTimeout);
        qtyTimersRef.current = {};

        if (data.shipping_method === 'Delivery') {
            const localErrors = {};
            
            if (!data.recipient_name || data.recipient_name.trim() === '') {
                localErrors.recipient_name = 'Recipient name is required';
            }
            if (!data.phone_number || data.phone_number.trim() === '') {
                localErrors.phone_number = 'Phone number is required';
            } else if (!/^(09|\+639)\d{9}$/.test(data.phone_number.replace(/\s+/g, ''))) {
                localErrors.phone_number = 'Please enter a valid Philippine mobile number (e.g. 09171234567)';
            }
            if (!data.shipping_street_address || data.shipping_street_address.trim() === '') {
                localErrors.shipping_street_address = 'Street address is required';
            }
            if (!data.shipping_city || data.shipping_city.trim() === '') {
                localErrors.shipping_city = 'City/Municipality is required';
            }
            if (!data.shipping_barangay || data.shipping_barangay.trim() === '') {
                localErrors.shipping_barangay = 'Barangay is required';
            }
            if (!data.shipping_region || data.shipping_region.trim() === '') {
                localErrors.shipping_region = 'Province/Region is required';
            }

            if (Object.keys(localErrors).length > 0) {
                setError(localErrors);
                addToast('Please complete all delivery details before placing order.', 'error');
                return;
            }

            if (shippingQuote.status !== 'ready') {
                addToast('Wait for the delivery quote before placing the order.', 'info');
                return;
            }
        } else if (data.shipping_method === 'Pick Up') {
            const localErrors = {};
            if (totalSellers > 1) {
                for (const group of sellerGroups) {
                    const config = pickupConfigs?.[String(group.sellerId)];
                    if (config && config.pickup_enabled === false) {
                        localErrors[`pickup_schedules.${group.sellerId}`] = `${group.shopName} does not offer workshop pick-up.`;
                    } else {
                        const sched = pickupSchedules[String(group.sellerId)];
                        if (!sched?.date) {
                            localErrors[`pickup_schedules.${group.sellerId}`] = `Please select a pickup date for ${group.shopName}.`;
                        } else if (!sched?.time_slot) {
                            localErrors[`pickup_schedules.${group.sellerId}`] = `Please select a time slot for ${group.shopName}.`;
                        }
                    }
                }
            } else {
                if (!data.pickup_date) {
                    localErrors.pickup_date = 'Please select a pickup date.';
                }
                if (!data.pickup_time_slot) {
                    localErrors.pickup_time_slot = 'Please select an available pickup time window.';
                }
            }

            if (Object.keys(localErrors).length > 0) {
                setError(localErrors);
                addToast('Please select your preferred pickup date and time window for each workshop.', 'error');
                return;
            }
        }

        clearErrors();
        post(route('checkout.store'), {
            preserveScroll: true,
        });
    };

    if (!checkoutItems || checkoutItems.length === 0) {
        return (
            <div className="min-h-screen bg-stone-50/50 px-4 py-16 flex items-center justify-center font-sans">
                <Head title="Cart Empty - Checkout" />
                <div className="max-w-md w-full rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto w-12 h-12 rounded-full bg-clay-50 flex items-center justify-center text-clay-600 mb-4">
                        <Store size={24} />
                    </div>
                    <h2 className="text-lg font-bold text-stone-900">Your checkout is empty</h2>
                    <p className="text-xs text-stone-500 mt-1 mb-6">
                        All items have been removed from this checkout session.
                    </p>
                    <Link
                        href={route('cart.index')}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-clay-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-clay-700 transition"
                    >
                        Return to Cart
                    </Link>
                </div>
            </div>
        );
    }

    if (isAdmin) {
        return (
            <div className="min-h-screen bg-stone-50/50 px-4 py-16 flex items-center justify-center font-sans">
                <div className="max-w-md w-full rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-4">
                        <AlertTriangle size={24} />
                    </div>
                    <h2 className="text-lg font-bold text-stone-900">Admin Account Detected</h2>
                    <p className="text-xs text-stone-500 mt-1 mb-6">
                        Administrators are restricted from placing commercial marketplace orders to maintain strict platform neutrality.
                    </p>
                    <Link
                        href={route('admin.dashboard')}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-stone-900 py-3 text-sm font-bold text-white shadow-sm hover:bg-stone-800 transition"
                    >
                        Back to Admin Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50/50 px-4 py-4 pb-24 font-sans text-stone-800 sm:px-6 sm:py-6 sm:pb-20 lg:px-8">
            <Head title="Checkout" />
            <div className="mx-auto max-w-6xl">
                {/* Unified compact top header bar */}
                <div className="mb-3.5 flex items-center justify-between border-b border-stone-200/60 pb-3">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <button 
                            type="button" 
                            onClick={() => window.history.back()} 
                            className="group flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-stone-500 shadow-2xs transition hover:border-clay-300 hover:text-clay-600 active:scale-95"
                            title="Go back"
                        >
                            <ArrowLeft size={13} />
                            <span className="text-[10.5px] font-bold uppercase tracking-wider">Back</span>
                        </button>
                        <div className="h-4 w-px bg-stone-200" />
                        <Link href={isArtisan ? route('seller.supply-hub.index') : '/'} className="flex items-center gap-2 group">
                            <img src="/images/logo.png" alt="Logo" className="h-6 w-6 object-contain" />
                            <h1 className="font-serif text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                                {isArtisan ? 'Materials Checkout' : 'Checkout'}
                            </h1>
                        </Link>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/70 px-2.5 py-1 text-emerald-700">
                        <ShieldCheck size={12} className="shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Secure Checkout</span>
                    </div>
                </div>

                {/* Artisan Procurement Guarantee Callout */}
                {isArtisan && (
                    <div className="mb-3 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs text-stone-700 shadow-2xs flex items-center gap-2.5">
                        <Store size={15} className="text-clay-600 shrink-0" />
                        <p className="text-[11.5px] text-stone-600">
                            <strong className="font-bold text-stone-900">Workshop Materials:</strong> Confirming delivery receipt will automatically record these items into your <strong className="text-stone-800 font-semibold">Inventory</strong>.
                        </p>
                    </div>
                )}

                {/* Multi-Shop Split Transparency Callout */}
                {totalSellers > 1 && (
                    <div className="mb-3.5 rounded-xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-2 text-xs text-amber-950 shadow-2xs flex items-start sm:items-center gap-2.5">
                        <Store size={15} className="text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
                        <p className="text-[11.5px] text-amber-900 leading-snug">
                            <strong className="font-bold text-amber-950">Split Order ({totalSellers} Studios):</strong>{' '}
                            Purchasing from {sellerGroups.map(g => g.shopName).join(', ')}. Each studio packages and dispatches orders individually with separate tracking.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5 lg:gap-6">
                    <div className="space-y-3.5 md:col-span-2">
                        {/* 1. Shipping Method */}
                        <ShippingMethodSelector 
                            shippingMethod={data.shipping_method} 
                            setShippingMethod={(val) => setData((current) => ({ ...current, ...val }))} 
                        />

                        {/* 2. Shipping Address OR Workshop Pick Up Schedule */}
                        {data.shipping_method === 'Delivery' ? (
                            <ShippingAddressSelector 
                                auth={auth}
                                data={data}
                                setData={setData}
                                errors={errors}
                                setError={setError}
                                clearErrors={clearErrors}
                                needsDeliveryContactDetails={needsDeliveryContactDetails}
                            />
                        ) : totalSellers > 1 ? (
                            <div className="rounded-2xl border border-stone-200 bg-white p-3.5 sm:p-4 shadow-sm space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-stone-200/60 pb-2.5">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Store size={16} className="text-clay-600 shrink-0" />
                                            <h2 className="text-sm font-bold text-stone-900">Workshop Pick Up Schedules</h2>
                                        </div>
                                        <p className="text-[11px] text-stone-500 mt-0.5">
                                            Schedule your visit date & time window for each of the {totalSellers} artisan studios:
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 shrink-0 self-start sm:self-auto">
                                        {Object.values(pickupSchedules).filter(s => s?.date && s?.time_slot).length} of {totalSellers} Scheduled
                                    </span>
                                </div>

                                {/* Workshop Selection Tabs */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {sellerGroups.map((group, idx) => {
                                        const config = pickupConfigs?.[String(group.sellerId)];
                                        const isSelected = String(activeWorkshopSellerId) === String(group.sellerId);
                                        const sched = pickupSchedules[String(group.sellerId)];
                                        const isConfigured = Boolean(sched?.date && sched?.time_slot);
                                        const isPickupDisabled = config && config.pickup_enabled === false;

                                        return (
                                            <button
                                                key={group.sellerId}
                                                type="button"
                                                onClick={() => setActiveWorkshopSellerId(group.sellerId)}
                                                className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                                                    isSelected
                                                        ? 'border-clay-500 bg-clay-50/50 ring-2 ring-clay-500/20 shadow-xs'
                                                        : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50 hover:border-stone-300'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-1 w-full">
                                                    <span className="text-xs font-bold text-stone-900 truncate">
                                                        {idx + 1}. {group.shopName}
                                                    </span>
                                                    {isPickupDisabled ? (
                                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 shrink-0">
                                                            Unavailable
                                                        </span>
                                                    ) : isConfigured ? (
                                                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                                                            <Check size={9} /> Ready
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                                                            Needed
                                                        </span>
                                                    )}
                                                </div>
                                                {group.location && (
                                                    <span className="text-[10px] text-stone-400 mt-0.5 truncate flex items-center gap-1">
                                                        <MapPin size={10} className="shrink-0" />
                                                        {group.location}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-stone-600 font-medium mt-0.5 truncate">
                                                    {sched?.formattedDate || sched?.date ? `${sched.formattedDate || sched.date} (${sched.time_slot})` : 'Select date & slot'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Active Workshop Pick Up Scheduler */}
                                <div className="pt-2">
                                    <StorePickupScheduler
                                        pickupConfig={pickupConfigs?.[String(activeWorkshopSellerId)] || null}
                                        selectedDate={pickupSchedules[String(activeWorkshopSellerId)]?.date || ''}
                                        selectedSlot={pickupSchedules[String(activeWorkshopSellerId)]?.time_slot || ''}
                                        onSelectDate={(date) => {
                                            setPickupSchedules(prev => {
                                                const days = pickupConfigs?.[String(activeWorkshopSellerId)]?.days || [];
                                                const dayObj = days.find(d => d.date === date);
                                                return {
                                                    ...prev,
                                                    [String(activeWorkshopSellerId)]: {
                                                        ...(prev[String(activeWorkshopSellerId)] || {}),
                                                        date,
                                                        formattedDate: dayObj?.formatted || date,
                                                    }
                                                };
                                            });
                                            if (errors[`pickup_schedules.${activeWorkshopSellerId}`]) clearErrors(`pickup_schedules.${activeWorkshopSellerId}`);
                                        }}
                                        onSelectSlot={(slot) => {
                                            setPickupSchedules(prev => ({
                                                ...prev,
                                                [String(activeWorkshopSellerId)]: {
                                                    ...(prev[String(activeWorkshopSellerId)] || {}),
                                                    time_slot: slot,
                                                }
                                            }));
                                            if (errors[`pickup_schedules.${activeWorkshopSellerId}`]) clearErrors(`pickup_schedules.${activeWorkshopSellerId}`);
                                        }}
                                        error={errors[`pickup_schedules.${activeWorkshopSellerId}`]}
                                    />
                                </div>
                            </div>
                        ) : (
                            <StorePickupScheduler
                                pickupConfig={primaryPickupConfig}
                                selectedDate={pickupSchedules[String(primarySellerId)]?.date || data.pickup_date}
                                selectedSlot={pickupSchedules[String(primarySellerId)]?.time_slot || data.pickup_time_slot}
                                onSelectDate={(date) => {
                                    const days = primaryPickupConfig?.days || [];
                                    const dayObj = days.find(d => d.date === date);
                                    setPickupSchedules(prev => ({
                                        ...prev,
                                        [String(primarySellerId)]: {
                                            ...(prev[String(primarySellerId)] || {}),
                                            date,
                                            formattedDate: dayObj?.formatted || date,
                                        }
                                    }));
                                    setData('pickup_date', date);
                                    if (errors.pickup_date) clearErrors('pickup_date');
                                }}
                                onSelectSlot={(slot) => {
                                    setPickupSchedules(prev => ({
                                        ...prev,
                                        [String(primarySellerId)]: {
                                            ...(prev[String(primarySellerId)] || {}),
                                            time_slot: slot,
                                        }
                                    }));
                                    setData('pickup_time_slot', slot);
                                    if (errors.pickup_time_slot) clearErrors('pickup_time_slot');
                                }}
                                error={errors.pickup_date || errors.pickup_time_slot}
                            />
                        )}

                        {/* 3. Delivery Notes */}
                        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 sm:p-4 shadow-sm transition-all duration-300">
                            <button
                                type="button"
                                onClick={() => setShowNotes(!showNotes)}
                                className="w-full flex items-center justify-between text-stone-700 focus:outline-none group"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="rounded-lg bg-stone-50 p-1.5 text-stone-500 transition group-hover:bg-clay-50 group-hover:text-clay-600"><Truck size={16} /></div>
                                    <div className="text-left">
                                        <h2 className="text-sm font-bold text-stone-900">Delivery Notes</h2>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-clay-600 hover:text-clay-700 transition">
                                    {showNotes || data.shipping_notes ? 'Collapse' : 'Add Instructions'}
                                </span>
                            </button>
                            <div className={`transition-all duration-300 overflow-hidden ${
                                showNotes || data.shipping_notes ? 'mt-3 max-h-48 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                            }`}>
                                <textarea 
                                    rows="2" 
                                    className="w-full rounded-xl border-stone-200 text-sm shadow-sm focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 placeholder-stone-400 transition" 
                                    placeholder="e.g. Gate code, landmark, available time, or handoff instructions" 
                                    value={data.shipping_notes} 
                                    onChange={(event) => setData('shipping_notes', event.target.value)} 
                                />
                                <div className="mt-2 flex items-start gap-2 rounded-lg bg-stone-50 p-2 text-[10.5px] leading-relaxed text-stone-500">
                                    <Info size={13} className="shrink-0 text-stone-400 mt-0.5" />
                                    <span>Notes will be shared with the artisan and your delivery rider.</span>
                                </div>
                            </div>
                        </div>

                        {/* 4. Payment Method */}
                        <PaymentMethodSelector 
                            paymentMethod={data.payment_method}
                            setPaymentMethod={(val) => setData('payment_method', val)}
                            shippingMethod={data.shipping_method}
                            errors={errors}
                        />
                    </div>

                    {/* Order Summary Column (Sticky desktop) */}
                    <div className="hidden md:block md:col-span-1 self-start md:sticky md:top-20 lg:top-24">
                        <OrderPricingSummary 
                            summary={summary}
                            shippingQuote={shippingQuote}
                            shippingMethod={data.shipping_method}
                            convenienceFeeRate={convenienceFeeRate}
                            showAggregateBreakdown={showAggregateBreakdown}
                            totalSellers={totalSellers}
                            submitDisabled={submitDisabled}
                            isPendingArtisan={isPendingArtisan}
                            processing={processing}
                            submitCheckout={submitCheckout}
                            setQuoteRetryNonce={setQuoteRetryNonce}
                            onUpdateQty={handleUpdateQty}
                            onRemoveItem={handleRemoveItem}
                            updatingItemId={updatingItemId}
                            removingItemId={removingItemId}
                        />
                    </div>
                </div>
            </div>

            {/* Mobile Sticky Bar */}
            <div className="md:hidden">
                <StickyActionBar>
                    <div className="min-w-0 flex-1 cursor-pointer group" onClick={() => setShowMobileSummary(true)}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400 flex items-center gap-1">
                            Total Due <ChevronUp size={10} className="shrink-0 text-stone-400 transition group-hover:text-clay-600" />
                        </p>
                        <p className="text-sm font-bold text-gray-900">{peso(summary.grandTotal)}</p>
                        <p className="text-[11px] text-stone-500">
                            {processing
                                ? 'Submitting order...'
                                : submitDisabled && data.shipping_method === 'Delivery' && shippingQuote.status !== 'ready'
                                    ? 'Delivery quote still needed'
                                    : totalSellers > 1
                                        ? `${totalSellers} split orders`
                                        : 'Tap to view details'}
                        </p>
                    </div>
                    <button
                        onClick={submitCheckout}
                        disabled={submitDisabled || isPendingArtisan}
                        className="flex h-11 flex-[1.2] items-center justify-center gap-2 rounded-xl bg-clay-600 px-4 text-sm font-bold text-white shadow-sm shadow-clay-200 transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                    >
                        {processing ? (
                            <>
                                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Processing...</span>
                            </>
                        ) : (
                            <>
                                <ShieldCheck size={16} />
                                <span>Place Order</span>
                            </>
                        )}
                    </button>
                </StickyActionBar>
            </div>

            {/* Mobile Summary Drawer */}
            <SlideOverDrawer
                show={showMobileSummary}
                onClose={() => setShowMobileSummary(false)}
                title="Order Summary"
                position="bottom"
                widthClass="max-w-xl"
                footer={
                    <button
                        onClick={(event) => {
                            setShowMobileSummary(false);
                            submitCheckout(event);
                        }}
                        disabled={submitDisabled || isPendingArtisan}
                        className="flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-clay-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                    >
                        {processing ? (
                            <>
                                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Processing...</span>
                            </>
                        ) : (
                            <>
                                <ShieldCheck size={16} />
                                <span>{totalSellers > 1 ? `Place ${totalSellers} Orders` : 'Place Order'}</span>
                            </>
                        )}
                    </button>
                }
            >
                <div className="space-y-4">
                    <OrderPricingSummary 
                        summary={summary}
                        shippingQuote={shippingQuote}
                        shippingMethod={data.shipping_method}
                        convenienceFeeRate={convenienceFeeRate}
                        showAggregateBreakdown={showAggregateBreakdown}
                        totalSellers={totalSellers}
                        submitDisabled={submitDisabled}
                        isPendingArtisan={isPendingArtisan}
                        processing={processing}
                        submitCheckout={submitCheckout}
                        setQuoteRetryNonce={setQuoteRetryNonce}
                        hideSubmitButton={true}
                        hideTitle={true}
                        flat={true}
                        onUpdateQty={handleUpdateQty}
                        onRemoveItem={handleRemoveItem}
                        updatingItemId={updatingItemId}
                        removingItemId={removingItemId}
                    />
                </div>
            </SlideOverDrawer>
        </div>
    );
}

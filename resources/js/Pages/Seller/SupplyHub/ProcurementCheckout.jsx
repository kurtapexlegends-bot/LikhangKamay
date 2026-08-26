import React, { useMemo, useState, useEffect } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import { 
    Store, Truck, ShieldCheck, ArrowLeft, CheckCircle2, 
    AlertCircle, Package, ArrowRight, MapPin, CreditCard, Banknote, Car
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import { formatStructuredAddress } from '@/lib/addressFormatting';

// Subcomponents from checkout
import ShippingMethodSelector from '@/Components/Consumer/Shop/Checkout/ShippingMethodSelector';
import ShippingAddressSelector from '@/Components/Consumer/Shop/Checkout/ShippingAddressSelector/ShippingAddressSelector';
import PaymentMethodSelector from '@/Components/Consumer/Shop/Checkout/PaymentMethodSelector';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ProcurementCheckout({ auth, items = [], pricing, userAddresses = [] }) {
    const { flash } = usePage().props;
    const { addToast } = useToast();
    const { openSidebar } = useSellerWorkspaceShell();
    useFlashToast(flash, addToast);

    const addresses = userAddresses.length > 0 ? userAddresses : (auth?.user?.addresses || []);
    const defaultAddress = addresses.find((addr) => addr.is_default) || addresses[0] || null;
    const convenienceFeeRate = pricing?.convenience_fee_rate ?? 0.04;

    const [shippingQuote, setShippingQuote] = useState({
        status: 'ready',
        totalShippingFee: 0,
        groups: {},
        vehicles: {},
    });

    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
        shipping_method: 'Delivery',
        selected_address_id: defaultAddress?.id || 'new',
        recipient_name: defaultAddress?.recipient_name || auth?.user?.shop_name || auth?.user?.name || '',
        phone_number: defaultAddress?.phone_number || auth?.user?.phone || '',
        shipping_street_address: defaultAddress?.street_address || '',
        shipping_city: defaultAddress?.city || '',
        shipping_barangay: defaultAddress?.barangay || '',
        shipping_region: defaultAddress?.region || 'Cavite',
        shipping_postal_code: defaultAddress?.postal_code || '',
        payment_method: 'GCash',
        notes: 'Artisan Workshop Sourcing Order',
        items: items.map(it => it.cart_key || String(it.id)),
    });

    // Group items by seller studio
    const sellerGroups = useMemo(() => {
        const groups = {};
        items.forEach(it => {
            const sellerId = it.seller_id || it.user_id || 1;
            const sellerName = it.shop_name || it.seller || 'Artisan Workshop';
            if (!groups[sellerId]) {
                groups[sellerId] = {
                    sellerId,
                    sellerName,
                    items: [],
                    subtotal: 0,
                    totalWeight: 0,
                };
            }
            const unitPrice = (it.wholesale_price && it.wholesale_min_qty && it.qty >= it.wholesale_min_qty)
                ? it.wholesale_price
                : (it.effective_price || it.price);
            const lineTotal = unitPrice * it.qty;
            const weightTotal = (it.weight || 1.0) * it.qty * 1.10;

            groups[sellerId].items.push({
                ...it,
                unitPrice,
                lineTotal,
            });
            groups[sellerId].subtotal += lineTotal;
            groups[sellerId].totalWeight += weightTotal;
        });

        return Object.values(groups).map(g => {
            const roundedW = Math.round(g.totalWeight * 10) / 10;
            const vehicle = roundedW > 300
                ? 'Large Van 1000kg'
                : roundedW > 200
                    ? 'MPV 300kg'
                    : roundedW > 20
                        ? '4-Wheel Sedan'
                        : 'Motorcycle';
            return { ...g, vehicle, totalWeight: roundedW };
        });
    }, [items]);

    // Financial totals
    const merchandiseSubtotal = sellerGroups.reduce((sum, g) => sum + g.subtotal, 0);
    const platformFee = Number((merchandiseSubtotal * convenienceFeeRate).toFixed(2));
    const grandTotal = Number((merchandiseSubtotal + platformFee).toFixed(2));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (processing) return;

        if (data.shipping_method === 'Delivery') {
            const localErrors = {};
            if (!data.recipient_name?.trim()) localErrors.recipient_name = 'Workshop / Recipient name is required';
            if (!data.phone_number?.trim()) localErrors.phone_number = 'Contact number is required';
            if (!data.shipping_street_address?.trim()) localErrors.shipping_street_address = 'Street address is required';
            if (!data.shipping_city?.trim()) localErrors.shipping_city = 'City/Municipality is required';

            if (Object.keys(localErrors).length > 0) {
                setError(localErrors);
                addToast('Please complete delivery destination details.', 'error');
                return;
            }
        }

        clearErrors();
        post(route('seller.supply-hub.checkout.store'), {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Material Checkout | LikhangKamay" />
            <SellerHeader
                title="Supply Hub"
                subtitle="Review your delivery address, courier allocation, and order total."
                onMenuClick={openSidebar}
                badge={{ label: 'Wholesale Supplies', iconColor: 'text-clay-500' }}
            />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                
                {/* Header Navigation & Workshop Guarantee */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <Link
                        href={route('seller.supply-hub.cart')}
                        className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-clay-600 transition-colors"
                    >
                        <div className="rounded-xl border border-stone-200 bg-white p-2 shadow-2xs">
                            <ArrowLeft size={14} />
                        </div>
                        <span>Return to Cart</span>
                    </Link>

                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-emerald-800 text-xs font-bold shadow-2xs">
                        <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                        <span>Workshop Material Order</span>
                    </div>
                </div>

                {/* Auto-Restock Guarantee Callout */}
                <div className="rounded-2xl border border-stone-200 bg-white p-4 text-xs text-stone-700 shadow-2xs flex items-start gap-3">
                    <Store size={18} className="text-clay-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                        <span className="font-bold text-stone-900 block">Direct Workshop Delivery & Inventory Sync</span>
                        <p className="text-stone-500 leading-relaxed">
                            Purchased raw materials are delivered directly from peer artisan workshops. When you confirm delivery receipt, LikhangKamay automatically records the items into your Studio Inventory.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left Column: Delivery & Payment Options */}
                    {/* Left Column: Delivery & Payment Options */}
                    <div className="lg:col-span-8 space-y-6">
                        
                        {/* 1. Shipping Method */}
                        <ShippingMethodSelector
                            shippingMethod={data.shipping_method}
                            setShippingMethod={(val) => setData((curr) => ({ ...curr, ...val }))}
                        />

                        {/* 2. Workshop Destination Address */}
                        {data.shipping_method === 'Delivery' && (
                            <ShippingAddressSelector
                                auth={{ ...auth, user: { ...auth?.user, addresses } }}
                                data={data}
                                setData={setData}
                                errors={errors}
                                setError={setError}
                                clearErrors={clearErrors}
                                needsDeliveryContactDetails={false}
                            />
                        )}

                        {/* 3. Payment Method */}
                        <PaymentMethodSelector
                            paymentMethod={data.payment_method}
                            setPaymentMethod={(val) => setData('payment_method', val)}
                            shippingMethod={data.shipping_method}
                            errors={errors}
                        />
                    </div>

                    {/* Right Column: Order Summary & Placement */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-5 sticky top-24">
                            <h3 className="font-bold text-stone-900 text-sm border-b border-stone-150 pb-3">
                                Order Summary
                            </h3>

                            {/* Supplier Groups */}
                            <div className="space-y-4">
                                {sellerGroups.map((group) => (
                                    <div key={group.sellerId} className="rounded-xl border border-stone-150 bg-stone-50/70 p-3.5 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                                                <Store size={13} className="text-clay-600" />
                                                {group.sellerName}
                                            </span>
                                            <span className="text-[10px] text-stone-400 font-mono">
                                                {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                                            </span>
                                        </div>

                                        {/* Items */}
                                        <div className="space-y-2 divide-y divide-stone-200/60 pt-1">
                                            {group.items.map((it) => (
                                                <div key={it.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                                                    <div className="min-w-0 flex-1 pr-2">
                                                        <p className="font-medium text-stone-800 truncate">{it.name}</p>
                                                        <span className="text-[10px] text-stone-400">
                                                            {it.qty} × {formatCurrency(it.unitPrice)}
                                                        </span>
                                                    </div>
                                                    <span className="font-bold text-stone-900 shrink-0">
                                                        {formatCurrency(it.lineTotal)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Logistics Pill */}
                                        <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500">
                                            <span>Est. Weight:</span>
                                            <span className="font-bold text-stone-800 flex items-center gap-1">
                                                <Truck size={12} className="text-clay-600" />
                                                {group.totalWeight} kg ({group.vehicle})
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Totals */}
                            <div className="space-y-2 pt-2 border-t border-stone-200 text-xs">
                                <div className="flex justify-between text-stone-500">
                                    <span>Materials Subtotal:</span>
                                    <span className="font-bold text-stone-800">{formatCurrency(merchandiseSubtotal)}</span>
                                </div>
                                <div className="flex justify-between text-stone-500">
                                    <span>Platform Fee (4%):</span>
                                    <span className="font-bold text-stone-800">{formatCurrency(platformFee)}</span>
                                </div>
                                <div className="flex justify-between items-baseline pt-2 border-t border-stone-200">
                                    <span className="font-bold text-stone-900 text-sm">Total Due:</span>
                                    <span className="font-black text-clay-700 text-lg">{formatCurrency(grandTotal)}</span>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="hidden lg:flex w-full rounded-xl bg-clay-600 py-3.5 text-xs font-bold text-white shadow-md hover:bg-clay-700 disabled:opacity-50 transition-all active:scale-95 items-center justify-center gap-2 cursor-pointer"
                            >
                                <span>Place Material Order</span>
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </form>

                {/* Mobile Sticky Order Placement Bar */}
                <div className="block lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 p-3.5 shadow-lg">
                    <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
                        <div className="space-y-0.5">
                            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">
                                Total Due
                            </span>
                            <span className="text-base font-black text-clay-700 block leading-none">
                                {formatCurrency(grandTotal)}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={processing || !selectedAddressId}
                            className="flex-1 max-w-[210px] flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-clay-600 hover:bg-clay-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-clay-200 transition-all active:scale-95 cursor-pointer"
                        >
                            <span>Confirm & Order</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

ProcurementCheckout.layout = (page) => <SellerWorkspaceLayout active="supply-hub">{page}</SellerWorkspaceLayout>;

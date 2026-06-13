import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, Info, ShieldCheck, Store, Truck, ChevronUp } from 'lucide-react';
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
    const { flash, items: incomingItems = [] } = usePage().props;
    const { addToast } = useToast();
    const isPendingArtisan = auth?.user?.role === 'artisan' && auth?.user?.artisan_status === 'pending';
    const isAdmin = auth?.user?.role === 'super_admin' || auth?.user?.role === 'admin';

    if (isAdmin) {
        return (
            <div className="min-h-screen bg-[#FDFBF9] flex flex-col items-center justify-center p-4 text-center">
                <div className="max-w-md bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
                    <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-500">
                        <AlertTriangle size={32} />
                    </div>
                    <h2 className="text-lg font-bold text-stone-900 mb-2">Access Restricted</h2>
                    <p className="text-sm text-stone-500 mb-6">
                        Administrators are not permitted to make purchases or proceed to checkout.
                    </p>
                    <Link
                        href={route('admin.dashboard')}
                        className="inline-flex items-center justify-center px-4 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-850 transition-all active:scale-95 shadow-sm w-full"
                    >
                        Back to Admin Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const convenienceFeeRate = pricing?.convenience_fee_rate ?? 0.03;
    const defaultAddress = auth.user.addresses?.find((address) => address.is_default) || null;
    const [quoteRetryNonce, setQuoteRetryNonce] = useState(0);
    const [showMobileSummary, setShowMobileSummary] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [shippingQuote, setShippingQuote] = useState({
        status: 'idle',
        totalShippingFee: 0,
        groups: {},
    });
    const quoteRequestRef = useRef(0);
    useFlashToast(flash, addToast);

    const grouped = useMemo(() => incomingItems.reduce((groups, item) => {
        const sellerId = item.artisan_id || 'unknown';
        if (!groups[sellerId]) {
            groups[sellerId] = { sellerId, shopName: item.shop_name || item.seller || 'Shop', items: [], subtotal: 0 };
        }
        groups[sellerId].items.push(item);
        groups[sellerId].subtotal += item.price * item.qty;
        return groups;
    }, {}), [incomingItems]);

    const sellerGroups = Object.values(grouped);
    const totalSellers = sellerGroups.length;

    const { data, setData, post, processing, errors } = useForm({
        items: incomingItems,
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
        save_address: false,
        total: 0,
    });

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

        if (!activeShippingAddress.trim()) {
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
                    items: incomingItems.map((item) => ({
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

                if (quoteRequestRef.current !== requestId) return;

                setShippingQuote({
                    status: 'ready',
                    totalShippingFee: Number(response.data.total_shipping_fee || 0),
                    groups: groupsBySellerId,
                });
            } catch {
                if (quoteRequestRef.current !== requestId) return;

                setShippingQuote({
                    status: 'error',
                    totalShippingFee: 0,
                    groups: {},
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
        incomingItems,
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
                total: Number((
                    data.shipping_method === 'Delivery'
                        ? group.subtotal
                            + platformFeeForSubtotal(group.subtotal)
                            + Number(shippingQuote.groups[String(group.sellerId)] || 0)
                        : group.subtotal
                ).toFixed(2)),
            })),
        };
    }, [convenienceFeeRate, data.shipping_method, sellerGroups, shippingQuote.groups, shippingQuote.totalShippingFee]);

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

    const needsDeliveryContactDetails = data.shipping_method === 'Delivery' && (!data.recipient_name.trim() || !data.phone_number.trim());

    const submitDisabled = processing
          || (data.shipping_method === 'Delivery' && !activeShippingAddress.trim())
          || (data.shipping_method === 'Delivery' && shippingQuote.status !== 'ready')
          || (data.shipping_method === 'Delivery' && (!data.recipient_name.trim() || !data.phone_number.trim()))
          || (data.save_address && isNewAddress && (!data.recipient_name.trim() || !data.phone_number.trim()));

    const submitCheckout = (event) => {
        event.preventDefault();

        if (submitDisabled) {
            if (data.shipping_method === 'Delivery' && shippingQuote.status !== 'ready') {
                addToast('Wait for the delivery quote before placing the order.', 'info');
            }
            return;
        }

        post(route('checkout.store'), {
            preserveScroll: true,
        });
    };

    return (
        <div className="min-h-screen bg-stone-50/50 px-4 py-6 pb-32 font-sans text-stone-800 sm:px-6 sm:py-12 sm:pb-12 lg:px-8">
            <Head title="Checkout" />
            <div className="mx-auto max-w-6xl">
                {/* Navigation and secure banner */}
                <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
                    <button onClick={() => window.history.back()} className="group flex items-center gap-2.5 text-stone-500 transition hover:text-clay-600">
                        <div className="rounded-xl border border-stone-200 bg-white p-2 shadow-sm transition-all group-hover:border-clay-200 group-hover:bg-clay-50/30 group-active:scale-90"><ArrowLeft size={16} /></div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Go Back</span>
                    </button>
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/60 px-3.5 py-1.5 text-emerald-700">
                        <ShieldCheck size={14} className="shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Secure Checkout Session</span>
                    </div>
                </div>

                <div className="mb-8 flex items-center justify-between border-b border-stone-200/60 pb-6">
                    <Link href="/" className="group flex items-center gap-3">
                        <img src="/images/logo.png" alt="Logo" className="h-9 w-9 object-contain transition group-hover:scale-105" />
                        <div>
                            <h1 className="font-serif text-xl font-bold text-stone-900 sm:text-2xl tracking-tight">Checkout</h1>
                            <p className="text-xs text-stone-500 mt-0.5">LikhangKamay Artisan Marketplace</p>
                        </div>
                    </Link>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 lg:gap-10">
                    <div className="space-y-6 md:col-span-2">
                        {/* 1. Shipping Method */}
                        <ShippingMethodSelector 
                            shippingMethod={data.shipping_method} 
                            setShippingMethod={(val) => setData((current) => ({ ...current, ...val }))} 
                        />

                        {/* 2. Shipping Address */}
                        {data.shipping_method === 'Delivery' ? (
                            <ShippingAddressSelector 
                                auth={auth}
                                data={data}
                                setData={setData}
                                errors={errors}
                                needsDeliveryContactDetails={needsDeliveryContactDetails}
                            />
                        ) : (
                            <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
                                <div className="flex items-start gap-3.5">
                                    <div className="rounded-xl bg-blue-100/60 p-2.5 text-blue-600"><Store size={20} /></div>
                                    <div>
                                        <h3 className="text-base font-bold text-blue-900">Store Pick Up Selected</h3>
                                        <p className="mt-1 text-sm text-blue-800">No delivery address is required. Coordinate pickup details with the artisan in chat after placing your order.</p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className="rounded-lg bg-blue-100/50 px-2.5 py-1 text-xs font-semibold text-blue-800">No Platform Fee</span>
                                            <span className="rounded-lg bg-blue-100/50 px-2.5 py-1 text-xs font-semibold text-blue-800">COD Only</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. Delivery Notes */}
                        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-all duration-300">
                            <button
                                type="button"
                                onClick={() => setShowNotes(!showNotes)}
                                className="w-full flex items-center justify-between text-stone-700 focus:outline-none group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="rounded-xl bg-stone-50 p-2 text-stone-500 transition group-hover:bg-clay-50 group-hover:text-clay-600"><Truck size={18} /></div>
                                    <div className="text-left">
                                        <h2 className="text-sm font-bold text-stone-900">Delivery Notes</h2>
                                        <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">Optional Instructions</p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-clay-600 hover:text-clay-700 transition">
                                    {showNotes || data.shipping_notes ? 'Collapse' : 'Add Instructions'}
                                </span>
                            </button>
                            <div className={`transition-all duration-300 overflow-hidden ${
                                showNotes || data.shipping_notes ? 'mt-4 max-h-48 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                            }`}>
                                <textarea 
                                    rows="2.5" 
                                    className="w-full rounded-xl border-stone-200 text-sm shadow-sm focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 placeholder-stone-400 transition" 
                                    placeholder="e.g. Gate code, landmark, available time, or handoff instructions" 
                                    value={data.shipping_notes} 
                                    onChange={(event) => setData('shipping_notes', event.target.value)} 
                                />
                                <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-stone-50 p-3 text-[11px] leading-relaxed text-stone-500">
                                    <Info size={14} className="shrink-0 text-stone-400 mt-0.5" />
                                    <span>Notes will be shared with the artisan seller and the courier if this order is dispatched via unified Lalamove delivery.</span>
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

                    {/* Order Summary Column */}
                    <div className="hidden md:block md:col-span-1 self-start md:sticky md:top-24">
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
                    />
                </div>
            </SlideOverDrawer>
        </div>
    );
}

import React, { useMemo, useState, useEffect } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, ScanFace } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import { formatStructuredAddress } from '@/lib/addressFormatting';
import CheckoutFaceCheckModal from '@/Components/Consumer/Shop/Checkout/CheckoutFaceCheckModal';
import LegalModal from '@/Components/LegalModal';
import CheckoutPoliciesNotice from '@/Components/Consumer/Shop/Checkout/CheckoutPoliciesNotice';

// Extracted Subcomponents & Hooks
import ShippingMethodSelector from '@/Components/Consumer/Shop/Checkout/ShippingMethodSelector';
import ShippingAddressSelector from '@/Components/Consumer/Shop/Checkout/ShippingAddressSelector/ShippingAddressSelector';
import PaymentMethodSelector from '@/Components/Consumer/Shop/Checkout/PaymentMethodSelector';
import OrderPricingSummary from '@/Components/Consumer/Shop/Checkout/OrderPricingSummary';
import StorePickupScheduler from '@/Components/Consumer/Shop/Checkout/StorePickupScheduler';
import CheckoutHeader from '@/Components/Consumer/Shop/Checkout/CheckoutHeader';
import MultiWorkshopPickupSection from '@/Components/Consumer/Shop/Checkout/MultiWorkshopPickupSection';
import CheckoutDeliveryNotesCard from '@/Components/Consumer/Shop/Checkout/CheckoutDeliveryNotesCard';
import CheckoutVoucherSection from '@/Components/Consumer/Shop/Checkout/CheckoutVoucherSection';
import CheckoutVoucherDrawer from '@/Components/Consumer/Shop/Checkout/CheckoutVoucherDrawer';
import CheckoutMobileStickyBar from '@/Components/Consumer/Shop/Checkout/CheckoutMobileStickyBar';
import { CheckoutEmptyCartState, CheckoutAdminRestrictedState } from '@/Components/Consumer/Shop/Checkout/CheckoutStatusNotice';
import FormErrorSummary from '@/Components/Common/FormErrorSummary';
import useCheckoutCart from '@/Components/Consumer/Shop/Checkout/hooks/useCheckoutCart';
import useShippingQuote from '@/Components/Consumer/Shop/Checkout/hooks/useShippingQuote';
import useCheckoutVouchers from '@/Components/Consumer/Shop/Checkout/hooks/useCheckoutVouchers';
import validateCheckoutBeforeSubmit from '@/Components/Consumer/Shop/Checkout/hooks/validateCheckoutBeforeSubmit';

const TYPES = [{ value: 'home', label: 'Home' }, { value: 'office', label: 'Office' }, { value: 'other', label: 'Other' }];
const typeLabel = (value) => TYPES.find((type) => type.value === value)?.label || 'Other';
const resolveAddressDisplay = (address) => address?.full_address || formatStructuredAddress({
    street_address: address?.street_address,
    barangay: address?.barangay,
    city: address?.city,
    region: address?.region,
    postal_code: address?.postal_code,
});

export default function Checkout({ auth, pricing }) {
    const {
        flash,
        items: incomingItems = [],
        pickupConfigs = {},
        availableVouchers = { shops: {} },
        policies = {},
        policiesSummary = {},
        returnWindowHours = 24,
    } = usePage().props;
    const { addToast } = useToast();
    const isArtisan = auth?.user?.role === 'artisan';
    const isPendingArtisan = auth?.user?.role === 'artisan' && auth?.user?.artisan_status === 'pending';
    const isAdmin = auth?.user?.role === 'super_admin' || auth?.user?.role === 'admin';

    const convenienceFeeRate = pricing?.convenience_fee_rate ?? 0.03;
    const defaultAddress = auth?.user?.addresses?.find((address) => address.is_default) || null;
    const requiresCheckoutFaceCheck = Boolean(auth?.requiresCheckoutFaceCheck);
    const [showNotes, setShowNotes] = useState(false);
    const [showFaceCheckModal, setShowFaceCheckModal] = useState(false);
    const [activeLegalModal, setActiveLegalModal] = useState({ isOpen: false, type: 'terms' });

    const handleOpenPolicy = (type) => setActiveLegalModal({ isOpen: true, type });
    const handleClosePolicyModal = () => setActiveLegalModal((prev) => ({ ...prev, isOpen: false }));

    const activeReturnWindow = useMemo(() => {
        const hours = Number(policiesSummary?.return_window_hours || returnWindowHours || 24);
        return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }, [policiesSummary, returnWindowHours]);

    const {
        checkoutItems,
        updatingItemId,
        removingItemId,
        handleUpdateQty,
        handleRemoveItem,
        clearPendingTimers,
    } = useCheckoutCart(incomingItems, addToast);

    useFlashToast(flash, addToast);

    const grouped = useMemo(() => checkoutItems.reduce((groups, item) => {
        const sellerId = item.artisan_id || 'unknown';
        if (!groups[sellerId]) {
            groups[sellerId] = {
                sellerId,
                shopName: item.shop_name || item.seller || 'Shop',
                location: item.seller_city || item.location || '',
                is_vat_registered: Boolean(item.is_vat_registered),
                items: [],
                subtotal: 0,
            };
        }
        groups[sellerId].items.push(item);
        groups[sellerId].subtotal += item.price * item.qty;
        if (item.is_vat_registered) {
            groups[sellerId].is_vat_registered = true;
        }
        return groups;
    }, {}), [checkoutItems]);

    const sellerGroups = useMemo(() => Object.values(grouped), [grouped]);
    const totalSellers = sellerGroups.length;

    const primarySellerId = sellerGroups[0]?.sellerId;
    const primaryPickupConfig = pickupConfigs?.[String(primarySellerId)] || Object.values(pickupConfigs || {})[0] || null;

    const sellersWithPickupDisabled = useMemo(() => {
        return sellerGroups.filter((group) => {
            const config = pickupConfigs?.[String(group.sellerId)];
            return config && config.pickup_enabled === false;
        });
    }, [sellerGroups, pickupConfigs]);

    const hasPickupDisabledSeller = sellersWithPickupDisabled.length > 0;
    const [activeWorkshopSellerId, setActiveWorkshopSellerId] = useState(primarySellerId);

    useEffect(() => {
        if (!sellerGroups.some((g) => String(g.sellerId) === String(activeWorkshopSellerId))) {
            setActiveWorkshopSellerId(primarySellerId);
        }
    }, [sellerGroups, activeWorkshopSellerId, primarySellerId]);

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
        shipping_address: resolveAddressDisplay(defaultAddress) || auth?.user?.saved_address || auth?.user?.street_address || '',
        shipping_address_type: defaultAddress?.address_type || 'home',
        shipping_street_address: defaultAddress?.street_address || auth?.user?.street_address || '',
        shipping_barangay: defaultAddress?.barangay || auth?.user?.barangay || '',
        shipping_city: defaultAddress?.city || auth?.user?.city || '',
        shipping_region: defaultAddress?.region || auth?.user?.region || '',
        shipping_postal_code: defaultAddress?.postal_code || auth?.user?.zip_code || '',
        latitude: defaultAddress?.latitude ?? null,
        longitude: defaultAddress?.longitude ?? null,
        shipping_latitude: defaultAddress?.latitude ?? null,
        shipping_longitude: defaultAddress?.longitude ?? null,
        recipient_name: defaultAddress?.recipient_name || auth?.user?.name || '',
        phone_number: defaultAddress?.phone_number || auth?.user?.phone_number || '',
        shipping_notes: '',
        payment_method: 'COD',
        shipping_method: 'Delivery',
        pickup_schedules: pickupSchedules,
        pickup_date: pickupSchedules[String(primarySellerId)]?.date || '',
        pickup_time_slot: pickupSchedules[String(primarySellerId)]?.time_slot || '',
        save_address: false,
        shop_vouchers: {},
        total: 0,
    });

    const {
        appliedShopVouchers,
        dynamicAvailableVouchers,
        voucherCalculations,
        promoCodeInput,
        setPromoCodeInput,
        validatingCode,
        voucherError,
        setVoucherError,
        isVoucherDrawerOpen,
        setIsVoucherDrawerOpen,
        applyVoucherObject,
        removeShopVoucher,
        handleApplyPromoCode,
        handleFollowShop,
        followingShopId,
        totalAvailableVouchersCount,
    } = useCheckoutVouchers({
        sellerGroups,
        availableVouchers,
        setData,
        addToast,
    });

    useEffect(() => {
        setData('items', checkoutItems);
    }, [checkoutItems, setData]);

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

    const isNewAddress = data.selected_address_id === 'new' || !auth?.user?.addresses?.length;
    const activeShippingAddress = isNewAddress ? structuredShippingPreview : data.shipping_address;

    const {
        shippingQuote,
        setQuoteRetryNonce,
    } = useShippingQuote({
        data,
        activeShippingAddress,
        checkoutItems,
    });

    const summary = useMemo(() => {
        const merchandiseSubtotal = sellerGroups.reduce((sum, group) => sum + group.subtotal, 0);
        const platformFeeForSubtotal = (subtotal) => Number((subtotal * convenienceFeeRate).toFixed(2));
        const platformFeeTotal = data.shipping_method === 'Delivery'
            ? Number(sellerGroups.reduce((sum, group) => sum + platformFeeForSubtotal(group.subtotal), 0).toFixed(2))
            : 0;
        const shippingFeeTotal = data.shipping_method === 'Delivery'
            ? Number(shippingQuote.totalShippingFee || 0)
            : 0;

        const totalShopDiscount = Number((voucherCalculations.totalShopDiscount || 0).toFixed(2));
        const totalVoucherDiscount = totalShopDiscount;

        const groups = sellerGroups.map((group) => {
            const key = String(group.sellerId);
            const shopDisc = Number((voucherCalculations.shopDiscountsBySeller?.[key] || 0).toFixed(2));
            const netMerch = Number(Math.max(0, group.subtotal - shopDisc).toFixed(2));

            const isVat = Boolean(group.is_vat_registered);
            const vatable = isVat ? Number((netMerch / 1.12).toFixed(2)) : 0;
            const vat = isVat ? Number((netMerch - vatable).toFixed(2)) : 0;
            const vatExempt = isVat ? 0 : netMerch;
            const pFee = data.shipping_method === 'Delivery' ? platformFeeForSubtotal(group.subtotal) : 0;
            const sFee = data.shipping_method === 'Delivery'
                ? Number(shippingQuote.groups[key] || 0)
                : 0;

            return {
                ...group,
                is_vat_registered: isVat,
                vatable_sales: vatable,
                vat_amount: vat,
                vat_exempt_sales: vatExempt,
                shopVoucherDiscount: shopDisc,
                shopVoucherCode: appliedShopVouchers[key]?.code || null,
                platformFee: pFee,
                shippingFee: sFee,
                vehicleInfo: data.shipping_method === 'Delivery'
                    ? (shippingQuote.vehicles?.[key] || null)
                    : null,
                pickupSchedule: data.shipping_method === 'Pick Up'
                    ? (pickupSchedules[key] || null)
                    : null,
                total: Number((netMerch + pFee + sFee).toFixed(2)),
            };
        });

        const vatableSalesTotal = Number(groups.reduce((sum, g) => sum + g.vatable_sales, 0).toFixed(2));
        const vatAmountTotal = Number(groups.reduce((sum, g) => sum + g.vat_amount, 0).toFixed(2));
        const vatExemptSalesTotal = Number(groups.reduce((sum, g) => sum + g.vat_exempt_sales, 0).toFixed(2));
        const hasVatRegistered = sellerGroups.some((g) => g.is_vat_registered);
        const netMerchandiseSubtotal = Number(Math.max(0, merchandiseSubtotal - totalVoucherDiscount).toFixed(2));

        return {
            merchandiseSubtotal,
            totalShopDiscount,
            totalVoucherDiscount,
            platformFeeTotal,
            shippingFeeTotal,
            vatableSalesTotal,
            vatAmountTotal,
            vatExemptSalesTotal,
            hasVatRegistered,
            grandTotal: Number((netMerchandiseSubtotal + platformFeeTotal + shippingFeeTotal).toFixed(2)),
            groups,
        };
    }, [
        convenienceFeeRate,
        data.shipping_method,
        sellerGroups,
        shippingQuote.groups,
        shippingQuote.totalShippingFee,
        shippingQuote.vehicles,
        pickupSchedules,
        voucherCalculations,
        appliedShopVouchers,
    ]);

    const showAggregateBreakdown = totalSellers > 1 || summary.totalVoucherDiscount > 0;
    const canEvaluateOrderMinimum = data.shipping_method === 'Pick Up' || shippingQuote.status === 'ready';
    const hasSubMinimumOrder = canEvaluateOrderMinimum && summary.groups.some((group) => Number(group.total || 0) < 20);

    useEffect(() => {
        if (hasSubMinimumOrder && (data.payment_method === 'GCash' || data.payment_method === 'Maya')) {
            setData('payment_method', 'COD');
            addToast('Switched to Cash on Delivery because online payment requires at least PHP 20.00 per order.', 'info');
        }
    }, [hasSubMinimumOrder, data.payment_method, setData, addToast]);

    useEffect(() => {
        setData('total', summary.grandTotal);
    }, [setData, summary.grandTotal]);

    useEffect(() => {
        if (data.selected_address_id !== 'new') return;
        if (data.shipping_address !== structuredShippingPreview) {
            setData('shipping_address', structuredShippingPreview);
        }
    }, [data.shipping_address, data.selected_address_id, setData, structuredShippingPreview]);

    useEffect(() => {
        if (hasPickupDisabledSeller && data.shipping_method === 'Pick Up') {
            setData('shipping_method', 'Delivery');
        }
    }, [hasPickupDisabledSeller, data.shipping_method, setData]);

    const needsDeliveryContactDetails = data.shipping_method === 'Delivery' && (!data.recipient_name.trim() || !data.phone_number.trim());
    const submitDisabled = processing || (data.shipping_method === 'Delivery' && shippingQuote.status !== 'ready');

    const performOrderSubmission = () => {
        clearErrors();
        post(route('checkout.store'), {
            preserveScroll: true,
            onSuccess: () => {
                if (typeof window !== 'undefined') {
                    try {
                        window.localStorage.removeItem('lk_cart_backup');
                    } catch {
                        // ignore storage errors
                    }
                }
            },
        });
    };

    const submitCheckout = (event) => {
        event.preventDefault();
        if (processing) return;

        clearPendingTimers();

        const isValid = validateCheckoutBeforeSubmit({
            data,
            summary,
            shippingQuote,
            hasPickupDisabledSeller,
            sellersWithPickupDisabled,
            totalSellers,
            sellerGroups,
            pickupConfigs,
            pickupSchedules,
            primaryPickupConfig,
            setError,
            addToast,
        });

        if (!isValid) return;

        if (requiresCheckoutFaceCheck) {
            setShowFaceCheckModal(true);
            return;
        }

        performOrderSubmission();
    };

    if (!checkoutItems || checkoutItems.length === 0) {
        return <CheckoutEmptyCartState />;
    }

    if (isAdmin) {
        return <CheckoutAdminRestrictedState />;
    }

    return (
        <div className="min-h-screen bg-stone-50/50 px-4 py-4 pb-24 font-sans text-stone-800 sm:px-6 sm:py-6 sm:pb-20 lg:px-8">
            <Head title="Checkout" />
            <div className="mx-auto max-w-6xl">
                <CheckoutHeader 
                    isArtisan={isArtisan} 
                    totalSellers={totalSellers} 
                    sellerGroups={sellerGroups} 
                />

                <FormErrorSummary errors={errors} className="mb-4" />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5 lg:gap-6">
                    <div className="space-y-3.5 md:col-span-2">
                        {/* 1. Shipping Method */}
                        <ShippingMethodSelector 
                            shippingMethod={data.shipping_method} 
                            setShippingMethod={(val) => setData((current) => ({ ...current, ...val }))} 
                            pickupDisabled={hasPickupDisabledSeller}
                            disabledSellers={sellersWithPickupDisabled}
                        />

                        {/* 2. Shipping Address OR Workshop Pick Up Schedule */}
                        {data.shipping_method === 'Delivery' ? (
                            <>
                                <ShippingAddressSelector 
                                    auth={auth}
                                    data={data}
                                    setData={setData}
                                    errors={errors}
                                    setError={setError}
                                    clearErrors={clearErrors}
                                    needsDeliveryContactDetails={needsDeliveryContactDetails}
                                />
                                {shippingQuote.status === 'error' && (
                                    <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 sm:p-4 text-xs text-rose-800 shadow-2xs space-y-2">
                                        <div className="flex items-start gap-2.5">
                                            <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                                            <div className="space-y-1 flex-1">
                                                <p className="font-bold text-rose-900 text-sm">
                                                    Delivery Quote Unavailable
                                                </p>
                                                <p className="text-rose-700 leading-relaxed text-xs">
                                                    {shippingQuote.errorMessage || 'Unable to calculate shipping quote. Please check your delivery address.'}
                                                </p>
                                                {shippingQuote.errorMessage?.toLowerCase().includes('identical') && !hasPickupDisabledSeller && (
                                                    <div className="pt-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setData((prev) => ({
                                                                ...prev,
                                                                shipping_method: 'Pick Up',
                                                            }))}
                                                            className="inline-flex items-center gap-1.5 font-semibold text-clay-700 underline hover:text-clay-900 text-xs"
                                                        >
                                                            Switch to Store Pick Up instead
                                                        </button>
                                                    </div>
                                                )}
                                                {(shippingQuote.errorMessage?.toLowerCase().includes('cavite') || shippingQuote.fieldErrors?.shipping_region || shippingQuote.fieldErrors?.shipping_city) && (
                                                    <p className="text-[11px] text-rose-600 font-medium pt-0.5">
                                                        Deliveries are strictly supported within the Province of Cavite. Please check your selected city and barangay.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : totalSellers > 1 ? (
                            <MultiWorkshopPickupSection
                                sellerGroups={sellerGroups}
                                totalSellers={totalSellers}
                                pickupConfigs={pickupConfigs}
                                pickupSchedules={pickupSchedules}
                                activeWorkshopSellerId={activeWorkshopSellerId}
                                setActiveWorkshopSellerId={setActiveWorkshopSellerId}
                                setPickupSchedules={setPickupSchedules}
                                errors={errors}
                                clearErrors={clearErrors}
                            />
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
                        <CheckoutDeliveryNotesCard
                            shippingNotes={data.shipping_notes}
                            setShippingNotes={(val) => setData('shipping_notes', val)}
                            showNotes={showNotes}
                            setShowNotes={setShowNotes}
                        />

                        {/* 4. Promotions & Vouchers */}
                        <CheckoutVoucherSection
                            promoCodeInput={promoCodeInput}
                            setPromoCodeInput={setPromoCodeInput}
                            onApplyPromoCode={handleApplyPromoCode}
                            validatingCode={validatingCode}
                            voucherError={voucherError}
                            setVoucherError={setVoucherError}
                            appliedShopVouchers={appliedShopVouchers}
                            voucherCalculations={voucherCalculations}
                            onRemoveShopVoucher={removeShopVoucher}
                            onOpenDrawer={() => setIsVoucherDrawerOpen(true)}
                            totalAvailableVouchersCount={totalAvailableVouchersCount}
                        />

                        {/* One-Time Safety Check Notice */}
                        {requiresCheckoutFaceCheck && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 flex items-start gap-2.5 text-xs text-amber-900">
                                <ScanFace size={16} className="text-amber-700 shrink-0 mt-0.5" />
                                <p className="leading-snug font-medium">
                                    One-Time Security Check: You will complete a quick face check right before placing your first order across any payment option.
                                </p>
                            </div>
                        )}

                        {/* 5. Payment Method */}
                        <PaymentMethodSelector 
                            paymentMethod={data.payment_method}
                            setPaymentMethod={(val) => setData('payment_method', val)}
                            shippingMethod={data.shipping_method}
                            onlinePaymentDisabled={hasSubMinimumOrder}
                            errors={errors}
                        />

                        {/* Mobile Checkout Compliance Notice */}
                        <div className="md:hidden pt-1">
                            <CheckoutPoliciesNotice
                                activeReturnWindow={activeReturnWindow}
                                onOpenPolicy={handleOpenPolicy}
                            />
                        </div>
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
                            activeReturnWindow={activeReturnWindow}
                            onOpenPolicy={handleOpenPolicy}
                        />
                    </div>
                </div>
            </div>

            {/* Mobile Sticky Bar & Drawer */}
            <CheckoutMobileStickyBar
                summary={summary}
                shippingQuote={shippingQuote}
                shippingMethod={data.shipping_method}
                totalSellers={totalSellers}
                submitDisabled={submitDisabled}
                isPendingArtisan={isPendingArtisan}
                processing={processing}
                submitCheckout={submitCheckout}
                convenienceFeeRate={convenienceFeeRate}
                showAggregateBreakdown={showAggregateBreakdown}
                setQuoteRetryNonce={setQuoteRetryNonce}
                handleUpdateQty={handleUpdateQty}
                handleRemoveItem={handleRemoveItem}
                updatingItemId={updatingItemId}
                removingItemId={removingItemId}
                activeReturnWindow={activeReturnWindow}
                onOpenPolicy={handleOpenPolicy}
            />

            <CheckoutVoucherDrawer
                isOpen={isVoucherDrawerOpen}
                onClose={() => setIsVoucherDrawerOpen(false)}
                availableVouchers={dynamicAvailableVouchers}
                sellerGroups={sellerGroups}
                appliedShopVouchers={appliedShopVouchers}
                voucherCalculations={voucherCalculations}
                onApplyVoucher={applyVoucherObject}
                onRemoveShopVoucher={removeShopVoucher}
                onFollowShop={handleFollowShop}
                followingShopId={followingShopId}
                promoCodeInput={promoCodeInput}
                setPromoCodeInput={setPromoCodeInput}
                onApplyPromoCode={handleApplyPromoCode}
                validatingCode={validatingCode}
                voucherError={voucherError}
            />

            <CheckoutFaceCheckModal
                show={showFaceCheckModal}
                onClose={() => setShowFaceCheckModal(false)}
                onCompleted={() => {
                    setShowFaceCheckModal(false);
                    addToast('Quick face check verified. Placing your order...', 'success');
                    performOrderSubmission();
                }}
            />

            <LegalModal
                isOpen={activeLegalModal.isOpen}
                type={activeLegalModal.type}
                onClose={handleClosePolicyModal}
                hasNextStep={false}
                policies={policies}
            />
        </div>
    );
}

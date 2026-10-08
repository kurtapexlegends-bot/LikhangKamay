import React, { useMemo, useState, useEffect } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import { formatStructuredAddress } from '@/lib/addressFormatting';

// Extracted Subcomponents & Hooks
import ShippingMethodSelector from '@/Components/Consumer/Shop/Checkout/ShippingMethodSelector';
import ShippingAddressSelector from '@/Components/Consumer/Shop/Checkout/ShippingAddressSelector/ShippingAddressSelector';
import PaymentMethodSelector from '@/Components/Consumer/Shop/Checkout/PaymentMethodSelector';
import OrderPricingSummary from '@/Components/Consumer/Shop/Checkout/OrderPricingSummary';
import StorePickupScheduler from '@/Components/Consumer/Shop/Checkout/StorePickupScheduler';
import CheckoutHeader from '@/Components/Consumer/Shop/Checkout/CheckoutHeader';
import MultiWorkshopPickupSection from '@/Components/Consumer/Shop/Checkout/MultiWorkshopPickupSection';
import CheckoutDeliveryNotesCard from '@/Components/Consumer/Shop/Checkout/CheckoutDeliveryNotesCard';
import CheckoutMobileStickyBar from '@/Components/Consumer/Shop/Checkout/CheckoutMobileStickyBar';
import { CheckoutEmptyCartState, CheckoutAdminRestrictedState } from '@/Components/Consumer/Shop/Checkout/CheckoutStatusNotice';
import useCheckoutCart from '@/Components/Consumer/Shop/Checkout/hooks/useCheckoutCart';
import useShippingQuote from '@/Components/Consumer/Shop/Checkout/hooks/useShippingQuote';

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
    const { flash, items: incomingItems = [], pickupConfigs = {} } = usePage().props;
    const { addToast } = useToast();
    const isArtisan = auth?.user?.role === 'artisan';
    const isPendingArtisan = auth?.user?.role === 'artisan' && auth?.user?.artisan_status === 'pending';
    const isAdmin = auth?.user?.role === 'super_admin' || auth?.user?.role === 'admin';

    const convenienceFeeRate = pricing?.convenience_fee_rate ?? 0.03;
    const defaultAddress = auth?.user?.addresses?.find((address) => address.is_default) || null;
    const [showNotes, setShowNotes] = useState(false);

    // Dynamic items and cart syncing hook
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
        shipping_address: resolveAddressDisplay(defaultAddress) || auth?.user?.saved_address || auth?.user?.street_address || '',
        shipping_address_type: defaultAddress?.address_type || 'home',
        shipping_street_address: defaultAddress?.street_address || auth?.user?.street_address || '',
        shipping_barangay: defaultAddress?.barangay || auth?.user?.barangay || '',
        shipping_city: defaultAddress?.city || auth?.user?.city || '',
        shipping_region: defaultAddress?.region || auth?.user?.region || '',
        shipping_postal_code: defaultAddress?.postal_code || auth?.user?.zip_code || '',
        recipient_name: defaultAddress?.recipient_name || auth?.user?.name || '',
        phone_number: defaultAddress?.phone_number || auth?.user?.phone_number || '',
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

    const isNewAddress = data.selected_address_id === 'new' || !auth?.user?.addresses?.length;
    const activeShippingAddress = isNewAddress ? structuredShippingPreview : data.shipping_address;

    // Courier quote hook
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

    const needsDeliveryContactDetails = data.shipping_method === 'Delivery' && (!data.recipient_name.trim() || !data.phone_number.trim());
    const submitDisabled = processing;

    const submitCheckout = (event) => {
        event.preventDefault();
        if (processing) return;

        clearPendingTimers();

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
            />
        </div>
    );
}

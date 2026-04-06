import React, { useMemo, useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, CheckCircle2, CreditCard, Info, MapPin, MessageCircle, Package, Pencil, Save, ShieldCheck, Store, Trash2, Truck, Wallet } from 'lucide-react';
import StructuredAddressFields from '@/Components/Address/StructuredAddressFields';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import { formatStructuredAddress } from '@/lib/addressFormatting';
import ConfirmationModal from '@/Components/ConfirmationModal';

const TYPES = [
    { value: 'home', label: 'Home' },
    { value: 'office', label: 'Office' },
    { value: 'other', label: 'Other' },
];

const peso = (value) => `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const typeLabel = (value) => TYPES.find((type) => type.value === value)?.label || 'Other';
const resolveAddressDisplay = (address) => address?.full_address || formatStructuredAddress({
    street_address: address?.street_address,
    barangay: address?.barangay,
    city: address?.city,
    region: address?.region,
    postal_code: address?.postal_code,
});

export default function Checkout({ auth, wallet, pricing }) {
    const { flash, items: incomingItems = [] } = usePage().props;
    const { addToast } = useToast();
    const convenienceFeeRate = pricing?.convenience_fee_rate ?? 0.03;
    const defaultAddress = auth.user.addresses?.find((address) => address.is_default) || null;
    const [selectedAddressId, setSelectedAddressId] = useState(defaultAddress?.id || 'new');
    const [editingAddressId, setEditingAddressId] = useState(null);
    const [deleteAddressTarget, setDeleteAddressTarget] = useState(null);
    const [shippingQuote, setShippingQuote] = useState({
        status: 'idle',
        totalShippingFee: 0,
        groups: {},
    });
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

    const isNewAddress = selectedAddressId === 'new' || !auth.user.addresses?.length;
    const showAddressForm = isNewAddress || editingAddressId !== null;
    const activeShippingAddress = isNewAddress ? structuredShippingPreview : data.shipping_address;

    React.useEffect(() => {
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
                    selected_address_id: selectedAddressId,
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

                setShippingQuote({
                    status: 'ready',
                    totalShippingFee: Number(response.data.total_shipping_fee || 0),
                    groups: groupsBySellerId,
                });
            } catch {
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
        selectedAddressId,
    ]);

    const summary = useMemo(() => {
        const merchandiseSubtotal = sellerGroups.reduce((sum, group) => sum + group.subtotal, 0);
        const convenienceFeeForSubtotal = (subtotal) => Number((subtotal * convenienceFeeRate).toFixed(2));
        const convenienceFeeTotal = data.shipping_method === 'Delivery'
            ? Number(sellerGroups.reduce((sum, group) => sum + convenienceFeeForSubtotal(group.subtotal), 0).toFixed(2))
            : 0;
        const shippingFeeTotal = data.shipping_method === 'Delivery'
            ? Number(shippingQuote.totalShippingFee || 0)
            : 0;
        return {
            merchandiseSubtotal,
            convenienceFeeTotal,
            shippingFeeTotal,
            grandTotal: Number((merchandiseSubtotal + convenienceFeeTotal + shippingFeeTotal).toFixed(2)),
            groups: sellerGroups.map((group) => ({
                ...group,
                convenienceFee: data.shipping_method === 'Delivery' ? convenienceFeeForSubtotal(group.subtotal) : 0,
                shippingFee: data.shipping_method === 'Delivery'
                    ? Number(shippingQuote.groups[String(group.sellerId)] || 0)
                    : 0,
                total: Number((
                    data.shipping_method === 'Delivery'
                        ? group.subtotal
                            + convenienceFeeForSubtotal(group.subtotal)
                            + Number(shippingQuote.groups[String(group.sellerId)] || 0)
                        : group.subtotal
                ).toFixed(2)),
            })),
        };
    }, [convenienceFeeRate, data.shipping_method, sellerGroups, shippingQuote.groups, shippingQuote.totalShippingFee]);

    const shippingFeeSummaryValue = data.shipping_method === 'Pick Up'
        ? peso(0)
        : shippingQuote.status === 'ready'
            ? peso(summary.shippingFeeTotal)
            : 'Calculating...';

    const showAggregateBreakdown = totalSellers > 1;

    React.useEffect(() => {
        setData('total', summary.grandTotal);
    }, [setData, summary.grandTotal]);

    React.useEffect(() => {
        if (selectedAddressId !== 'new') {
            return;
        }

        if (data.shipping_address !== structuredShippingPreview) {
            setData('shipping_address', structuredShippingPreview);
        }
    }, [data.shipping_address, selectedAddressId, setData, structuredShippingPreview]);

    React.useEffect(() => {
        if (!auth.user.addresses?.length) {
            if (selectedAddressId !== 'new') {
                setSelectedAddressId('new');
            }

            return;
        }

        if (selectedAddressId === 'new') {
            return;
        }

        const stillExists = auth.user.addresses.some((address) => String(address.id) === String(selectedAddressId));

        if (!stillExists) {
            const fallback = auth.user.addresses.find((address) => address.is_default) || auth.user.addresses[0];

            if (fallback) {
                setSelectedAddressId(fallback.id);
                setEditingAddressId(null);
            }
        }
    }, [auth.user.addresses, selectedAddressId]);
    const walletBalance = Number(wallet?.balance || 0);
    const walletEligible = data.shipping_method === 'Delivery' && walletBalance >= summary.grandTotal;
    const needsDeliveryContactDetails = data.shipping_method === 'Delivery' && (!data.recipient_name.trim() || !data.phone_number.trim());

    const chooseSavedAddress = (address) => {
        setSelectedAddressId(address.id);
        setEditingAddressId(null);
        setData((current) => ({
            ...current,
            selected_address_id: address.id,
            address_label: address.label || typeLabel(address.address_type || 'home'),
            shipping_address: resolveAddressDisplay(address),
            shipping_address_type: address.address_type || 'home',
            shipping_street_address: address.street_address || '',
            shipping_barangay: address.barangay || '',
            shipping_city: address.city || '',
            shipping_region: address.region || '',
            shipping_postal_code: address.postal_code || '',
            recipient_name: address.recipient_name || auth.user.name || '',
            phone_number: address.phone_number || auth.user.phone_number || '',
            save_address: false,
        }));
    };

    const chooseNewAddress = () => {
        setSelectedAddressId('new');
        setEditingAddressId(null);
        setData((current) => ({
            ...current,
            selected_address_id: 'new',
            address_label: typeLabel(current.shipping_address_type || 'home'),
            shipping_address: '',
            shipping_address_type: current.shipping_address_type || 'home',
            shipping_street_address: auth.user.street_address || '',
            shipping_barangay: auth.user.barangay || '',
            shipping_city: auth.user.city || '',
            shipping_region: auth.user.region || '',
            shipping_postal_code: auth.user.zip_code || '',
            recipient_name: auth.user.name || '',
            phone_number: auth.user.phone_number || '',
            save_address: false,
        }));
    };

    const startEditingAddress = (address) => {
        setSelectedAddressId(address.id);
        setEditingAddressId(address.id);
        setData((current) => ({
            ...current,
            selected_address_id: address.id,
            address_label: address.label || typeLabel(address.address_type || 'home'),
            shipping_address: resolveAddressDisplay(address),
            shipping_address_type: address.address_type || 'home',
            shipping_street_address: address.street_address || '',
            shipping_barangay: address.barangay || '',
            shipping_city: address.city || '',
            shipping_region: address.region || '',
            shipping_postal_code: address.postal_code || '',
            recipient_name: address.recipient_name || auth.user.name || '',
            phone_number: address.phone_number || auth.user.phone_number || '',
            save_address: false,
        }));
    };

    const cancelAddressForm = () => {
        if (auth.user.addresses?.length && selectedAddressId !== 'new') {
            const fallback = auth.user.addresses.find((address) => String(address.id) === String(selectedAddressId));

            if (fallback) {
                chooseSavedAddress(fallback);
                return;
            }
        }

        chooseNewAddress();
    };

    const saveAddress = () => {
        const payload = {
            label: data.address_label || typeLabel(data.shipping_address_type || 'home'),
            address_type: data.shipping_address_type,
            recipient_name: data.recipient_name,
            phone_number: data.phone_number,
            street_address: data.shipping_street_address,
            barangay: data.shipping_barangay,
            city: data.shipping_city,
            region: data.shipping_region,
            postal_code: data.shipping_postal_code,
        };

        const onSuccess = () => {
            setEditingAddressId(null);
        };

        if (editingAddressId) {
            router.patch(route('user-addresses.update', editingAddressId), payload, {
                preserveScroll: true,
                onSuccess,
            });
            return;
        }

        router.post(route('user-addresses.store'), payload, {
            preserveScroll: true,
            onSuccess,
        });
    };

    const setDefaultAddress = (addressId) => {
        router.patch(route('user-addresses.set-default', addressId), {}, {
            preserveScroll: true,
        });
    };

    const deleteAddress = () => {
        if (!deleteAddressTarget) {
            return;
        }

        router.delete(route('user-addresses.destroy', deleteAddressTarget.id), {
            preserveScroll: true,
            onFinish: () => {
                if (String(selectedAddressId) === String(deleteAddressTarget.id)) {
                    setSelectedAddressId('new');
                    setEditingAddressId(null);
                }

                setDeleteAddressTarget(null);
            },
        });
    };

    const submitDisabled = processing
        || (data.shipping_method === 'Delivery' && !activeShippingAddress.trim())
        || (data.shipping_method === 'Delivery' && shippingQuote.status !== 'ready')
        || (data.shipping_method === 'Delivery' && (!data.recipient_name.trim() || !data.phone_number.trim()))
        || (data.payment_method === 'Wallet' && !walletEligible)
        || (data.save_address && isNewAddress && (!data.recipient_name.trim() || !data.phone_number.trim()));

    return (
        <div className="min-h-screen bg-[#FDFBF9] px-4 py-6 font-sans text-gray-800 sm:px-6 sm:py-12 lg:px-8">
            <Head title="Checkout" />
            <div className="mx-auto max-w-6xl">
                <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
                    <button onClick={() => window.history.back()} className="flex items-center gap-2 text-gray-400 transition hover:text-clay-600">
                        <div className="rounded-full border border-gray-100 bg-white p-2 shadow-sm"><ArrowLeft size={18} /></div>
                        <span className="text-xs font-bold uppercase tracking-widest">Go Back</span>
                    </button>
                    <div className="flex items-center gap-2 text-gray-400">
                        <ShieldCheck size={16} className="text-emerald-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">End-to-End Encrypted</span>
                    </div>
                </div>

                <div className="mb-6 flex items-center gap-3 sm:mb-8">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80">
                        <img src="/images/logo.png" alt="Logo" className="h-10 w-10 object-contain" />
                        <h1 className="font-serif text-xl font-bold text-gray-900 sm:text-2xl">Secure Checkout</h1>
                    </Link>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-7">
                    <div className="space-y-4 lg:col-span-2">
                        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
                            <div className="mb-3 flex items-center gap-3 text-clay-700"><Truck size={18} /><h2 className="text-base font-bold">Shipping Method</h2></div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 ${data.shipping_method === 'Delivery' ? 'border-clay-600 bg-clay-50 ring-1 ring-clay-600' : 'border-gray-200 hover:border-clay-300'}`}>
                                    <input type="radio" name="shipping_method" value="Delivery" checked={data.shipping_method === 'Delivery'} onChange={(event) => setData((current) => ({ ...current, shipping_method: event.target.value }))} className="text-clay-600 focus:ring-clay-500" />
                                    <div><p className="font-bold text-gray-900">Standard Delivery</p><p className="text-xs text-gray-500">3% fee per seller order subtotal.</p></div>
                                </label>
                                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 ${data.shipping_method === 'Pick Up' ? 'border-clay-600 bg-clay-50 ring-1 ring-clay-600' : 'border-gray-200 hover:border-clay-300'}`}>
                                    <input type="radio" name="shipping_method" value="Pick Up" checked={data.shipping_method === 'Pick Up'} onChange={(event) => setData((current) => ({ ...current, shipping_method: event.target.value, payment_method: 'COD' }))} className="text-clay-600 focus:ring-clay-500" />
                                    <div><p className="font-bold text-gray-900">Store Pick Up</p><p className="text-xs text-gray-500">No convenience fee. COD only.</p></div>
                                </label>
                            </div>
                        </div>

                        {data.shipping_method === 'Delivery' ? (
                            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
                                <div className="mb-3 flex items-center gap-3 text-clay-700"><MapPin size={18} /><h2 className="text-base font-bold">Shipping Address</h2></div>
                                {!!auth.user.addresses?.length && (
                                    <div className="mb-4 grid gap-3 sm:grid-cols-2">
                                        {auth.user.addresses.map((address) => (
                                            <div
                                                key={address.id}
                                                onClick={() => chooseSavedAddress(address)}
                                                className={`cursor-pointer rounded-xl border p-4 ${
                                                    selectedAddressId === address.id
                                                        ? address.is_default
                                                            ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                                                            : 'border-clay-600 bg-clay-50 ring-1 ring-clay-600'
                                                        : address.is_default
                                                            ? 'border-emerald-500 bg-emerald-50'
                                                            : 'border-gray-200 hover:border-clay-300'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-sm font-bold text-gray-800">{address.label}</span>
                                                            <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                                                                {typeLabel(address.address_type)}
                                                            </span>
                                                            {address.is_default && (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                                                                    <CheckCircle2 size={10} />
                                                                    Default
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-0.5" onClick={(event) => event.stopPropagation()}>
                                                        {!address.is_default && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setDefaultAddress(address.id)}
                                                                className="rounded-md px-1.5 py-1 text-[10px] font-medium leading-none text-gray-500 transition hover:bg-white hover:text-indigo-600"
                                                            >
                                                                Set Default
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => startEditingAddress(address)}
                                                            className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[10px] font-medium leading-none text-gray-500 transition hover:bg-white hover:text-indigo-600"
                                                        >
                                                            <Pencil size={12} />
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeleteAddressTarget(address)}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition hover:bg-white hover:text-red-600"
                                                            aria-label={`Delete ${address.label} address`}
                                                            title="Delete address"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                        {selectedAddressId === address.id && !address.is_default && <CheckCircle2 size={16} className="text-clay-600" />}
                                                    </div>
                                                </div>
                                                <p className="mt-2 line-clamp-2 text-xs text-gray-600">{resolveAddressDisplay(address)}</p>
                                                <p className="mt-1 text-[10px] text-gray-500">{address.recipient_name} | {address.phone_number}</p>
                                            </div>
                                        ))}
                                        <div onClick={chooseNewAddress} className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-3.5 text-center ${selectedAddressId === 'new' ? 'border-clay-600 bg-clay-50 text-clay-700' : 'border-gray-200 text-gray-400 hover:border-clay-400 hover:text-clay-600'}`}>
                                            <span className="text-2xl font-light">+</span>
                                            <span className="text-sm font-medium">Use New Address</span>
                                        </div>
                                    </div>
                                )}

                                {showAddressForm && (
                                    <div className="space-y-3.5">
                                        <div>
                                            <p className="mb-2 text-sm font-bold text-gray-800">Address Type</p>
                                            <div className="grid grid-cols-3 gap-2.5">
                                                {TYPES.map((type) => (
                                                    <button key={type.value} type="button" onClick={() => setData((current) => ({ ...current, shipping_address_type: type.value }))} className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${data.shipping_address_type === type.value ? 'border-clay-600 bg-clay-50 text-clay-700' : 'border-gray-200 text-gray-500 hover:border-clay-300'}`}>{type.label}</button>
                                                ))}
                                            </div>
                                            {errors.shipping_address_type && <p className="mt-1 text-sm text-red-500">{errors.shipping_address_type}</p>}
                                        </div>
                                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-1 block text-sm font-bold text-gray-700">Recipient Name</label>
                                                <input
                                                    type="text"
                                                    value={data.recipient_name}
                                                    onChange={(event) => setData('recipient_name', event.target.value)}
                                                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-clay-500 focus:ring-clay-500"
                                                    placeholder="Full recipient name"
                                                />
                                                {errors.recipient_name && <p className="mt-1 text-sm text-red-500">{errors.recipient_name}</p>}
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-sm font-bold text-gray-700">Phone Number</label>
                                                <input
                                                    type="text"
                                                    value={data.phone_number}
                                                    onChange={(event) => setData('phone_number', event.target.value)}
                                                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-clay-500 focus:ring-clay-500"
                                                    placeholder="09XXXXXXXXX"
                                                />
                                                {errors.phone_number && <p className="mt-1 text-sm text-red-500">{errors.phone_number}</p>}
                                            </div>
                                        </div>
                                        <StructuredAddressFields
                                            key={`checkout-address-${selectedAddressId}`}
                                            data={data}
                                            setData={setData}
                                            errors={errors}
                                            prefix="shipping_"
                                            required
                                            previewLabel="Delivery Address"
                                        />
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={saveAddress}
                                                className="rounded-xl bg-clay-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-clay-700"
                                            >
                                                Save Address
                                            </button>
                                            <button
                                                type="button"
                                                onClick={cancelAddressForm}
                                                className="text-sm font-medium text-gray-500 hover:text-gray-700"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {!isNewAddress && needsDeliveryContactDetails && (
                                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                        <p className="text-sm font-bold text-amber-800">Complete delivery contact details</p>
                                        <p className="mt-1 text-xs text-amber-700">This saved address is missing recipient details required for courier booking.</p>
                                        <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-1 block text-sm font-bold text-gray-700">Recipient Name</label>
                                                <input
                                                    type="text"
                                                    value={data.recipient_name}
                                                    onChange={(event) => setData('recipient_name', event.target.value)}
                                                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-clay-500 focus:ring-clay-500"
                                                    placeholder="Full recipient name"
                                                />
                                                {errors.recipient_name && <p className="mt-1 text-sm text-red-500">{errors.recipient_name}</p>}
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-sm font-bold text-gray-700">Phone Number</label>
                                                <input
                                                    type="text"
                                                    value={data.phone_number}
                                                    onChange={(event) => setData('phone_number', event.target.value)}
                                                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-clay-500 focus:ring-clay-500"
                                                    placeholder="09XXXXXXXXX"
                                                />
                                                {errors.phone_number && <p className="mt-1 text-sm text-red-500">{errors.phone_number}</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {errors.shipping_address && <p className="mt-1 text-sm text-red-500">{errors.shipping_address}</p>}
                                {errors.selected_address_id && <p className="mt-1 text-sm text-red-500">{errors.selected_address_id}</p>}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
                                <div className="flex items-start gap-3.5">
                                    <div className="rounded-full bg-blue-100 p-2.5 text-blue-600"><Store size={20} /></div>
                                    <div><h3 className="text-base font-bold text-blue-900">Store Pick Up Selected</h3><p className="mt-1 text-sm text-blue-800">No address needed. Coordinate pick-up in chat.</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">No Convenience Fee</span><span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">COD Only</span></div></div>
                                </div>
                            </div>
                        )}

                        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
                            <div className="mb-3 flex items-center gap-3 text-clay-700"><Truck size={18} /><h2 className="text-base font-bold">Delivery Notes</h2><span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Optional</span></div>
                            <textarea rows="2" className="w-full rounded-xl border-gray-300 text-sm shadow-sm focus:border-clay-500 focus:ring-clay-500" placeholder="e.g. Gate code, landmark, available time, or handoff instructions" value={data.shipping_notes} onChange={(event) => setData('shipping_notes', event.target.value)} />
                            <p className="mt-2 flex items-center gap-1 text-xs text-gray-400"><Info size={12} />Shared with the seller and courier if this order is booked through Lalamove.</p>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
                            <div className="mb-3 flex items-center gap-3 text-clay-700"><CreditCard size={18} /><h2 className="text-base font-bold">Payment Method</h2></div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 ${data.payment_method === 'COD' ? 'border-clay-600 bg-clay-50 ring-1 ring-clay-600' : 'border-gray-200 hover:border-clay-300'}`}>
                                    <input type="radio" name="payment" value="COD" checked={data.payment_method === 'COD'} onChange={(event) => setData('payment_method', event.target.value)} className="text-clay-600 focus:ring-clay-500" />
                                    <div><p className="font-bold text-gray-900">Cash on Delivery</p><p className="text-xs text-gray-500">Pay when you receive</p></div>
                                </label>
                                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 ${data.shipping_method === 'Pick Up' ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-50' : data.payment_method === 'GCash' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <input type="radio" name="payment" value="GCash" checked={data.payment_method === 'GCash'} onChange={(event) => setData('payment_method', event.target.value)} disabled={data.shipping_method === 'Pick Up'} className="text-blue-600 focus:ring-blue-500 disabled:opacity-50" />
                                    <div><p className="font-bold text-gray-900">GCash</p><p className="text-xs text-gray-500">{data.shipping_method === 'Pick Up' ? 'Not available for pickup' : 'Pay online after order placement'}</p></div>
                                </label>
                                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 ${data.shipping_method === 'Pick Up' || !walletEligible ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-60' : data.payment_method === 'Wallet' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-gray-200 hover:border-emerald-300'}`}>
                                    <input type="radio" name="payment" value="Wallet" checked={data.payment_method === 'Wallet'} onChange={(event) => setData('payment_method', event.target.value)} disabled={data.shipping_method === 'Pick Up' || !walletEligible} className="text-emerald-600 focus:ring-emerald-500 disabled:opacity-50" />
                                    <div><p className="font-bold text-gray-900">Wallet</p><p className="text-xs text-gray-500">{data.shipping_method === 'Pick Up' ? 'Wallet disabled for pickup' : walletEligible ? `Available balance: ${peso(walletBalance)}` : `Need ${peso(summary.grandTotal)} total`}</p></div>
                                </label>
                            </div>
                            {errors.payment_method && <p className="mt-2 text-sm text-red-500">{errors.payment_method}</p>}
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_20px_45px_rgba(34,24,16,0.07)] lg:sticky lg:top-24 sm:p-5">
                            <h3 className="mb-4 text-base font-bold text-gray-900">Order Summary</h3>
                            <div className="mb-5 max-h-80 space-y-5 overflow-y-auto pr-1.5">
                                {summary.groups.map((group) => (
                                    <div key={group.sellerId} className="space-y-3">
                                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2"><Store size={14} className="text-clay-500" /><span className="text-sm font-bold text-gray-700">{group.shopName}</span></div>
                                        {group.items.map((item, index) => (
                                            <div key={`${group.sellerId}-${index}`} className="flex gap-3">
                                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100"><img src={item.img ? (item.img.startsWith('http') || item.img.startsWith('/storage') ? item.img : `/storage/${item.img}`) : '/images/no-image.png'} alt={item.name} className="h-full w-full object-cover" onError={(event) => { event.target.onerror = null; event.target.src = '/images/no-image.png'; }} /></div>
                                                <div className="min-w-0 flex-1"><p className="line-clamp-1 text-sm font-bold text-gray-800">{item.name}</p><p className="text-xs text-gray-500">{item.variant} - x{item.qty}</p><p className="text-sm font-medium text-clay-600">{peso(item.price * item.qty)}</p></div>
                                            </div>
                                        ))}
                                        <div className="space-y-1 border-t border-dashed border-gray-200 pt-2 text-xs text-gray-500">
                                            {!showAggregateBreakdown && (
                                                <>
                                                    <div className="flex justify-between"><span>Merchandise</span><span className="font-medium">{peso(group.subtotal)}</span></div>
                                                    {data.shipping_method === 'Delivery' && <div className="flex justify-between"><span>Convenience Fee (3%)</span><span className="font-medium">{peso(group.convenienceFee)}</span></div>}
                                                    {data.shipping_method === 'Delivery' && <div className="flex justify-between"><span>Shipping Fee</span><span className="font-medium">{peso(group.shippingFee)}</span></div>}
                                                </>
                                            )}
                                            {showAggregateBreakdown && (
                                                <div className="flex justify-between font-bold text-gray-700"><span>Seller Total</span><span>{peso(group.total)}</span></div>
                                            )}
                                            {!showAggregateBreakdown && (
                                                <div className="flex justify-between font-bold text-gray-900"><span>Order Total</span><span>{peso(group.total)}</span></div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2 border-t border-gray-100 pt-4 text-sm text-gray-600">
                                {showAggregateBreakdown && (
                                    <>
                                        <div className="flex justify-between"><span>Merchandise Subtotal</span><span>{peso(summary.merchandiseSubtotal)}</span></div>
                                        <div className="flex justify-between"><span>Convenience Fee (3%)</span><span>{peso(summary.convenienceFeeTotal)}</span></div>
                                        <div className="flex justify-between"><span>Shipping Fee</span><span className={data.shipping_method === 'Delivery' && shippingQuote.status !== 'ready' ? 'text-xs italic text-gray-400' : ''}>{shippingFeeSummaryValue}</span></div>
                                    </>
                                )}
                                {totalSellers > 1 && <div className="flex justify-between text-xs text-blue-600"><span className="flex items-center gap-1"><Package size={12} />Orders Created</span><span className="font-bold">{totalSellers} separate orders</span></div>}
                                <div className="mt-2 flex justify-between border-t border-dashed border-gray-200 pt-2 text-lg font-bold text-gray-900"><span>Total Due Now</span><span>{peso(summary.grandTotal)}</span></div>
                                <p className="text-center text-[10px] text-gray-400">
                                    {data.shipping_method === 'Pick Up'
                                        ? 'Pickup orders have no shipping charge.'
                                        : shippingQuote.status === 'ready'
                                            ? 'Shipping fee is already included in the total due now.'
                                            : 'Waiting for the delivery quote before enabling checkout.'}
                                </p>
                            </div>
                            <button onClick={(event) => { event.preventDefault(); post(route('checkout.store')); }} disabled={submitDisabled} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-clay-600 py-3.5 text-sm font-bold text-white shadow-md shadow-clay-200 transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-50"><ShieldCheck size={18} />{processing ? 'Processing...' : totalSellers > 1 ? `Place ${totalSellers} Orders` : 'Place Order'}</button>
                            <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-gray-400"><MessageCircle size={12} />Message seller{totalSellers > 1 ? 's' : ''} after ordering</p>
                        </div>
                    </div>
                </div>
            </div>
            <ConfirmationModal
                isOpen={!!deleteAddressTarget}
                onClose={() => setDeleteAddressTarget(null)}
                onConfirm={deleteAddress}
                title="Delete address?"
                message={deleteAddressTarget ? `Remove ${deleteAddressTarget.label} from your address book?` : 'Delete this address?'}
                icon={AlertTriangle}
                iconBg="bg-red-50 text-red-600"
                confirmText="Delete"
                confirmColor="bg-red-600 hover:bg-red-700"
            />
        </div>
    );
}

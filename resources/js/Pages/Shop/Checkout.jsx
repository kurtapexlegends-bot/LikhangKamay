import React, { useMemo, useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, CreditCard, Info, MapPin, MessageCircle, Package, Save, ShieldCheck, Store, Truck, Wallet } from 'lucide-react';
import StructuredAddressFields from '@/Components/Address/StructuredAddressFields';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import { formatStructuredAddress } from '@/lib/addressFormatting';

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

    const summary = useMemo(() => {
        const merchandiseSubtotal = sellerGroups.reduce((sum, group) => sum + group.subtotal, 0);
        const convenienceFeeForSubtotal = (subtotal) => Number((subtotal * convenienceFeeRate).toFixed(2));
        const convenienceFeeTotal = data.shipping_method === 'Delivery'
            ? Number(sellerGroups.reduce((sum, group) => sum + convenienceFeeForSubtotal(group.subtotal), 0).toFixed(2))
            : 0;
        return {
            merchandiseSubtotal,
            convenienceFeeTotal,
            grandTotal: Number((merchandiseSubtotal + convenienceFeeTotal).toFixed(2)),
            groups: sellerGroups.map((group) => ({
                ...group,
                convenienceFee: data.shipping_method === 'Delivery' ? convenienceFeeForSubtotal(group.subtotal) : 0,
                total: Number((
                    data.shipping_method === 'Delivery'
                        ? group.subtotal + convenienceFeeForSubtotal(group.subtotal)
                        : group.subtotal
                ).toFixed(2)),
            })),
        };
    }, [convenienceFeeRate, data.shipping_method, sellerGroups]);

    React.useEffect(() => {
        setData('total', summary.grandTotal);
    }, [setData, summary.grandTotal]);

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

    React.useEffect(() => {
        if (selectedAddressId !== 'new') {
            return;
        }

        if (data.shipping_address !== structuredShippingPreview) {
            setData('shipping_address', structuredShippingPreview);
        }
    }, [data.shipping_address, selectedAddressId, setData, structuredShippingPreview]);

    const walletBalance = Number(wallet?.balance || 0);
    const walletEligible = data.shipping_method === 'Delivery' && walletBalance >= summary.grandTotal;
    const checkoutNotes = [
        {
            key: 'wallet',
            icon: Wallet,
            tone: 'emerald',
            label: 'Wallet',
            value: peso(walletBalance),
            detail: data.shipping_method === 'Pick Up'
                ? 'Pickup uses COD.'
                : walletEligible
                    ? 'Ready for wallet checkout.'
                    : 'Delivery only. Full amount required.',
        },
        {
            key: 'shipping',
            icon: MessageCircle,
            tone: 'amber',
            label: 'Shipping Fee',
            value: 'Settled in chat',
            detail: 'Excluded from this total.',
        },
        ...(totalSellers > 1 ? [{
            key: 'sellers',
            icon: Store,
            tone: 'blue',
            label: 'Orders',
            value: `${totalSellers} sellers`,
            detail: 'Separate orders will be created.',
        }] : []),
    ];
    const isNewAddress = selectedAddressId === 'new' || !auth.user.addresses?.length;
    const needsDeliveryContactDetails = data.shipping_method === 'Delivery' && (!data.recipient_name.trim() || !data.phone_number.trim());

    const chooseSavedAddress = (address) => {
        setSelectedAddressId(address.id);
        setData((current) => ({
            ...current,
            selected_address_id: address.id,
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
        setData((current) => ({
            ...current,
            selected_address_id: 'new',
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

    const activeShippingAddress = isNewAddress ? structuredShippingPreview : data.shipping_address;

    const submitDisabled = processing
        || (data.shipping_method === 'Delivery' && !activeShippingAddress.trim())
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
                        <div className="rounded-2xl border border-[#E9E1D9] bg-white px-4 py-3.5 shadow-sm">
                            <div className={`grid gap-3 ${checkoutNotes.length === 3 ? 'lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
                                {checkoutNotes.map((note) => {
                                    const Icon = note.icon;
                                    const tones = {
                                        emerald: {
                                            shell: 'border-emerald-100 bg-emerald-50/70',
                                            icon: 'bg-emerald-100 text-emerald-700',
                                            label: 'text-emerald-900',
                                            value: 'text-emerald-800',
                                            detail: 'text-emerald-700',
                                        },
                                        amber: {
                                            shell: 'border-amber-100 bg-amber-50/70',
                                            icon: 'bg-amber-100 text-amber-700',
                                            label: 'text-amber-900',
                                            value: 'text-amber-800',
                                            detail: 'text-amber-700',
                                        },
                                        blue: {
                                            shell: 'border-blue-100 bg-blue-50/70',
                                            icon: 'bg-blue-100 text-blue-700',
                                            label: 'text-blue-900',
                                            value: 'text-blue-800',
                                            detail: 'text-blue-700',
                                        },
                                    }[note.tone];

                                    return (
                                        <div key={note.key} className={`rounded-xl border px-3 py-3 ${tones.shell}`}>
                                            <div className="flex items-start gap-3">
                                                <div className={`rounded-lg p-2 ${tones.icon}`}><Icon size={17} /></div>
                                                <div className="min-w-0">
                                                    <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${tones.label}`}>{note.label}</p>
                                                    <p className={`mt-1 text-sm font-bold sm:text-[15px] ${tones.value}`}>{note.value}</p>
                                                    <p className={`mt-0.5 text-[11px] ${tones.detail}`}>{note.detail}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

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
                                            <div key={address.id} onClick={() => chooseSavedAddress(address)} className={`cursor-pointer rounded-xl border-2 p-3.5 ${selectedAddressId === address.id ? 'border-clay-600 bg-clay-50' : 'border-gray-100 hover:border-clay-200'}`}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <span className="text-sm font-bold text-gray-800">{address.label}</span>
                                                        <div className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-clay-700 shadow-sm">{typeLabel(address.address_type)}</div>
                                                    </div>
                                                    {selectedAddressId === address.id && <CheckCircle2 size={16} className="text-clay-600" />}
                                                </div>
                                                <p className="mt-2 line-clamp-2 text-xs text-gray-600">{resolveAddressDisplay(address)}</p>
                                                <p className="mt-1 text-[10px] text-gray-500">{address.recipient_name} | {address.phone_number}</p>
                                            </div>
                                        ))}
                                        <div onClick={chooseNewAddress} className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-3.5 text-center ${selectedAddressId === 'new' ? 'border-clay-600 bg-clay-50 text-clay-700' : 'border-gray-200 text-gray-400 hover:border-clay-400 hover:text-clay-600'}`}>
                                            <span className="text-sm font-medium">Use New Address</span><span className="text-xs">Select an address type below.</span>
                                        </div>
                                    </div>
                                )}

                                {isNewAddress && (
                                    <div className="space-y-3.5">
                                        <div>
                                            <p className="mb-2 text-sm font-bold text-gray-800">Address Type</p>
                                            <div className="grid grid-cols-3 gap-2.5">
                                                {TYPES.map((type) => (
                                                    <button key={type.value} type="button" onClick={() => setData('shipping_address_type', type.value)} className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${data.shipping_address_type === type.value ? 'border-clay-600 bg-clay-50 text-clay-700' : 'border-gray-200 text-gray-500 hover:border-clay-300'}`}>{type.label}</button>
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
                                            helperText="Use the buyer's exact delivery address."
                                            previewLabel="Delivery Address"
                                        />
                                        <label className="flex items-center gap-3"><input type="checkbox" checked={data.save_address} onChange={(event) => setData('save_address', event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-clay-600 focus:ring-clay-500" /><span className="flex items-center gap-1.5 text-sm text-gray-600"><Save size={14} className="text-gray-400" />Save as my default address</span></label>
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
                                            <div className="flex justify-between"><span>Merchandise ({group.shopName})</span><span className="font-medium">{peso(group.subtotal)}</span></div>
                                            {data.shipping_method === 'Delivery' && <div className="flex justify-between"><span>Convenience Fee (3%)</span><span className="font-medium">{peso(group.convenienceFee)}</span></div>}
                                            <div className="flex justify-between font-bold text-gray-700"><span>Order Total</span><span>{peso(group.total)}</span></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2 border-t border-gray-100 pt-4 text-sm text-gray-600">
                                <div className="flex justify-between"><span>Merchandise Subtotal</span><span>{peso(summary.merchandiseSubtotal)}</span></div>
                                <div className="flex justify-between"><span>Convenience Fee (3%)</span><span>{peso(summary.convenienceFeeTotal)}</span></div>
                                <div className="flex justify-between text-gray-400"><span>Shipping Fee</span><span className="text-xs italic">To be discussed</span></div>
                                {totalSellers > 1 && <div className="flex justify-between text-xs text-blue-600"><span className="flex items-center gap-1"><Package size={12} />Orders Created</span><span className="font-bold">{totalSellers} separate orders</span></div>}
                                <div className="mt-2 flex justify-between border-t border-dashed border-gray-200 pt-2 text-lg font-bold text-gray-900"><span>Total Due Now</span><span>{peso(summary.grandTotal)}</span></div>
                                <p className="text-center text-[10px] text-gray-400">Shipping fee is confirmed with each seller after checkout.</p>
                            </div>
                            <button onClick={(event) => { event.preventDefault(); post(route('checkout.store')); }} disabled={submitDisabled} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-clay-600 py-3.5 text-sm font-bold text-white shadow-xl shadow-clay-200 transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-50"><ShieldCheck size={18} />{processing ? 'Processing...' : totalSellers > 1 ? `Place ${totalSellers} Orders` : 'Place Order'}</button>
                            <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-gray-400"><MessageCircle size={12} />Message seller{totalSellers > 1 ? 's' : ''} after ordering</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

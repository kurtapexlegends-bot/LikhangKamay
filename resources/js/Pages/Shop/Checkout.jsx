import React, { useMemo, useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, CheckCircle, CheckCircle2, CreditCard, Info, MapPin, MessageCircle, Package, Save, ShieldCheck, Store, Truck, Wallet, X } from 'lucide-react';

const TYPES = [
    { value: 'home', label: 'Home' },
    { value: 'office', label: 'Office' },
    { value: 'other', label: 'Other' },
];

const peso = (value) => `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const typeLabel = (value) => TYPES.find((type) => type.value === value)?.label || 'Other';

export default function Checkout({ auth, wallet, pricing }) {
    const { flash, items: incomingItems = [] } = usePage().props;
    const feePerOrder = pricing?.convenience_fee_per_delivery_order ?? 20;
    const defaultAddress = auth.user.addresses?.find((address) => address.is_default) || null;
    const [selectedAddressId, setSelectedAddressId] = useState(defaultAddress?.id || 'new');
    const [showToast, setShowToast] = useState(false);
    const [toast, setToast] = useState({ type: 'success', message: '' });

    React.useEffect(() => {
        if (flash.success) {
            setToast({ type: 'success', message: flash.success });
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
        if (flash.error) {
            setToast({ type: 'error', message: flash.error });
            setShowToast(true);
            setTimeout(() => setShowToast(false), 5000);
        }
    }, [flash]);

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
        shipping_address: defaultAddress?.full_address || auth.user.saved_address || auth.user.street_address || '',
        shipping_address_type: defaultAddress?.address_type || 'home',
        recipient_name: auth.user.name || '',
        phone_number: auth.user.phone_number || '',
        shipping_notes: '',
        payment_method: 'COD',
        shipping_method: 'Delivery',
        save_address: false,
        total: 0,
    });

    const summary = useMemo(() => {
        const merchandiseSubtotal = sellerGroups.reduce((sum, group) => sum + group.subtotal, 0);
        const convenienceFeeTotal = data.shipping_method === 'Delivery' ? totalSellers * feePerOrder : 0;
        return {
            merchandiseSubtotal,
            convenienceFeeTotal,
            grandTotal: merchandiseSubtotal + convenienceFeeTotal,
            groups: sellerGroups.map((group) => ({
                ...group,
                convenienceFee: data.shipping_method === 'Delivery' ? feePerOrder : 0,
                total: group.subtotal + (data.shipping_method === 'Delivery' ? feePerOrder : 0),
            })),
        };
    }, [data.shipping_method, feePerOrder, sellerGroups, totalSellers]);

    React.useEffect(() => {
        setData('total', summary.grandTotal);
    }, [setData, summary.grandTotal]);

    const walletBalance = Number(wallet?.balance || 0);
    const walletEligible = data.shipping_method === 'Delivery' && walletBalance >= summary.grandTotal;
    const isNewAddress = selectedAddressId === 'new' || !auth.user.addresses?.length;

    const chooseSavedAddress = (address) => {
        setSelectedAddressId(address.id);
        setData((current) => ({
            ...current,
            selected_address_id: address.id,
            shipping_address: address.full_address,
            shipping_address_type: address.address_type || 'home',
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
        }));
    };

    const submitDisabled = processing
        || (data.shipping_method === 'Delivery' && !data.shipping_address.trim())
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

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
                    <div className="space-y-6 lg:col-span-2">
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-emerald-100 p-2"><Wallet size={20} className="text-emerald-700" /></div>
                                <div>
                                    <h3 className="text-sm font-bold text-emerald-900">Wallet Balance</h3>
                                    <p className="mt-1 text-lg font-bold text-emerald-800">{peso(walletBalance)}</p>
                                    <p className="mt-1 text-xs text-emerald-700">Wallet is available for delivery orders when the balance covers the whole total.</p>
                                </div>
                            </div>
                        </div>

                        {totalSellers > 1 && (
                            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-700">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-xl bg-blue-100 p-2"><Store size={20} className="text-blue-600" /></div>
                                    <div><span className="font-bold text-blue-800">Multiple Sellers</span><p className="mt-1">Separate orders will be created for {totalSellers} sellers.</p></div>
                                </div>
                            </div>
                        )}

                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700">
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-amber-100 p-2"><MessageCircle size={20} className="text-amber-600" /></div>
                                <div><span className="font-bold text-amber-800">Shipping is negotiated via chat</span><p className="mt-1">Delivery charges remain separate from this checkout total.</p></div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
                            <div className="mb-4 flex items-center gap-3 text-clay-700"><Truck size={20} /><h2 className="text-lg font-bold">Shipping Method</h2></div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${data.shipping_method === 'Delivery' ? 'border-clay-600 bg-clay-50 ring-1 ring-clay-600' : 'border-gray-200 hover:border-clay-300'}`}>
                                    <input type="radio" name="shipping_method" value="Delivery" checked={data.shipping_method === 'Delivery'} onChange={(event) => setData((current) => ({ ...current, shipping_method: event.target.value }))} className="text-clay-600 focus:ring-clay-500" />
                                    <div><p className="font-bold text-gray-900">Standard Delivery</p><p className="text-xs text-gray-500">Convenience fee applies per seller order.</p></div>
                                </label>
                                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${data.shipping_method === 'Pick Up' ? 'border-clay-600 bg-clay-50 ring-1 ring-clay-600' : 'border-gray-200 hover:border-clay-300'}`}>
                                    <input type="radio" name="shipping_method" value="Pick Up" checked={data.shipping_method === 'Pick Up'} onChange={(event) => setData((current) => ({ ...current, shipping_method: event.target.value, payment_method: 'COD' }))} className="text-clay-600 focus:ring-clay-500" />
                                    <div><p className="font-bold text-gray-900">Store Pick Up</p><p className="text-xs text-gray-500">No convenience fee. COD only.</p></div>
                                </label>
                            </div>
                        </div>

                        {data.shipping_method === 'Delivery' ? (
                            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
                                <div className="mb-4 flex items-center gap-3 text-clay-700"><MapPin size={20} /><h2 className="text-lg font-bold">Shipping Address</h2></div>
                                {!!auth.user.addresses?.length && (
                                    <div className="mb-4 grid gap-3 sm:grid-cols-2">
                                        {auth.user.addresses.map((address) => (
                                            <div key={address.id} onClick={() => chooseSavedAddress(address)} className={`cursor-pointer rounded-xl border-2 p-4 ${selectedAddressId === address.id ? 'border-clay-600 bg-clay-50' : 'border-gray-100 hover:border-clay-200'}`}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <span className="text-sm font-bold text-gray-800">{address.label}</span>
                                                        <div className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-clay-700 shadow-sm">{typeLabel(address.address_type)}</div>
                                                    </div>
                                                    {selectedAddressId === address.id && <CheckCircle2 size={16} className="text-clay-600" />}
                                                </div>
                                                <p className="mt-2 line-clamp-2 text-xs text-gray-600">{address.full_address}</p>
                                                <p className="mt-1 text-[10px] text-gray-500">{address.recipient_name} | {address.phone_number}</p>
                                            </div>
                                        ))}
                                        <div onClick={chooseNewAddress} className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center ${selectedAddressId === 'new' ? 'border-clay-600 bg-clay-50 text-clay-700' : 'border-gray-200 text-gray-400 hover:border-clay-400 hover:text-clay-600'}`}>
                                            <span className="text-sm font-medium">Use New Address</span><span className="text-xs">Select an address type below.</span>
                                        </div>
                                    </div>
                                )}

                                {isNewAddress && (
                                    <div className="space-y-4">
                                        <div>
                                            <p className="mb-2 text-sm font-bold text-gray-800">Address Type</p>
                                            <div className="grid grid-cols-3 gap-3">
                                                {TYPES.map((type) => (
                                                    <button key={type.value} type="button" onClick={() => setData('shipping_address_type', type.value)} className={`rounded-xl border px-3 py-3 text-sm font-bold ${data.shipping_address_type === type.value ? 'border-clay-600 bg-clay-50 text-clay-700' : 'border-gray-200 text-gray-500 hover:border-clay-300'}`}>{type.label}</button>
                                                ))}
                                            </div>
                                            {errors.shipping_address_type && <p className="mt-1 text-sm text-red-500">{errors.shipping_address_type}</p>}
                                        </div>
                                        <textarea rows="3" className="w-full rounded-xl border-gray-300 shadow-sm focus:border-clay-500 focus:ring-clay-500" placeholder="Enter your full delivery address..." value={data.shipping_address} onChange={(event) => setData('shipping_address', event.target.value)} />
                                        <label className="flex items-center gap-3"><input type="checkbox" checked={data.save_address} onChange={(event) => setData('save_address', event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-clay-600 focus:ring-clay-500" /><span className="flex items-center gap-1.5 text-sm text-gray-600"><Save size={14} className="text-gray-400" />Save as my default address</span></label>
                                        {data.save_address && (
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                <div><label className="mb-1 block text-sm font-bold text-gray-700">Recipient Name</label><input type="text" value={data.recipient_name} onChange={(event) => setData('recipient_name', event.target.value)} className="w-full rounded-xl border-gray-300 shadow-sm focus:border-clay-500 focus:ring-clay-500" placeholder="Full recipient name" />{errors.recipient_name && <p className="mt-1 text-sm text-red-500">{errors.recipient_name}</p>}</div>
                                                <div><label className="mb-1 block text-sm font-bold text-gray-700">Phone Number</label><input type="text" value={data.phone_number} onChange={(event) => setData('phone_number', event.target.value)} className="w-full rounded-xl border-gray-300 shadow-sm focus:border-clay-500 focus:ring-clay-500" placeholder="09XXXXXXXXX" />{errors.phone_number && <p className="mt-1 text-sm text-red-500">{errors.phone_number}</p>}</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {errors.shipping_address && <p className="mt-1 text-sm text-red-500">{errors.shipping_address}</p>}
                                {errors.selected_address_id && <p className="mt-1 text-sm text-red-500">{errors.selected_address_id}</p>}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-6">
                                <div className="flex items-start gap-4">
                                    <div className="rounded-full bg-blue-100 p-3 text-blue-600"><Store size={24} /></div>
                                    <div><h3 className="text-lg font-bold text-blue-900">Store Pick Up Selected</h3><p className="mt-1 text-sm text-blue-800">No shipping address needed. Coordinate pick-up with the seller via chat.</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">No Convenience Fee</span><span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">COD Only</span></div></div>
                                </div>
                            </div>
                        )}

                        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
                            <div className="mb-4 flex items-center gap-3 text-clay-700"><Truck size={20} /><h2 className="text-lg font-bold">Shipping Preferences</h2><span className="text-xs font-medium text-gray-400">(Optional)</span></div>
                            <textarea rows="2" className="w-full rounded-xl border-gray-300 text-sm shadow-sm focus:border-clay-500 focus:ring-clay-500" placeholder="e.g. Preferred courier: Lalamove, Available time: 9 AM - 5 PM" value={data.shipping_notes} onChange={(event) => setData('shipping_notes', event.target.value)} />
                            <p className="mt-2 flex items-center gap-1 text-xs text-gray-400"><Info size={12} />This will be shared with all sellers to help arrange shipping.</p>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
                            <div className="mb-4 flex items-center gap-3 text-clay-700"><CreditCard size={20} /><h2 className="text-lg font-bold">Payment Method</h2></div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${data.payment_method === 'COD' ? 'border-clay-600 bg-clay-50 ring-1 ring-clay-600' : 'border-gray-200 hover:border-clay-300'}`}>
                                    <input type="radio" name="payment" value="COD" checked={data.payment_method === 'COD'} onChange={(event) => setData('payment_method', event.target.value)} className="text-clay-600 focus:ring-clay-500" />
                                    <div><p className="font-bold text-gray-900">Cash on Delivery</p><p className="text-xs text-gray-500">Pay when you receive</p></div>
                                </label>
                                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${data.shipping_method === 'Pick Up' ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-50' : data.payment_method === 'GCash' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <input type="radio" name="payment" value="GCash" checked={data.payment_method === 'GCash'} onChange={(event) => setData('payment_method', event.target.value)} disabled={data.shipping_method === 'Pick Up'} className="text-blue-600 focus:ring-blue-500 disabled:opacity-50" />
                                    <div><p className="font-bold text-gray-900">GCash</p><p className="text-xs text-gray-500">{data.shipping_method === 'Pick Up' ? 'Not available for pickup' : 'Pay online after order placement'}</p></div>
                                </label>
                                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${data.shipping_method === 'Pick Up' || !walletEligible ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-60' : data.payment_method === 'Wallet' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-gray-200 hover:border-emerald-300'}`}>
                                    <input type="radio" name="payment" value="Wallet" checked={data.payment_method === 'Wallet'} onChange={(event) => setData('payment_method', event.target.value)} disabled={data.shipping_method === 'Pick Up' || !walletEligible} className="text-emerald-600 focus:ring-emerald-500 disabled:opacity-50" />
                                    <div><p className="font-bold text-gray-900">Wallet</p><p className="text-xs text-gray-500">{data.shipping_method === 'Pick Up' ? 'Wallet disabled for pickup' : walletEligible ? `Available balance: ${peso(walletBalance)}` : `Need ${peso(summary.grandTotal)} total`}</p></div>
                                </label>
                            </div>
                            {errors.payment_method && <p className="mt-2 text-sm text-red-500">{errors.payment_method}</p>}
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-lg lg:sticky lg:top-24 sm:p-6">
                            <h3 className="mb-6 text-lg font-bold text-gray-900">Order Summary</h3>
                            <div className="mb-6 max-h-80 space-y-6 overflow-y-auto pr-2">
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
                                            {data.shipping_method === 'Delivery' && <div className="flex justify-between"><span>Convenience Fee</span><span className="font-medium">{peso(group.convenienceFee)}</span></div>}
                                            <div className="flex justify-between font-bold text-gray-700"><span>Order Total</span><span>{peso(group.total)}</span></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2 border-t border-gray-100 pt-4 text-sm text-gray-600">
                                <div className="flex justify-between"><span>Merchandise Subtotal</span><span>{peso(summary.merchandiseSubtotal)}</span></div>
                                <div className="flex justify-between"><span>Convenience Fee</span><span>{peso(summary.convenienceFeeTotal)}</span></div>
                                <div className="flex justify-between text-gray-400"><span>Shipping Fee</span><span className="text-xs italic">To be discussed</span></div>
                                {totalSellers > 1 && <div className="flex justify-between text-xs text-blue-600"><span className="flex items-center gap-1"><Package size={12} />Orders Created</span><span className="font-bold">{totalSellers} separate orders</span></div>}
                                <div className="mt-2 flex justify-between border-t border-dashed border-gray-200 pt-2 text-lg font-bold text-gray-900"><span>Total Due Now</span><span>{peso(summary.grandTotal)}</span></div>
                                <p className="text-center text-[10px] text-gray-400">Shipping charges will still be confirmed by each seller after checkout.</p>
                            </div>
                            <button onClick={(event) => { event.preventDefault(); post(route('checkout.store')); }} disabled={submitDisabled} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-clay-600 py-3.5 text-sm font-bold text-white shadow-xl shadow-clay-200 transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-50"><ShieldCheck size={18} />{processing ? 'Processing...' : totalSellers > 1 ? `Place ${totalSellers} Orders` : 'Place Order'}</button>
                            <p className="mt-4 flex items-center justify-center gap-1 text-center text-xs text-gray-400"><MessageCircle size={12} />Chat with seller{totalSellers > 1 ? 's' : ''} after ordering</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`fixed bottom-4 left-4 right-4 z-[100] transform transition-all duration-500 sm:bottom-6 sm:left-auto sm:right-6 ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl ${toast.type === 'success' ? 'border-green-100 bg-white' : 'border-red-100 bg-white'}`}>
                    <div className={`rounded-full p-2 ${toast.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{toast.type === 'success' ? <CheckCircle size={20} className="stroke-2" /> : <AlertCircle size={20} className="stroke-2" />}</div>
                    <div><h4 className={`text-sm font-bold ${toast.type === 'success' ? 'text-green-900' : 'text-red-900'}`}>{toast.type === 'success' ? 'Success' : 'Error'}</h4><p className="text-xs text-gray-500">{toast.message}</p></div>
                    <button onClick={() => setShowToast(false)} className="ml-2 text-gray-400 hover:text-gray-600"><X size={14} /></button>
                </div>
            </div>
        </div>
    );
}

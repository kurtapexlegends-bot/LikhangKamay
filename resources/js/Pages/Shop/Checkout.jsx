import React, { useState, useMemo } from 'react';
import { Head, useForm, usePage, Link } from '@inertiajs/react';
import { 
    ShieldCheck, CreditCard, MapPin, Truck, AlertCircle, CheckCircle2, 
    MessageCircle, Info, Store, Save, Package, ArrowLeft,
    CheckCircle, X
} from 'lucide-react';

export default function Checkout({ auth }) {
    // Get Items passed from "Buy Now" or Cart
    const incomingItems = usePage().props.items || [];

    // Group items by seller
    const groupedBySeller = useMemo(() => {
        return incomingItems.reduce((groups, item) => {
            const sellerId = item.artisan_id || 'unknown';
            if (!groups[sellerId]) {
                groups[sellerId] = {
                    sellerId,
                    shopName: item.shop_name || item.seller || 'Shop',
                    items: [],
                    subtotal: 0
                };
            }
            groups[sellerId].items.push(item);
            groups[sellerId].subtotal += item.price * item.qty;
            return groups;
        }, {});
    }, [incomingItems]);

    const sellerGroups = Object.values(groupedBySeller);
    const totalSellers = sellerGroups.length;

    // --- FLASH MESSAGE HANDLING ---
    const { flash } = usePage().props;
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success'); // 'success' or 'error'

    React.useEffect(() => {
        if (flash.success) {
            setToastType('success');
            setToastMessage(flash.success);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
        if (flash.error) {
            setToastType('error');
            setToastMessage(flash.error);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 5000);
        }
    }, [flash]);

    // Address State
    const [selectedAddressId, setSelectedAddressId] = useState(
        auth.user.addresses?.find(a => a.is_default)?.id || 'new'
    );

    // Initial Address Value
    const initialAddress = auth.user.addresses?.find(a => a.is_default)?.full_address 
        || auth.user.saved_address 
        || auth.user.street_address 
        || '';

    const calculateTotal = () => incomingItems.reduce((acc, item) => acc + (item.price * item.qty), 0);

    // Form Handling
    const { data, setData, post, processing, errors } = useForm({
        items: incomingItems,
        shipping_address: initialAddress,
        shipping_notes: '', 
        payment_method: 'COD',
        shipping_method: 'Delivery', // Default
        save_address: false,
        total: calculateTotal()
    });

    // Handle Address Click
    const handleAddressSelect = (addr) => {
        setSelectedAddressId(addr.id);
        setData('shipping_address', addr.full_address);
    };

    const handleNewAddressClick = () => {
        setSelectedAddressId('new');
        setData('shipping_address', '');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('checkout.store')); 
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800 py-12 px-4 sm:px-6 lg:px-8">
            <Head title="Checkout" />

            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8 group">
                    <button 
                        onClick={() => window.history.back()} 
                        className="flex items-center gap-2 text-gray-400 hover:text-clay-600 transition-all duration-300"
                    >
                        <div className="p-2 rounded-full bg-white shadow-sm border border-gray-100 group-hover:border-clay-100 group-hover:bg-clay-50 transition-all">
                            <ArrowLeft size={18} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest">Go Back</span>
                    </button>

                    <div className="flex items-center gap-2 text-gray-400">
                        <ShieldCheck size={16} className="text-emerald-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">End-to-End Encrypted</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 mb-8">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <img src="/images/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                        <h1 className="text-2xl font-serif font-bold text-gray-900">Secure Checkout</h1>
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* LEFT COLUMN: FORMS */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Multi-Seller Notice */}
                        {totalSellers > 1 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-100 rounded-xl">
                                        <Store size={20} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-blue-800 text-sm">Multiple Sellers</h3>
                                        <p className="text-blue-700 text-xs mt-1">
                                            Your cart has items from {totalSellers} different sellers. 
                                            Separate orders will be created for each seller.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Shipping Notice */}
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-amber-100 rounded-xl">
                                    <MessageCircle size={20} className="text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-amber-800 text-sm">Shipping is Negotiated via Chat</h3>
                                    <p className="text-amber-700 text-xs mt-1">
                                        After placing your order, you'll chat with each seller to arrange shipping (Lalamove, Grab, etc.). 
                                        The seller will provide shipping costs and tracking info.
                                    </p>
                                </div>
                            </div>
                        </div>


                        {/* 1. Shipping Method */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-4 text-clay-700">
                                <Truck size={20} />
                                <h2 className="text-lg font-bold">Shipping Method</h2>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Delivery */}
                                <label className={`border rounded-xl p-4 cursor-pointer flex items-center gap-3 transition-all ${data.shipping_method === 'Delivery' ? 'border-clay-600 bg-clay-50 ring-1 ring-clay-600' : 'border-gray-200 hover:border-clay-300'}`}>
                                    <input 
                                        type="radio" 
                                        name="shipping_method" 
                                        value="Delivery"
                                        checked={data.shipping_method === 'Delivery'}
                                        onChange={e => setData('shipping_method', e.target.value)}
                                        className="text-clay-600 focus:ring-clay-500"
                                    />
                                    <div>
                                        <p className="font-bold text-gray-900">Standard Delivery</p>
                                        <p className="text-xs text-gray-500">Via Courier / Lalamove</p>
                                    </div>
                                </label>

                                {/* Pick Up */}
                                <label className={`border rounded-xl p-4 cursor-pointer flex items-center gap-3 transition-all ${data.shipping_method === 'Pick Up' ? 'border-clay-600 bg-clay-50 ring-1 ring-clay-600' : 'border-gray-200 hover:border-clay-300'}`}>
                                    <input 
                                        type="radio" 
                                        name="shipping_method" 
                                        value="Pick Up"
                                        checked={data.shipping_method === 'Pick Up'}
                                        onChange={e => {
                                            setData('shipping_method', e.target.value);
                                            setData('payment_method', 'COD'); // Force COD for Store Pickup
                                        }}
                                        className="text-clay-600 focus:ring-clay-500"
                                    />
                                    <div>
                                        <p className="font-bold text-gray-900">Store Pick Up</p>
                                        <p className="text-xs text-gray-500">Meet seller at location</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* 2. Shipping Address (Only for Delivery) */}
                        {data.shipping_method === 'Delivery' ? (
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-top-4">
                                <div className="flex items-center gap-3 mb-4 text-clay-700">
                                    <MapPin size={20} />
                                    <h2 className="text-lg font-bold">Shipping Address</h2>
                                </div>

                                {/* Saved Addresses List */}
                                {auth.user.addresses && auth.user.addresses.length > 0 && (
                                    <div className="grid gap-3 mb-4 sm:grid-cols-2">
                                        {auth.user.addresses.map((addr) => (
                                            <div 
                                                key={addr.id}
                                                onClick={() => handleAddressSelect(addr)}
                                                className={`cursor-pointer p-4 rounded-xl border-2 transition-all text-left ${
                                                    selectedAddressId === addr.id 
                                                        ? 'border-clay-600 bg-clay-50' 
                                                        : 'border-gray-100 hover:border-clay-200'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-gray-800 text-sm">{addr.label}</span>
                                                    {selectedAddressId === addr.id && (
                                                        <CheckCircle2 size={16} className="text-clay-600" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{addr.full_address}</p>
                                                <p className="text-[10px] text-gray-500 mt-1">{addr.recipient_name} | {addr.phone_number}</p>
                                            </div>
                                        ))}

                                        <div 
                                            onClick={handleNewAddressClick}
                                            className={`cursor-pointer p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${
                                                selectedAddressId === 'new'
                                                    ? 'border-clay-600 bg-clay-50 text-clay-700'
                                                    : 'border-gray-200 text-gray-400 hover:border-clay-400 hover:text-clay-600'
                                            }`}
                                        >
                                            <span className="text-sm font-medium">Use New Address</span>
                                        </div>
                                    </div>
                                )}

                                {/* Address Text Area (Shown if New Address is selected OR no saved addresses) */}
                                {(selectedAddressId === 'new' || !auth.user.addresses || auth.user.addresses.length === 0) && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <textarea 
                                            rows="3"
                                            className="w-full border-gray-300 rounded-xl focus:border-clay-500 focus:ring-clay-500 shadow-sm"
                                            placeholder="Enter your full delivery address..."
                                            value={data.shipping_address}
                                            onChange={e => setData('shipping_address', e.target.value)}
                                        ></textarea>
                                        
                                        <label className="flex items-center gap-3 mt-3 cursor-pointer group">
                                            <input 
                                                type="checkbox"
                                                checked={data.save_address}
                                                onChange={(e) => setData('save_address', e.target.checked)}
                                                className="w-4 h-4 text-clay-600 border-gray-300 rounded focus:ring-clay-500"
                                            />
                                            <span className="text-sm text-gray-600 group-hover:text-clay-700 flex items-center gap-1.5">
                                                <Save size={14} className="text-gray-400" />
                                                Save as my default address
                                            </span>
                                        </label>
                                    </div>
                                )}
                                
                                {errors.shipping_address && <p className="text-red-500 text-sm mt-1">{errors.shipping_address}</p>}
                            </div>
                        ) : (
                            /* Store Pick Up Info */
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                                        <Store size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-blue-900 text-lg">Store Pick Up Selected</h3>
                                        <p className="text-blue-800 text-sm mt-1">
                                            You don't need to provide a shipping address. You will coordinate with the seller(s) via chat to pick up your order at their location.
                                        </p>
                                        <div className="mt-3 flex gap-2">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                No Shipping Fee
                                            </span>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                Faster Access
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}



                        {/* 2. Shipping Notes (Optional) */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-4 text-clay-700">
                                <Truck size={20} />
                                <h2 className="text-lg font-bold">Shipping Preferences</h2>
                                <span className="text-xs text-gray-400 font-medium">(Optional)</span>
                            </div>
                            <textarea 
                                rows="2"
                                className="w-full border-gray-300 rounded-xl focus:border-clay-500 focus:ring-clay-500 shadow-sm text-sm"
                                placeholder="e.g. Preferred courier: Lalamove, Available time: 9 AM - 5 PM"
                                value={data.shipping_notes}
                                onChange={e => setData('shipping_notes', e.target.value)}
                            ></textarea>
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                <Info size={12} />
                                This will be shared with all sellers to help arrange shipping.
                            </p>
                        </div>

                        {/* 3. Payment Method */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-4 text-clay-700">
                                <CreditCard size={20} />
                                <h2 className="text-lg font-bold">Payment Method</h2>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Option 1: COD */}
                                <label className={`border rounded-xl p-4 cursor-pointer flex items-center gap-3 transition-all ${data.payment_method === 'COD' ? 'border-clay-600 bg-clay-50 ring-1 ring-clay-600' : 'border-gray-200 hover:border-clay-300'}`}>
                                    <input 
                                        type="radio" 
                                        name="payment" 
                                        value="COD"
                                        checked={data.payment_method === 'COD'}
                                        onChange={e => setData('payment_method', e.target.value)}
                                        className="text-clay-600 focus:ring-clay-500"
                                    />
                                    <div>
                                        <p className="font-bold text-gray-900">Cash on Delivery</p>
                                        <p className="text-xs text-gray-500">Pay when you receive</p>
                                    </div>
                                </label>

                                {/* Option 2: GCash */}
                                <label className={`border rounded-xl p-4 cursor-pointer flex items-center gap-3 transition-all ${
                                    data.shipping_method === 'Pick Up' ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-100' :
                                    data.payment_method === 'GCash' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'
                                }`}>
                                    <input 
                                        type="radio" 
                                        name="payment" 
                                        value="GCash"
                                        checked={data.payment_method === 'GCash'}
                                        onChange={e => setData('payment_method', e.target.value)}
                                        disabled={data.shipping_method === 'Pick Up'}
                                        className="text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                    <div>
                                        <p className="font-bold text-gray-900">E-Wallet / GCash</p>
                                        <p className="text-xs text-gray-500">
                                            {data.shipping_method === 'Pick Up' ? 'Not available for Store Pickup' : 'Seller will send QR Code'}
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: ORDER SUMMARY */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg sticky top-24">
                            <h3 className="text-lg font-bold text-gray-900 mb-6">Order Summary</h3>

                            {/* Items grouped by seller */}
                            <div className="space-y-6 mb-6 max-h-80 overflow-y-auto pr-2">
                                {sellerGroups.map((group) => (
                                    <div key={group.sellerId} className="space-y-3">
                                        {/* Seller Header */}
                                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                            <Store size={14} className="text-clay-500" />
                                            <span className="text-sm font-bold text-gray-700">{group.shopName}</span>
                                        </div>
                                        
                                        {/* Seller's Items */}
                                        {group.items.map((item, idx) => (
                                            <div key={idx} className="flex gap-3">
                                                <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                                                    <img 
                                                        src={item.img ? (item.img.startsWith('http') || item.img.startsWith('/storage') ? item.img : `/storage/${item.img}`) : (item.primary_image_url ? (item.primary_image_url.startsWith('http') || item.primary_image_url.startsWith('/storage') ? item.primary_image_url : `/storage/${item.primary_image_url}`) : (item.product?.primary_image_url ? (item.product.primary_image_url.startsWith('http') || item.product.primary_image_url.startsWith('/storage') ? item.product.primary_image_url : `/storage/${item.product.primary_image_url}`) : '/images/no-image.png'))} 
                                                        alt={item.name} 
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { e.target.onerror = null; e.target.src = '/images/no-image.png'; }}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-800 line-clamp-1">{item.name}</p>
                                                    <p className="text-xs text-gray-500">{item.variant} - x{item.qty}</p>
                                                    <p className="text-sm font-medium text-clay-600">₱{(item.price * item.qty).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {/* Seller Subtotal */}
                                        <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-dashed border-gray-200">
                                            <span>Subtotal ({group.shopName})</span>
                                            <span className="font-medium">₱{group.subtotal.toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-gray-100 pt-4 space-y-2 text-sm text-gray-600">
                                <div className="flex justify-between">
                                    <span>Merchandise Subtotal</span>
                                    <span>₱{calculateTotal().toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-gray-400">
                                    <span>Shipping Fee</span>
                                    <span className="text-xs italic">To be discussed</span>
                                </div>
                                {totalSellers > 1 && (
                                    <div className="flex justify-between text-blue-600 text-xs">
                                        <span className="flex items-center gap-1">
                                            <Package size={12} />
                                            Orders Created
                                        </span>
                                        <span className="font-bold">{totalSellers} separate orders</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-gray-900 text-lg pt-2 border-t border-dashed border-gray-200 mt-2">
                                    <span>Total</span>
                                    <span>₱{calculateTotal().toLocaleString()}+</span>
                                </div>
                                <p className="text-[10px] text-gray-400 text-center">
                                    * Shipping fee will be confirmed by each seller
                                </p>
                            </div>

                            {/* Submit Button */}
                            <button 
                                onClick={handleSubmit}
                                disabled={processing || (data.shipping_method === 'Delivery' && !data.shipping_address.trim())}
                                className="w-full mt-6 bg-clay-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-clay-200 hover:bg-clay-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {processing ? (
                                    <span className="flex items-center gap-2">Processing...</span>
                                ) : (
                                    <>
                                        <ShieldCheck size={18} /> 
                                        {totalSellers > 1 ? `Place ${totalSellers} Orders` : 'Place Order'}
                                    </>
                                )}
                            </button>

                            <p className="text-xs text-center text-gray-400 mt-4 flex items-center justify-center gap-1">
                                <MessageCircle size={12} /> Chat with seller{totalSellers > 1 ? 's' : ''} after ordering
                            </p>
                        </div>
                    </div>

                </div>
            </div>
            
            {/* --- TOAST NOTIFICATION --- */}
            <div className={`fixed bottom-6 right-6 z-[100] transition-all duration-500 transform ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${toastType === 'success' ? 'bg-white border-green-100' : 'bg-white border-red-100'}`}>
                    <div className={`p-2 rounded-full ${toastType === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {toastType === 'success' ? <CheckCircle size={20} className="stroke-2" /> : <AlertCircle size={20} className="stroke-2" />}
                    </div>
                    <div>
                        <h4 className={`text-sm font-bold ${toastType === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                            {toastType === 'success' ? 'Success' : 'Error'}
                        </h4>
                        <p className="text-xs text-gray-500">{toastMessage}</p>
                    </div>
                    <button onClick={() => setShowToast(false)} className="ml-2 text-gray-400 hover:text-gray-600"><X size={14} /></button>
                </div>
            </div>
        </div>
    );
}

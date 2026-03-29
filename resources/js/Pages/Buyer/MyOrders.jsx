import React, { useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import BuyerNavbar from '@/Components/BuyerNavbar';
import Dropdown from '@/Components/Dropdown'; 
import Modal from '@/Components/Modal';
import RatingModal from '@/Components/RatingModal';
import ConfirmationModal from '@/Components/ConfirmationModal';
import { 
    Package, Truck, CheckCircle, Clock, RotateCcw, XCircle,
    MessageCircle, Search, ShoppingBag, ChevronDown, AlertTriangle, 
    MapPin, Hash, Star, PackageCheck, AlertCircle, Wallet, CreditCard, Printer, Store, UploadCloud 
} from 'lucide-react';

// --- RETURN REQUEST MODAL COMPONENT ---
const ReturnRequestModal = ({ isOpen, onClose, order }) => {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        return_reason: '',
        return_proof_image: null,
    });

    const [previewUrl, setPreviewUrl] = useState(null);

    React.useEffect(() => {
        if (!isOpen) {
            reset();
            clearErrors();
            setPreviewUrl(null);
        }
    }, [isOpen]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('return_proof_image', file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('my-orders.return', order.id), {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="md">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
                        <RotateCcw size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Request Return</h2>
                        <p className="text-sm text-gray-500">Provide details for your request.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Reason for Return</label>
                        <textarea
                            className="w-full border-gray-300 rounded-xl focus:ring-orange-500 focus:border-orange-500 shadow-sm text-sm"
                            rows="3"
                            placeholder="e.g., Item is damaged, wrong item sent..."
                            value={data.return_reason}
                            onChange={(e) => setData('return_reason', e.target.value)}
                            required
                        ></textarea>
                        {errors.return_reason && <p className="text-red-500 text-xs mt-1">{errors.return_reason}</p>}
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Proof Image</label>
                        <label className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${previewUrl ? 'border-orange-400 bg-orange-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}>
                            <div className="space-y-1 text-center">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="mx-auto h-32 object-contain" />
                                ) : (
                                    <UploadCloud className="mx-auto h-10 w-10 text-gray-400" />
                                )}
                                <div className="flex text-sm text-gray-600 justify-center">
                                    <span className="relative rounded-md font-medium text-orange-600 hover:text-orange-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-orange-500">
                                        <span>Upload a file</span>
                                        <input 
                                            type="file" 
                                            className="sr-only" 
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            required={!previewUrl} // Required initially
                                        />
                                    </span>
                                </div>
                                {!previewUrl && <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>}
                            </div>
                        </label>
                        {errors.return_proof_image && <p className="text-red-500 text-xs mt-1">{errors.return_proof_image}</p>}
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
                            disabled={processing}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-6 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-200 disabled:opacity-50 flex items-center gap-2"
                        >
                            {processing ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

// --- ENHANCED ORDER TIMELINE COMPONENT ---
const OrderTimeline = ({ status, isPickup }) => {
    // Dynamic steps based on shipping method
    const steps = isPickup ? [
        { key: 'Pending', label: 'Placed', icon: Clock, color: 'amber' },
        { key: 'Accepted', label: 'Confirmed', icon: PackageCheck, color: 'blue' },
        { key: 'Ready for Pickup', label: 'Ready', icon: Store, color: 'indigo' },
        { key: 'Delivered', label: 'Picked Up', icon: CheckCircle, color: 'teal' },
        { key: 'Completed', label: 'Completed', icon: Star, color: 'green' },
    ] : [
        { key: 'Pending', label: 'Placed', icon: Clock, color: 'amber' },
        { key: 'Accepted', label: 'Confirmed', icon: PackageCheck, color: 'blue' },
        { key: 'Shipped', label: 'Shipped', icon: Truck, color: 'indigo' },
        { key: 'Delivered', label: 'Delivered', icon: MapPin, color: 'teal' },
        { key: 'Completed', label: 'Completed', icon: CheckCircle, color: 'green' },
    ];

    const getStepStatus = (stepKey) => {
        // Map current status to an index for progress calculation
        // We use the step keys directly to find their position
        const statusOrder = steps.map(s => s.key);
        
        let normalizedStatus = status;
        // Map backend status to timeline steps if needed
        if (status === 'Ready for Pickup' && !isPickup) normalizedStatus = 'Shipped'; // Fallback
        if (status === 'Shipped' && isPickup) normalizedStatus = 'Ready for Pickup'; // Fallback

        const currentIndex = statusOrder.indexOf(normalizedStatus);
        const stepIndex = statusOrder.indexOf(stepKey);
        
        if (status === 'Cancelled' || status === 'Rejected') return 'cancelled';
        if (status === 'Refund/Return') {
            if (stepIndex <= statusOrder.indexOf('Completed')) return 'done';
            return 'pending';
        }

        // If normalizedStatus not found (e.g. intermediate state), find closest previous logic?
        // Actually, let's keep it simple. If status matches a step key, we use its index.
        
        if (currentIndex === -1) {
             // Handle cases like 'Processing' if not in steps
             if (status === 'Processing') return stepIndex <= 1 ? 'done' : 'pending';
             return 'pending';
        }

        if (stepIndex < currentIndex) return 'done';
        if (stepIndex === currentIndex) return 'active';
        return 'pending';
    };

    // Cancelled/Rejected/Refund State (Keep existing code...)
    if (status === 'Cancelled' || status === 'Rejected') {
        return (
            <div className="flex items-center justify-center py-4 bg-gray-50 border-t border-b border-gray-100">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
                    <XCircle size={16} className="text-gray-500" />
                    <span className="text-sm font-bold text-gray-600">Order {status}</span>
                </div>
            </div>
        );
    }

    if (status === 'Refund/Return') {
        return (
            <div className="flex items-center justify-center py-4 bg-orange-50 border-t border-b border-orange-100">
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full animate-pulse">
                    <RotateCcw size={16} className="text-orange-600" />
                    <span className="text-sm font-bold text-orange-700">Return/Refund in Progress</span>
                </div>
            </div>
        );
    }
    
    if (status === 'Refunded') {
        return (
            <div className="flex items-center justify-center py-4 bg-purple-50 border-t border-b border-purple-100">
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full">
                    <CheckCircle size={16} className="text-purple-600" />
                    <span className="text-sm font-bold text-purple-700">Money Refunded</span>
                </div>
            </div>
        );
    }

    if (status === 'Replaced') {
        return (
            <div className="flex items-center justify-center py-4 bg-teal-50 border-t border-b border-teal-100">
                <div className="flex items-center gap-2 px-4 py-2 bg-teal-100 rounded-full">
                    <PackageCheck size={16} className="text-teal-600" />
                    <span className="text-sm font-bold text-teal-700">Replacement Sent</span>
                </div>
            </div>
        );
    }

    // Determine progress state
    const currentStepIndex = steps.findIndex(s => s.key === status);

    return (
        <div className="overflow-x-auto py-6 px-4 sm:px-6 bg-white border-t border-b border-gray-100">
            <div className="flex min-w-[560px] items-center justify-between max-w-3xl mx-auto">
                {steps.map((step, idx) => {
                    const stepStatus = getStepStatus(step.key);
                    const Icon = step.icon;
                    const isLast = idx === steps.length - 1;
                    
                    return (
                        <div key={step.key} className={`flex items-center ${isLast ? 'flex-none' : 'flex-1'}`}>
                            {/* Step Circle & Label */}
                            <div className="relative flex flex-col items-center group">
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 z-10 relative
                                    ${stepStatus === 'done' 
                                        ? 'bg-green-500 text-white shadow-lg shadow-green-200 scale-100' 
                                        : stepStatus === 'active' 
                                            ? 'bg-white text-clay-600 border-2 border-clay-500 shadow-xl shadow-clay-200 scale-110' 
                                            : 'bg-white text-gray-300 border-2 border-gray-100'}
                                `}>
                                    {stepStatus === 'done' ? <CheckCircle size={18} strokeWidth={3} /> : <Icon size={18} />}
                                    
                                    {/* Pulse effect for active */}
                                    {stepStatus === 'active' && (
                                        <span className="absolute inset-0 rounded-full bg-clay-400 opacity-20 animate-ping" />
                                    )}
                                </div>
                                
                                <span className={`
                                    absolute -bottom-8 whitespace-nowrap text-[11px] font-bold uppercase tracking-wider transition-all duration-300
                                    ${stepStatus === 'done' ? 'text-green-600' 
                                        : stepStatus === 'active' ? 'text-clay-700 transform scale-110' 
                                        : 'text-gray-400'}
                                `}>
                                    {step.label}
                                </span>
                            </div>

                            {/* Connecting Line (not for last item) */}
                            {!isLast && (
                                <div className="flex-1 h-1 mx-2 relative bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`absolute top-0 left-0 bottom-0 bg-green-500 transition-all duration-700 ease-out rounded-full ${
                                            idx < currentStepIndex ? 'w-full' : 'w-0'
                                        }`} 
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- STATUS BADGE COMPONENT ---
const StatusBadge = ({ status }) => {
    const config = {
        'Pending': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
        'Accepted': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: PackageCheck },
        'Shipped': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', icon: Truck },
        'Ready for Pickup': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', icon: Store },
        'Delivered': { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', icon: MapPin },
        'Completed': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle },
        'Refund/Return': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', icon: RotateCcw },
        'Cancelled': { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', icon: XCircle },
        'Rejected': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
    };
    
    const { bg, text, border, icon: Icon } = config[status] || config['Pending'];
    
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${bg} ${text} ${border}`}>
            <Icon size={12} />
            {status}
        </span>
    );
};

// --- PAYMENT STATUS BADGE COMPONENT ---
// (Keep as is)
const PaymentStatusBadge = ({ status, method }) => {
    // ... (Keep existing code)
    const config = {
        'pending': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Unpaid' },
        'paid': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', label: 'Paid' },
        'refunded': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', label: 'Refunded' },
    };
    
    const { bg, text, border, label } = config[status] || config['pending'];
    
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${bg} ${text} ${border}`}>
            <Wallet size={10} />
            {label} - {method || 'COD'}
        </span>
    );
};

const humanizeAddressType = (value) => {
    if (!value) return null;

    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function MyOrders({ auth, orders, wallet }) {
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [processing, setProcessing] = useState(false);
    
    const [ratingModal, setRatingModal] = useState({ isOpen: false, order: null });
    const [returnModalState, setReturnModalState] = useState({ isOpen: false, order: null });

    // Modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        type: null, // 'receive', 'return', 'cancel'
        orderId: null
    });

    const tabs = [
        { id: 'All', label: 'All Orders', count: orders.length },
        { id: 'Pending', label: 'To Pay' },
        { id: 'Accepted', label: 'To Ship' },
        { id: 'Shipped', label: 'To Receive' },
        { id: 'Ready for Pickup', label: 'To Pickup' }, // New Tab
        { id: 'Completed', label: 'Completed' },
        { id: 'Refund/Return', label: 'Returns' },
    ];

    const getTabCount = (tabId) => {
        if (tabId === 'All') return orders.length;
        if (tabId === 'Accepted') return orders.filter(o => ['Accepted', 'Processing'].includes(o.status) && o.shipping_method !== 'Pick Up').length; // To Ship (Delivery Only)
        if (tabId === 'Shipped') return orders.filter(o => ['Shipped', 'Delivered'].includes(o.status) && o.shipping_method !== 'Pick Up').length; // To Receive (Delivery Only)
        if (tabId === 'Ready for Pickup') return orders.filter(o => (['Ready for Pickup', 'Delivered'].includes(o.status) || ['Accepted', 'Processing'].includes(o.status)) && o.shipping_method === 'Pick Up').length; // To Pickup (All Pick Up states)
        if (tabId === 'Refund/Return') return orders.filter(o => ['Refund/Return', 'Refunded', 'Replaced'].includes(o.status)).length; // Returns
        return orders.filter(o => o.status === tabId).length;
    };

    const filteredOrders = orders.filter(order => {
        let tabMatch = true;
        if (activeTab !== 'All') {
            if (activeTab === 'Accepted') {
                // To Ship: Accepted/Processing AND Delivery
                tabMatch = ['Accepted', 'Processing'].includes(order.status) && order.shipping_method !== 'Pick Up';
            } else if (activeTab === 'Shipped') {
                // To Receive: Shipped/Delivered AND Delivery
                tabMatch = ['Shipped', 'Delivered'].includes(order.status) && order.shipping_method !== 'Pick Up';
            } else if (activeTab === 'Ready for Pickup') {
                // To Pickup: Ready/Delivered OR Accepted/Processing AND Pick Up
                tabMatch = (['Ready for Pickup', 'Delivered'].includes(order.status) || ['Accepted', 'Processing'].includes(order.status)) && order.shipping_method === 'Pick Up';
            } else if (activeTab === 'Refund/Return') {
                tabMatch = ['Refund/Return', 'Refunded', 'Replaced'].includes(order.status);
            } else {
                tabMatch = order.status === activeTab;
            }
        }

        let searchMatch = true;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            searchMatch = order.items.some(item => 
                item.name.toLowerCase().includes(query)
            ) || order.order_number?.toLowerCase().includes(query);
        }

        return tabMatch && searchMatch;
    });

    // --- MODAL CONFIGS ---
    const modalConfigs = {
        receive: {
            title: 'Confirm Order Received',
            message: 'By confirming, you acknowledge receiving this order in good condition. You will have 1 day to request a return if there are any issues.',
            icon: CheckCircle,
            iconBg: 'bg-green-100 text-green-600',
            confirmText: 'Confirm Receipt',
            confirmColor: 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200',
            action: (id) => router.post(route('my-orders.receive', id), {}, {
                onStart: () => setProcessing(true),
                onFinish: () => { setProcessing(false); closeModal(); }
            })
        },
        cancel: {
            title: 'Cancel Order',
            message: 'Are you sure you want to cancel this order? This action cannot be undone.',
            icon: XCircle,
            iconBg: 'bg-red-100 text-red-600',
            confirmText: 'Yes, Cancel Order',
            confirmColor: 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200',
            action: (id) => router.post(route('my-orders.cancel', id), {}, {
                onStart: () => setProcessing(true),
                onFinish: () => { setProcessing(false); closeModal(); }
            })
        },
        cancelReturn: {
            title: 'Cancel Return Request',
            message: 'Are you sure? cancelling your return request will mark this order as Completed. This action cannot be undone.',
            icon: CheckCircle,
            iconBg: 'bg-green-100 text-green-600',
            confirmText: 'Yes, Keep Item',
            confirmColor: 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200',
            action: (id) => router.post(route('my-orders.cancel-return', id), {}, {
                onStart: () => setProcessing(true),
                onFinish: () => { setProcessing(false); closeModal(); }
            })
        }
    };

    const openModal = (type, orderId) => setConfirmModal({ isOpen: true, type, orderId });
    const closeModal = () => setConfirmModal({ isOpen: false, type: null, orderId: null });

    const handleConfirm = () => {
        if (confirmModal.type && confirmModal.orderId) {
            modalConfigs[confirmModal.type].action(confirmModal.orderId);
        }
    };

    const contactSeller = (sellerId) => {
        router.visit(route('buyer.chat', { user_id: sellerId }));
    };

    const buyAgain = (orderId) => {
        router.post(route('cart.buy-again', orderId));
    };

    const currentConfig = confirmModal.type ? modalConfigs[confirmModal.type] : null;

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800">
            <Head title="My Purchases" />

            {/* --- NAVBAR --- */}
            <BuyerNavbar />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                
                {/* --- FLASH MESSAGES --- */}
                {usePage().props.flash?.success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-start gap-2">
                        <CheckCircle size={18} />
                        <span className="text-sm font-bold">{usePage().props.flash.success}</span>
                    </div>
                )}
                {usePage().props.flash?.error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-2">
                        <AlertCircle size={18} />
                        <span className="text-sm font-bold">{usePage().props.flash.error}</span>
                    </div>
                )}
                
                {/* Page Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-serif font-bold text-gray-900">My Purchases</h1>
                    <p className="text-gray-500 text-sm mt-1">Track your orders and manage returns</p>
                </div>

                {wallet && (
                    <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">Buyer Wallet</p>
                                    <h2 className="mt-2 text-2xl font-bold text-emerald-900">
                                        PHP {Number(wallet.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </h2>
                                    <p className="mt-1 text-xs text-emerald-700">Refunded money lands here and can be used for eligible delivery orders.</p>
                                </div>
                                <div className="rounded-2xl bg-white/80 p-3 text-emerald-700 shadow-sm">
                                    <Wallet size={22} />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Recent Wallet Activity</p>
                                <p className="mt-1 text-sm text-gray-500">Latest purchase and refund movements tied to your account.</p>
                            </div>

                            <div className="mt-4 space-y-3">
                                {wallet.recent_transactions?.length ? wallet.recent_transactions.slice(0, 3).map((entry) => (
                                    <div key={entry.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900">{entry.description || entry.category}</p>
                                            <p className="mt-1 text-xs text-gray-500">
                                                {entry.order_number ? `Order ${entry.order_number}` : 'Wallet update'}{entry.created_at ? ` - ${entry.created_at}` : ''}
                                            </p>
                                        </div>
                                        <div className={`shrink-0 text-sm font-bold ${entry.direction === 'credit' ? 'text-emerald-700' : 'text-red-600'}`}>
                                            {entry.direction === 'credit' ? '+' : '-'}PHP {Number(entry.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                                        No wallet activity yet. Refunds and eligible wallet purchases will appear here.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TABS --- */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
                    <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                        {tabs.map(tab => {
                            const count = getTabCount(tab.id);
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 min-w-[92px] sm:min-w-[100px] py-4 px-3 text-xs sm:text-sm font-bold text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
                                        activeTab === tab.id 
                                        ? 'border-clay-600 text-clay-700 bg-clay-50/50' 
                                        : 'border-transparent text-gray-500 hover:text-clay-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {tab.label}
                                    {count > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                            activeTab === tab.id ? 'bg-clay-600 text-white' : 'bg-gray-200 text-gray-600'
                                        }`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* --- SEARCH BAR --- */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by Order ID or Product Name..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clay-200 focus:border-clay-500 shadow-sm transition-all"
                    />
                </div>

                {/* --- ORDER LIST --- */}
                <div className="space-y-6">
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map(order => (
                            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-300">
                                
                                {/* Order Header */}
                                <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-gray-50 to-white flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-100">
                                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                        <div>
                                            <span className="text-xs text-gray-400 font-medium">Order</span>
                                            <h3 className="font-bold text-gray-900 text-sm">#{order.order_number || order.id}</h3>
                                        </div>
                                        <div className="hidden sm:block h-8 w-px bg-gray-200" />
                                        <div className="flex items-center gap-1.5 text-gray-500">
                                            <Clock size={14} />
                                            <span className="text-xs font-medium">{order.date}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <PaymentStatusBadge status={order.payment_status} method={order.payment_method} />
                                        <StatusBadge status={order.status} />
                                    </div>
                                </div>

                                {/* Order Timeline */}
                                <OrderTimeline status={order.status} isPickup={order.shipping_method === 'Pick Up'} />

                                {/* Order Items */}
                                <div className="p-4 sm:p-6 space-y-4">
                                    {order.shipping_method === 'Pick Up' ? (
                                        <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-100 rounded-xl">
                                            <div className="p-2 bg-white rounded-lg shadow-sm text-orange-600">
                                                <Store size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">Store Pick Up</p>
                                                <p className="text-xs text-gray-500 mb-1">Please coordinate with seller via chat.</p>
                                                {order.proof_of_delivery && (
                                                    <a href={order.proof_of_delivery} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-orange-600 underline hover:text-orange-800 flex items-center gap-1 mt-1">
                                                        <PackageCheck size={12} /> View Proof of Readiness
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                            <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">
                                                <MapPin size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">Standard Delivery</p>
                                                {order.shipping_address_type && (
                                                    <span className="mt-1 inline-flex rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                                                        {humanizeAddressType(order.shipping_address_type)}
                                                    </span>
                                                )}
                                                <p className="text-xs text-gray-500 mb-1">{order.shipping_address}</p>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {order.tracking_number && (
                                                        <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-600 font-medium">
                                                            Tracker: {order.tracking_number}
                                                        </span>
                                                    )}
                                                    {order.proof_of_delivery && (
                                                        <a href={order.proof_of_delivery} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-blue-600 underline hover:text-blue-800 flex items-center gap-1">
                                                            <PackageCheck size={12} /> View Proof of Delivery
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-gray-200 transition">
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-xl border border-gray-200 overflow-hidden shrink-0 shadow-sm">
                                                <img 
                                                    src={item.img} 
                                                    alt={item.name} 
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.target.src = '/images/placeholder.svg'; }}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-gray-900 text-sm truncate">{item.name}</h4>
                                                <p className="text-xs text-gray-500 mt-1">Variation: {item.variant}</p>
                                                <p className="text-xs text-gray-400">Qty: {item.qty}</p>
                                            </div>
                                            <div className="text-left sm:text-right shrink-0">
                                                <p className="font-bold text-clay-700">₱{Number(item.price).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Warranty Info (if applicable) */}
                                {(order.status === 'Completed' && order.can_return) && (
                                    <div className="px-4 sm:px-6 pb-4">
                                        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 animate-pulse w-full sm:w-auto">
                                            <AlertTriangle size={14} className="text-amber-600" />
                                            <span className="text-xs font-medium text-amber-700">
                                                Return expires: <span className="font-bold">{order.warranty_expires_at}</span>
                                            </span>
                                        </div>
                                    </div>
                                )}


                                {/* Order Footer */}
                                <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <p className="text-xs text-gray-400 font-medium">Order Breakdown</p>
                                        <div className="mt-2 space-y-1 text-sm text-gray-500">
                                            <div className="flex items-center gap-3">
                                                <span className="min-w-[140px]">Merchandise Subtotal</span>
                                                <span className="font-semibold text-gray-700">PHP {order.merchandise_subtotal}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="min-w-[140px]">Convenience Fee</span>
                                                <span className="font-semibold text-gray-700">PHP {order.convenience_fee_amount}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="min-w-[140px]">Total Paid</span>
                                                <span className="text-xl sm:text-2xl font-bold text-clay-700">PHP {order.total}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex w-full flex-wrap gap-2 justify-start sm:justify-end">
                                        
                                        {/* Download Receipt */}
                                        <a 
                                            href={`/my-orders/${order.id}/receipt`}
                                            target="_blank"
                                            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm"
                                        >
                                            <Printer size={16} /> Receipt
                                        </a>

                                        {/* Contact Seller */}
                                        {/* Contact Seller - Hide if Completed (unless Return/Refund) */}
                                        {order.status !== 'Completed' && (
                                            <button 
                                                onClick={() => contactSeller(order.seller_id)}
                                                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm"
                                            >
                                                <MessageCircle size={16} /> Chat
                                            </button>
                                        )}

                                        {/* PENDING/ACCEPTED: Pay Now (For E-Wallets) */}
                                        {['Pending', 'Accepted'].includes(order.status) && order.payment_status === 'pending' && order.payment_method !== 'COD' && (
                                            <a 
                                                href={route('payment.pay', order.order_number)}
                                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
                                            >
                                                <CreditCard size={16} /> Pay Now
                                            </a>
                                        )}

                                        {/* PENDING: Cancel */}
                                        {order.can_cancel && (
                                            <button 
                                                onClick={() => openModal('cancel', order.id)}
                                                className="inline-flex items-center gap-2 px-4 py-2.5 border border-red-200 bg-red-50 rounded-xl text-sm font-bold text-red-600 hover:bg-red-100 transition"
                                            >
                                                <XCircle size={16} /> Cancel
                                            </button>
                                        )}

                                        {/* DELIVERED / READY FOR PICKUP: Confirm Receipt */}
                                        {(order.status === 'Delivered' && !order.received_at) && (
                                            <button 
                                                onClick={() => openModal('receive', order.id)}
                                                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all hover:-translate-y-0.5 ${
                                                    order.shipping_method === 'Pick Up'
                                                    ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-200'
                                                    : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                                                }`}
                                            >
                                                {order.shipping_method === 'Pick Up' ? <PackageCheck size={16} /> : <CheckCircle size={16} />}
                                                {order.shipping_method === 'Pick Up' ? 'Confirm Pick Up' : 'Order Received'}
                                            </button>
                                        )}

                                        {/* COMPLETED: Rate & Return */}
                                        {/* COMPLETED: Rate & Return */}
                                        {/* COMPLETED: Rate & Return & Buy Again */}
                                        {order.status === 'Completed' && (
                                            <>
                                                <button 
                                                    onClick={() => buyAgain(order.id)}
                                                    className="inline-flex items-center gap-2 px-4 py-2.5 border border-clay-200 bg-clay-50 text-clay-700 rounded-xl text-sm font-bold hover:bg-clay-100 transition shadow-sm"
                                                >
                                                    <ShoppingBag size={16} /> Buy Again
                                                </button>

                                                {!order.items.every(item => item.is_rated) && (
                                                    <button 
                                                        onClick={() => setRatingModal({ isOpen: true, order })}
                                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-clay-600 text-white rounded-xl text-sm font-bold hover:bg-clay-700 shadow-lg shadow-clay-200 transition-all hover:-translate-y-0.5"
                                                    >
                                                        <Star size={16} /> Rate
                                                    </button>
                                                )}

                                                {order.can_return && (
                                                    <button 
                                                        onClick={() => setReturnModalState({ isOpen: true, order })}
                                                        className="inline-flex items-center gap-2 px-4 py-2.5 border border-orange-200 bg-orange-50 rounded-xl text-sm font-bold text-orange-600 hover:bg-orange-100 transition"
                                                    >
                                                        <RotateCcw size={16} /> Return
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        
                                        {/* REFUND/RETURN */}
                                        {order.status === 'Refund/Return' && (
                                            <>
                                                <button 
                                                    onClick={() => openModal('cancelReturn', order.id)}
                                                    className="inline-flex items-center gap-2 px-4 py-2.5 border border-red-200 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition shadow-sm"
                                                >
                                                    <XCircle size={16} /> Cancel Return
                                                </button>
                                                <button 
                                                    onClick={() => contactSeller(order.seller_id)}
                                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all hover:-translate-y-0.5"
                                                >
                                                    <MessageCircle size={16} /> Negotiate Return
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShoppingBag size={40} className="text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">No orders found</h3>
                            <p className="text-gray-500 text-sm mb-6 mt-1">
                                {activeTab === 'All' 
                                    ? "You haven't placed any orders yet." 
                                    : `No orders in "${tabs.find(t => t.id === activeTab)?.label}" category.`}
                            </p>
                            <Link href="/shop" className="inline-flex items-center gap-2 px-6 py-3 bg-clay-600 text-white rounded-xl font-bold hover:bg-clay-700 shadow-lg shadow-clay-200 transition-all hover:-translate-y-0.5">
                                <ShoppingBag size={18} /> Start Shopping
                            </Link>
                        </div>
                    )}
                </div>

            </main>

            {/* --- RATING MODAL --- */}
            <RatingModal 
                isOpen={ratingModal.isOpen} 
                onClose={() => setRatingModal({ ...ratingModal, isOpen: false })}
                order={ratingModal.order}
            />

            {/* --- RETURN FORM MODAL --- */}
            <ReturnRequestModal
                isOpen={returnModalState.isOpen}
                onClose={() => setReturnModalState({ isOpen: false, order: null })}
                order={returnModalState.order}
            />

            {/* --- CONFIRMATION MODAL --- */}
            {currentConfig && (
                <ConfirmationModal
                    isOpen={confirmModal.isOpen}
                    onClose={closeModal}
                    onConfirm={handleConfirm}
                    title={currentConfig.title}
                    message={currentConfig.message}
                    icon={currentConfig.icon}
                    iconBg={currentConfig.iconBg}
                    confirmText={currentConfig.confirmText}
                    confirmColor={currentConfig.confirmColor}
                    processing={processing}
                />
            )}
        </div>
    );
}



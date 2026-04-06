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
    MapPin, Hash, Star, PackageCheck, AlertCircle, Wallet, CreditCard, Printer, Store, UploadCloud, ExternalLink
} from 'lucide-react';

// --- RETURN REQUEST MODAL COMPONENT ---
const ReturnRequestModal = ({ isOpen, onClose, order }) => {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        return_reason: '',
        return_proof_image: null,
    });

    const [previewUrl, setPreviewUrl] = useState(null);

    const revokePreview = () => {
        if (previewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
    };

    React.useEffect(() => {
        if (!isOpen) {
            reset();
            clearErrors();
            revokePreview();
            setPreviewUrl(null);
        }
    }, [isOpen]);

    React.useEffect(() => {
        return () => revokePreview();
    }, [previewUrl]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('return_proof_image', file);
            revokePreview();
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

    let normalizedStatus = status;
    if (status === 'Ready for Pickup' && !isPickup) normalizedStatus = 'Shipped';
    if (status === 'Shipped' && isPickup) normalizedStatus = 'Ready for Pickup';
    if (status === 'Processing') normalizedStatus = 'Accepted';

    const currentStepIndex = steps.findIndex((step) => step.key === normalizedStatus);

    return (
        <div className="overflow-x-auto overflow-y-visible border-t border-b border-stone-100 bg-white px-4 py-5 sm:px-6">
            <div className="mx-auto flex min-w-[560px] max-w-3xl items-center justify-between pb-6">
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

const deliveryStatusConfig = (status) => {
    const normalized = String(status || '').toUpperCase();

    const configs = {
        ASSIGNING_DRIVER: {
            label: 'Assigning Driver',
            tone: 'border-indigo-200 bg-indigo-50 text-indigo-700',
            detail: 'Lalamove is assigning a courier.',
        },
        ON_GOING: {
            label: 'On Going',
            tone: 'border-sky-200 bg-sky-50 text-sky-700',
            detail: 'Courier is moving with your order.',
        },
        PICKED_UP: {
            label: 'Picked Up',
            tone: 'border-blue-200 bg-blue-50 text-blue-700',
            detail: 'Your package has been picked up.',
        },
        COMPLETED: {
            label: 'Completed',
            tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
            detail: 'Lalamove marked this delivery as completed.',
        },
        CANCELED: {
            label: 'Canceled',
            tone: 'border-red-200 bg-red-50 text-red-700',
            detail: 'Courier canceled the delivery.',
        },
        REJECTED: {
            label: 'Rejected',
            tone: 'border-red-200 bg-red-50 text-red-700',
            detail: 'Lalamove rejected the delivery request.',
        },
        EXPIRED: {
            label: 'Expired',
            tone: 'border-amber-200 bg-amber-50 text-amber-700',
            detail: 'The delivery request expired.',
        },
    };

    return configs[normalized] || {
        label: normalized || 'Pending',
        tone: 'border-gray-200 bg-gray-50 text-gray-700',
        detail: 'Waiting for courier updates.',
    };
};

const buyerCourierTrackingState = (order) => {
    const base = deliveryStatusConfig(order?.delivery?.status);
    const isReplacementExchange = order?.delivery?.flow_type === 'replacement_exchange';

    if (String(order?.delivery?.status || '').toUpperCase() === 'COMPLETED' && order?.status === 'Delivered') {
        return {
            ...base,
            label: isReplacementExchange ? 'Exchange Completed' : 'Awaiting Your Confirmation',
            tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
            detail: isReplacementExchange
                ? 'Courier completed the replacement exchange. Confirm receipt once the replacement item is safely with you.'
                : 'Courier completed delivery. Confirm receipt once the order is safely with you.',
        };
    }

    if (String(order?.delivery?.status || '').toUpperCase() === 'COMPLETED' && order?.status === 'Completed') {
        return {
            ...base,
            label: isReplacementExchange ? 'Exchange Resolved' : 'Delivered',
            tone: 'border-green-200 bg-green-50 text-green-700',
            detail: isReplacementExchange
                ? 'Courier completed the replacement exchange and you already confirmed receipt.'
                : 'Courier completed delivery and you already confirmed receipt.',
        };
    }

    if (isReplacementExchange) {
        return {
            ...base,
            detail: 'Replacement exchange is in progress. Courier will deliver the replacement item and return the rejected item to the seller.',
        };
    }

    return base;
};

export default function MyOrders({ auth, orders }) {
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

    // Extract flash messages unconditionally (must not be called inside JSX/conditionals)
    const { props: { flash } } = usePage();

    const hasActiveCourierTracking = orders.some((order) => {
        if (order?.delivery?.provider !== 'lalamove' || !order?.delivery?.external_order_id) {
            return false;
        }

        return !['COMPLETED', 'CANCELED', 'REJECTED', 'EXPIRED'].includes(String(order?.delivery?.status || '').toUpperCase());
    });

    React.useEffect(() => {
        if (!hasActiveCourierTracking || typeof window === 'undefined') {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            if (document.hidden) {
                return;
            }

            router.reload({
                only: ['orders'],
                preserveState: true,
                preserveScroll: true,
            });
        }, 15000);

        return () => window.clearInterval(intervalId);
    }, [hasActiveCourierTracking]);

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

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
                
                {/* --- FLASH MESSAGES --- */}
                {flash?.success && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-start gap-2">
                        <CheckCircle size={16} />
                        <span className="text-[13px] font-bold">{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-2">
                        <AlertCircle size={16} />
                        <span className="text-[13px] font-bold">{flash.error}</span>
                    </div>
                )}
                
                {/* Page Header */}
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-stone-900">My Purchases</h1>
                        <p className="mt-0.5 text-xs text-stone-500">Track your orders and manage returns.</p>
                    </div>
                    <Link
                        href={route('my-wallet.index')}
                        className="inline-flex items-center gap-1.5 self-start rounded-lg border border-stone-200 bg-white px-3 py-2 text-[12px] font-bold text-stone-700 shadow-sm transition hover:bg-stone-50"
                    >
                        <Wallet size={14} strokeWidth={2.5} />
                        My Wallet
                    </Link>
                </div>

                {/* --- TABS --- */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
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
                <div className="relative mb-4">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search by Order ID or Product Name..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-lg text-[12px] font-medium placeholder:text-stone-400 focus:ring-2 focus:ring-clay-200 focus:border-clay-500 shadow-sm transition-all"
                    />
                </div>

                {/* --- ORDER LIST --- */}
                <div className="space-y-6">
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map(order => (
                            <div key={order.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.05)] transition-all duration-300">
                                
                                {/* Order Header */}
                                <div className="px-4 py-3 bg-[#FDFBF9] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-stone-100">
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Order Ref</span>
                                            <h3 className="font-bold tracking-tight text-stone-900 text-[13px]">#{order.order_number || order.id}</h3>
                                        </div>
                                        <div className="hidden sm:block h-4 w-px bg-stone-200" />
                                        <div className="flex items-center gap-1 text-stone-500">
                                            <Clock size={12} />
                                            <span className="text-[11px] font-medium">{order.date}</span>
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
                                    {/* Pickup / Delivery Info */}
                                    {order.shipping_method === 'Pick Up' ? (
                                        <div className="flex items-center gap-2.5 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2">
                                            <div className="p-1.5 bg-white rounded-lg shadow-sm text-orange-600 shrink-0">
                                                <Store size={14} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-bold text-gray-900">Store Pick Up</p>
                                                <p className="text-[10px] text-gray-500">Coordinate pickup time with seller via chat.</p>
                                                {order.proof_of_delivery && (
                                                    <a href={order.proof_of_delivery} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-orange-600 underline hover:text-orange-800 flex items-center gap-1 mt-0.5">
                                                        <PackageCheck size={11} /> View Proof of Readiness
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {/* Address row */}
                                            <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                                                <div className="flex items-start gap-2">
                                                    <div className="p-1 bg-white rounded shadow-sm text-blue-600 shrink-0 mt-0.5">
                                                        <MapPin size={13} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <p className="text-[12px] font-bold text-gray-900">
                                                                {order.delivery?.provider === 'lalamove' ? 'Lalamove Delivery' : 'Standard Delivery'}
                                                            </p>
                                                            {order.shipping_address_type && (
                                                                <span className="inline-flex rounded border border-blue-200 bg-white px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide text-blue-700">
                                                                    {humanizeAddressType(order.shipping_address_type)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-gray-500 leading-snug">{order.shipping_address}</p>
                                                        {(order.shipping_recipient_name || order.shipping_contact_phone) && (
                                                            <p className="text-[10px] text-gray-400">
                                                                {order.shipping_recipient_name}
                                                                {order.shipping_recipient_name && order.shipping_contact_phone ? ' | ' : ''}
                                                                {order.shipping_contact_phone}
                                                            </p>
                                                        )}
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {order.tracking_number && (
                                                                <span className="text-[9px] bg-white px-1.5 py-0 rounded border border-blue-200 text-blue-600 font-medium">
                                                                    Tracker: {order.tracking_number}
                                                                </span>
                                                            )}
                                                            {order.proof_of_delivery && (
                                                                <a href={order.proof_of_delivery} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-blue-600 underline hover:text-blue-800 flex items-center gap-1">
                                                                    <PackageCheck size={9} /> View Proof
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Courier tracking card */}
                                            {order.delivery && (
                                                <div className="rounded-lg border border-gray-200 bg-white/80 px-2.5 py-2">
                                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                                        <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-gray-400">Courier</p>
                                                        {order.delivery.share_link && (
                                                            <a
                                                                href={order.delivery.share_link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-0.5 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[9px] font-bold text-gray-600 hover:bg-gray-100 shadow-sm"
                                                            >
                                                                Track <ExternalLink size={9} />
                                                            </a>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-1 mb-1.5">
                                                        {order.delivery.flow_type === 'replacement_exchange' && (
                                                            <span className="inline-flex rounded border border-teal-200 bg-teal-50 px-1.5 py-0 text-[9px] font-bold text-teal-700">
                                                                {order.delivery.flow_label}
                                                            </span>
                                                        )}
                                                        <div className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold ${buyerCourierTrackingState(order).tone}`}>
                                                            <Truck size={10} />
                                                            {buyerCourierTrackingState(order).label}
                                                        </div>
                                                    </div>

                                                    <p className="text-[10px] leading-snug text-gray-500 mb-1.5">{buyerCourierTrackingState(order).detail}</p>

                                                    {order.delivery.flow_type === 'replacement_exchange' && order.delivery.route_legs?.length > 0 && (
                                                        <div className="mb-1.5 flex flex-col gap-0.5">
                                                            {order.delivery.route_legs.map((leg) => (
                                                                <p key={`${leg.label}-${leg.from}-${leg.to}`} className="text-[9px] text-teal-700 font-medium">
                                                                    <span className="font-bold">{leg.label}:</span> {leg.from} → {leg.to}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {(order.delivery.external_order_id || order.delivery.last_updated_at) && (
                                                        <div className="flex flex-wrap gap-1 text-[9px]">
                                                            {order.delivery.external_order_id && (
                                                                <span className="rounded border border-gray-200 bg-white px-1.5 py-0 font-bold text-gray-600">
                                                                    ID: {order.delivery.external_order_id}
                                                                </span>
                                                            )}
                                                            {order.delivery.last_updated_at && (
                                                                <span className="rounded border border-gray-200 bg-white px-1.5 py-0 text-gray-500">
                                                                    {order.delivery.last_updated_at}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {order.delivery.pending_auto_cancel && (
                                                        <div className="mt-1.5 rounded border border-red-200 bg-red-50 px-2 py-1 text-[9px] text-red-700">
                                                            <span className="font-bold">Return-to-sender hold —</span> Auto-cancel after {order.delivery.cancel_hold_ends_at} if unresolved.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Replacement in Progress */}
                                    {order.replacement_in_progress && (
                                        <div className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5">
                                                    <PackageCheck size={13} className="text-teal-600 shrink-0" />
                                                    <p className="text-[12px] font-bold text-teal-800">Replacement in Progress</p>
                                                </div>
                                                {order.replacement_started_at && (
                                                    <span className="text-[9px] text-teal-600 font-medium whitespace-nowrap">{order.replacement_started_at}</span>
                                                )}
                                            </div>
                                            {order.replacement_resolution_description && (
                                                <div className="mt-1.5 rounded border border-teal-100 bg-white/70 px-2 py-1 text-[9px] text-teal-900 whitespace-pre-wrap">
                                                    <span className="font-bold">Resolution: </span>{order.replacement_resolution_description}
                                                </div>
                                            )}
                                            <p className="mt-1 text-[9px] text-teal-700 leading-snug">
                                                {order.delivery?.flow_type === 'replacement_exchange'
                                                    ? 'Courier will deliver the replacement to you and return the rejected item to the seller.'
                                                    : 'Replacement must be delivered and confirmed before the issue is resolved.'}
                                            </p>
                                        </div>
                                    )}

                                    {/* Replacement Resolved */}
                                    {order.replacement_resolved_at && (
                                        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                                            <CheckCircle size={13} className="text-emerald-600 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-bold text-emerald-800">Replacement Resolved</p>
                                                <p className="text-[10px] text-emerald-700">Confirmed on {order.replacement_resolved_at}.
                                                    {order.replacement_resolution_description && <span> · {order.replacement_resolution_description}</span>}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {order.items.length > 0 && (
                                        <div className="overflow-hidden rounded-lg border border-stone-100 bg-[#FCFAF7]">
                                            <div className="divide-y divide-stone-100/70">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 transition-colors hover:bg-white">
                                                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-lg border border-stone-200 overflow-hidden shrink-0 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
                                                            <img 
                                                                src={item.img} 
                                                                alt={item.name} 
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { e.target.src = '/images/placeholder.svg'; }}
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0 self-center">
                                                            <h4 className="font-bold text-stone-900 text-[14px] truncate">{item.name}</h4>
                                                            <div className="mt-1 flex items-center gap-3 text-[12px] text-stone-500">
                                                                <span>Var: {item.variant}</span>
                                                                <span className="h-1 w-1 rounded-full bg-stone-300"></span>
                                                                <span>Qty: {item.qty}</span>
                                                            </div>
                                                        </div>
                                                        <div className="w-full text-left sm:w-auto sm:text-right shrink-0 sm:self-center mt-3 sm:mt-0">
                                                            <p className="font-black tracking-tight text-stone-900 text-[16px]">PHP {Number(item.price).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
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
                                <div className="px-4 py-3 bg-[#FDFBF9] border-t border-stone-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="w-full sm:w-auto">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-1.5">Order Breakdown</p>
                                        <div className="space-y-1 text-[12px] text-stone-500">
                                            <div className="flex items-center justify-between gap-4 sm:justify-start">
                                                <span className="min-w-[120px]">Subtotal</span>
                                                <span className="font-bold text-stone-800 text-right whitespace-nowrap shrink-0">PHP {order.merchandise_subtotal}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 sm:justify-start">
                                                <span className="min-w-[120px]">Fee (3%)</span>
                                                <span className="font-bold text-stone-800 text-right whitespace-nowrap shrink-0">PHP {order.convenience_fee_amount}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 pt-1.5 mt-1.5 border-t border-stone-200/60 sm:justify-start">
                                                <span className="min-w-[120px] font-bold text-stone-900 text-[13px]">Total</span>
                                                <span className="text-[15px] font-black tracking-tight text-[#c8764b] text-right whitespace-nowrap shrink-0">PHP {order.total}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex w-full flex-wrap gap-2 justify-start sm:justify-end">
                                        
                                        {/* Download Receipt */}
                                        <a 
                                            href={`/my-orders/${order.id}/receipt`}
                                            target="_blank"
                                            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white rounded-lg text-[12px] font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm"
                                        >
                                            <Printer size={14} /> Receipt
                                        </a>

                                        {/* Contact Seller */}
                                        {/* Contact Seller - Hide if Completed (unless Return/Refund) */}
                                        {order.status !== 'Completed' && (
                                            <button 
                                                onClick={() => contactSeller(order.seller_id)}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white rounded-lg text-[12px] font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm"
                                            >
                                                <MessageCircle size={14} /> Chat
                                            </button>
                                        )}

                                        {/* PENDING/ACCEPTED: Pay Now (For E-Wallets) */}
                                        {['Pending', 'Accepted'].includes(order.status) && order.payment_status === 'pending' && order.payment_method !== 'COD' && (
                                            <a 
                                                href={route('payment.pay', order.order_number)}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-[12px] font-bold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all hover:-translate-y-0.5"
                                            >
                                                <CreditCard size={14} /> Pay Now
                                            </a>
                                        )}

                                        {/* PENDING: Cancel */}
                                        {order.can_cancel && (
                                            <button 
                                                onClick={() => openModal('cancel', order.id)}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 bg-red-50 rounded-lg text-[12px] font-bold text-red-600 hover:bg-red-100 transition"
                                            >
                                                <XCircle size={14} /> Cancel
                                            </button>
                                        )}

                                        {/* DELIVERED / READY FOR PICKUP: Confirm Receipt */}
                                        {(order.status === 'Delivered' && !order.received_at) && (
                                            <button 
                                                onClick={() => openModal('receive', order.id)}
                                                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold shadow-md transition-all hover:-translate-y-0.5 ${
                                                    order.shipping_method === 'Pick Up'
                                                    ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-200'
                                                    : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                                                }`}
                                            >
                                                {order.shipping_method === 'Pick Up' ? <PackageCheck size={14} /> : <CheckCircle size={14} />}
                                                {order.shipping_method === 'Pick Up' ? 'Confirm Pick Up' : 'Order Received'}
                                            </button>
                                        )}

                                        {/* COMPLETED: Rate & Return */}
                                        {order.status === 'Completed' && (
                                            <>
                                                <button 
                                                    onClick={() => buyAgain(order.id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-clay-200 bg-clay-50 text-clay-700 rounded-lg text-[12px] font-bold hover:bg-clay-100 transition shadow-sm"
                                                >
                                                    <ShoppingBag size={14} /> Buy Again
                                                </button>

                                                {(!order.replacement_in_progress && (
                                                    order.items.some(item => !item.is_rated) ||
                                                    order.items.some(item => item.review?.can_manage_review)
                                                )) && (
                                                    <button 
                                                        onClick={() => setRatingModal({ isOpen: true, order })}
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-clay-600 text-white rounded-lg text-[12px] font-bold hover:bg-clay-700 shadow-md shadow-clay-200 transition-all hover:-translate-y-0.5"
                                                    >
                                                        <Star size={14} /> {order.items.some(item => item.review?.can_manage_review) ? 'Manage Reviews' : 'Rate'}
                                                    </button>
                                                )}

                                                {order.can_return && (
                                                    <button 
                                                        onClick={() => setReturnModalState({ isOpen: true, order })}
                                                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-orange-200 bg-orange-50 rounded-lg text-[12px] font-bold text-orange-600 hover:bg-orange-100 transition"
                                                    >
                                                        <RotateCcw size={14} /> Return
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        
                                        {/* REFUND/RETURN */}
                                        {order.status === 'Refund/Return' && (
                                            <>
                                                <button 
                                                    onClick={() => openModal('cancelReturn', order.id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 bg-red-50 text-red-600 rounded-lg text-[12px] font-bold hover:bg-red-100 transition shadow-sm"
                                                >
                                                    <XCircle size={14} /> Cancel Return
                                                </button>
                                                <button 
                                                    onClick={() => contactSeller(order.seller_id)}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-lg text-[12px] font-bold hover:bg-orange-600 shadow-md shadow-orange-200 transition-all hover:-translate-y-0.5"
                                                >
                                                    <MessageCircle size={14} /> Negotiate Return
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-24 text-center bg-white rounded-2xl border border-stone-100 shadow-sm">
                            <div className="w-20 h-20 bg-[#FCFAF7] border border-stone-200/60 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                                <ShoppingBag size={32} strokeWidth={1.5} className="text-stone-400" />
                            </div>
                            <h3 className="text-[17px] font-bold tracking-tight text-stone-900">No orders found</h3>
                            <p className="text-stone-500 text-[13px] mb-6 mt-1.5 max-w-sm mx-auto">
                                {activeTab === 'All' 
                                    ? "You haven't placed any orders yet. Start exploring artisan products." 
                                    : `No orders found in the "${tabs.find(t => t.id === activeTab)?.label}" category.`}
                            </p>
                            <Link href="/shop" className="inline-flex items-center gap-2 px-6 py-2.5 bg-clay-700 text-white rounded-xl text-[13px] font-bold hover:bg-clay-800 shadow-sm transition-all">
                                <ShoppingBag size={16} strokeWidth={2.5} /> Start Shopping
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

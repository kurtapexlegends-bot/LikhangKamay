import React, { useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import BuyerNavbar from '@/Layouts/BuyerNavbar';
import ImpersonationBanner from '@/Layouts/ImpersonationBanner';
import Dropdown from '@/Components/Dropdown';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState'; 
import Modal from '@/Components/Modal';
import RatingModal from '@/Components/Consumer/RatingModal';
import ConfirmationModal from '@/Components/ConfirmationModal';
import { Clock, Store, MapPin, Search, ShoppingBag, AlertCircle, AlertTriangle, MessageCircle, ExternalLink, Hash, CheckCircle, PackageCheck, Truck, RotateCcw, XCircle, CreditCard, Star, Activity, Printer, UploadCloud, ChevronDown, ChevronRight, EllipsisVertical } from 'lucide-react';
import { motion } from 'framer-motion';

// --- RETURN REQUEST MODAL COMPONENT ---
// --- RETURN REQUEST MODAL COMPONENT (MULTI-PHOTO) ---
const ReturnRequestModal = ({ isOpen, onClose, order }) => {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        reason: '',
        proof_photos: [],
    });

    const [previewUrls, setPreviewUrls] = useState([]);

    const revokePreviews = () => {
        previewUrls.forEach(url => {
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
    };

    React.useEffect(() => {
        if (!isOpen) {
            reset();
            clearErrors();
            revokePreviews();
            setPreviewUrls([]);
        }
    }, [isOpen]);

    React.useEffect(() => {
        return () => revokePreviews();
    }, [previewUrls]);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + data.proof_photos.length > 5) {
            alert('You can upload up to 5 photos in total.');
            return;
        }
        const updatedFiles = [...data.proof_photos, ...files];
        setData('proof_photos', updatedFiles);

        const newUrls = files.map(file => URL.createObjectURL(file));
        setPreviewUrls([...previewUrls, ...newUrls]);
    };

    const handleRemoveFile = (index) => {
        const updatedFiles = [...data.proof_photos];
        updatedFiles.splice(index, 1);
        setData('proof_photos', updatedFiles);

        const updatedUrls = [...previewUrls];
        if (updatedUrls[index]?.startsWith('blob:')) {
            URL.revokeObjectURL(updatedUrls[index]);
        }
        updatedUrls.splice(index, 1);
        setPreviewUrls(updatedUrls);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('my-orders.dispute', order.id), {
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
                        <h2 className="text-xl font-bold text-gray-900">Initiate Return Dispute</h2>
                        <p className="text-sm text-gray-500">Provide details and photos of the damaged item.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Reason for Return</label>
                        <textarea
                            className="w-full border-gray-300 rounded-xl focus:ring-orange-500 focus:border-orange-500 shadow-sm text-sm"
                            rows="3"
                            placeholder="Describe what is wrong with the item (damaged, wrong item sent)..."
                            value={data.reason}
                            onChange={(e) => setData('reason', e.target.value)}
                            required
                        ></textarea>
                        {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason}</p>}
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Proof Photos (Up to 5)</label>
                        <label className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:border-gray-400 transition-colors">
                            <div className="space-y-1 text-center">
                                <UploadCloud className="mx-auto h-10 w-10 text-gray-400" />
                                <div className="flex text-sm text-gray-600 justify-center">
                                    <span className="relative rounded-md font-medium text-orange-600 hover:text-orange-500 focus-within:outline-none">
                                        <span>Upload images</span>
                                        <input 
                                            type="file" 
                                            className="sr-only" 
                                            accept="image/*"
                                            multiple
                                            onChange={handleFileChange}
                                            required={data.proof_photos.length === 0}
                                        />
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB (multiple allowed)</p>
                            </div>
                        </label>
                        {errors.proof_photos && <p className="text-red-500 text-xs mt-1">{errors.proof_photos}</p>}
                        
                        {/* Preview list */}
                        {previewUrls.length > 0 && (
                            <div className="mt-4 grid grid-cols-5 gap-2">
                                {previewUrls.map((url, index) => (
                                    <div key={index} className="relative aspect-square rounded-lg border border-gray-200 overflow-hidden group">
                                        <img src={url} alt="Preview" className="h-full w-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFile(index)}
                                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition"
                                        >
                                            <XCircle size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-bold text-gray-700 transition hover:bg-gray-50"
                            disabled={processing}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-2 font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:opacity-50"
                        >
                            {processing ? 'Submitting...' : 'Submit Dispute'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

// --- ESCALATE DISPUTE MODAL COMPONENT ---
const EscalateDisputeModal = ({ isOpen, onClose, disputeId }) => {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        action: 'escalate',
        escalation_reason: '',
    });

    React.useEffect(() => {
        if (!isOpen) {
            reset();
            clearErrors();
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('disputes.react', disputeId), {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="md">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Escalate Dispute</h2>
                        <p className="text-sm text-gray-500">Provide details on why you are escalating this dispute.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Reason for Escalation</label>
                        <textarea
                            className="w-full border-gray-300 rounded-xl focus:ring-amber-500 focus:border-amber-500 shadow-sm text-sm"
                            rows="4"
                            placeholder="Explain the situation clearly (e.g., seller proposed replacement but I prefer refund, or seller rejected but product is damaged)..."
                            value={data.escalation_reason}
                            onChange={(e) => setData('escalation_reason', e.target.value)}
                            required
                        ></textarea>
                        {errors.escalation_reason && <p className="text-red-500 text-xs mt-1">{errors.escalation_reason}</p>}
                    </div>

                    <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-bold text-gray-700 transition hover:bg-gray-50"
                            disabled={processing}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-2 font-bold text-white shadow-lg shadow-amber-200 transition hover:bg-amber-700 disabled:opacity-50"
                        >
                            {processing ? 'Escalating...' : 'Confirm Escalation'}
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
        { key: 'Ready for Pickup', label: 'Ready', icon: Store, color: 'sky' },
        { key: 'Delivered', label: 'Picked Up', icon: CheckCircle, color: 'teal' },
        { key: 'Completed', label: 'Completed', icon: Star, color: 'green' },
    ] : [
        { key: 'Pending', label: 'Placed', icon: Clock, color: 'amber' },
        { key: 'Accepted', label: 'Confirmed', icon: PackageCheck, color: 'blue' },
        { key: 'Shipped', label: 'Shipped', icon: Truck, color: 'sky' },
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
        <>
            {/* --- SLEEK MOBILE VERTICAL TIMELINE --- */}
            <div className="block sm:hidden border-t border-b border-stone-50 bg-[#FDFBF9]/50 px-5 py-5">
                <div className="relative space-y-4 pl-4">
                    {/* Thin Progress Line */}
                    <div className="absolute left-[27px] top-2 bottom-2 w-[1px] bg-stone-200" />
                    
                    {steps.map((step, idx) => {
                        const stepStatus = getStepStatus(step.key);
                        const isDone = stepStatus === 'done';
                        const isActive = stepStatus === 'active';
                        
                        return (
                            <div key={step.key} className="relative flex items-center gap-4">
                                {/* Indicator Dot */}
                                <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">
                                    {isActive ? (
                                        <>
                                            <div className="h-4 w-4 rounded-full bg-clay-500 shadow-[0_0_0_4px_rgba(180,94,56,0.15)]" />
                                            <div className="absolute inset-0 h-full w-full animate-ping rounded-full bg-clay-400 opacity-20" />
                                        </>
                                    ) : isDone ? (
                                        <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                                    ) : (
                                        <div className="h-2.5 w-2.5 rounded-full bg-stone-200" />
                                    )}
                                </div>

                                {/* Label Content */}
                                <div className="flex items-center gap-2">
                                    <span className={`text-[13px] tracking-tight ${
                                        isActive 
                                            ? 'font-black text-clay-900' 
                                            : isDone 
                                                ? 'font-bold text-stone-600' 
                                                : 'font-medium text-stone-400'
                                    }`}>
                                        {step.label}
                                    </span>
                                    {isActive && (
                                        <span className="rounded-full bg-clay-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-clay-700">
                                            Current
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- DESKTOP HORIZONTAL TIMELINE (Strictly Preserved) --- */}
            <div className="hidden sm:block overflow-x-auto overflow-y-visible border-t border-b border-stone-100 bg-white px-4 py-5 sm:px-6">
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
                                        ${stepStatus === 'done' 
                                            ? 'text-green-600' 
                                            : stepStatus === 'active' 
                                                ? 'text-clay-700 transform scale-110' 
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
        </>
    );
};

// --- STATUS BADGE COMPONENT ---
const StatusBadge = ({ status }) => {
    const config = {
        'Pending': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
        'Accepted': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: PackageCheck },
        'Shipped': { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200', icon: Truck },
        'Ready for Pickup': { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200', icon: Store },
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
            <CreditCard size={10} />
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
            tone: 'border-sky-200 bg-sky-50 text-sky-700',
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

// --- COURIER PROGRESS BAR COMPONENT ---
const CourierProgressBar = ({ status }) => {
    const normalized = String(status || '').toUpperCase();
    
    // Define steps
    const steps = [
        { key: 'ASSIGNING', label: 'Assigning' },
        { key: 'TRANSIT', label: 'In Transit' },
        { key: 'COMPLETED', label: 'Delivered' }
    ];

    let currentStepIndex = 0; // default assigning
    if (normalized === 'ON_GOING' || normalized === 'PICKED_UP') {
        currentStepIndex = 1;
    } else if (normalized === 'COMPLETED') {
        currentStepIndex = 2;
    } else if (['CANCELED', 'REJECTED', 'EXPIRED'].includes(normalized)) {
        return null; // Don't show progress bar for terminal failure states
    }

    return (
        <div className="py-4 px-2">
            <div className="relative flex items-center justify-between">
                {/* Background line */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-stone-100 rounded-full" />
                
                {/* Active progress line */}
                <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-clay-500 rounded-full transition-all duration-700 ease-in-out" 
                    style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                />

                {steps.map((step, idx) => {
                    const isActive = idx === currentStepIndex;
                    const isCompleted = idx < currentStepIndex;
                    
                    return (
                        <div key={step.key} className="relative z-10 flex flex-col items-center">
                            {/* Circle Indicator */}
                            <div className={`
                                w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500
                                ${isCompleted 
                                    ? 'bg-clay-600 text-white shadow-sm' 
                                    : isActive 
                                        ? 'bg-white text-clay-600 border border-clay-500 shadow-sm ring-4 ring-clay-100/50' 
                                        : 'bg-white text-stone-300 border border-stone-200'}
                            `}>
                                {isCompleted ? (
                                    <CheckCircle size={12} strokeWidth={3} />
                                ) : (
                                    <span className="text-[10px] font-black">{idx + 1}</span>
                                )}
                            </div>
                            
                            {/* Label */}
                            <span className={`
                                mt-1.5 text-[10px] font-bold tracking-tight transition-colors duration-300
                                ${isActive 
                                    ? 'text-clay-700 font-extrabold' 
                                    : isCompleted 
                                        ? 'text-stone-600' 
                                        : 'text-stone-400'}
                            `}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const formatTimelineStamp = (value) => {
    if (!value) return null;

    try {
        return new Intl.DateTimeFormat('en-PH', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date(value));
    } catch {
        return value;
    }
};

const buyerProofLabel = (order) => {
    if (!order?.proof_of_delivery) return null;

    if (order.shipping_method === 'Pick Up') {
        return ['Delivered', 'Completed'].includes(order.status)
            ? 'View Pickup Handover Proof'
            : 'View Proof of Readiness';
    }

    return ['Delivered', 'Completed'].includes(order.status)
        ? 'View Delivery Proof'
        : 'View Shipment Proof';
};

const buyerDeliverySummary = (order) => {
    const latestEvent = order?.timeline?.[0] ?? null;
    const latestEventTime = latestEvent?.timestamp ? formatTimelineStamp(latestEvent.timestamp) : null;

    if (order.shipping_method === 'Pick Up') {
        if (order.status === 'Ready for Pickup') {
            return {
                tone: 'border-sky-100 bg-sky-50',
                title: 'Ready for pickup',
                detail: 'Your order is packed and ready. Coordinate the pickup time with the seller.',
                latestEvent,
                latestEventTime,
            };
        }

        if (['Delivered', 'Completed'].includes(order.status)) {
            return {
                tone: 'border-emerald-100 bg-emerald-50',
                title: order.status === 'Completed' ? 'Pickup completed' : 'Picked up',
                detail: order.status === 'Completed'
                    ? 'You already confirmed receipt of this pickup order.'
                    : 'The seller marked the order as picked up. Confirm receipt once everything is complete.',
                latestEvent,
                latestEventTime,
            };
        }

        return {
            tone: 'border-orange-100 bg-orange-50',
            title: 'Pickup preparation',
            detail: 'The seller will notify you once the order is ready for pickup.',
            latestEvent,
            latestEventTime,
        };
    }

    if (order.delivery?.provider === 'lalamove') {
        // The detailed "Courier Tracking" card below handles Lalamove status.
        // We return null here to prevent duplicating the status in a summary box.
        return null;
    }

    if (order.status === 'Accepted') {
        return {
            tone: 'border-blue-100 bg-blue-50',
            title: 'Preparing for shipment',
            detail: 'The seller accepted the order and will upload shipment proof before marking it as shipped.',
            latestEvent,
            latestEventTime,
        };
    }

    if (order.status === 'Shipped') {
        return {
            tone: 'border-sky-100 bg-sky-50',
            title: 'Shipment in progress',
            detail: 'The seller marked the parcel as shipped. Check the shipment proof and tracking details if provided.',
            latestEvent,
            latestEventTime,
        };
    }

    if (order.status === 'Delivered') {
        return {
            tone: 'border-teal-100 bg-teal-50',
            title: 'Marked as delivered',
            detail: 'Review the delivery proof, then confirm receipt once the order is safely with you.',
            latestEvent,
            latestEventTime,
        };
    }

    if (order.status === 'Completed') {
        return {
            tone: 'border-green-100 bg-green-50',
            title: 'Order completed',
            detail: 'You already confirmed receipt of this order.',
            latestEvent,
            latestEventTime,
        };
    }

    return {
        tone: 'border-stone-100 bg-stone-50',
        title: 'Order update pending',
        detail: 'The seller will update the delivery status as the order moves forward.',
        latestEvent,
        latestEventTime,
    };
};

const buyerIssueSummary = (order) => {
    if (order.dispute) {
        const dispute = order.dispute;
        let title = 'Dispute Return/Refund Filed';
        let detail = 'Your request is waiting for the seller. Use chat to agree on a refund or replacement.';
        let tone = 'border-orange-200 bg-orange-50';
        let badgeTone = 'border-orange-200 bg-white text-orange-700';

        if (dispute.status === 'seller_accepted') {
            title = 'Refund Approved';
            detail = 'The seller accepted your refund request.';
            tone = 'border-purple-200 bg-purple-50';
            badgeTone = 'border-purple-200 bg-white text-purple-700';
        } else if (dispute.status === 'seller_rejected') {
            title = 'Dispute Rejected by Seller';
            detail = 'The seller rejected your return request. You can negotiate via chat, accept the decision, or escalate to Admin Helpdesk for arbitration.';
            tone = 'border-red-200 bg-red-50';
            badgeTone = 'border-red-200 bg-white text-red-700';
        } else if (dispute.status === 'seller_proposed_replacement') {
            title = 'Replacement Exchange Proposed';
            detail = 'The seller proposed a replacement exchange. Please review the details below. You can accept this offer or escalate the dispute to Admin Helpdesk.';
            tone = 'border-blue-200 bg-blue-50';
            badgeTone = 'border-blue-200 bg-white text-blue-700';
        } else if (dispute.status === 'escalated') {
            title = 'Escalated to Admin Support';
            detail = 'The dispute has been escalated. Platform moderators are reviewing the evidence to resolve the issue.';
            tone = 'border-amber-200 bg-amber-50';
            badgeTone = 'border-amber-200 bg-white text-amber-700';
        } else if (dispute.status === 'resolved_refunded') {
            title = 'Dispute Resolved: Refunded';
            detail = 'Admin support or seller ruled in favor of a refund. The transaction has been refunded.';
            tone = 'border-purple-200 bg-purple-50';
            badgeTone = 'border-purple-200 bg-white text-purple-700';
        } else if (dispute.status === 'resolved_rejected') {
            title = 'Dispute Case Closed';
            detail = 'Admin support ruled to reject the return claim. The order remains completed.';
            tone = 'border-stone-200 bg-stone-50';
            badgeTone = 'border-stone-200 bg-white text-stone-700';
        } else if (dispute.status === 'resolved_replacement') {
            title = 'Replacement Exchange Started';
            detail = 'You accepted the replacement proposal. The seller is preparing the replacement item.';
            tone = 'border-teal-200 bg-teal-50';
            badgeTone = 'border-teal-200 bg-white text-teal-700';
        }

        return {
            tone,
            badgeTone,
            icon: RotateCcw,
            title,
            detail,
            timestampLabel: dispute.resolved_at ? 'Resolved' : (dispute.status === 'seller_proposed_replacement' ? 'Proposed' : null),
            timestampValue: dispute.resolved_at || null,
            infoLabel: dispute.status === 'seller_proposed_replacement' ? 'Replacement Description' : (dispute.status === 'seller_rejected' ? 'Rejection Explanation' : 'Reason'),
            infoValue: dispute.status === 'seller_proposed_replacement' ? dispute.seller_proposed_description : (dispute.status === 'seller_rejected' ? dispute.seller_explanation : dispute.reason),
            proofPhotos: dispute.proof_photos,
        };
    }

    if (order.status === 'Refund/Return') {
        return {
            tone: 'border-orange-200 bg-orange-50',
            badgeTone: 'border-orange-200 bg-white text-orange-700',
            icon: RotateCcw,
            title: 'Return under review',
            detail: 'Your request is waiting for the seller. Use chat to agree on a refund or replacement.',
            timestampLabel: null,
            timestampValue: null,
            infoLabel: 'Reason',
            infoValue: order.return_reason || 'No reason provided.',
            proofHref: order.return_proof_image,
            proofLabel: 'View Return Proof',
        };
    }

    if (order.replacement_in_progress) {
        return {
            tone: 'border-teal-200 bg-teal-50',
            badgeTone: 'border-teal-200 bg-white text-teal-700',
            icon: PackageCheck,
            title: 'Replacement approved',
            detail: order.delivery?.flow_type === 'replacement_exchange'
                ? 'Courier will deliver the replacement to you and return the rejected item to the seller.'
                : 'The seller approved a replacement. Wait for the replacement item, then confirm receipt once it arrives.',
            timestampLabel: 'Approved',
            timestampValue: order.replacement_started_at,
            infoLabel: 'Resolution',
            infoValue: order.replacement_resolution_description || null,
            proofHref: null,
            proofLabel: null,
        };
    }

    if (order.replacement_resolved_at) {
        return {
            tone: 'border-emerald-200 bg-emerald-50',
            badgeTone: 'border-emerald-200 bg-white text-emerald-700',
            icon: CheckCircle,
            title: 'Replacement completed',
            detail: 'You already confirmed receipt of the replacement item and the issue has been resolved.',
            timestampLabel: 'Confirmed',
            timestampValue: order.replacement_resolved_at,
            infoLabel: 'Resolution',
            infoValue: order.replacement_resolution_description || null,
            proofHref: null,
            proofLabel: null,
        };
    }

    if (order.status === 'Refunded' || order.payment_status === 'refunded') {
        return {
            tone: 'border-purple-200 bg-purple-50',
            badgeTone: 'border-purple-200 bg-white text-purple-700',
            icon: CreditCard,
            title: 'Refund completed',
            detail: 'The seller approved your return and the refund has already been processed for this order.',
            timestampLabel: null,
            timestampValue: null,
            infoLabel: null,
            infoValue: null,
            proofHref: order.return_proof_image,
            proofLabel: order.return_proof_image ? 'View Return Proof' : null,
        };
    }

    return null;
};

export default function MyOrders({ auth, orders }) {
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [processing, setProcessing] = useState(false);
    
    const [ratingModal, setRatingModal] = useState({ isOpen: false, order: null });
    const [returnModalState, setReturnModalState] = useState({ isOpen: false, order: null });
    const [escalateModalState, setEscalateModalState] = useState({ isOpen: false, disputeId: null });
    const [expandedOrders, setExpandedOrders] = useState(new Set());
    const [expandedCourierTrackings, setExpandedCourierTrackings] = useState(new Set());

    const toggleCourierTrackingExpansion = (orderId) => {
        const newSet = new Set(expandedCourierTrackings);
        if (newSet.has(orderId)) newSet.delete(orderId);
        else newSet.add(orderId);
        setExpandedCourierTrackings(newSet);
    };

    const toggleOrderExpansion = (orderId) => {
        const newSet = new Set(expandedOrders);
        if (newSet.has(orderId)) newSet.delete(orderId);
        else newSet.add(orderId);
        setExpandedOrders(newSet);
    };

    // Mobile Secondary Actions Selector
    const getMobileSecondaryActions = (order) => {
        const actions = [];
        
        // Receipt (Always available)
        actions.push({
            label: 'Receipt',
            icon: Printer,
            href: `/my-orders/${order.id}/receipt`,
            type: 'link'
        });

        // Chat (Only if order is not completed)
        if (order.status !== 'Completed') {
            actions.push({
                label: 'Chat',
                icon: MessageCircle,
                onClick: () => contactSeller(order.seller_id),
                type: 'button'
            });
        }

        // Cancel Order
        if (order.can_cancel) {
            actions.push({
                label: 'Cancel Order',
                icon: XCircle,
                onClick: () => openModal('cancel', order.id),
                type: 'button',
                danger: true
            });
        }

        // Buy Again
        if (order.status === 'Completed') {
            actions.push({
                label: 'Buy Again',
                icon: ShoppingBag,
                onClick: () => buyAgain(order.id),
                type: 'button'
            });
        }

        // Return
        if (order.status === 'Completed' && order.can_return) {
            actions.push({
                label: 'Return',
                icon: RotateCcw,
                onClick: () => setReturnModalState({ isOpen: true, order }),
                type: 'button',
                warning: true
            });
        }

        // Escalate to Admin
        if (order.status === 'Refund/Return' && ['seller_proposed_replacement', 'seller_rejected'].includes(order.dispute?.status)) {
            actions.push({
                label: 'Escalate to Admin',
                icon: AlertTriangle,
                onClick: () => setEscalateModalState({ isOpen: true, disputeId: order.dispute.id }),
                type: 'button',
                warning: true
            });
        }

        // Cancel Return
        if (order.status === 'Refund/Return') {
            actions.push({
                label: 'Cancel Return',
                icon: XCircle,
                onClick: () => openModal('cancelReturn', order.id),
                type: 'button',
                danger: true
            });
        }

        return actions;
    };

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
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800 flex flex-col">
            <Head title="My Purchases" />
            <ImpersonationBanner />
            <BuyerNavbar />

            <main className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5">
                
                {/* --- FLASH MESSAGES --- */}
                {/* ... (Keep existing flash logic) */}
                
                {/* Page Header - More Compact */}
                <div className="mb-3 flex items-center justify-between">
                    <h1 className="text-lg font-black tracking-tight text-stone-900 sm:text-xl">My Purchases</h1>
                    <p className="hidden sm:block text-xs text-stone-500">Track orders, delivery, and returns.</p>
                </div>

                {/* --- TABS --- */}
                <div className="mb-3 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                    <div className="flex overflow-x-auto scrollbar-hide">
                        {tabs.map(tab => {
                            const count = getTabCount(tab.id);
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative flex min-w-[85px] flex-1 items-center justify-center gap-2 px-2 py-3 text-center text-[10px] font-bold transition-all sm:min-w-[100px] sm:text-sm sm:py-4 focus:outline-none ${
                                        activeTab === tab.id 
                                        ? 'text-clay-700 bg-clay-50/50' 
                                        : 'text-gray-400 hover:text-clay-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        {tab.label}
                                        {count > 0 && (
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold transition-colors ${
                                                activeTab === tab.id ? 'bg-clay-600 text-white' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {count}
                                            </span>
                                        )}
                                    </span>
                                    {activeTab === tab.id && (
                                        <motion.div 
                                            layoutId="activeTabUnderline"
                                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-clay-600"
                                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* --- SEARCH BAR --- */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                    <input 
                        type="text" 
                        placeholder="Search items or order IDs..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-white py-1.5 pl-8 pr-3 text-[11px] font-medium placeholder:text-stone-400 shadow-sm transition-all focus:border-clay-500 focus:ring-0 sm:py-2 sm:pl-9 sm:text-[12px]"
                    />
                </div>

                {/* --- ORDER LIST --- */}
                <div className="space-y-6">
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => {
                            const deliverySummary = buyerDeliverySummary(order);
                            const issueSummary = buyerIssueSummary(order);

                            return (
                            <div key={order.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-colors hover:border-stone-300">
                                
                                {/* Order Header */}
                                <div className="px-3.5 py-2.5 bg-[#FDFBF9] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-stone-100">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5 text-stone-500 mb-0.5">
                                            <Store size={10} />
                                            <span className="text-[10px] font-black uppercase tracking-tight">{order.seller_name || 'Shop'}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-black tracking-tight text-stone-900 text-[12px]">#{order.order_number?.slice(-8) || order.id}</h3>
                                            <div className="h-3 w-px bg-stone-200" />
                                            <span className="text-[10px] font-medium text-stone-400">{order.date}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <PaymentStatusBadge status={order.payment_status} method={order.payment_method} />
                                        <StatusBadge status={order.status} />
                                    </div>
                                </div>

                                {/* Timeline Section - Collapsible on Mobile */}
                                <div className="border-b border-stone-50">
                                    <button 
                                        type="button"
                                        onClick={() => toggleOrderExpansion(order.id)}
                                        className="flex w-full items-center justify-between bg-white px-4 py-3 sm:hidden min-h-[44px]"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Activity size={12} className="text-clay-500" />
                                            <span className="text-[11px] font-bold text-stone-700">Track Order</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-medium text-stone-400">
                                                {expandedOrders.has(order.id) ? 'Hide' : 'View'} History
                                            </span>
                                            <div className={`transition-transform duration-300 ${expandedOrders.has(order.id) ? 'rotate-180' : ''}`}>
                                                <ExternalLink size={10} className="text-stone-300" />
                                            </div>
                                        </div>
                                    </button>
                                    
                                    <div className={`${expandedOrders.has(order.id) ? 'block' : 'hidden'} sm:block`}>
                                        <OrderTimeline status={order.status} isPickup={order.shipping_method === 'Pick Up'} />
                                    </div>
                                </div>

                                {/* Order Items */}
                                <div className="p-4 sm:p-6 space-y-4">
                                    {/* Pickup / Delivery Info */}
                                    <div className="space-y-1.5">
                                        {deliverySummary && (
                                            <div className={`rounded-xl border px-3 py-2 ${deliverySummary.tone}`}>
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="text-[12px] font-bold text-stone-900">{deliverySummary.title}</p>
                                                        <p className="text-[10px] leading-snug text-stone-600">{deliverySummary.detail}</p>
                                                        {order.shipping_method === 'Pick Up' && order.proof_of_delivery && (
                                                            <a 
                                                                href={order.proof_of_delivery} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-[#FFFDFB] px-2.5 py-1.5 text-[10px] font-bold text-orange-650 hover:bg-orange-50 transition shadow-sm min-h-[44px] sm:min-h-[28px] mt-1.5"
                                                            >
                                                                <PackageCheck size={12} /> {buyerProofLabel(order)}
                                                            </a>
                                                        )}
                                                    </div>
                                                    {deliverySummary.latestEventTime && (
                                                        <span className="rounded-full border border-white/80 bg-white/80 px-2 py-0.5 text-[9px] font-bold text-stone-500">
                                                            {deliverySummary.latestEventTime}
                                                        </span>
                                                    )}
                                                </div>
                                                {deliverySummary.latestEvent && (
                                                    <p className="mt-1 text-[9px] font-medium text-stone-500">
                                                        Latest update: {deliverySummary.latestEvent.label}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {order.shipping_method !== 'Pick Up' && (
                                        <>
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
                                                            {order.shipping_notes && (
                                                                <span className="text-[9px] bg-white px-1.5 py-0 rounded border border-blue-200 text-blue-600 font-medium">
                                                                    Note: {order.shipping_notes}
                                                                </span>
                                                            )}
                                                            {order.proof_of_delivery && (
                                                                <a 
                                                                    href={order.proof_of_delivery} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer" 
                                                                    className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-blue-650 hover:bg-blue-50 transition shadow-sm min-h-[44px] sm:min-h-[28px] mt-1"
                                                                >
                                                                    <PackageCheck size={12} /> {buyerProofLabel(order)}
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Courier tracking card */}
                                            {order.delivery && (
                                                <div className="rounded-xl border border-stone-200/80 bg-[#FCF7F2] p-2 shadow-sm transition-colors hover:border-clay-300 mt-3">
                                                    <div 
                                                        onClick={() => toggleCourierTrackingExpansion(order.id)}
                                                        className={`flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-clay-50/50 p-1 -m-1 rounded transition-colors ${
                                                            expandedCourierTrackings.has(order.id) ? "mb-1" : ""
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-1.5">
                                                            <Truck size={12} className="text-clay-600" />
                                                            <p className="text-[10px] font-extrabold uppercase tracking-wide text-clay-700">Courier Tracking</p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            {!expandedCourierTrackings.has(order.id) && (
                                                                <div className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold shadow-sm ${buyerCourierTrackingState(order).tone}`}>
                                                                    {buyerCourierTrackingState(order).label}
                                                                </div>
                                                            )}
                                                            {expandedCourierTrackings.has(order.id) ? (
                                                                <ChevronDown size={12} className="text-clay-500" />
                                                            ) : (
                                                                <ChevronRight size={12} className="text-clay-500" />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {expandedCourierTrackings.has(order.id) && (
                                                        <div className="space-y-2 mt-1 pt-1.5 border-t border-clay-100/30">
                                                            <div className="flex items-center justify-between gap-3 mb-2">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    {order.delivery.flow_type === 'replacement_exchange' && (
                                                                        <span className="inline-flex rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-bold tracking-tight text-teal-700 shadow-sm">
                                                                            {order.delivery.flow_label}
                                                                        </span>
                                                                    )}
                                                                    <div className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold shadow-sm ${buyerCourierTrackingState(order).tone}`}>
                                                                        {buyerCourierTrackingState(order).label}
                                                                    </div>
                                                                </div>
                                                                {order.delivery.share_link && (
                                                                    <a
                                                                        href={order.delivery.share_link}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 rounded-md border border-clay-200 bg-white px-2 py-1 text-[10px] font-bold text-clay-700 hover:bg-clay-50 hover:text-clay-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all shrink-0"
                                                                    >
                                                                        Live Track <ExternalLink size={10} />
                                                                    </a>
                                                                )}
                                                            </div>

                                                            <CourierProgressBar status={order.delivery.status} />

                                                            <p className="text-[11px] leading-relaxed text-stone-600 mb-2.5 font-medium">{buyerCourierTrackingState(order).detail}</p>

                                                            {order.delivery.flow_type === 'replacement_exchange' && order.delivery.route_legs?.length > 0 && (
                                                                <div className="mb-2.5 flex flex-col gap-1 rounded-lg bg-white/60 p-2 border border-stone-100/50">
                                                                    {order.delivery.route_legs.map((leg) => (
                                                                        <div key={`${leg.label}-${leg.from}-${leg.to}`} className="flex items-start gap-2">
                                                                            <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-teal-400" />
                                                                            <p className="text-[10px] text-stone-700 font-medium">
                                                                                <span className="font-bold text-teal-800">{leg.label}:</span> {leg.from} <span className="mx-0.5 text-stone-400">→</span> {leg.to}
                                                                            </p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {(order.delivery.external_order_id || order.delivery.last_updated_at) && (
                                                                <div className="flex flex-wrap gap-1.5 mt-2 pt-2.5 border-t border-stone-200/50">
                                                                    {order.delivery.external_order_id && (
                                                                        <div className="flex items-center gap-1 px-1.5 text-[9px]">
                                                                            <Hash size={10} className="text-stone-400" />
                                                                            <span className="font-bold text-stone-600">ID: {order.delivery.external_order_id}</span>
                                                                        </div>
                                                                    )}
                                                                    {order.delivery.last_updated_at && (
                                                                        <div className="flex items-center gap-1 px-1.5 text-[9px] text-stone-500 border-l border-stone-300/50">
                                                                            <Clock size={10} className="text-stone-400" />
                                                                            <span>{order.delivery.last_updated_at}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {order.delivery.pending_auto_cancel && (
                                                                <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 shadow-sm">
                                                                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                                                    <div className="text-[10px]">
                                                                        <span className="font-bold">Return-to-sender Hold</span>
                                                                        <p className="mt-0.5">Auto-cancel after {order.delivery.cancel_hold_ends_at} if unresolved.</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                        )}
                                    </div>

                                    {issueSummary && (
                                        <div className={`rounded-xl border px-3 py-2.5 ${issueSummary.tone}`}>
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <issueSummary.icon size={13} className="shrink-0 text-current" />
                                                        <p className="text-[12px] font-bold text-stone-900">{issueSummary.title}</p>
                                                    </div>
                                                    <p className="mt-1 text-[10px] leading-snug text-stone-600">{issueSummary.detail}</p>
                                                </div>
                                                {issueSummary.timestampValue && (
                                                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold ${issueSummary.badgeTone}`}>
                                                        {issueSummary.timestampLabel}: {issueSummary.timestampValue}
                                                    </span>
                                                )}
                                            </div>

                                            {issueSummary.infoValue && (
                                                <div className="mt-2 rounded-lg border border-white/80 bg-white/75 px-2.5 py-2 text-[10px] text-stone-700 whitespace-pre-wrap leading-snug">
                                                    <span className="font-bold">{issueSummary.infoLabel}: </span>{issueSummary.infoValue}
                                                </div>
                                            )}

                                            {issueSummary.proofHref && (
                                                <a
                                                    href={issueSummary.proofHref}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-2 inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/80 px-2 py-1 text-[9px] font-bold text-stone-700 hover:bg-white"
                                                >
                                                    <PackageCheck size={10} /> {issueSummary.proofLabel}
                                                </a>
                                            )}

                                            {issueSummary.proofPhotos && issueSummary.proofPhotos.length > 0 && (
                                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                    {issueSummary.proofPhotos.map((photo, i) => (
                                                        <a
                                                            key={i}
                                                            href={photo}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="h-12 w-12 rounded-lg border border-white/80 overflow-hidden shadow-sm hover:opacity-85 transition-opacity"
                                                        >
                                                            <img src={photo} alt={`Proof ${i + 1}`} className="h-full w-full object-cover" />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
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
                                <div className="flex flex-col gap-4 border-t border-stone-100 bg-[#FDFBF9] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="w-full sm:w-auto">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-1.5">Order Breakdown</p>
                                        <div className="divide-y divide-stone-200/60 sm:divide-y-0 text-[12px] text-stone-500 sm:space-y-1">
                                            <div className="flex items-center justify-between gap-4 py-2 sm:py-0 sm:justify-start">
                                                <span className="min-w-[120px]">Subtotal</span>
                                                <span className="shrink-0 whitespace-nowrap text-right font-bold text-stone-800">PHP {order.merchandise_subtotal}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 py-2 sm:py-0 sm:justify-start">
                                                <span className="min-w-[120px]">Fee (3%)</span>
                                                <span className="shrink-0 whitespace-nowrap text-right font-bold text-stone-800">PHP {order.convenience_fee_amount}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 py-2 sm:py-0 sm:justify-start">
                                                <span className="min-w-[120px]">Shipping Fee</span>
                                                <span className="shrink-0 whitespace-nowrap text-right font-bold text-stone-800">
                                                    {order.shipping_method === 'Pick Up'
                                                        ? 'Free'
                                                        : `PHP ${order.shipping_fee_amount}`}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 py-2.5 pt-3 sm:py-0 sm:pt-1.5 sm:justify-start border-t border-stone-200/60 sm:border-t-0">
                                                <span className="min-w-[120px] font-bold text-stone-900 text-[13px]">Total</span>
                                                <span className="shrink-0 whitespace-nowrap text-right text-[15px] font-black tracking-tight text-[#c8764b]">PHP {order.total}</span>
                                            </div>
                                        </div>
                                    </div>                                    {/* --- DESKTOP FOOTER ACTIONS (Strictly Preserved) --- */}
                                    <div className="hidden sm:flex flex-row items-center gap-2 flex-wrap justify-end overflow-visible">
                                        {/* Download Receipt */}
                                        <a 
                                            href={`/my-orders/${order.id}/receipt`}
                                            target="_blank"
                                            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-[12px] font-bold text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                                        >
                                            <Printer size={15} /> Receipt
                                        </a>

                                        {/* Contact Seller */}
                                        {order.status !== 'Completed' && (
                                            <button 
                                                onClick={() => contactSeller(order.seller_id)}
                                                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-4 border border-gray-200 bg-white rounded-lg text-[12px] font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm"
                                            >
                                                <MessageCircle size={15} /> Chat
                                            </button>
                                        )}

                                        {/* PENDING/ACCEPTED: Pay Now */}
                                        {['Pending', 'Accepted'].includes(order.status) && order.payment_status === 'pending' && order.payment_method !== 'COD' && (
                                            <a 
                                                href={route('payment.pay', order.order_number)}
                                                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-5 bg-blue-600 text-white rounded-lg text-[12px] font-bold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all hover:-translate-y-0.5"
                                            >
                                                <CreditCard size={15} /> Pay Now
                                            </a>
                                        )}

                                        {/* PENDING: Cancel */}
                                        {order.can_cancel && (
                                            <button 
                                                onClick={() => openModal('cancel', order.id)}
                                                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-4 border border-red-200 bg-red-50 rounded-lg text-[12px] font-bold text-red-655 hover:bg-red-100 transition"
                                            >
                                                <XCircle size={15} /> Cancel
                                            </button>
                                        )}

                                        {/* DELIVERED: Confirm Receipt */}
                                        {(order.status === 'Delivered' && !order.received_at) && (
                                            <button 
                                                onClick={() => openModal('receive', order.id)}
                                                className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-5 rounded-lg text-[12px] font-bold shadow-md transition-all hover:-translate-y-0.5 ${
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
                                        {order.status === 'Completed' && (
                                            <>
                                                <button 
                                                    onClick={() => buyAgain(order.id)}
                                                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-4 border border-clay-200 bg-clay-50 text-clay-700 rounded-lg text-[12px] font-bold hover:bg-clay-100 transition shadow-sm"
                                                >
                                                    <ShoppingBag size={15} /> Buy Again
                                                </button>

                                                {(!order.replacement_in_progress && (
                                                    order.items.some(item => !item.is_rated) ||
                                                    order.items.some(item => item.review?.can_manage_review)
                                                )) && (
                                                    <button 
                                                        onClick={() => setRatingModal({ isOpen: true, order })}
                                                        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-5 bg-clay-600 text-white rounded-lg text-[12px] font-bold hover:bg-clay-700 shadow-md shadow-clay-200 transition-all hover:-translate-y-0.5"
                                                    >
                                                        <Star size={15} /> {order.items.some(item => item.review?.can_manage_review) ? 'Manage Reviews' : 'Rate'}
                                                    </button>
                                                )}

                                                {order.can_return && (
                                                    <button 
                                                        onClick={() => setReturnModalState({ isOpen: true, order })}
                                                        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-4 border border-orange-200 bg-orange-50 rounded-lg text-[12px] font-bold text-orange-655 hover:bg-orange-100 transition"
                                                    >
                                                        <RotateCcw size={15} /> Return
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        
                                        {/* REFUND/RETURN */}
                                        {order.status === 'Refund/Return' && (
                                            <>
                                                {order.dispute?.status === 'seller_proposed_replacement' && (
                                                    <button 
                                                        onClick={() => router.post(route('disputes.react', order.dispute.id), { action: 'accept_replacement' })}
                                                        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-5 bg-teal-600 text-white rounded-lg text-[12px] font-bold hover:bg-teal-700 shadow-md shadow-teal-200 transition-all hover:-translate-y-0.5 animate-pulse"
                                                    >
                                                        <CheckCircle size={15} /> Accept Replacement
                                                    </button>
                                                )}
                                                
                                                {['seller_proposed_replacement', 'seller_rejected'].includes(order.dispute?.status) && (
                                                    <button 
                                                        onClick={() => setEscalateModalState({ isOpen: true, disputeId: order.dispute.id })}
                                                        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-4 border border-amber-200 bg-amber-50 text-amber-700 rounded-lg text-[12px] font-bold hover:bg-amber-100 transition shadow-sm animate-pulse"
                                                    >
                                                        <AlertTriangle size={15} /> Escalate to Admin
                                                    </button>
                                                )}

                                                <button 
                                                    onClick={() => openModal('cancelReturn', order.id)}
                                                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-4 border border-red-200 bg-red-50 text-red-655 rounded-lg text-[12px] font-bold hover:bg-red-100 transition shadow-sm"
                                                >
                                                    <XCircle size={15} /> Cancel Return
                                                </button>
                                                <button 
                                                    onClick={() => contactSeller(order.seller_id)}
                                                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-5 bg-orange-500 text-white rounded-lg text-[12px] font-bold hover:bg-orange-600 shadow-md shadow-orange-200 transition-all hover:-translate-y-0.5"
                                                >
                                                    <MessageCircle size={15} /> Negotiate Return
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {/* --- MOBILE FOOTER ACTIONS WITH DROPDOWN --- */}
                                    <div className="flex sm:hidden w-full flex-row items-center gap-2 py-1 justify-end">
                                        {/* Primary Actions Promoted directly on Mobile */}
                                        {/* 1. Pay Now */}
                                        {['Pending', 'Accepted'].includes(order.status) && order.payment_status === 'pending' && order.payment_method !== 'COD' && (
                                            <a 
                                                href={route('payment.pay', order.order_number)}
                                                className="flex-1 inline-flex h-11 items-center justify-center gap-1.5 px-5 bg-blue-600 text-white rounded-lg text-[12px] font-bold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all active:scale-95"
                                            >
                                                <CreditCard size={15} /> Pay Now
                                            </a>
                                        )}

                                        {/* 2. Confirm Receipt / Pick Up */}
                                        {(order.status === 'Delivered' && !order.received_at) && (
                                            <button 
                                                onClick={() => openModal('receive', order.id)}
                                                className={`flex-1 inline-flex h-11 items-center justify-center gap-1.5 px-5 rounded-lg text-[12px] font-bold shadow-md transition-all active:scale-95 ${
                                                    order.shipping_method === 'Pick Up'
                                                    ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-200'
                                                    : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                                                }`}
                                            >
                                                {order.shipping_method === 'Pick Up' ? <PackageCheck size={16} /> : <CheckCircle size={16} />}
                                                {order.shipping_method === 'Pick Up' ? 'Confirm Pick Up' : 'Order Received'}
                                            </button>
                                        )}

                                        {/* 3. Rate / Manage Reviews */}
                                        {(order.status === 'Completed' && !order.replacement_in_progress && (
                                            order.items.some(item => !item.is_rated) ||
                                            order.items.some(item => item.review?.can_manage_review)
                                        )) && (
                                            <button 
                                                onClick={() => setRatingModal({ isOpen: true, order })}
                                                className="flex-1 inline-flex h-11 items-center justify-center gap-1.5 px-5 bg-clay-600 text-white rounded-lg text-[12px] font-bold hover:bg-clay-700 shadow-md shadow-clay-200 transition-all active:scale-95"
                                            >
                                                <Star size={15} /> {order.items.some(item => item.review?.can_manage_review) ? 'Manage Reviews' : 'Rate'}
                                            </button>
                                        )}

                                        {/* 4. Accept Replacement */}
                                        {(order.status === 'Refund/Return' && order.dispute?.status === 'seller_proposed_replacement') && (
                                            <button 
                                                onClick={() => router.post(route('disputes.react', order.dispute.id), { action: 'accept_replacement' })}
                                                className="flex-1 inline-flex h-11 items-center justify-center gap-1.5 px-5 bg-teal-600 text-white rounded-lg text-[12px] font-bold hover:bg-teal-700 shadow-md shadow-teal-200 transition-all active:scale-95 animate-pulse"
                                            >
                                                <CheckCircle size={15} /> Accept Replacement
                                            </button>
                                        )}

                                        {/* 5. Negotiate Return */}
                                        {(order.status === 'Refund/Return') && (
                                            <button 
                                                onClick={() => contactSeller(order.seller_id)}
                                                className="flex-1 inline-flex h-11 items-center justify-center gap-1.5 px-5 bg-orange-500 text-white rounded-lg text-[12px] font-bold hover:bg-orange-600 shadow-md shadow-orange-200 transition-all active:scale-95"
                                            >
                                                <MessageCircle size={15} /> Negotiate Return
                                            </button>
                                        )}

                                        {/* Promoted Secondary Actions when no direct primary action is available */}
                                        {/* Promoting Chat */}
                                        {(!(['Pending', 'Accepted'].includes(order.status) && order.payment_status === 'pending' && order.payment_method !== 'COD') &&
                                         !(order.status === 'Delivered' && !order.received_at) &&
                                         !(order.status === 'Completed' && !order.replacement_in_progress && (order.items.some(item => !item.is_rated) || order.items.some(item => item.review?.can_manage_review))) &&
                                         !(order.status === 'Refund/Return') &&
                                         order.status !== 'Completed') && (
                                            <button 
                                                onClick={() => contactSeller(order.seller_id)}
                                                className="flex-1 inline-flex h-11 items-center justify-center gap-1.5 px-4 border border-gray-200 bg-white rounded-lg text-[12px] font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm active:scale-95"
                                            >
                                                <MessageCircle size={15} /> Chat
                                            </button>
                                        )}

                                        {/* Promoting Buy Again */}
                                        {(order.status === 'Completed' && 
                                          !(order.status === 'Completed' && !order.replacement_in_progress && (order.items.some(item => !item.is_rated) || order.items.some(item => item.review?.can_manage_review)))) && (
                                            <button 
                                                onClick={() => buyAgain(order.id)}
                                                className="flex-1 inline-flex h-11 items-center justify-center gap-1.5 px-4 border border-clay-200 bg-clay-50 text-clay-700 rounded-lg text-[12px] font-bold hover:bg-clay-100 transition shadow-sm active:scale-95"
                                            >
                                                <ShoppingBag size={15} /> Buy Again
                                            </button>
                                        )}

                                        {/* Secondary Dropdown Actions */}
                                        {(() => {
                                            const actions = getMobileSecondaryActions(order);
                                            
                                            // Determine if Chat has been promoted
                                            const isChatPromoted = !(['Pending', 'Accepted'].includes(order.status) && order.payment_status === 'pending' && order.payment_method !== 'COD') &&
                                                 !(order.status === 'Delivered' && !order.received_at) &&
                                                 !(order.status === 'Completed' && !order.replacement_in_progress && (order.items.some(item => !item.is_rated) || order.items.some(item => item.review?.can_manage_review))) &&
                                                 !(order.status === 'Refund/Return') &&
                                                 order.status !== 'Completed';

                                            // Determine if Buy Again has been promoted
                                            const isBuyAgainPromoted = order.status === 'Completed' && 
                                                 !(order.status === 'Completed' && !order.replacement_in_progress && (order.items.some(item => !item.is_rated) || order.items.some(item => item.review?.can_manage_review)));

                                            const finalMobileSecondaryActions = actions.filter(act => {
                                                if (isChatPromoted && act.label === 'Chat') return false;
                                                if (isBuyAgainPromoted && act.label === 'Buy Again') return false;
                                                return true;
                                            });

                                            if (finalMobileSecondaryActions.length === 0) return null;

                                            // If there's exactly 1 action remaining, we can render it directly or keep it in the dropdown. 
                                            // Standardizing to dropdown keeps the layout neat, but if it's just "Receipt" (e.g. for completed & rated orders), 
                                            // showing it directly as a button next to "Buy Again" is extremely clean.
                                            if (finalMobileSecondaryActions.length === 1) {
                                                const act = finalMobileSecondaryActions[0];
                                                const Icon = act.icon;
                                                if (act.type === 'link') {
                                                    return (
                                                        <a
                                                            href={act.href}
                                                            target="_blank"
                                                            className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-[12px] font-bold text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 active:scale-95"
                                                        >
                                                            <Icon size={15} /> {act.label}
                                                        </a>
                                                    );
                                                }
                                                return (
                                                    <button
                                                        type="button"
                                                        onClick={act.onClick}
                                                        className={`inline-flex h-11 shrink-0 items-center justify-center gap-1.5 px-4 border rounded-lg text-[12px] font-bold shadow-sm transition active:scale-95 ${
                                                            act.danger
                                                                ? 'border-red-200 bg-red-50 text-red-655 hover:bg-red-100'
                                                                : act.warning
                                                                    ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                                        }`}
                                                    >
                                                        <Icon size={15} /> {act.label}
                                                    </button>
                                                );
                                            }

                                            return (
                                                <Dropdown>
                                                    <Dropdown.Trigger>
                                                        <button 
                                                            type="button" 
                                                            className="flex h-11 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-stone-500 hover:bg-stone-50 transition shadow-sm min-w-[44px] active:scale-95"
                                                        >
                                                            <EllipsisVertical size={16} />
                                                        </button>
                                                    </Dropdown.Trigger>
                                                    <Dropdown.Content align="top-right" width="48" contentClasses="py-1 bg-white">
                                                        {finalMobileSecondaryActions.map((act, i) => {
                                                            const Icon = act.icon;
                                                            if (act.type === 'link') {
                                                                return (
                                                                    <a
                                                                        key={i}
                                                                        href={act.href}
                                                                        target="_blank"
                                                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-[13px] font-bold text-stone-700 hover:bg-stone-50 transition-colors"
                                                                    >
                                                                        <Icon size={14} className="text-stone-400" />
                                                                        {act.label}
                                                                    </a>
                                                                );
                                                            }
                                                            return (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    onClick={act.onClick}
                                                                    className={`flex items-center gap-2 w-full px-4 py-2.5 text-left text-[13px] font-bold transition-colors ${
                                                                        act.danger 
                                                                            ? 'text-red-655 hover:bg-red-50' 
                                                                            : act.warning 
                                                                                ? 'text-amber-700 hover:bg-amber-50' 
                                                                                : 'text-stone-700 hover:bg-stone-50'
                                                                    }`}
                                                                >
                                                                    <Icon size={14} className={act.danger ? 'text-red-400' : act.warning ? 'text-amber-400' : 'text-stone-400'} />
                                                                    {act.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </Dropdown.Content>
                                                </Dropdown>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                            );
                        })
                    ) : searchQuery.trim() ? (
                        <WorkspaceEmptyState
                            icon={Search}
                            title="No matching orders"
                            description={`We couldn't find any orders matching "${searchQuery}". Try using different terms or click below to clear the search.`}
                            actionLabel="Clear Search"
                            onAction={() => setSearchQuery('')}
                        />
                    ) : (
                        <WorkspaceEmptyState
                            icon={ShoppingBag}
                            title="No orders found"
                            description={
                                activeTab === 'All' 
                                    ? "You haven't placed any orders yet. Start exploring artisan products." 
                                    : `No orders found in the "${tabs.find(t => t.id === activeTab)?.label}" category.`
                            }
                            actionLabel="Start Shopping"
                            actionHref="/shop"
                        />
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

            {/* --- ESCALATE DISPUTE MODAL --- */}
            <EscalateDisputeModal
                isOpen={escalateModalState.isOpen}
                onClose={() => setEscalateModalState({ isOpen: false, disputeId: null })}
                disputeId={escalateModalState.disputeId}
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

import React from 'react';
import { Clock, PackageCheck, Truck, Store, MapPin, CheckCircle, RotateCcw, XCircle, CreditCard, ShieldAlert } from 'lucide-react';

export const StatusBadge = ({ status, dispute = null }) => {
    // Dispute-aware sub-status when order is in Refund/Return
    if ((status === 'Refund/Return' || status === 'Dispute') && dispute) {
        const disputeConfigs = {
            'seller_rejected': { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-600', label: 'Declined Return', icon: RotateCcw },
            'seller_proposed_replacement': { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200', dot: 'bg-teal-600', label: 'Replacement Offer', icon: RotateCcw },
            'escalated': { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-600', label: 'Under Review', icon: Clock },
            'seller_accepted': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-600', label: 'Refund Approved', icon: CheckCircle },
            'resolved_refunded': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-600', label: 'Refund Approved', icon: CheckCircle },
            'resolved_replacement': { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200', dot: 'bg-teal-600', label: 'Replacement Approved', icon: PackageCheck },
            'resolved_rejected': { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200', dot: 'bg-stone-500', label: 'Dispute Closed', icon: XCircle },
        };
        const dispConf = disputeConfigs[dispute.status] || {
            bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-600', label: 'Return Requested', icon: RotateCcw
        };
        const Icon = dispConf.icon;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border shadow-2xs ${dispConf.bg} ${dispConf.text} ${dispConf.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dispConf.dot}`} />
                <Icon size={11} />
                {dispConf.label}
            </span>
        );
    }

    const config = {
        'Pending': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-600', label: 'To Pay', icon: Clock },
        'Accepted': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-600', label: 'To Ship', icon: PackageCheck },
        'Shipped': { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200', dot: 'bg-sky-600', label: 'In Transit', icon: Truck },
        'Ready for Pickup': { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200', dot: 'bg-sky-600', label: 'Ready for Pickup', icon: Store },
        'Delivered': { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200', dot: 'bg-teal-600', label: 'Delivered', icon: MapPin },
        'Completed': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-600', label: 'Completed', icon: CheckCircle },
        'Refund/Return': { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-600', label: 'Return Requested', icon: RotateCcw },
        'Refunded': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-600', label: 'Refunded', icon: CheckCircle },
        'Replaced': { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200', dot: 'bg-teal-600', label: 'Replaced', icon: PackageCheck },
        'Cancelled': { bg: 'bg-stone-100', text: 'text-stone-600', border: 'border-stone-200', dot: 'bg-stone-400', label: 'Cancelled', icon: XCircle },
        'Rejected': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-600', label: 'Declined', icon: XCircle },
    };
    
    const item = config[status] || config['Pending'];
    const Icon = item.icon;
    
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border shadow-2xs ${item.bg} ${item.text} ${item.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
            <Icon size={11} />
            {item.label}
        </span>
    );
};

export const PaymentStatusBadge = ({ status, method }) => {
    const config = {
        'pending': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500', label: 'Unpaid' },
        'paid': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-600', label: 'Paid' },
        'refund_pending': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500', label: 'Refund Pending' },
        'refunded': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-600', label: 'Refunded' },
        'failed': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-600', label: 'Failed' },
        'cancelled': { bg: 'bg-stone-100', text: 'text-stone-600', border: 'border-stone-200', dot: 'bg-stone-400', label: 'Cancelled' },
    };
    
    const item = config[status?.toLowerCase()] || config['pending'];
    
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border shadow-2xs ${item.bg} ${item.text} ${item.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
            <CreditCard size={10} />
            {item.label} &bull; {method || 'COD'}
        </span>
    );
};

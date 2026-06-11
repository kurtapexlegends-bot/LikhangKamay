import React from 'react';
import { Clock, PackageCheck, Truck, Store, MapPin, CheckCircle, RotateCcw, XCircle, CreditCard } from 'lucide-react';

export const StatusBadge = ({ status }) => {
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

export const PaymentStatusBadge = ({ status, method }) => {
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

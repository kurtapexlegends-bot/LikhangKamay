import React from 'react';

export default function StatusBadge({ status }) {
    const styles = {
        'pending': 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-100',
        'finance_approved': 'bg-stone-100 text-stone-700 border-stone-200 ring-1 ring-stone-100',
        'accounting_approved': 'bg-[#F8EEE6] text-clay-700 border-[#E7D8C9] ring-1 ring-[#F4E7DB]',
        'ordered': 'bg-[#FBF1E8] text-clay-700 border-[#E7D8C9] ring-1 ring-[#F4E7DB]',
        'partially_received': 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-100',
        'received': 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100',
        'completed': 'bg-green-50 text-green-700 border-green-200 ring-1 ring-green-100',
        'rejected': 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100',
    };

    const labels = {
        'pending': 'Pending Accounting',
        'finance_approved': 'Pending Accounting',
        'accounting_approved': 'Funds Released',
        'ordered': 'Ordered',
        'partially_received': 'Partially Received',
        'received': 'Received (Buffer)',
        'completed': 'Completed',
        'rejected': 'Rejected',
    };

    const dotColors = {
        'completed': 'bg-green-500',
        'rejected': 'bg-red-500',
        'ordered': 'bg-clay-500',
        'accounting_approved': 'bg-clay-500',
        'received': 'bg-emerald-500',
    };

    const activeDotColor = dotColors[status] || 'bg-amber-500';

    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${styles[status] || styles['pending']}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${activeDotColor}`} />
            {labels[status] || status}
        </span>
    );
}

import React from 'react';
import { Store, FileText } from 'lucide-react';
import { StatusBadge, PaymentStatusBadge } from '../StatusBadges';

export default function OrderCardHeader({ order }) {
    return (
        <div className="px-4 sm:px-5 py-3 bg-stone-50/80 border-b border-stone-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-white border border-stone-200 text-stone-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <Store size={13} className="text-stone-600" />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black tracking-tight text-stone-900 truncate">
                            {order.seller_name || 'Artisan Shop'}
                        </span>
                        <span className="text-stone-300 hidden sm:inline">&bull;</span>
                        <span className="text-xs font-mono font-bold text-stone-500">
                            #{order.order_number || order.id}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] text-stone-400 mt-0.5 flex-wrap">
                        <span>Placed {order.date}</span>
                        <span>&bull;</span>
                        <a
                            href={`/my-orders/${order.id}/receipt?download=1`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-stone-600 hover:text-stone-900 underline flex items-center gap-1 transition"
                            title="Download official receipt"
                        >
                            <FileText size={11} className="text-stone-400" />
                            <span>Receipt PDF</span>
                        </a>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                <PaymentStatusBadge status={order.payment_status} method={order.payment_method} />
                <StatusBadge status={order.status} dispute={order.dispute} />
            </div>
        </div>
    );
}

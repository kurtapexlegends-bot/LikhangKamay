import React from 'react';
import { Store, FileText } from 'lucide-react';
import { StatusBadge, PaymentStatusBadge } from '../StatusBadges';

export default function OrderCardHeader({ order }) {
    return (
        <div className="px-4 py-3 bg-stone-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-stone-200/60">
            <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-stone-500 mb-0.5">
                    <Store size={10} />
                    <span className="text-[10px] font-black uppercase tracking-tight">{order.seller_name || 'Shop'}</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-black tracking-tight text-stone-900 text-[12px]">#{order.order_number?.slice(-8) || order.id}</h3>
                    <div className="h-3 w-px bg-stone-200" />
                    <span className="text-[10px] font-medium text-stone-400">{order.date}</span>
                    <div className="h-3 w-px bg-stone-200 hidden sm:block" />
                    <a
                        href={`/my-orders/${order.id}/receipt?download=1`}
                        target="_blank"
                        rel="noreferrer"
                        className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-stone-500 hover:text-clay-700 transition"
                        title="Download official receipt"
                    >
                        <FileText size={11} className="text-stone-400" />
                        <span>Receipt</span>
                    </a>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <PaymentStatusBadge status={order.payment_status} method={order.payment_method} />
                <StatusBadge status={order.status} />
            </div>
        </div>
    );
}

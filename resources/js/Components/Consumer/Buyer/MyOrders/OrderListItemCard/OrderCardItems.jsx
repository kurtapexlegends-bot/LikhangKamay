import React from 'react';

export default function OrderCardItems({ order }) {
    if (!order.items || order.items.length === 0) return null;

    const formatPHP = (val) => {
        const num = Number(val);
        return isNaN(num) ? `PHP ${val}` : `PHP ${num.toFixed(2)}`;
    };

    const getPaymentLabel = (method, status) => {
        const isPaid = status?.toLowerCase() === 'paid';
        if (method === 'COD') {
            return isPaid ? 'Paid via Cash on Delivery' : 'Pay via Cash on Delivery';
        }
        return isPaid ? `Paid via ${method}` : `To pay via ${method}`;
    };

    return (
        <div className="space-y-3">
            {/* Mobile View: Horizontal scrolling thumbnails for multiple items, full-width card for single item */}
            <div className="flex sm:hidden overflow-x-auto flex-nowrap gap-2.5 pb-1 px-0.5 no-scrollbar scrollbar-none">
                {order.items.map((item, idx) => (
                    <div 
                        key={idx} 
                        className={`flex flex-row items-center gap-2.5 bg-white p-2.5 border border-stone-200 rounded-xl ${order.items.length === 1 ? 'w-full' : 'min-w-[220px] max-w-[260px] shrink-0'} shadow-2xs`}
                    >
                        <div className="w-11 h-11 bg-white rounded-lg border border-stone-200 overflow-hidden shrink-0 shadow-2xs">
                            <img 
                                src={item.img} 
                                alt={item.name} 
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-stone-900 text-[11px] truncate leading-tight">{item.name}</h4>
                            <p className="text-[10px] text-stone-500 mt-0.5">Qty: {item.qty} | {item.variant}</p>
                            <p className="font-black text-stone-950 text-[12px] mt-0.5">{formatPHP(item.price)}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop & Tablet View: Vertical stacked list layout */}
            <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-[#FCFAF7] shadow-2xs">
                <div className="hidden sm:block divide-y divide-stone-100/70">
                    {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3.5 p-3 transition-colors hover:bg-white w-full min-w-0">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-lg border border-stone-200 overflow-hidden shrink-0 shadow-2xs">
                                <img 
                                    src={item.img} 
                                    alt={item.name} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                                								/>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-row items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-stone-900 text-[13px] truncate">{item.name}</h4>
                                    <div className="mt-0.5 flex items-center gap-2.5 text-[11px] text-stone-500">
                                        <span>Var: {item.variant}</span>
                                        <span className="h-1 w-1 rounded-full bg-stone-300"></span>
                                        <span>Qty: {item.qty}</span>
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="font-black tracking-tight text-stone-900 text-[14px]">{formatPHP(item.price)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Integrated Payment Breakdown Footer */}
                <div className="sm:border-t border-stone-200/70 bg-stone-100/50 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-stone-600 gap-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Items Subtotal: <strong className="text-stone-850 font-semibold">{formatPHP(order.merchandise_subtotal)}</strong></span>
                        <span className="text-stone-300 hidden sm:inline">•</span>
                        <span>Service Fee (3%): <strong className="text-clay-600 font-semibold">{formatPHP(order.convenience_fee_amount)}</strong></span>
                        <span className="text-stone-300 hidden sm:inline">•</span>
                        <span>Shipping: <strong className="text-stone-850 font-semibold">{order.shipping_method === 'Pick Up' ? 'Free' : formatPHP(order.shipping_fee_amount)}</strong></span>
                    </div>
                    <div className="flex flex-col sm:items-end justify-center pt-1.5 sm:pt-0 border-t border-stone-200/40 sm:border-t-0">
                        <div className="flex items-center justify-between sm:justify-end gap-2">
                            <span className="text-stone-500 font-bold uppercase tracking-wider text-[10px]">Total Payment</span>
                            <span className="text-[13px] font-black tracking-tight text-clay-700 bg-clay-50 border border-clay-100/80 px-2.5 py-0.5 rounded-lg shadow-2xs">
                                {formatPHP(order.total)}
                            </span>
                        </div>
                        <span className="text-[10px] text-stone-400 mt-0.5 text-right font-medium">
                            {getPaymentLabel(order.payment_method, order.payment_status)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

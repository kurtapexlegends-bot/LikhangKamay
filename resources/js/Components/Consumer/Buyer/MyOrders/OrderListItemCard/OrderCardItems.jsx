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
        <div className="space-y-4">
            {/* Mobile View: Horizontal scrolling thumbnails and brief info */}
            <div className="flex sm:hidden overflow-x-auto flex-nowrap gap-3 pb-2.5 px-1 no-scrollbar scrollbar-none">
                {order.items.map((item, idx) => (
                    <div 
                        key={idx} 
                        className="flex flex-row items-center gap-3 bg-white p-3 border border-stone-200 rounded-xl min-w-[240px] max-w-[280px] shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.03)]"
                    >
                        <div className="w-12 h-12 bg-white rounded-lg border border-stone-200 overflow-hidden shrink-0 shadow-sm">
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
                            <p className="font-black text-stone-955 text-[12px] mt-1">PHP {Number(item.price).toLocaleString()}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Mobile View Breakdown */}
            <div className="sm:hidden bg-stone-50/70 border border-stone-200/50 rounded-xl p-3.5 mt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">Payment Breakdown</p>
                <div className="space-y-1.5 text-[11px] text-stone-650">
                    <div className="flex justify-between">
                        <span>Items Subtotal</span>
                        <span className="font-semibold text-stone-800">{formatPHP(order.merchandise_subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Convenience Fee (3%)</span>
                        <span className="font-semibold text-[#c8764b]">{formatPHP(order.convenience_fee_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Shipping Fee</span>
                        <span className="font-semibold text-stone-800">
                            {order.shipping_method === 'Pick Up' ? 'Free' : formatPHP(order.shipping_fee_amount)}
                        </span>
                    </div>
                    <div className="border-t border-stone-200 pt-2 mt-2 flex justify-between items-center font-bold text-stone-900">
                        <div>
                            <span className="block text-[12px]">Total Payment</span>
                            <span className="text-[9px] text-stone-400 font-normal leading-tight">
                                {getPaymentLabel(order.payment_method, order.payment_status)}
                            </span>
                        </div>
                        <span className="text-md font-black tracking-tight text-clay-700 bg-clay-50 border border-clay-100 px-2.5 py-0.5 rounded-lg">
                            {formatPHP(order.total)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Desktop & Tablet View: Vertical stacked list layout */}
            <div className="hidden sm:block overflow-hidden rounded-xl border border-stone-200 bg-[#FCFAF7] shadow-sm">
                <div className="divide-y divide-stone-150/70">
                    {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-start sm:items-center gap-4 p-4 transition-colors hover:bg-white w-full min-w-0">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-lg border border-stone-200 overflow-hidden shrink-0 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
                                <img 
                                    src={item.img} 
                                    alt={item.name} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                                />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-stone-900 text-[14px] line-clamp-2 sm:truncate">{item.name}</h4>
                                    <div className="mt-1 flex items-center gap-3 text-[12px] text-stone-500">
                                        <span>Var: {item.variant}</span>
                                        <span className="h-1 w-1 rounded-full bg-stone-300"></span>
                                        <span>Qty: {item.qty}</span>
                                    </div>
                                    <div className="mt-1.5 sm:hidden">
                                        <p className="font-black tracking-tight text-stone-900 text-[14px]">PHP {Number(item.price).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="hidden sm:block shrink-0 text-right">
                                    <p className="font-black tracking-tight text-stone-900 text-[16px]">PHP {Number(item.price).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pricing Breakdown inside the items container */}
                <div className="border-t border-stone-200 bg-stone-50/50 p-4 flex justify-end">
                    <div className="w-full sm:max-w-xs space-y-2 text-[12px]">
                        <div className="flex justify-between text-stone-600">
                            <span>Subtotal</span>
                            <span className="font-semibold text-stone-800">{formatPHP(order.merchandise_subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-stone-600">
                            <span>Fee (3%)</span>
                            <span className="font-semibold text-[#c8764b]">{formatPHP(order.convenience_fee_amount)}</span>
                        </div>
                        <div className="flex justify-between text-stone-600">
                            <span>Shipping Fee</span>
                            <span className="font-semibold text-stone-800">
                                {order.shipping_method === 'Pick Up' ? 'Free' : formatPHP(order.shipping_fee_amount)}
                            </span>
                        </div>
                        <div className="border-t border-stone-200 pt-2.5 mt-2.5 flex items-center justify-between font-bold text-stone-900">
                            <div>
                                <span className="block text-[13px]">Total</span>
                                <span className="text-[10px] text-stone-400 font-normal leading-tight">
                                    {getPaymentLabel(order.payment_method, order.payment_status)}
                                </span>
                            </div>
                            <span className="text-lg font-black tracking-tight text-clay-700 bg-clay-50 border border-clay-100 px-3 py-1 rounded-lg">
                                {formatPHP(order.total)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

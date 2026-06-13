import React from 'react';

export default function OrderCardItems({ order }) {
    if (!order.items || order.items.length === 0) return null;

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
                            <p className="font-black text-stone-950 text-[12px] mt-1">PHP {Number(item.price).toLocaleString()}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop & Tablet View: Vertical stacked list layout */}
            <div className="hidden sm:block overflow-hidden rounded-lg border border-stone-100 bg-[#FCFAF7]">
                <div className="divide-y divide-stone-100/70">
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
            </div>
        </div>
    );
}

import React from 'react';
import { formatPeso } from '@/utils/stockRequestHelpers';

export default function RequestDetailsCard({ request, isMobile = false }) {
    const qty = request.quantity || 1;
    const received = request.received_quantity || 0;
    const transferred = request.transferred_quantity || 0;
    const receivedPercent = Math.min(100, Math.round((received / qty) * 100));
    const transferredPercent = Math.min(100, Math.round((transferred / qty) * 100));

    if (isMobile) {
        return (
            <div className="mt-3 grid grid-cols-2 gap-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/60 p-3 text-xs">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Order Quantity</p>
                    <p className="mt-0.5 text-xs font-bold text-stone-800">
                        {request.quantity} <span className="font-normal text-stone-500">{request.supply?.unit || 'pcs'}</span>
                    </p>
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total Cost</p>
                    <p className="mt-0.5 text-xs font-black text-clay-700">{formatPeso(request.total_cost)}</p>
                </div>
                <div className="col-span-2 space-y-2 pt-1 border-t border-stone-200/50">
                    <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600 mb-1">
                            <span>Received at Buffer</span>
                            <span className="font-bold text-emerald-700">{received} / {qty}</span>
                        </div>
                        <div className="h-1.5 bg-stone-200/70 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${receivedPercent}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600 mb-1">
                            <span>Transferred to Studio</span>
                            <span className="font-bold text-clay-700">{transferred} / {qty}</span>
                        </div>
                        <div className="h-1.5 bg-stone-200/70 rounded-full overflow-hidden">
                            <div className="h-full bg-clay-500 rounded-full transition-all duration-300" style={{ width: `${transferredPercent}%` }} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-1.5 min-w-[140px] max-w-[180px]">
            <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px]">
                    <span className="text-stone-400 font-medium">Received:</span>
                    <span className="font-bold text-emerald-700">{received} <span className="text-[10px] font-normal text-stone-400">/ {qty}</span></span>
                </div>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200/40">
                    <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300" 
                        style={{ width: `${receivedPercent}%` }}
                    />
                </div>
            </div>

            <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px]">
                    <span className="text-stone-400 font-medium">Transferred:</span>
                    <span className="font-bold text-clay-700">{transferred} <span className="text-[10px] font-normal text-stone-400">/ {qty}</span></span>
                </div>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200/40">
                    <div 
                        className="h-full bg-clay-500 rounded-full transition-all duration-300" 
                        style={{ width: `${transferredPercent}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

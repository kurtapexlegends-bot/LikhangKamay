import React from 'react';
import { formatPeso } from '@/lib/stockRequestHelpers';

export default function RequestDetailsCard({ request, isMobile = false }) {
    const receivedPercent = request.quantity > 0 ? ((request.received_quantity || 0) / request.quantity * 100) : 0;
    const transferredPercent = request.quantity > 0 ? ((request.transferred_quantity || 0) / request.quantity * 100) : 0;

    if (isMobile) {
        return (
            <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 text-xs">
                <div>
                    <p className="font-bold uppercase tracking-wide text-gray-400">Requested</p>
                    <p className="mt-1 font-semibold text-gray-700">{request.quantity} {request.supply?.unit}</p>
                </div>
                <div>
                    <p className="font-bold uppercase tracking-wide text-gray-400">Total Cost</p>
                    <p className="mt-1 font-semibold text-clay-700">{formatPeso(request.total_cost)}</p>
                </div>
                <div className="col-span-2 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-400">Received</span>
                        <span className="font-semibold text-green-600">{request.received_quantity || 0}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${receivedPercent}%` }} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-400">Transferred</span>
                        <span className="font-semibold text-clay-700">{request.transferred_quantity || 0}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-clay-500 rounded-full" style={{ width: `${transferredPercent}%` }} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 w-20">Received</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
                    <div 
                        className="h-full bg-green-500 rounded-full transition-all duration-500" 
                        style={{ width: `${receivedPercent}%` }}
                    />
                </div>
                <span className="font-bold text-green-600 min-w-[20px]">{request.received_quantity || 0}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 w-20">Transferred</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
                    <div 
                        className="h-full bg-clay-500 rounded-full transition-all duration-500" 
                        style={{ width: `${transferredPercent}%` }}
                    />
                </div>
                <span className="font-bold text-clay-700 min-w-[20px]">{request.transferred_quantity || 0}</span>
            </div>
        </div>
    );
}

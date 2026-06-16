import React from 'react';
import { AlertTriangle, Truck, Package, ArrowRight, Inbox } from 'lucide-react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import StatusBadge from './StatusBadge';
import RequestDetailsCard from './RequestDetailsCard';
import { formatPeso } from '@/lib/stockRequestHelpers';

export default function StockRequestsTable({
    filteredRequests,
    activeTab,
    canEdit,
    processingId,
    onMarkOrdered,
    onReceiveClick,
    onTransferClick,
}) {
    if (filteredRequests.length === 0) {
        const descriptions = {
            'all': 'Stock requests from inventory will appear here once created.',
            'pending': 'No requests with "Pending Approval" status.',
            'finance_approved': 'No requests with "Budget Approved" status.',
            'accounting_approved': 'No requests with "Ready to Order" status.',
            'ordered': 'No requests with "On Process" status.',
            'partially_received': 'No requests with "Partially Received" status.',
            'received': 'No requests with "In Buffer" status.',
            'completed': 'No requests with "Completed" status.',
            'rejected': 'No requests with "Rejected" status.',
        };
        return (
            <div className="p-4 sm:p-8">
                <WorkspaceEmptyState
                    icon={Inbox}
                    title="No requests found"
                    description={descriptions[activeTab] || 'No requests found.'}
                    compact={true}
                />
            </div>
        );
    }

    return (
        <>
            {/* Mobile Cards (shown on mobile, hidden on tablet/desktop) */}
            <div className="space-y-3 p-4 sm:hidden">
                {filteredRequests.map((req) => (
                    <div key={req.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                        #{req.id}
                                    </span>
                                    <StatusBadge status={req.status} />
                                </div>
                                <p className="mt-3 text-sm font-bold text-gray-900">{req.supply?.name || 'Unknown Item'}</p>
                                <p className="mt-1 text-[11px] text-gray-500">{req.supply?.category}</p>
                                <p className="mt-1 text-[11px] text-gray-500">
                                    Requested by <span className="font-bold text-gray-600">{req.requester?.name || 'Seller owner'}</span>
                                </p>
                            </div>
                        </div>

                        {/* Request Details Block (Quantity, Cost, and Progress Bars) */}
                        <RequestDetailsCard request={req} isMobile={true} />

                        {req.status === 'rejected' && req.rejection_reason && (
                            <div className="mt-3 rounded-xl border border-red-200 bg-[#FFFBFB] px-3.5 py-3 shadow-sm">
                                <div className="flex items-center gap-1.5 mb-1.5 text-red-500">
                                    <AlertTriangle size={12} strokeWidth={2.5} />
                                    <span className="text-[9px] font-bold uppercase tracking-[0.16em]">Reason for Rejection</span>
                                </div>
                                <span className="block text-[11px] font-medium leading-relaxed text-red-700">{req.rejection_reason}</span>
                            </div>
                        )}

                        <div className="mt-3 flex items-center justify-end gap-2 flex-wrap">
                            {req.status === 'accounting_approved' && (
                                <button 
                                    disabled={!canEdit || processingId === `ordered-${req.id}`}
                                    onClick={() => onMarkOrdered(req)} 
                                    className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 bg-clay-600 text-white text-[11px] font-bold rounded-lg hover:bg-clay-700 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Truck size={13} /> 
                                    {processingId === `ordered-${req.id}` ? 'Updating...' : 'Mark Ordered'}
                                </button>
                            )}
                            {(req.status === 'ordered' || req.status === 'partially_received' || req.status === 'received') && (
                                <button 
                                    disabled={!canEdit || processingId === `receive-${req.id}`} 
                                    onClick={() => onReceiveClick(req)} 
                                    className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 bg-amber-600 text-white text-[11px] font-bold rounded-lg hover:bg-amber-700 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Package size={13} /> 
                                    {processingId === `receive-${req.id}` ? 'Receiving...' : 'Receive'}
                                </button>
                            )}
                            {(req.status === 'received' && (req.received_quantity - req.transferred_quantity > 0)) && (
                                <button 
                                    disabled={!canEdit || processingId === `transfer-${req.id}`} 
                                    onClick={() => onTransferClick(req)} 
                                    className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 bg-sky-600 text-white text-[11px] font-bold rounded-lg hover:bg-sky-700 active:scale-95 shadow-sm shadow-sky-100 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <ArrowRight size={13} /> 
                                    {processingId === `transfer-${req.id}` ? 'Transferring...' : 'Transfer'}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table (hidden on mobile, shown on tablet/desktop) */}
            <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[980px] text-left">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Request ID</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Requested</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Progress</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Cost</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredRequests.map((req) => (
                            <tr key={req.id} className="group hover:bg-[#FCF7F2] transition-colors duration-150">
                                <td className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1 font-mono text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                        #{req.id}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <p className="font-bold text-gray-900 text-sm">{req.supply?.name || 'Unknown Item'}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">{req.supply?.category}</p>
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        Requested by <span className="font-bold text-gray-600">{req.requester?.name || 'Seller owner'}</span>
                                    </p>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm font-bold text-gray-900">{req.quantity}</span>
                                    <span className="text-xs text-gray-400 ml-1">{req.supply?.unit}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <RequestDetailsCard request={req} isMobile={false} />
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm font-bold text-clay-700">{formatPeso(req.total_cost)}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col items-start gap-2 max-w-[220px]">
                                        <StatusBadge status={req.status} />
                                        {req.status === 'rejected' && req.rejection_reason && (
                                            <div className="rounded-[0.85rem] border border-red-200 bg-[#FFFBFB] p-2.5 shadow-sm w-full transition-shadow hover:shadow-md">
                                                <div className="flex items-center gap-1.5 mb-1 text-red-500">
                                                    <AlertTriangle size={10} strokeWidth={2.5} />
                                                    <span className="text-[8px] font-bold uppercase tracking-[0.16em]">Rejection Reason</span>
                                                </div>
                                                <span className="block text-[10px] font-medium leading-[1.4] text-red-700 break-words line-clamp-3" title={req.rejection_reason}>
                                                    {req.rejection_reason}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {req.status === 'accounting_approved' && (
                                            <button 
                                                disabled={!canEdit || processingId === `ordered-${req.id}`}
                                                onClick={() => onMarkOrdered(req)} 
                                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-clay-600 text-white text-[10px] font-bold rounded-lg hover:bg-clay-700 transition-all active:scale-95 shadow-sm shadow-clay-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                                            >
                                                <Truck size={13} /> 
                                                {processingId === `ordered-${req.id}` ? 'Updating...' : 'Mark Ordered'}
                                            </button>
                                        )}
                                        {(req.status === 'ordered' || req.status === 'partially_received' || req.status === 'received') && (
                                            <button 
                                                disabled={!canEdit || processingId === `receive-${req.id}`} 
                                                onClick={() => onReceiveClick(req)} 
                                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-600 text-white text-[10px] font-bold rounded-lg hover:bg-amber-700 transition-all active:scale-95 shadow-sm shadow-amber-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                                            >
                                                <Package size={13} /> 
                                                Receive
                                            </button>
                                        )}
                                        {(req.status === 'received' && (req.received_quantity - req.transferred_quantity > 0)) && (
                                            <button 
                                                disabled={!canEdit || processingId === `transfer-${req.id}`} 
                                                onClick={() => onTransferClick(req)} 
                                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-sky-600 text-white text-[10px] font-bold rounded-lg hover:bg-sky-700 transition-all active:scale-95 shadow-sm shadow-sky-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                                            >
                                                <ArrowRight size={13} /> 
                                                Transfer
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

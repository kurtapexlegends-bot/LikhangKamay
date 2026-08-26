import React from 'react';
import { Link } from '@inertiajs/react';
import { AlertTriangle, Truck, Package, ArrowRight, Inbox, Store, CheckCircle2 } from 'lucide-react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import StatusBadge from './StatusBadge';
import RequestDetailsCard from './RequestDetailsCard';
import { formatPeso } from '@/utils/stockRequestHelpers';

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
            'ordered': 'No requests with "Ordered" status.',
            'partially_received': 'No requests with "Partially Received" status.',
            'received': 'No requests with "In Buffer" status.',
            'completed': 'No requests with "Completed" status.',
            'rejected': 'No requests with "Rejected" status.',
        };
        return (
            <div className="p-6 sm:p-12">
                <WorkspaceEmptyState
                    icon={Inbox}
                    title="No restock requests found"
                    description={descriptions[activeTab] || 'No requests match the selected filter.'}
                    compact={true}
                />
            </div>
        );
    }

    return (
        <>
            {/* Mobile Cards (shown on mobile, hidden on tablet/desktop) */}
            <div className="space-y-3 p-3.5 sm:hidden">
                {filteredRequests.map((req) => (
                    <div key={req.id} className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs space-y-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center font-mono text-[11px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200/70">
                                        #{req.id}
                                    </span>
                                    <StatusBadge status={req.status} />
                                </div>
                                <h4 className="mt-2 text-sm font-black text-stone-900 truncate">
                                    {req.supply?.name || 'Item'}
                                </h4>
                                <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                                    {req.supply?.category && <span className="font-semibold text-stone-700">{req.supply.category} • </span>}
                                    Requested by <span className="font-bold text-stone-700">{req.requester?.name || 'Store Owner'}</span>
                                </p>
                            </div>
                        </div>

                        {/* Request Details Block */}
                        <RequestDetailsCard request={req} isMobile={true} />

                        {req.status === 'rejected' && req.rejection_reason && (
                            <div className="rounded-xl border border-red-200/80 bg-red-50/60 p-3 shadow-2xs">
                                <div className="flex items-center gap-1.5 mb-1 text-red-600">
                                    <AlertTriangle size={12} strokeWidth={2.5} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Rejection Reason</span>
                                </div>
                                <span className="block text-xs font-medium leading-relaxed text-red-800">{req.rejection_reason}</span>
                            </div>
                        )}

                        {/* Action Buttons on Mobile */}
                        <div className="pt-1 flex items-center justify-end gap-2 flex-wrap">
                            {req.status === 'accounting_approved' && (
                                <>
                                    <Link
                                        href={route('seller.supply-hub.index', { search: req.supply?.name })}
                                        className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 transition-all active:scale-95 shadow-2xs"
                                    >
                                        <Store size={13} />
                                        <span>Supply Hub</span>
                                    </Link>
                                    <button 
                                        disabled={!canEdit || processingId === `ordered-${req.id}`}
                                        onClick={() => onMarkOrdered(req)} 
                                        className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 bg-white border border-stone-200 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-50 transition-all active:scale-95 shadow-2xs disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Truck size={13} /> 
                                        {processingId === `ordered-${req.id}` ? 'Updating...' : 'Mark Ordered'}
                                    </button>
                                </>
                            )}
                            {(req.status === 'ordered' || req.status === 'partially_received' || req.status === 'received') && (
                                <button 
                                    disabled={!canEdit || processingId === `receive-${req.id}`} 
                                    onClick={() => onReceiveClick(req)} 
                                    className="w-full inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition-all active:scale-95 shadow-2xs disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Package size={14} /> 
                                    {processingId === `receive-${req.id}` ? 'Receiving...' : 'Receive Material Intake'}
                                </button>
                            )}
                            {(req.status === 'received' && (req.received_quantity - req.transferred_quantity > 0)) && (
                                <button 
                                    disabled={!canEdit || processingId === `transfer-${req.id}`} 
                                    onClick={() => onTransferClick(req)} 
                                    className="w-full inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 active:scale-95 shadow-2xs transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <ArrowRight size={14} /> 
                                    {processingId === `transfer-${req.id}` ? 'Transferring...' : 'Transfer to Active Inventory'}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table (hidden on mobile, shown on tablet/desktop) */}
            <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[920px] text-left">
                    <thead>
                        <tr className="border-b border-stone-100 bg-stone-50/50">
                            <th className="px-4 py-3 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Request</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Item & Requester</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Order Qty</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Intake Progress</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Total Cost</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-stone-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100/80">
                        {filteredRequests.map((req) => (
                            <tr key={req.id} className="group hover:bg-stone-50/60 transition-colors duration-150">
                                <td className="px-4 py-3.5 align-middle">
                                    <span className="inline-flex items-center font-mono text-xs font-bold text-stone-600 bg-stone-100 px-2 py-1 rounded-lg border border-stone-200/70 shadow-2xs">
                                        #{req.id}
                                    </span>
                                </td>
                                <td className="px-4 py-3.5 align-middle">
                                    <p className="font-black text-stone-900 text-sm leading-snug">{req.supply?.name || 'Item'}</p>
                                    <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                                        {req.supply?.category && <span className="text-stone-700 font-semibold">{req.supply.category} • </span>}
                                        By <span className="font-bold text-stone-700">{req.requester?.name || 'Store Owner'}</span>
                                    </p>
                                </td>
                                <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                                    <span className="text-sm font-black text-stone-900">{req.quantity}</span>
                                    <span className="text-xs text-stone-400 font-medium ml-1">{req.supply?.unit || 'pcs'}</span>
                                </td>
                                <td className="px-4 py-3.5 align-middle">
                                    <RequestDetailsCard request={req} isMobile={false} />
                                </td>
                                <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                                    <span className="text-sm font-black text-clay-700">{formatPeso(req.total_cost)}</span>
                                </td>
                                <td className="px-4 py-3.5 align-middle">
                                    <div className="flex flex-col items-start gap-1.5 max-w-[200px]">
                                        <StatusBadge status={req.status} />
                                        {req.status === 'rejected' && req.rejection_reason && (
                                            <div className="rounded-xl border border-red-200/80 bg-red-50/60 p-2 shadow-2xs w-full">
                                                <div className="flex items-center gap-1 mb-0.5 text-red-600">
                                                    <AlertTriangle size={10} strokeWidth={2.5} />
                                                    <span className="text-[9px] font-bold uppercase tracking-wider">Reason</span>
                                                </div>
                                                <span className="block text-[10px] font-medium leading-relaxed text-red-800 break-words line-clamp-2" title={req.rejection_reason}>
                                                    {req.rejection_reason}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3.5 align-middle text-right">
                                    <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                                        {req.status === 'accounting_approved' && (
                                            <>
                                                <Link
                                                    href={route('seller.supply-hub.index', { search: req.supply?.name })}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 transition-all active:scale-95 shadow-2xs min-h-[34px]"
                                                    title="Source on Supply Hub"
                                                >
                                                    <Store size={13} /> 
                                                    <span>Source</span>
                                                </Link>
                                                <button 
                                                    disabled={!canEdit || processingId === `ordered-${req.id}`}
                                                    onClick={() => onMarkOrdered(req)} 
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-50 transition-all active:scale-95 shadow-2xs disabled:cursor-not-allowed disabled:opacity-50 min-h-[34px]"
                                                    title="Mark as Ordered"
                                                >
                                                    <Truck size={13} /> 
                                                    {processingId === `ordered-${req.id}` ? 'Updating...' : 'Mark Ordered'}
                                                </button>
                                            </>
                                        )}
                                        {(req.status === 'ordered' || req.status === 'partially_received' || req.status === 'received') && (
                                            <button 
                                                disabled={!canEdit || processingId === `receive-${req.id}`} 
                                                onClick={() => onReceiveClick(req)} 
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition-all active:scale-95 shadow-2xs disabled:cursor-not-allowed disabled:opacity-50 min-h-[34px]"
                                            >
                                                <Package size={13} /> 
                                                <span>Receive</span>
                                            </button>
                                        )}
                                        {(req.status === 'received' && (req.received_quantity - req.transferred_quantity > 0)) && (
                                            <button 
                                                disabled={!canEdit || processingId === `transfer-${req.id}`} 
                                                onClick={() => onTransferClick(req)} 
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all active:scale-95 shadow-2xs disabled:cursor-not-allowed disabled:opacity-50 min-h-[34px]"
                                            >
                                                <ArrowRight size={13} /> 
                                                <span>Transfer</span>
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

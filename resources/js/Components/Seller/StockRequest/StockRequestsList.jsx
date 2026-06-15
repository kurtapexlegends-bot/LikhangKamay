import React from 'react';
import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { AlertTriangle, Truck, Package, ArrowRight, Inbox } from 'lucide-react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { 
    STATUS_STYLES, STATUS_LABELS, getStatusBadgeDotColor, formatPeso, STATUS_TABS 
} from '@/utils/stockRequestHelpers';

export default function StockRequestsList({
    filteredRequests,
    requests,
    activeTab,
    canEditStockRequests,
    processingId,
    setSelectedRequest,
    setShowOrderModal,
    openReceiveModal,
    openTransferModal
}) {
    const getStatusBadge = (status) => {
        const styles = STATUS_STYLES[status] || STATUS_STYLES['pending'];
        const label = STATUS_LABELS[status] || status;
        const dotColor = getStatusBadgeDotColor(status);

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${styles}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                {label}
            </span>
        );
    };

    const renderRequestCard = (req) => (
        <div 
            key={req.id} 
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shrink-0 snap-center w-[85vw] max-w-[300px] sm:w-auto sm:max-w-none"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-stone-400 bg-stone-50 px-2 py-1 rounded-md border border-stone-100">
                            #{req.id}
                        </span>
                        {getStatusBadge(req.status)}
                    </div>
                    <p className="mt-3 text-sm font-bold text-stone-900 truncate">{req.supply?.name || 'Unknown Item'}</p>
                    <p className="mt-1 text-[11px] text-stone-500">{req.supply?.category}</p>
                    <p className="mt-1 text-[11px] text-stone-500 truncate">
                        Requested by <span className="font-bold text-stone-600">{req.requester?.name || 'Seller owner'}</span>
                    </p>
                </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-stone-50 p-3 text-xs">
                <div>
                    <p className="font-bold uppercase tracking-wide text-stone-400">Requested</p>
                    <p className="mt-1 font-semibold text-stone-700">{req.quantity} {req.supply?.unit}</p>
                </div>
                <div>
                    <p className="font-bold uppercase tracking-wide text-stone-400">Total Cost</p>
                    <p className="mt-1 font-semibold text-clay-700">{formatPeso(req.total_cost)}</p>
                </div>
                <div className="col-span-2 space-y-2">
                    <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="text-stone-400">Received</span>
                        <span className="font-bold text-green-600">{req.received_quantity || 0}</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${req.quantity > 0 ? ((req.received_quantity || 0) / req.quantity * 100) : 0}%` }} />
                    </div>
                    <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="text-stone-400">Transferred</span>
                        <span className="font-bold text-clay-700">{req.transferred_quantity || 0}</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-clay-500 rounded-full" style={{ width: `${req.quantity > 0 ? ((req.transferred_quantity || 0) / req.quantity * 100) : 0}%` }} />
                    </div>
                </div>
            </div>

            {req.status === 'rejected' && req.rejection_reason && (
                <div className="mt-3 rounded-xl border border-red-200 bg-[#FFFBFB] px-3.5 py-3 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1.5 text-red-500">
                        <AlertTriangle size={12} strokeWidth={2.5} />
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em]">Reason for Rejection</span>
                    </div>
                    <span className="block text-[11px] font-medium leading-relaxed text-red-700">{req.rejection_reason}</span>
                </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
                {req.status === 'accounting_approved' && (
                    <button 
                        disabled={!canEditStockRequests || processingId === `ordered-${req.id}`}
                        onClick={() => {
                            setSelectedRequest(req);
                            setShowOrderModal(true);
                        }} 
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-clay-600 text-white text-[11px] font-bold rounded-lg hover:bg-clay-700 transition-all min-h-[44px] sm:min-h-0 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Truck size={13} /> {processingId === `ordered-${req.id}` ? 'Updating...' : 'Mark Ordered'}
                    </button>
                )}
                {(req.status === 'ordered' || req.status === 'partially_received' || req.status === 'received') && (
                    <button disabled={!canEditStockRequests || processingId === `receive-${req.id}`} onClick={() => openReceiveModal(req)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white text-[11px] font-bold rounded-lg hover:bg-amber-700 transition-all min-h-[44px] sm:min-h-0 disabled:cursor-not-allowed disabled:opacity-50">
                        <Package size={13} /> Receive
                    </button>
                )}
                {(req.status === 'received' && (req.received_quantity - req.transferred_quantity > 0)) && (
                    <button disabled={!canEditStockRequests || processingId === `transfer-${req.id}`} onClick={() => openTransferModal(req)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-600 text-white text-[11px] font-bold rounded-lg hover:bg-sky-700 transition-all min-h-[44px] sm:min-h-0 disabled:cursor-not-allowed disabled:opacity-50">
                        <ArrowRight size={13} /> Transfer
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            {/* Mobile View: Horizontal scrolling card deck (< 640px) */}
            <div className="flex overflow-x-auto pb-4 gap-4 flex-nowrap no-scrollbar snap-x snap-mandatory sm:hidden p-4">
                {filteredRequests.length > 0 ? (
                    filteredRequests.map(renderRequestCard)
                ) : (
                    <WorkspaceEmptyState
                        icon={Inbox}
                        title="No requests found"
                        description={activeTab === 'all'
                            ? 'Stock requests from inventory will appear here once created.'
                            : `No requests with "${STATUS_TABS.find(t => t.id === activeTab)?.label}" status.`}
                        action={null}
                        compact={true}
                    />
                )}
            </div>

            {/* Tablet View: Card Grid (>= 640px and < 1024px) */}
            <div className="hidden sm:grid lg:hidden grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {filteredRequests.length > 0 ? (
                    filteredRequests.map(renderRequestCard)
                ) : (
                    <WorkspaceEmptyState
                        icon={Inbox}
                        title="No requests found"
                        description={activeTab === 'all'
                            ? 'Stock requests from inventory will appear here once created.'
                            : `No requests with "${STATUS_TABS.find(t => t.id === activeTab)?.label}" status.`}
                        action={null}
                        compact={true}
                    />
                )}
            </div>

            {/* Desktop View: Table (>= 1024px) */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full min-w-[980px] text-left">
                    <thead>
                        <tr className="border-b border-stone-100">
                            <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Request ID</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Item</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Requested</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Progress</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Total Cost</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                        {filteredRequests.length > 0 ? (
                            filteredRequests.map((req, idx) => (
                                <motion.tr 
                                    key={req.id} 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="group hover:bg-[#FCF7F2] transition-colors duration-150"
                                >
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1 font-mono text-xs text-stone-400 bg-stone-50 px-2 py-1 rounded-md border border-stone-100">
                                            #{req.id}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-stone-900 text-sm">{req.supply?.name || 'Unknown Item'}</p>
                                        <p className="text-[11px] text-stone-400 mt-0.5">{req.supply?.category}</p>
                                        <p className="text-[11px] text-stone-400 mt-1">
                                            Requested by <span className="font-bold text-stone-600">{req.requester?.name || 'Seller owner'}</span>
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-stone-900">{req.quantity}</span>
                                        <span className="text-xs text-stone-400 ml-1">{req.supply?.unit}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-stone-400 w-20">Received</span>
                                                <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden max-w-[80px]">
                                                    <div 
                                                        className="h-full bg-green-500 rounded-full transition-all duration-500" 
                                                        style={{ width: `${req.quantity > 0 ? ((req.received_quantity || 0) / req.quantity * 100) : 0}%` }}
                                                    />
                                                </div>
                                                <span className="font-bold text-green-600 min-w-[20px]">{req.received_quantity || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-stone-400 w-20">Transferred</span>
                                                <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden max-w-[80px]">
                                                    <div 
                                                        className="h-full bg-clay-500 rounded-full transition-all duration-500" 
                                                        style={{ width: `${req.quantity > 0 ? ((req.transferred_quantity || 0) / req.quantity * 100) : 0}%` }}
                                                    />
                                                </div>
                                                <span className="font-bold text-clay-700 min-w-[20px]">{req.transferred_quantity || 0}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-clay-700">{formatPeso(req.total_cost)}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-start gap-2 max-w-[220px]">
                                            {getStatusBadge(req.status)}
                                            {req.status === 'rejected' && req.rejection_reason && (
                                                <div className="rounded-[0.85rem] border border-red-200 bg-[#FFFBFB] p-2.5 shadow-sm w-full transition-shadow hover:shadow-md">
                                                    <div className="flex items-center gap-1.5 mb-1 text-red-500">
                                                        <AlertTriangle size={10} strokeWidth={2.5} />
                                                        <span className="text-[8px] font-bold uppercase tracking-[0.16em]">Rejection Reason</span>
                                                    </div>
                                                    <span className="block text-[10px] font-medium leading-[1.4] text-red-700 break-words line-clamp-3" title={req.rejection_reason}>{req.rejection_reason}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {req.status === 'accounting_approved' && (
                                                <button 
                                                    disabled={!canEditStockRequests || processingId === `ordered-${req.id}`}
                                                    onClick={() => {
                                                        setSelectedRequest(req);
                                                        setShowOrderModal(true);
                                                    }} 
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-clay-600 text-white text-[10px] font-bold rounded-lg hover:bg-clay-700 transition-all active:scale-95 shadow-sm shadow-clay-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 min-h-[44px] sm:min-h-0"
                                                >
                                                    <Truck size={13} /> {processingId === `ordered-${req.id}` ? 'Updating...' : 'Mark Ordered'}
                                                </button>
                                            )}
                                            {(req.status === 'ordered' || req.status === 'partially_received' || req.status === 'received') && (
                                                <button disabled={!canEditStockRequests || processingId === `receive-${req.id}`} onClick={() => openReceiveModal(req)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white text-[10px] font-bold rounded-lg hover:bg-amber-700 transition-all active:scale-95 shadow-sm shadow-amber-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 min-h-[44px] sm:min-h-0">
                                                    <Package size={13} /> Receive
                                                </button>
                                            )}
                                            {(req.status === 'received' && (req.received_quantity - req.transferred_quantity > 0)) && (
                                                <button disabled={!canEditStockRequests || processingId === `transfer-${req.id}`} onClick={() => openTransferModal(req)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-600 text-white text-[10px] font-bold rounded-lg hover:bg-sky-700 transition-all active:scale-95 shadow-sm shadow-sky-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 min-h-[44px] sm:min-h-0">
                                                    <ArrowRight size={13} /> Transfer
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </motion.tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="px-6 py-12">
                                    <WorkspaceEmptyState
                                        icon={Inbox}
                                        title="No requests found"
                                        description={activeTab === 'all' 
                                            ? 'Stock requests from inventory will appear here once created.'
                                            : `No requests with "${STATUS_TABS.find(t => t.id === activeTab)?.label}" status.`
                                        }
                                        action={null}
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* TABLE FOOTER */}
            {filteredRequests.length > 0 && (
                <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between">
                    <p className="text-xs text-stone-400">
                        Showing <span className="font-bold text-stone-600">{filteredRequests.length}</span> of <span className="font-bold text-stone-600">{requests.length}</span> requests
                    </p>
                </div>
            )}
        </div>
    );
}

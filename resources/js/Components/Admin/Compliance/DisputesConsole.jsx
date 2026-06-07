import React, { useState, useMemo } from 'react';
import { Search, X, MessageSquare } from 'lucide-react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import CompactPagination from '@/Components/CompactPagination';
import { 
    statusClasses, 
    statusLabels, 
    outcomeClasses, 
    getModerationOutcome 
} from '@/utils/contentSafetyHelpers';

export default function DisputesConsole({
    disputes = [],
    openDisputeActionModal,
    setDisputeDeleteState
}) {
    const [disputeSearch, setDisputeSearch] = useState('');
    const [disputeStatusFilter, setDisputeStatusFilter] = useState('all');
    const [disputeQuickView, setDisputeQuickView] = useState('open');
    const [disputesCurrentPage, setDisputesCurrentPage] = useState(1);

    const filteredDisputes = useMemo(() => {
        const query = disputeSearch.trim().toLowerCase();
        return disputes.filter((dispute) => {
            if (disputeStatusFilter !== 'all' && dispute.status !== disputeStatusFilter) return false;
            if (disputeQuickView === 'open' && ['resolved', 'rejected'].includes(dispute.status)) return false;
            if (disputeQuickView === 'closed' && !['resolved', 'rejected'].includes(dispute.status)) return false;
            if (disputeQuickView === 'low_rating' && Number(dispute.review_rating || 0) > 2) return false;
            if (disputeQuickView === 'high_rating' && Number(dispute.review_rating || 0) < 4) return false;
            if (!query) return true;
            return [
                dispute.shop_name,
                dispute.product_name,
                dispute.reported_by,
                dispute.reason,
                dispute.review_comment,
            ].some((value) => String(value || '').toLowerCase().includes(query));
        });
    }, [disputes, disputeSearch, disputeStatusFilter, disputeQuickView]);

    const DISPUTES_ITEMS_PER_PAGE = 10;
    const disputesTotalPages = Math.max(1, Math.ceil(filteredDisputes.length / DISPUTES_ITEMS_PER_PAGE));
    
    const paginatedDisputes = useMemo(() => {
        const start = (disputesCurrentPage - 1) * DISPUTES_ITEMS_PER_PAGE;
        return filteredDisputes.slice(start, start + DISPUTES_ITEMS_PER_PAGE);
    }, [filteredDisputes, disputesCurrentPage]);

    return (
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            {/* Filters Header */}
            <div className="flex flex-col gap-3 border-b border-stone-100 bg-[#FCFBF9] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                    <h4 className="text-sm font-bold text-stone-900">Review Dispute Queue</h4>
                    <p className="text-[11px] font-medium text-stone-500 mt-0.5">Sellers can request review moderation for unfair store comments.</p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <div className="relative w-full sm:w-72">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                        <input
                             type="text"
                             value={disputeSearch}
                             onChange={(event) => {
                                 setDisputeSearch(event.target.value);
                                 setDisputesCurrentPage(1);
                             }}
                             placeholder="Search shop, product, or reason"
                             className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-9 text-xs font-medium text-stone-900 placeholder-stone-400 focus:border-clay-300 focus:ring-0 shadow-sm min-h-[44px] sm:min-h-0"
                        />
                        {disputeSearch && (
                            <button
                                type="button"
                                onClick={() => {
                                    setDisputeSearch('');
                                    setDisputesCurrentPage(1);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                    <select
                        value={disputeStatusFilter}
                        onChange={(event) => {
                            setDisputeStatusFilter(event.target.value);
                            setDisputesCurrentPage(1);
                        }}
                        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-stone-600 outline-none shadow-sm focus:border-clay-300 focus:ring-0 min-h-[44px] sm:min-h-0"
                    >
                        <option value="all">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="under_review">Under review</option>
                        <option value="resolved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Quick Tabs filters with horizontal scroll on mobile */}
            <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3 sm:px-6 bg-white overflow-x-auto flex-nowrap scrollbar-hide -mx-4 px-4 sm:-mx-0 sm:px-0">
                {[
                    ['open', 'Open queue'],
                    ['closed', 'Closed'],
                    ['low_rating', '1-2 stars'],
                    ['high_rating', '4-5 stars'],
                ].map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => {
                            setDisputeQuickView(key);
                            setDisputesCurrentPage(1);
                        }}
                        className={`rounded-full border px-4 py-2 text-[10px] font-bold transition-colors whitespace-nowrap min-h-[40px] flex items-center justify-center shrink-0 ${
                            disputeQuickView === key
                                ? 'border-clay-200 bg-clay-50 text-clay-700'
                                : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                        }`}
                    >
                        {label}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => {
                        setDisputeQuickView('open');
                        setDisputeStatusFilter('all');
                        setDisputeSearch('');
                        setDisputesCurrentPage(1);
                    }}
                    className="ml-auto rounded-full border border-stone-200 bg-white px-4 py-2 text-[10px] font-bold text-stone-500 hover:bg-stone-50 whitespace-nowrap min-h-[40px] flex items-center justify-center shrink-0"
                >
                    Reset filters
                </button>
            </div>

            {/* Dispute Items list */}
            {paginatedDisputes.length > 0 ? (
                <div className="divide-y divide-stone-100">
                    {paginatedDisputes.map((dispute) => {
                        const outcome = getModerationOutcome(dispute);
                        return (
                            <div key={dispute.id} className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between bg-white hover:bg-stone-50/20 transition-colors">
                                <div className="min-w-0 space-y-2 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusClasses[dispute.status] || statusClasses.pending}`}>
                                            {statusLabels[dispute.status] || String(dispute.status).replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-[10px] font-medium text-stone-400">
                                            {dispute.reported_at ? new Date(dispute.reported_at).toLocaleString() : 'Unknown date'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs sm:text-sm font-bold text-stone-900">{dispute.product_name}</p>
                                        <p className="text-[11px] text-stone-500">{dispute.shop_name} · Reported by {dispute.reported_by}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                                        <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-stone-600">
                                            {Number(dispute.review_rating || 0)} star review
                                        </span>
                                        {dispute.resolved_at && (
                                            <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-stone-400">
                                                Closed {new Date(dispute.resolved_at).toLocaleDateString()}
                                            </span>
                                        )}
                                        <span className={`rounded-full border px-2 py-0.5 ${outcome.tone ? outcomeClasses[outcome.tone] : 'border-stone-200 bg-stone-50 text-stone-500'}`}>
                                            {outcome.label}
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm font-medium text-stone-800 leading-relaxed"><span className="font-bold text-stone-500">Dispute Reason:</span> &quot;{dispute.reason}&quot;</p>
                                    {dispute.review_comment && (
                                        <p className="rounded-xl border border-stone-100 bg-[#FAF9F6] px-3 py-2 text-xs sm:text-sm text-stone-600">
                                            <span className="font-bold text-stone-500 text-[11px] uppercase tracking-wider block mb-1">Customer Review</span>
                                            &quot;{dispute.review_comment}&quot;
                                        </p>
                                    )}
                                    {dispute.details && (
                                        <p className="text-xs sm:text-sm text-stone-500"><span className="font-bold text-stone-400">Details:</span> {dispute.details}</p>
                                    )}
                                    {dispute.resolution_notes && (
                                        <p className="text-[11px] text-stone-500 font-medium"><span className="font-bold text-stone-400">Resolution Notes:</span> {dispute.resolution_notes}</p>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 lg:justify-end shrink-0">
                                    {dispute.status === 'pending' && (
                                        <button
                                            type="button"
                                            onClick={() => openDisputeActionModal(dispute, 'under_review')}
                                            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 min-h-[44px] flex items-center justify-center"
                                        >
                                            Start Review
                                        </button>
                                    )}
                                    {dispute.status === 'under_review' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => openDisputeActionModal(dispute, 'resolved')}
                                                className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 min-h-[44px] flex items-center justify-center"
                                            >
                                                Approve Request
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openDisputeActionModal(dispute, 'rejected')}
                                                className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-100 min-h-[44px] flex items-center justify-center"
                                            >
                                                Reject Request
                                            </button>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setDisputeDeleteState({ open: true, dispute })}
                                        className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 min-h-[44px] flex items-center justify-center"
                                    >
                                        Remove Request
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="px-6 py-12 bg-white">
                    <WorkspaceEmptyState
                        icon={MessageSquare}
                        title="No disputes found"
                        description="Disputed customer reviews submitted by shop owners will populate in this view."
                    />
                </div>
            )}

            <div className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between shrink-0">
                <CompactPagination
                    currentPage={disputesCurrentPage}
                    totalPages={disputesTotalPages}
                    totalItems={filteredDisputes.length}
                    itemsPerPage={DISPUTES_ITEMS_PER_PAGE}
                    onPageChange={setDisputesCurrentPage}
                    itemLabel="disputes"
                />
            </div>
        </div>
    );
}

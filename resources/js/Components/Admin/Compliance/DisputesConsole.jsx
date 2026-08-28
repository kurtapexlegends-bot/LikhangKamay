import React, { useState, useMemo } from 'react';
import { Search, X, MessageSquare, ChevronDown, Check, Star, AlertTriangle, ShieldCheck, Clock, Store, Trash2 } from 'lucide-react';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import CompactPagination from '@/Components/CompactPagination';
import { 
    statusClasses, 
    statusLabels, 
    outcomeClasses, 
    getModerationOutcome 
} from '@/utils/contentSafetyHelpers';

const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'resolved', label: 'Approved (Hidden)' },
    { value: 'rejected', label: 'Rejected (Visible)' },
];

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
        <div className="rounded-2xl border border-stone-200/80 bg-white shadow-2xs overflow-hidden">
            {/* Header & Main Search/Filter Bar */}
            <div className="flex flex-col gap-3.5 border-b border-stone-100 bg-[#FCFBF9] p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h4 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
                        <MessageSquare size={16} className="text-clay-700" />
                        Review Dispute Queue
                    </h4>
                    <p className="text-xs text-stone-500 font-medium mt-0.5">
                        Shop owners requesting review arbitration for unfair or malicious comments.
                    </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row items-stretch sm:items-center">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-64">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                        <input
                            type="text"
                            value={disputeSearch}
                            onChange={(event) => {
                                setDisputeSearch(event.target.value);
                                setDisputesCurrentPage(1);
                            }}
                            placeholder="Search shop, product, or reason..."
                            className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-8 text-xs font-medium text-stone-900 placeholder-stone-400 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 shadow-2xs h-[38px]"
                        />
                        {disputeSearch && (
                            <button
                                type="button"
                                onClick={() => {
                                    setDisputeSearch('');
                                    setDisputesCurrentPage(1);
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Status Dropdown */}
                    <Listbox
                        value={disputeStatusFilter}
                        onChange={(value) => {
                            setDisputeStatusFilter(value);
                            setDisputesCurrentPage(1);
                        }}
                    >
                        <div className="relative shrink-0">
                            <ListboxButton className="inline-flex items-center justify-between w-full sm:w-48 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 hover:border-stone-300 transition-all h-[38px] text-left cursor-pointer">
                                <span className="truncate">{statusOptions.find(opt => opt.value === disputeStatusFilter)?.label || 'All Statuses'}</span>
                                <ChevronDown size={14} className="text-stone-400 shrink-0 ml-2" />
                            </ListboxButton>
                            <ListboxOptions className="absolute right-0 mt-1.5 w-full sm:w-52 rounded-xl border border-stone-200 bg-white p-1 shadow-xl z-50 focus:outline-none ring-1 ring-black/5">
                                {statusOptions.map((opt) => (
                                    <ListboxOption
                                        key={opt.value}
                                        value={opt.value}
                                        className={({ focus, selected }) =>
                                            `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                                                selected ? 'bg-clay-50 text-clay-700' :
                                                focus ? 'bg-stone-50 text-stone-900' : 'text-stone-600'
                                            }`
                                        }
                                    >
                                        {({ selected }) => (
                                            <>
                                                <span>{opt.label}</span>
                                                {selected && <Check size={14} className="text-clay-700 shrink-0" />}
                                            </>
                                        )}
                                    </ListboxOption>
                                ))}
                            </ListboxOptions>
                        </div>
                    </Listbox>
                </div>
            </div>

            {/* Quick Filter Pills */}
            <div className="flex items-center gap-1.5 border-b border-stone-100 px-4 py-2.5 sm:px-6 bg-white overflow-x-auto scrollbar-hide">
                {[
                    ['open', 'Open Queue'],
                    ['closed', 'Closed / Decided'],
                    ['low_rating', '1–2 Star Reviews'],
                    ['high_rating', '4–5 Star Reviews'],
                ].map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => {
                            setDisputeQuickView(key);
                            setDisputesCurrentPage(1);
                        }}
                        className={`rounded-lg px-3 py-1 text-[11px] font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                            disputeQuickView === key
                                ? 'bg-clay-700 text-white shadow-2xs'
                                : 'bg-stone-50 border border-stone-200/80 text-stone-600 hover:bg-stone-100'
                        }`}
                    >
                        {label}
                    </button>
                ))}

                {(disputeQuickView !== 'open' || disputeStatusFilter !== 'all' || disputeSearch) && (
                    <button
                        type="button"
                        onClick={() => {
                            setDisputeQuickView('open');
                            setDisputeStatusFilter('all');
                            setDisputeSearch('');
                            setDisputesCurrentPage(1);
                        }}
                        className="ml-auto rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-bold text-stone-500 hover:bg-stone-50 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                        Reset
                    </button>
                )}
            </div>

            {/* Dispute Items list */}
            {paginatedDisputes.length > 0 ? (
                <div className="divide-y divide-stone-100">
                    {paginatedDisputes.map((dispute) => {
                        const outcome = getModerationOutcome(dispute);
                        const rating = Number(dispute.review_rating || 0);

                        return (
                            <div key={dispute.id} className="p-5 sm:p-6 bg-white hover:bg-stone-50/40 transition-colors space-y-4">
                                {/* Top Header Row: Status, Date, Rating, Product */}
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-md border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusClasses[dispute.status] || statusClasses.pending}`}>
                                                {statusLabels[dispute.status] || String(dispute.status).replace(/_/g, ' ')}
                                            </span>

                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-amber-900 text-[10px] font-bold">
                                                <Star size={10} className="fill-amber-500 text-amber-500" />
                                                {rating} {rating === 1 ? 'Star' : 'Stars'}
                                            </span>

                                            <span className="text-[11px] font-medium text-stone-400">
                                                Reported {dispute.reported_at ? new Date(dispute.reported_at).toLocaleString() : 'Recently'}
                                            </span>
                                        </div>

                                        <div className="pt-1">
                                            <h4 className="text-sm font-bold text-stone-900 truncate">
                                                {dispute.product_name}
                                            </h4>
                                            <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                                                <Store size={12} className="text-stone-400" />
                                                <span className="font-semibold text-stone-700">{dispute.shop_name}</span>
                                                <span>· Disputed by</span>
                                                <span className="font-semibold text-stone-700">{dispute.reported_by}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons Row */}
                                    <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0">
                                        {dispute.status === 'pending' && (
                                            <button
                                                type="button"
                                                onClick={() => openDisputeActionModal(dispute, 'under_review')}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sky-800 bg-sky-50 border border-sky-200/80 hover:bg-sky-100 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
                                            >
                                                <Clock size={13} />
                                                <span>Start Review</span>
                                            </button>
                                        )}

                                        {dispute.status === 'under_review' && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => openDisputeActionModal(dispute, 'resolved')}
                                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-emerald-800 bg-emerald-50 border border-emerald-200/80 hover:bg-emerald-100 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
                                                >
                                                    <ShieldCheck size={13} />
                                                    <span>Approve (Hide Review)</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => openDisputeActionModal(dispute, 'rejected')}
                                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-rose-800 bg-rose-50 border border-rose-200/80 hover:bg-rose-100 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
                                                >
                                                    <X size={13} />
                                                    <span>Reject (Keep Visible)</span>
                                                </button>
                                            </>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => setDisputeDeleteState({ open: true, dispute })}
                                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-stone-500 bg-white border border-stone-200 hover:bg-stone-50 hover:text-rose-600 text-xs font-bold transition cursor-pointer shadow-2xs"
                                            title="Remove dispute record"
                                        >
                                            <Trash2 size={13} />
                                            <span className="hidden sm:inline">Remove</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Content Grid: Customer Review vs Seller Dispute Reason */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                                    {/* Customer Review Box */}
                                    <div className="bg-[#FCFBF9] border border-stone-200/80 rounded-xl p-3.5 space-y-1.5">
                                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                            <span>Customer Review Comment</span>
                                            <span className="text-stone-500 font-mono">ID #{dispute.review_id}</span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-stone-800 font-medium leading-relaxed italic">
                                            &ldquo;{dispute.review_comment || 'No written comment provided with star rating.'}&rdquo;
                                        </p>
                                    </div>

                                    {/* Seller Dispute Reason Box */}
                                    <div className="bg-amber-50/40 border border-amber-200/60 rounded-xl p-3.5 space-y-1.5">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                                            <span>Seller Dispute Reason</span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-stone-900 font-semibold leading-relaxed">
                                            &ldquo;{dispute.reason}&rdquo;
                                        </p>
                                        {dispute.details && (
                                            <p className="text-xs text-stone-600 font-normal pt-1 border-t border-amber-100">
                                                {dispute.details}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Resolution Status Banner (if resolved or under review) */}
                                {(dispute.resolution_notes || dispute.status !== 'pending') && (
                                    <div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                        dispute.status === 'resolved' ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950' :
                                        dispute.status === 'rejected' ? 'bg-stone-50 border-stone-200 text-stone-800' :
                                        'bg-blue-50/50 border-blue-200/60 text-blue-950'
                                    }`}>
                                        <div>
                                            <span className="font-bold block sm:inline mr-2">Outcome:</span>
                                            <span className="font-medium">{outcome.label}</span>
                                            {dispute.resolution_notes && (
                                                <p className="text-[11px] text-stone-600 mt-1 sm:mt-0 font-normal">
                                                    Note: {dispute.resolution_notes}
                                                </p>
                                            )}
                                        </div>

                                        {dispute.resolved_at && (
                                            <span className="text-[10px] font-medium text-stone-400 shrink-0">
                                                Decided {new Date(dispute.resolved_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="px-6 py-14 bg-white text-center">
                    <WorkspaceEmptyState
                        icon={MessageSquare}
                        title="No disputes found"
                        description="Disputed customer reviews submitted by shop owners will appear in this queue."
                    />
                </div>
            )}

            {/* Pagination Footer */}
            <div className="p-4 border-t border-stone-100 bg-stone-50/60 flex items-center justify-between shrink-0">
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


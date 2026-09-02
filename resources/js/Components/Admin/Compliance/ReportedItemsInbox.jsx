/* global route */
import React, { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ShieldAlert, Loader2, CheckCircle2, Check, X, Search, Package, User, MessageSquare, Star, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import CompactPagination from '@/Components/CompactPagination';
import { SkeletonModeration } from '@/utils/contentSafetyHelpers';

export default function ReportedItemsInbox({
    tickets = [],
    selectedTicket,
    setSelectedTicket,
    handleFlagAction,
    isNavigating,
    flagsPagination
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('active');

    const categoryCounts = useMemo(() => {
        let active = 0;
        let productFlags = 0;
        let userFlags = 0;
        let disputes = 0;
        let closed = 0;

        tickets.forEach(ticket => {
            const isClosed = ['resolved', 'rejected', 'dismissed'].includes(ticket.status);
            if (isClosed) {
                closed++;
            } else {
                active++;
                if (ticket.ticketType === 'flag' && ticket.targetType === 'Product') {
                    productFlags++;
                } else if (ticket.ticketType === 'flag' && ticket.targetType === 'User') {
                    userFlags++;
                } else if (ticket.ticketType === 'dispute') {
                    disputes++;
                }
            }
        });

        return {
            active,
            product_flags: productFlags,
            user_flags: userFlags,
            disputes,
            closed,
        };
    }, [tickets]);

    const filteredTickets = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return tickets.filter(ticket => {
            const isClosed = ['resolved', 'rejected', 'dismissed'].includes(ticket.status);

            if (filterCategory === 'active' && isClosed) return false;
            if (filterCategory === 'closed' && !isClosed) return false;
            if (filterCategory === 'product_flags' && (ticket.ticketType !== 'flag' || ticket.targetType !== 'Product' || isClosed)) return false;
            if (filterCategory === 'user_flags' && (ticket.ticketType !== 'flag' || ticket.targetType !== 'User' || isClosed)) return false;
            if (filterCategory === 'disputes' && (ticket.ticketType !== 'dispute' || isClosed)) return false;

            if (!query) return true;
            return [
                ticket.title,
                ticket.reporterName,
                ticket.reason,
                ticket.targetType,
                ticket.shopName,
                ticket.reviewComment,
                ticket.rawId
            ].some(val => String(val || '').toLowerCase().includes(query));
        });
    }, [tickets, searchQuery, filterCategory]);

    const getTypeIcon = (ticket) => {
        if (ticket.ticketType === 'dispute') return <MessageSquare size={10} />;
        if (ticket.targetType === 'Product') return <Package size={10} />;
        if (ticket.targetType === 'User') return <User size={10} />;
        return <ShieldAlert size={10} />;
    };

    const getTypeBadgeClass = (ticket) => {
        if (ticket.ticketType === 'dispute') return 'bg-indigo-50 text-indigo-800 border-indigo-200/80';
        if (ticket.targetType === 'Product') return 'bg-clay-50 text-clay-800 border-clay-200/80';
        if (ticket.targetType === 'User') return 'bg-rose-50 text-rose-800 border-rose-200/80';
        return 'bg-amber-50 text-amber-800 border-amber-200/80';
    };

    const getTypeLabel = (ticket) => {
        if (ticket.ticketType === 'dispute') return 'Review Dispute';
        if (ticket.targetType === 'Product') return 'Product Flag';
        if (ticket.targetType === 'User') return 'User Flag';
        return 'Content Flag';
    };

    const getStatusPill = (status) => {
        switch (status) {
            case 'pending':
                return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200/60">Pending</span>;
            case 'under_review':
                return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-sky-50 text-sky-700 border border-sky-200/60">Reviewing</span>;
            case 'resolved':
                return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/60">Resolved</span>;
            case 'rejected':
                return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-stone-50 text-stone-600 border border-stone-200/60">Rejected</span>;
            case 'dismissed':
                return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-stone-50 text-stone-500 border border-stone-200/60">Dismissed</span>;
            default:
                return null;
        }
    };

    return (
        <div className={`w-full lg:w-[380px] xl:w-[420px] bg-white border border-stone-200/80 rounded-2xl shadow-2xs flex flex-col overflow-hidden ${selectedTicket ? 'hidden lg:flex' : 'flex'} h-full shrink-0`}>
            {/* Header */}
            <div className="p-4 border-b border-stone-100 bg-[#FCFBF9] shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60">
                            <ShieldAlert size={14} />
                        </div>
                        <h3 className="font-bold text-stone-900 text-xs sm:text-sm">
                            Moderation Inbox
                        </h3>
                    </div>
                    {isNavigating && <Loader2 size={14} className="animate-spin text-stone-400" />}
                </div>

                {/* Search Input */}
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={13} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search ticket, product, shop, or reason..."
                        className="w-full rounded-xl border border-stone-200 bg-white py-1.5 pl-8 pr-8 text-xs font-medium text-stone-900 placeholder-stone-400 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 shadow-2xs h-[36px]"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* Filter Pills with Badge Numbers */}
                <div 
                    onWheel={(e) => {
                        if (e.deltaY !== 0) {
                            e.currentTarget.scrollLeft += e.deltaY;
                        }
                    }}
                    className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pt-0.5 scroll-smooth touch-pan-x"
                >
                    {[
                        { key: 'active', label: 'Active', count: categoryCounts.active },
                        { key: 'product_flags', label: 'Products', count: categoryCounts.product_flags },
                        { key: 'user_flags', label: 'Users', count: categoryCounts.user_flags },
                        { key: 'disputes', label: 'Disputes', count: categoryCounts.disputes },
                        { key: 'closed', label: 'Closed', count: categoryCounts.closed },
                    ].map((tab) => {
                        const isActive = filterCategory === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setFilterCategory(tab.key)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                                    isActive
                                        ? 'bg-clay-700 text-white shadow-2xs'
                                        : 'bg-white border border-stone-200/80 text-stone-600 hover:bg-stone-50'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span 
                                    className={`inline-flex items-center justify-center px-1.5 py-0.2 rounded-md text-[9px] font-black ${
                                        isActive 
                                            ? 'bg-white/20 text-white' 
                                            : tab.count > 0 ? 'bg-stone-100 text-stone-700' : 'bg-stone-100/60 text-stone-400'
                                    }`}
                                >
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {isNavigating && tickets.length === 0 ? (
                    <SkeletonModeration />
                ) : filteredTickets.length === 0 ? (
                    <div className="p-10 text-center">
                        <CheckCircle2 size={28} className="mx-auto mb-2.5 text-stone-300" />
                        <p className="font-bold text-stone-800 text-xs">No moderation tickets match your filters.</p>
                        <p className="text-[11px] text-stone-400 mt-1">Select &ldquo;All Active&rdquo; or clear search to inspect tickets.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-stone-100">
                        {filteredTickets.map(ticket => {
                            const isSelected = selectedTicket?.id === ticket.id;

                            return (
                                <li key={ticket.id} className="relative overflow-hidden group/item">
                                    <div
                                        className={`relative w-full z-10 p-3.5 transition-all cursor-pointer ${
                                            isSelected 
                                                ? 'bg-clay-50/60 border-l-4 border-l-clay-700 pl-3' 
                                                : 'bg-white hover:bg-stone-50/70 border-l-4 border-l-transparent'
                                        }`}
                                        onClick={() => setSelectedTicket(ticket)}
                                    >
                                        <div className="flex justify-between items-center mb-1.5 gap-2">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${getTypeBadgeClass(ticket)}`}>
                                                    {getTypeIcon(ticket)}
                                                    {getTypeLabel(ticket)}
                                                </span>

                                                {ticket.ticketType === 'dispute' && ticket.rating > 0 && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200/60 text-amber-800 text-[9px] font-black">
                                                        <Star size={9} className="fill-amber-500 text-amber-500" />
                                                        {ticket.rating}.0
                                                    </span>
                                                )}

                                                {getStatusPill(ticket.status)}
                                            </div>

                                            <span className="text-[10px] font-medium text-stone-400 shrink-0">
                                                {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ''}
                                            </span>
                                        </div>

                                        <p className="text-xs font-bold text-stone-900 truncate mt-1">
                                            {ticket.title}
                                        </p>

                                        <p className="text-[11px] text-stone-600 mt-1 line-clamp-1 leading-relaxed">
                                            &ldquo;{ticket.reason}&rdquo;
                                        </p>

                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 text-[10px] text-stone-400">
                                            <span className="truncate max-w-[220px]">
                                                {ticket.ticketType === 'dispute' ? 'Shop: ' : 'Reporter: '}
                                                <span className="font-semibold text-stone-600">{ticket.reporterName || 'Anonymous'}</span>
                                            </span>
                                            <span className="font-mono text-[9px]">#{ticket.rawId}</span>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Pagination footer (if flags paginator has multiple pages) */}
            {flagsPagination && flagsPagination.total > flagsPagination.per_page && (
                <div className="p-3 border-t border-stone-100 bg-stone-50/70 shrink-0">
                    <CompactPagination 
                        currentPage={flagsPagination.current_page}
                        totalPages={flagsPagination.last_page}
                        totalItems={flagsPagination.total}
                        itemsPerPage={flagsPagination.per_page}
                        onPageChange={(page) => router.get(route('admin.compliance', { flags_page: page }), {}, { preserveScroll: true })}
                        itemLabel="reports"
                    />
                </div>
            )}
        </div>
    );
}



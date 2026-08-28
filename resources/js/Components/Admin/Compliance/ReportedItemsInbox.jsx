/* global route */
import React, { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ShieldAlert, Loader2, CheckCircle2, Check, X, Search, Package, User, MessageSquare } from 'lucide-react';
import CompactPagination from '@/Components/CompactPagination';
import { SkeletonModeration } from '@/utils/contentSafetyHelpers';

export default function ReportedItemsInbox({
    flags,
    selectedFlag,
    setSelectedFlag,
    handleFlagAction,
    isNavigating
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    const filteredFlagsData = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return (flags.data || []).filter(flag => {
            const rawType = flag.reportable_type ? flag.reportable_type.split('\\').pop() : '';
            if (typeFilter !== 'all') {
                if (typeFilter === 'Product' && rawType !== 'Product') return false;
                if (typeFilter === 'User' && rawType !== 'User') return false;
                if (typeFilter === 'Review' && rawType !== 'Review') return false;
            }
            if (!query) return true;
            const targetName = flag.reportable ? (flag.reportable.name || flag.reportable.title || '') : '';
            const reporterName = flag.reporter?.name || '';
            const reason = flag.reason || '';
            return [targetName, reporterName, reason, rawType].some(val => 
                String(val).toLowerCase().includes(query)
            );
        });
    }, [flags.data, searchQuery, typeFilter]);

    const getTypeIcon = (type) => {
        switch (type) {
            case 'Product': return <Package size={10} />;
            case 'User': return <User size={10} />;
            case 'Review': return <MessageSquare size={10} />;
            default: return <ShieldAlert size={10} />;
        }
    };

    const getTypeBadgeClass = (type) => {
        switch (type) {
            case 'Product': return 'bg-clay-50 text-clay-800 border-clay-200/80';
            case 'User': return 'bg-amber-50 text-amber-800 border-amber-200/80';
            case 'Review': return 'bg-indigo-50 text-indigo-800 border-indigo-200/80';
            default: return 'bg-stone-50 text-stone-700 border-stone-200/80';
        }
    };

    return (
        <div className={`w-full lg:w-[380px] xl:w-[420px] bg-white border border-stone-200/80 rounded-2xl shadow-2xs flex flex-col overflow-hidden ${selectedFlag ? 'hidden lg:flex' : 'flex'} h-full shrink-0`}>
            {/* Header */}
            <div className="p-4 border-b border-stone-100 bg-[#FCFBF9] shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60">
                            <ShieldAlert size={14} />
                        </div>
                        <h3 className="font-bold text-stone-900 text-xs sm:text-sm">
                            Report Queue
                        </h3>
                        <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                            {flags.total}
                        </span>
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
                        placeholder="Search ticket, product, or reason..."
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

                {/* Type Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pt-0.5">
                    {['all', 'Product', 'User', 'Review'].map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setTypeFilter(type)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                                typeFilter === type
                                    ? 'bg-clay-700 text-white shadow-2xs'
                                    : 'bg-white border border-stone-200/80 text-stone-600 hover:bg-stone-50'
                            }`}
                        >
                            {type === 'all' ? 'All Types' : type}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {isNavigating && flags.data.length === 0 ? (
                    <SkeletonModeration />
                ) : filteredFlagsData.length === 0 ? (
                    <div className="p-10 text-center">
                        <CheckCircle2 size={28} className="mx-auto mb-2.5 text-stone-300" />
                        <p className="font-bold text-stone-800 text-xs">No pending reports match your search.</p>
                        <p className="text-[11px] text-stone-400 mt-1">Try clearing filters to see all queued reports.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-stone-100">
                        {filteredFlagsData.map(flag => {
                            const rawType = flag.reportable_type ? flag.reportable_type.split('\\').pop() : 'Content';
                            const isSelected = selectedFlag?.id === flag.id;

                            return (
                                <li key={flag.id} className="relative overflow-hidden group/item">
                                    <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
                                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs opacity-0 group-drag-right:opacity-100 transition-opacity">
                                            <Check size={16} strokeWidth={3} /> Dismiss
                                        </div>
                                        <div className="flex items-center gap-1.5 text-rose-600 font-bold text-xs opacity-0 group-drag-left:opacity-100 transition-opacity">
                                            Take Action <X size={16} strokeWidth={3} />
                                        </div>
                                    </div>

                                    <motion.div
                                        drag="x"
                                        dragConstraints={{ left: 0, right: 0 }}
                                        dragElastic={0.7}
                                        onDragEnd={(e, info) => {
                                            if (info.offset.x > 100) handleFlagAction(flag.id, 'dismiss');
                                            if (info.offset.x < -100) handleFlagAction(flag.id, 'takedown');
                                        }}
                                        whileTap={{ scale: 0.99 }}
                                        className={`relative w-full z-10 p-3.5 transition-all cursor-pointer ${
                                            isSelected 
                                                ? 'bg-clay-50/60 border-l-4 border-l-clay-700 pl-3' 
                                                : 'bg-white hover:bg-stone-50/70 border-l-4 border-l-transparent'
                                        }`}
                                        onClick={() => setSelectedFlag(flag)}
                                    >
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${getTypeBadgeClass(rawType)}`}>
                                                {getTypeIcon(rawType)}
                                                {rawType}
                                            </span>
                                            <span className="text-[10px] font-medium text-stone-400">
                                                {flag.created_at ? new Date(flag.created_at).toLocaleDateString() : ''}
                                            </span>
                                        </div>

                                        <p className="text-xs font-bold text-stone-900 truncate">
                                            {flag.reportable ? (flag.reportable.name || flag.reportable.title || `ID: ${flag.reportable_id}`) : 'Content Deleted'}
                                        </p>

                                        <p className="text-[11px] text-stone-600 mt-1 line-clamp-2 leading-relaxed">
                                            &ldquo;{flag.reason}&rdquo;
                                        </p>

                                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-stone-100 text-[10px] text-stone-400">
                                            <span>By <span className="font-semibold text-stone-600">{flag.reporter?.name || 'Anonymous User'}</span></span>
                                            <span className="font-mono text-[9px]">#{flag.id}</span>
                                        </div>
                                    </motion.div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {flags.total > flags.per_page && (
                <div className="p-3 border-t border-stone-100 bg-stone-50/70 shrink-0">
                    <CompactPagination 
                        currentPage={flags.current_page}
                        totalPages={flags.last_page}
                        totalItems={flags.total}
                        itemsPerPage={flags.per_page}
                        onPageChange={(page) => router.get(route('admin.compliance', { tab: 'flags', flags_page: page }), {}, { preserveScroll: true })}
                        itemLabel="reports"
                    />
                </div>
            )}
        </div>
    );
}


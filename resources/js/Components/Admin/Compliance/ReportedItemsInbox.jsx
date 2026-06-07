/* global route */
import React from 'react';
import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ShieldAlert, Loader2, CheckCircle2, Check, X } from 'lucide-react';
import CompactPagination from '@/Components/CompactPagination';
import { SkeletonModeration } from '@/utils/contentSafetyHelpers';

export default function ReportedItemsInbox({
    flags,
    selectedFlag,
    setSelectedFlag,
    handleFlagAction,
    isNavigating
}) {
    return (
        <div className={`w-full lg:w-1/3 bg-white border border-stone-200 rounded-2xl shadow-sm flex flex-col overflow-hidden ${selectedFlag ? 'hidden lg:flex' : 'flex'} h-full`}>
            <div className="p-4 border-b border-stone-100 bg-stone-50/50 shrink-0 flex items-center justify-between">
                <h3 className="font-bold text-stone-900 flex items-center gap-2 text-xs sm:text-sm">
                    <ShieldAlert size={15} className="text-amber-500" />
                    Pending Reports ({flags.total})
                </h3>
                {isNavigating && <Loader2 size={14} className="animate-spin text-stone-400" />}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {isNavigating && flags.data.length === 0 ? (
                    <SkeletonModeration />
                ) : flags.data.length === 0 ? (
                    <div className="p-10 text-center">
                        <CheckCircle2 size={32} className="mx-auto mb-3 text-stone-300" />
                        <p className="font-medium text-stone-500 text-sm">The report queue is clean.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-stone-100">
                        {flags.data.map(flag => (
                            <li key={flag.id} className="relative overflow-hidden group/item">
                                <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
                                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs opacity-0 group-drag-right:opacity-100 transition-opacity">
                                        <Check size={18} strokeWidth={3} /> Dismiss
                                    </div>
                                    <div className="flex items-center gap-2 text-rose-600 font-bold text-xs opacity-0 group-drag-left:opacity-100 transition-opacity">
                                        Take Action <X size={18} strokeWidth={3} />
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
                                    whileTap={{ scale: 0.98 }}
                                    className={`relative w-full z-10 bg-white p-4 transition-colors hover:bg-stone-50 cursor-grab active:cursor-grabbing ${selectedFlag?.id === flag.id ? 'bg-clay-50/20' : ''}`}
                                    onClick={() => setSelectedFlag(flag)}
                                >
                                    {selectedFlag?.id === flag.id && (
                                        <div className="absolute inset-y-0 left-0 w-1 bg-clay-600" />
                                    )}
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                                            {flag.reportable_type ? flag.reportable_type.split('\\').pop() : ''}
                                        </span>
                                        <span className="text-[9px] font-medium text-stone-400">
                                            {new Date(flag.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                                        {flag.reportable ? (flag.reportable.name || flag.reportable.title || `ID: ${flag.reportable_id}`) : 'Content Deleted'}
                                    </p>
                                    <p className="text-[11px] text-stone-500 mt-1 line-clamp-1">&quot;{flag.reason}&quot;</p>
                                </motion.div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {flags.total > flags.per_page && (
                <div className="p-4 border-t border-stone-100 bg-stone-50 shrink-0">
                    <CompactPagination 
                        currentPage={flags.current_page}
                        totalPages={flags.last_page}
                        totalItems={flags.total}
                        itemsPerPage={flags.per_page}
                        onPageChange={(page) => router.get(route('admin.compliance', { tab: 'flags', flags_page: page }), {}, { preserveScroll: true })}
                    />
                </div>
            )}
        </div>
    );
}

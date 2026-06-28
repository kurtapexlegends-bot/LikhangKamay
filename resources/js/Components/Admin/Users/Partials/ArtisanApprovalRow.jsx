import React from 'react';
import { motion } from 'framer-motion';
import { Phone, MapPin, AlertTriangle, Calendar, CheckCircle, Eye } from 'lucide-react';
import Checkbox from '@/Components/Checkbox';
import { ARTISAN_DOCUMENTS } from '@/utils/userManagerHelpers';

export default function ArtisanApprovalRow({
    artisan,
    isSelected,
    toggleArtisanSelection,
    viewedCount,
    openReviewModal
}) {
    const submittedCount = ARTISAN_DOCUMENTS.filter(doc => !!artisan[doc.key]).length;
    const isReady = submittedCount > 0 && viewedCount >= submittedCount;

    return (
        <div className="grid grid-cols-1 gap-4 px-4 py-4 transition-all duration-200 hover:bg-stone-50/60 sm:px-6 md:grid-cols-12 md:items-center relative group">
            {/* Hover Accent */}
            <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-clay-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-center" />

            <div className="col-span-4 flex items-center gap-4">
                <Checkbox
                    checked={isSelected}
                    onChange={() => toggleArtisanSelection(artisan.id)}
                />
                <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-clay-100 bg-clay-50/50 text-base font-bold text-clay-700 shadow-sm transition-transform group-hover:scale-105">
                        {artisan.avatar ? (
                            <img
                                src={artisan.avatar.startsWith('http') ? artisan.avatar : `/storage/${artisan.avatar}`}
                                alt={artisan.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            artisan.name?.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-[14px] text-stone-900 leading-tight truncate group-hover:text-clay-800 transition-colors">
                            {artisan.shop_name}
                        </h3>
                        <p className="text-stone-500 text-[11px] font-medium truncate mt-0.5">
                            {artisan.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                            <Calendar size={10} className="text-stone-300" />
                            <span className="text-[10px] text-stone-400 font-medium">
                                Submitted {artisan.submitted_at}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-span-3">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 group/contact">
                        <div className="p-1 rounded-md bg-stone-100/50 text-stone-400 group-hover/contact:bg-clay-50 group-hover/contact:text-clay-500 transition-colors">
                            <Phone size={10} />
                        </div>
                        <span className="text-[11px] font-semibold text-stone-600 truncate">
                            {artisan.phone_number}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 group/contact">
                        <div className="p-1 rounded-md bg-stone-100/50 text-stone-400 group-hover/contact:bg-clay-50 group-hover/contact:text-clay-500 transition-colors">
                            <MapPin size={10} />
                        </div>
                        <span className="text-[11px] text-stone-500 truncate leading-relaxed">
                            {artisan.address}
                        </span>
                    </div>
                </div>
            </div>

            <div className="col-span-2">
                <div className="rounded-2xl border border-stone-100 bg-stone-50/40 p-2.5 transition-colors group-hover:bg-white group-hover:border-stone-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.1em] text-stone-400">
                            Progress
                        </span>
                        <span className={`text-[10px] font-black ${isReady ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {viewedCount} <span className="text-stone-300">/</span> {submittedCount}
                        </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200/50 ring-1 ring-inset ring-black/5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{
                                width: `${submittedCount > 0 ? Math.min(100, (viewedCount / submittedCount) * 100) : 0}%`
                            }}
                            className={`h-full rounded-full transition-all duration-700 ${
                                isReady
                                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                    : 'bg-amber-400'
                            }`}
                        />
                    </div>
                    <p className={`mt-2 text-[9px] font-bold leading-tight ${isReady ? 'text-emerald-600' : 'text-stone-400'}`}>
                        {isReady ? 'Ready for approval' : 'Preview all submitted files first'}
                    </p>
                </div>
            </div>

            <div className="col-span-2 flex flex-col items-start md:items-center gap-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50/50 border border-amber-200/30 px-2 py-0.5 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Pending
                </span>
                {Object.values(artisan.document_flags || {}).some(flags => flags.length > 0) && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-200/30 px-2 py-0.5 rounded-full mt-1">
                        <AlertTriangle size={9} /> Flagged
                    </span>
                )}
                {isReady && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50/50 border border-emerald-200/30 px-2 py-0.5 rounded-full">
                        <CheckCircle size={9} /> Verified
                    </span>
                )}
            </div>

            <div className="col-span-1 flex justify-start md:justify-end">
                <button
                    onClick={() => openReviewModal(artisan)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-transparent hover:border-clay-100/30 bg-clay-50/50 hover:bg-clay-100 px-4 text-[11px] font-bold text-clay-700 shadow-sm transition-all min-h-[44px]"
                >
                    <Eye size={13} className="text-clay-500" />
                    <span>Review</span>
                </button>
            </div>
        </div>
    );
}

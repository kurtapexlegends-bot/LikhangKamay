/* global route */
import React from 'react';
import { Link } from '@inertiajs/react';
import { AlertTriangle, Eye, X, ShieldOff, UserX, Package, User, Store, ExternalLink } from 'lucide-react';

export default function ReportDetailsCard({ selectedFlag, handleAction, isMobile = false }) {
    const rawType = selectedFlag.reportable_type ? selectedFlag.reportable_type.split('\\').pop() : 'Content';
    const isProduct = rawType === 'Product' && selectedFlag.reportable;
    const isUser = rawType === 'User' && selectedFlag.reportable;

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            {/* Header */}
            <div className={`p-5 sm:p-6 border-b border-stone-100 shrink-0 ${isMobile ? 'bg-white' : 'bg-[#FCFBF9]'}`}>
                <div className="flex justify-between items-start gap-3 mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                                Ticket #{selectedFlag.id}
                            </span>
                            <span className="text-[11px] font-medium text-stone-400">
                                Submitted {selectedFlag.created_at ? new Date(selectedFlag.created_at).toLocaleString() : ''}
                            </span>
                        </div>
                        <p className="text-xs text-stone-500">
                            Reported by <span className="font-bold text-stone-800">{selectedFlag.reporter?.name || 'Anonymous User'}</span>
                        </p>
                    </div>

                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 border border-amber-200/80 shrink-0">
                        <AlertTriangle size={12} className="text-amber-600" /> Pending Review
                    </span>
                </div>

                {/* Report Reason Box */}
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/60">
                    <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-1.5">
                        Violation Reason
                    </h4>
                    <p className="text-xs sm:text-sm font-semibold text-stone-900 leading-relaxed">
                        &ldquo;{selectedFlag.reason}&rdquo;
                    </p>
                </div>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-[#FAF9F6]">
                <div>
                    <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">
                        Reported Entity Information
                    </h4>

                    {selectedFlag.reportable ? (
                        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                            {/* Product Entity View */}
                            {isProduct && (
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row items-start gap-4">
                                        {selectedFlag.reportable.cover_photo_path ? (
                                            <img 
                                                src={`/storage/${selectedFlag.reportable.cover_photo_path}`} 
                                                alt={selectedFlag.reportable.name} 
                                                className="w-full sm:w-28 h-28 object-cover rounded-xl border border-stone-200/80 shrink-0" 
                                                loading="lazy"
                                                decoding="async"
                                            />
                                        ) : (
                                            <div className="w-full sm:w-28 h-28 rounded-xl bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-400 shrink-0">
                                                <Package size={28} />
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <span className="text-[9px] font-black uppercase tracking-wider text-clay-700 bg-clay-50 px-2 py-0.5 rounded-md border border-clay-200">
                                                        Product Listing
                                                    </span>
                                                    <h3 className="text-sm sm:text-base font-bold text-stone-900 mt-1 truncate">
                                                        {selectedFlag.reportable.name}
                                                    </h3>
                                                </div>

                                                <Link 
                                                    href={route('product.show', selectedFlag.reportable.slug || selectedFlag.reportable.id)} 
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-200 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-100 transition shadow-2xs shrink-0"
                                                >
                                                    <Eye size={13} /> <span>View Live</span>
                                                    <ExternalLink size={11} className="text-stone-400" />
                                                </Link>
                                            </div>

                                            {selectedFlag.reportable.price && (
                                                <p className="text-xs font-black text-stone-900 mt-2">
                                                    ₱{Number(selectedFlag.reportable.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                </p>
                                            )}

                                            {selectedFlag.reportable.description && (
                                                <p className="text-xs text-stone-600 mt-2 line-clamp-3 leading-relaxed bg-stone-50/70 p-2.5 rounded-lg border border-stone-100">
                                                    {selectedFlag.reportable.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* User Entity View */}
                            {isUser && (
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 font-black text-lg">
                                        {selectedFlag.reportable.name ? selectedFlag.reportable.name.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                            User Account ({selectedFlag.reportable.role || 'Member'})
                                        </span>
                                        <h3 className="text-sm font-bold text-stone-900 mt-1 truncate">
                                            {selectedFlag.reportable.name}
                                        </h3>
                                        <p className="text-xs text-stone-500 truncate">
                                            {selectedFlag.reportable.email}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Generic/Other Entity */}
                            {!isProduct && !isUser && (
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                                        {rawType}
                                    </span>
                                    <h3 className="text-sm font-bold text-stone-900 mt-1">
                                        {selectedFlag.reportable.name || selectedFlag.reportable.title || `Item #${selectedFlag.reportable_id}`}
                                    </h3>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-stone-200">
                            <p className="text-stone-500 font-medium text-xs">This reported content has already been removed or permanently deleted.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions Toolbar */}
            <div className="p-4 sm:p-5 border-t border-stone-100 bg-[#FCFBF9] shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-2.5 z-10">
                <button 
                    type="button"
                    onClick={() => handleAction(selectedFlag.id, 'dismiss')}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-xl font-bold text-xs hover:bg-stone-50 hover:text-stone-900 transition shadow-2xs min-h-[40px] cursor-pointer"
                >
                    <X size={14} /> Dismiss (False Alarm)
                </button>

                <div className="flex items-center gap-2">
                    <button 
                        type="button"
                        onClick={() => handleAction(selectedFlag.id, 'takedown')}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition shadow-md shadow-amber-600/20 active:scale-95 min-h-[40px] cursor-pointer"
                    >
                        <ShieldOff size={14} /> Takedown Listing
                    </button>
                    <button 
                        type="button"
                        onClick={() => handleAction(selectedFlag.id, 'suspend')}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition shadow-md shadow-rose-600/20 active:scale-95 min-h-[40px] cursor-pointer"
                    >
                        <UserX size={14} /> Suspend User
                    </button>
                </div>
            </div>
        </div>
    );
}


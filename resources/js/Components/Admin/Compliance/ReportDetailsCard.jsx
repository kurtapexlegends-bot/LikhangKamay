/* global route */
import React from 'react';
import { Link } from '@inertiajs/react';
import { AlertTriangle, Eye, X, ShieldOff, UserX } from 'lucide-react';

export default function ReportDetailsCard({ selectedFlag, handleAction, isMobile = false }) {
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className={`p-4 sm:p-6 border-b border-stone-100 shrink-0 ${isMobile ? 'bg-white' : 'bg-stone-50/30'}`}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        {!isMobile && (
                            <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight mb-1">
                                Ticket #{selectedFlag.id}
                            </h2>
                        )}
                        <p className="text-xs sm:text-sm text-stone-500">
                            Reported by <span className="font-bold text-stone-700">{selectedFlag.reporter?.name || 'Unknown User'}</span>
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-700 border border-amber-200">
                        <AlertTriangle size={10} className="w-3 h-3" /> Pending Review
                    </span>
                </div>
                <div className="bg-[#FAF9F6] p-3 sm:p-4 rounded-xl border border-stone-200/60 shadow-sm">
                    <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Report Reason</h4>
                    <p className="text-xs sm:text-sm font-medium text-stone-800 leading-relaxed">&quot;{selectedFlag.reason}&quot;</p>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAF9F6]">
                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-4">Reported Content Details</h4>
                {selectedFlag.reportable ? (
                    <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5 shadow-sm">
                        <div className={`flex ${isMobile ? 'flex-col' : 'items-start'} gap-4`}>
                            {(selectedFlag.reportable_type || '').includes('Product') && selectedFlag.reportable.cover_photo_path && (
                                <img 
                                    src={`/storage/${selectedFlag.reportable.cover_photo_path}`} 
                                    alt="Product" 
                                    className={`${isMobile ? 'w-full h-48' : 'w-24 h-24'} object-cover rounded-lg border border-stone-100`} 
                                />
                            )}
                            <div className="flex-1">
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                                            {selectedFlag.reportable_type ? selectedFlag.reportable_type.split('\\').pop() : ''}
                                        </span>
                                        <h3 className="text-sm sm:text-base font-bold text-stone-900">{selectedFlag.reportable.name || selectedFlag.reportable.title}</h3>
                                    </div>
                                    {(selectedFlag.reportable_type || '').includes('Product') && (
                                        <Link 
                                            href={route('product.show', selectedFlag.reportable.slug || selectedFlag.reportable.id)} 
                                            className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 text-stone-600 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-stone-200 transition min-h-[44px]"
                                        >
                                            <Eye size={14} /> <span className="hidden sm:inline">View Live</span>
                                        </Link>
                                    )}
                                </div>
                                {(selectedFlag.reportable_type || '').includes('Product') && (
                                    <p className="text-xs sm:text-sm text-stone-500 mt-2 line-clamp-4">{selectedFlag.reportable.description}</p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200">
                        <p className="text-stone-500 font-medium text-xs">This content has already been deleted from the platform.</p>
                    </div>
                )}
            </div>

            <div className="sticky bottom-0 p-4 border-t border-stone-100 bg-stone-50 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-3 z-10">
                <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                        onClick={() => handleAction(selectedFlag.id, 'dismiss')}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-stone-200 text-stone-600 rounded-xl font-bold text-xs hover:bg-stone-50 hover:text-stone-900 transition-colors shadow-sm w-full min-h-[44px]"
                    >
                        <X size={14} /> Dismiss (False Alarm)
                    </button>
                </div>
                <div className="flex gap-2 w-full sm:w-auto flex-1 justify-end">
                    <button 
                        onClick={() => handleAction(selectedFlag.id, 'takedown')}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold text-[11px] sm:text-xs hover:bg-amber-700 transition shadow-sm active:scale-95 min-h-[44px]"
                    >
                        <ShieldOff size={14} /> Takedown
                    </button>
                    <button 
                        onClick={() => handleAction(selectedFlag.id, 'suspend')}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-bold text-[11px] sm:text-xs hover:bg-red-700 transition shadow-sm active:scale-95 min-h-[44px]"
                    >
                        <UserX size={14} /> Suspend User
                    </button>
                </div>
            </div>
        </div>
    );
}

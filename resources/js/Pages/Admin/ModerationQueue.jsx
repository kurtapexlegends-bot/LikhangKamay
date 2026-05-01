import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { ShieldAlert, Check, X, AlertTriangle, Eye, ShieldOff, UserX } from 'lucide-react';
import CompactPagination from '@/Components/CompactPagination';

export default function ModerationQueue({ flags }) {
    const [selectedFlag, setSelectedFlag] = useState(null);
    
    const handleAction = (id, action) => {
        router.post(route(`admin.moderation.${action}`, id), {}, { 
            preserveScroll: true,
            onSuccess: () => setSelectedFlag(null)
        });
    };

    return (
        <AdminLayout title="Moderation Queue">
            <div className="flex flex-col lg:flex-row gap-6 mt-6 h-[calc(100vh-140px)]">
                
                {/* Left Pane: Inbox List */}
                <div className="w-full lg:w-1/3 bg-white border border-stone-200 rounded-2xl shadow-sm flex flex-col overflow-hidden h-full">
                    <div className="p-4 border-b border-stone-100 bg-stone-50/50 shrink-0">
                        <h3 className="font-bold text-stone-900 flex items-center gap-2">
                            <ShieldAlert size={16} className="text-amber-500" />
                            Pending Reports ({flags.total})
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {flags.data.length === 0 ? (
                            <div className="p-10 text-center">
                                <Check size={32} className="mx-auto mb-3 text-stone-300" />
                                <p className="font-medium text-stone-500 text-sm">The queue is clean.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-stone-100">
                                {flags.data.map(flag => (
                                    <li key={flag.id}>
                                        <button 
                                            onClick={() => setSelectedFlag(flag)}
                                            className={`w-full text-left p-4 transition-colors hover:bg-stone-50 ${selectedFlag?.id === flag.id ? 'bg-amber-50/50 border-l-4 border-amber-400' : 'border-l-4 border-transparent'}`}
                                        >
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                                    {flag.reportable_type.split('\\').pop()}
                                                </span>
                                                <span className="text-[10px] font-bold text-stone-400">
                                                    {new Date(flag.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-stone-900 truncate">
                                                {flag.reportable ? (flag.reportable.name || flag.reportable.title || `ID: ${flag.reportable_id}`) : 'Content Deleted'}
                                            </p>
                                            <p className="text-xs text-stone-500 mt-1 line-clamp-1">"{flag.reason}"</p>
                                        </button>
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
                                onPageChange={(page) => router.get(route('admin.moderation', { page }), {}, { preserveScroll: true })}
                            />
                        </div>
                    )}
                </div>

                {/* Right Pane: Review & Action */}
                <div className="flex-1 bg-white border border-stone-200 rounded-2xl shadow-sm flex flex-col overflow-hidden h-full">
                    {selectedFlag ? (
                        <>
                            <div className="p-6 border-b border-stone-100 shrink-0 bg-stone-50/30">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-stone-900 tracking-tight mb-1">Ticket #{selectedFlag.id}</h2>
                                        <p className="text-sm text-stone-500">Reported by <span className="font-bold text-stone-700">{selectedFlag.reporter?.name || 'Unknown User'}</span></p>
                                    </div>
                                    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 border border-amber-200">
                                        <AlertTriangle size={12} /> Pending Review
                                    </span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Report Reason</h4>
                                    <p className="text-sm font-medium text-stone-800 leading-relaxed">"{selectedFlag.reason}"</p>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 bg-[#FDFBF9]">
                                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">Reported Content Details</h4>
                                {selectedFlag.reportable ? (
                                    <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
                                        <div className="flex items-start gap-4">
                                            {selectedFlag.reportable_type.includes('Product') && selectedFlag.reportable.cover_photo_path && (
                                                <img src={`/storage/${selectedFlag.reportable.cover_photo_path}`} alt="Product" className="w-24 h-24 object-cover rounded-lg border border-stone-100" />
                                            )}
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                                                            {selectedFlag.reportable_type.split('\\').pop()}
                                                        </span>
                                                        <h3 className="text-lg font-bold text-stone-900">{selectedFlag.reportable.name || selectedFlag.reportable.title}</h3>
                                                    </div>
                                                    {selectedFlag.reportable_type.includes('Product') && (
                                                        <Link href={route('product.show', selectedFlag.reportable.slug || selectedFlag.reportable.id)} target="_blank" className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg text-xs font-bold hover:bg-stone-200 transition">
                                                            <Eye size={14} /> View Live
                                                        </Link>
                                                    )}
                                                </div>
                                                {selectedFlag.reportable_type.includes('Product') && (
                                                    <p className="text-sm text-stone-500 mt-2 line-clamp-3">{selectedFlag.reportable.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200">
                                        <p className="text-stone-500 font-medium">This content has already been deleted from the platform.</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-stone-100 bg-stone-50 shrink-0 flex items-center justify-between gap-4">
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleAction(selectedFlag.id, 'dismiss')}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-xl font-bold text-xs hover:bg-stone-50 hover:text-stone-900 transition-colors shadow-sm"
                                    >
                                        <X size={16} /> Dismiss (False Alarm)
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleAction(selectedFlag.id, 'takedown')}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-700 transition-colors shadow-sm active:scale-95"
                                    >
                                        <ShieldOff size={16} /> Takedown Product
                                    </button>
                                    <button 
                                        onClick={() => handleAction(selectedFlag.id, 'suspend')}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-colors shadow-sm active:scale-95"
                                    >
                                        <UserX size={16} /> Suspend User
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-stone-50/30">
                            <div className="w-16 h-16 bg-white border border-stone-200 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                <ShieldAlert size={28} className="text-stone-300" />
                            </div>
                            <h3 className="text-lg font-bold text-stone-900 mb-1">Select a Ticket</h3>
                            <p className="text-sm text-stone-500 max-w-xs">Click on a report from the queue on the left to review the content and take action.</p>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
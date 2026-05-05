import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { ShieldAlert, Check, X, AlertTriangle, Eye, ShieldOff, UserX } from 'lucide-react';
import CompactPagination from '@/Components/CompactPagination';
import SlideOverDrawer from '@/Components/SlideOverDrawer';

export default function ModerationQueue({ flags }) {
    const [selectedFlag, setSelectedFlag] = useState(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024); // lg breakpoint
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    const handleAction = (id, action) => {
        router.post(route(`admin.moderation.${action}`, id), {}, { 
            preserveScroll: true,
            onSuccess: () => setSelectedFlag(null)
        });
    };

    return (
        <AdminLayout title="Moderation Queue">
            <div className="flex flex-col lg:flex-row gap-6 mt-6 h-auto lg:h-[calc(100vh-140px)]">
                
                {/* Left Pane: Inbox List */}
                <div className={`w-full lg:w-1/3 bg-white border border-stone-200 rounded-2xl shadow-sm flex flex-col overflow-hidden ${selectedFlag ? 'hidden lg:flex' : 'flex'} h-full`}>
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

                {/* Right Pane: Review & Action (Desktop Only / SlideOver for Mobile) */}
                <div className="hidden lg:flex flex-1 bg-white border border-stone-200 rounded-2xl shadow-sm flex-col overflow-hidden h-full">
                    {selectedFlag ? (
                        <ReviewContent 
                            selectedFlag={selectedFlag} 
                            handleAction={handleAction} 
                            onClose={() => setSelectedFlag(null)} 
                        />
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

            {/* Mobile Review Drawer */}
            <SlideOverDrawer
                show={!!selectedFlag && isMobile}
                onClose={() => setSelectedFlag(null)}
                title={`Ticket #${selectedFlag?.id}`}
                widthClass="max-w-xl"
                className="lg:hidden"
            >
                {selectedFlag && (
                    <div className="h-full -m-6">
                        <ReviewContent 
                            selectedFlag={selectedFlag} 
                            handleAction={handleAction} 
                            onClose={() => setSelectedFlag(null)}
                            isMobile={true}
                        />
                    </div>
                )}
            </SlideOverDrawer>
        </AdminLayout>
    );
}

const ReviewContent = ({ selectedFlag, handleAction, onClose, isMobile = false }) => {
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className={`p-4 sm:p-6 border-b border-stone-100 shrink-0 ${isMobile ? 'bg-white' : 'bg-stone-50/30'}`}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        {!isMobile && <h2 className="text-xl font-bold text-stone-900 tracking-tight mb-1">Ticket #{selectedFlag.id}</h2>}
                        <p className="text-xs sm:text-sm text-stone-500">Reported by <span className="font-bold text-stone-700">{selectedFlag.reporter?.name || 'Unknown User'}</span></p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-800 border border-amber-200">
                        <AlertTriangle size={10} className="sm:w-3 sm:h-3" /> Pending Review
                    </span>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-xl border border-stone-200 shadow-sm">
                    <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Report Reason</h4>
                    <p className="text-xs sm:text-sm font-medium text-stone-800 leading-relaxed">"{selectedFlag.reason}"</p>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FDFBF9] no-scrollbar">
                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-4">Reported Content Details</h4>
                {selectedFlag.reportable ? (
                    <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5 shadow-sm">
                        <div className={`flex ${isMobile ? 'flex-col' : 'items-start'} gap-4`}>
                            {selectedFlag.reportable_type.includes('Product') && selectedFlag.reportable.cover_photo_path && (
                                <img src={`/storage/${selectedFlag.reportable.cover_photo_path}`} alt="Product" className={`${isMobile ? 'w-full h-48' : 'w-24 h-24'} object-cover rounded-lg border border-stone-100`} />
                            )}
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                                            {selectedFlag.reportable_type.split('\\').pop()}
                                        </span>
                                        <h3 className="text-base sm:text-lg font-bold text-stone-900">{selectedFlag.reportable.name || selectedFlag.reportable.title}</h3>
                                    </div>
                                    {selectedFlag.reportable_type.includes('Product') && (
                                        <Link href={route('product.show', selectedFlag.reportable.slug || selectedFlag.reportable.id)} target="_blank" className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-100 text-stone-600 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-stone-200 transition">
                                            <Eye size={14} /> <span className="hidden sm:inline">View Live</span>
                                        </Link>
                                    )}
                                </div>
                                {selectedFlag.reportable_type.includes('Product') && (
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

            <div className={`p-4 border-t border-stone-100 bg-stone-50 shrink-0 flex ${isMobile ? 'flex-col' : 'items-center justify-between'} gap-3`}>
                <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
                    <button 
                        onClick={() => handleAction(selectedFlag.id, 'dismiss')}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-stone-200 text-stone-600 rounded-xl font-bold text-xs hover:bg-stone-50 hover:text-stone-900 transition-colors shadow-sm ${isMobile ? 'w-full' : ''}`}
                    >
                        <X size={14} /> Dismiss (False Alarm)
                    </button>
                </div>
                <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
                    <button 
                        onClick={() => handleAction(selectedFlag.id, 'takedown')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-[11px] sm:text-xs hover:bg-amber-700 transition shadow-sm active:scale-95"
                    >
                        <ShieldOff size={14} /> Takedown
                    </button>
                    <button 
                        onClick={() => handleAction(selectedFlag.id, 'suspend')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold text-[11px] sm:text-xs hover:bg-red-700 transition shadow-sm active:scale-95"
                    >
                        <UserX size={14} /> Suspend User
                    </button>
                </div>
            </div>
        </div>
    );
};
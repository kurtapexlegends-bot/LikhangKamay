/* global route */
import React, { useState, useMemo, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { useToast } from '@/Components/ToastContext';
import DisputeInspectorContent from '@/Components/Admin/Disputes/DisputeInspectorContent';
import DisputeLightboxModal from '@/Components/Admin/Disputes/DisputeLightboxModal';
import ArbitrationConfirmModal from '@/Components/Admin/Disputes/ArbitrationConfirmModal';
import {
    ShieldAlert, 
    CheckCircle2, 
    Search, 
    X, 
    Camera
} from 'lucide-react';

export default function DisputeEscalationDashboard({ disputes = [] }) {
    const { addToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState(disputes.length > 0 ? disputes[0].id : null);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showMobileDetail, setShowMobileDetail] = useState(false);

    // Deep-linking from Global Search or Direct Links
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const search = params.get('search');
        if (search) {
            setSearchQuery(search);
            const match = disputes.find(d => 
                String(d.id) === String(search) || 
                String(d.order?.order_number || '').toLowerCase().includes(search.toLowerCase())
            );
            if (match) {
                setSelectedId(match.id);
            }
        }
    }, [disputes]);

    // Lightbox Modal State
    const [lightboxState, setLightboxState] = useState({ open: false, photos: [], currentIndex: 0 });

    // Arbitration Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState({ open: false, decision: null });

    // Filtered Disputes
    const filteredDisputes = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return disputes;

        return disputes.filter(d => {
            const orderNum = String(d.order?.order_number || d.order_id || '').toLowerCase();
            const buyerName = String(d.order?.user?.name || d.order?.customer_name || '').toLowerCase();
            const shopName = String(d.order?.artisan?.shop_name || d.order?.artisan?.name || '').toLowerCase();
            const reason = String(d.reason || '').toLowerCase();
            const escalationReason = String(d.escalation_reason || '').toLowerCase();
            const disputeId = String(d.id || '');

            return (
                orderNum.includes(query) ||
                buyerName.includes(query) ||
                shopName.includes(query) ||
                reason.includes(query) ||
                escalationReason.includes(query) ||
                disputeId.includes(query)
            );
        });
    }, [disputes, searchQuery]);

    // Active Dispute
    const selectedDispute = useMemo(() => {
        if (!selectedId) return filteredDisputes[0] || null;
        return disputes.find(d => d.id === selectedId) || filteredDisputes[0] || null;
    }, [disputes, selectedId, filteredDisputes]);

    const handleSelectDispute = (dispute) => {
        setSelectedId(dispute.id);
        setNotes('');
        setError('');
    };

    const openConfirmModal = (decision) => {
        if (!selectedDispute) return;
        if (!notes.trim()) {
            setError('Please provide resolution notes explaining your decision.');
            return;
        }
        setError('');
        setConfirmModal({ open: true, decision });
    };

    const executeArbitration = () => {
        if (!selectedDispute || !confirmModal.decision) return;

        const decision = confirmModal.decision;
        setIsSubmitting(true);
        setError('');

        router.post(
            route('admin.disputes.arbitrate', selectedDispute.id),
            {
                decision,
                admin_notes: notes.trim(),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    addToast(
                        `Dispute resolved: ${decision === 'refund' ? 'Full Refund Approved' : 'Funds Released to Seller'}.`, 
                        'success'
                    );
                    setNotes('');
                    setConfirmModal({ open: false, decision: null });

                    // Select next available dispute
                    const remaining = disputes.filter(d => d.id !== selectedDispute.id);
                    if (remaining.length > 0) {
                        setSelectedId(remaining[0].id);
                    } else {
                        setSelectedId(null);
                    }
                },
                onError: (errs) => {
                    setError(errs.message || errs.admin_notes || 'Failed to submit dispute resolution.');
                    setConfirmModal({ open: false, decision: null });
                },
                onFinish: () => {
                    setIsSubmitting(false);
                }
            }
        );
    };

    const openLightbox = (photos, index = 0) => {
        setLightboxState({ open: true, photos, currentIndex: index });
    };

    const nextPhoto = () => {
        setLightboxState(prev => ({
            ...prev,
            currentIndex: (prev.currentIndex + 1) % prev.photos.length
        }));
    };

    const prevPhoto = () => {
        setLightboxState(prev => ({
            ...prev,
            currentIndex: (prev.currentIndex - 1 + prev.photos.length) % prev.photos.length
        }));
    };

    return (
        <>
            <Head title="Order Dispute Resolution" />

            <div className="flex flex-col lg:h-[calc(100vh-140px)] min-h-[640px]">
                {disputes.length === 0 ? (
                    <WorkspaceEmptyState
                        icon={CheckCircle2}
                        title="All Disputes Resolved"
                        description="There are currently no active order disputes requiring platform review."
                    />
                ) : (
                    <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0 overflow-hidden">
                        {/* LEFT COLUMN: Queue List */}
                        <div className={`w-full lg:w-[380px] xl:w-[420px] bg-white border border-stone-200/80 rounded-2xl shadow-2xs flex flex-col overflow-hidden ${selectedDispute ? 'hidden lg:flex' : 'flex'} h-full shrink-0`}>
                            {/* Queue Header */}
                            <div className="p-4 border-b border-stone-100 bg-[#FCFBF9] shrink-0 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60">
                                            <ShieldAlert size={14} />
                                        </div>
                                        <h3 className="font-bold text-stone-900 text-xs sm:text-sm">
                                            Active Disputes
                                        </h3>
                                        <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                                            {filteredDisputes.length}
                                        </span>
                                    </div>
                                </div>

                                {/* Search Input */}
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={13} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search order #, customer, shop, or reason..."
                                        className="w-full rounded-xl border border-stone-200 bg-white py-1.5 pl-8 pr-8 text-xs font-medium text-stone-900 placeholder-stone-400 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 shadow-2xs h-[36px]"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Disputes Queue Items */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {filteredDisputes.length === 0 ? (
                                    <div className="p-10 text-center">
                                        <CheckCircle2 size={28} className="mx-auto mb-2 text-stone-300" />
                                        <p className="font-bold text-stone-800 text-xs">No matching disputes found.</p>
                                        <p className="text-[11px] text-stone-400 mt-1">Try clearing your search query.</p>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-stone-100">
                                        {filteredDisputes.map((dispute) => {
                                            const isActive = dispute.id === selectedDispute?.id;
                                            const buyerName = dispute.order?.user?.name || dispute.order?.customer_name || 'Buyer';
                                            const shopName = dispute.order?.artisan?.shop_name || dispute.order?.artisan?.name || 'Artisan Shop';
                                            const totalAmount = dispute.order?.total_amount ? Number(dispute.order.total_amount) : 0;
                                            const photoCount = Array.isArray(dispute.proof_photos) ? dispute.proof_photos.length : 0;

                                            return (
                                                <li key={dispute.id} className="relative overflow-hidden group">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectDispute(dispute)}
                                                        className={`w-full text-left p-3.5 transition-all cursor-pointer ${
                                                            isActive
                                                                ? 'bg-clay-50/60 border-l-4 border-l-clay-700 pl-3'
                                                                : 'bg-white hover:bg-stone-50/70 border-l-4 border-l-transparent'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-center mb-1.5 gap-2">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-mono text-[10px] font-black text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200/60">
                                                                    Order #{dispute.order?.order_number || dispute.order_id}
                                                                </span>
                                                                {totalAmount > 0 && (
                                                                    <span className="font-mono text-[10px] font-bold text-stone-900 bg-white border border-stone-200 px-1.5 py-0.5 rounded">
                                                                        ₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <span className="text-[10px] font-medium text-stone-400 shrink-0">
                                                                {dispute.updated_at ? new Date(dispute.updated_at).toLocaleDateString() : ''}
                                                            </span>
                                                        </div>

                                                        <p className="text-xs font-bold text-stone-900 truncate mt-1">
                                                            {buyerName} <span className="text-stone-400 font-normal">vs</span> {shopName}
                                                        </p>

                                                        <p className="text-[11px] text-stone-600 mt-1 line-clamp-1 leading-relaxed">
                                                            &ldquo;{dispute.reason}&rdquo;
                                                        </p>

                                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 text-[10px] text-stone-400">
                                                            <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                                Under Review
                                                            </span>

                                                            <div className="flex items-center gap-2">
                                                                {photoCount > 0 && (
                                                                    <span className="inline-flex items-center gap-0.5 text-stone-500 font-medium">
                                                                        <Camera size={10} />
                                                                        {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                                                                    </span>
                                                                )}
                                                                <span className="font-mono text-[9px]">Dispute #{dispute.id}</span>
                                                            </div>
                                                        </div>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Case Detail & Arbitration Inspector */}
                        <div className={`w-full lg:flex-1 min-w-0 bg-white border border-stone-200/80 rounded-2xl shadow-2xs flex flex-col overflow-hidden h-full ${selectedDispute ? 'flex' : 'hidden lg:flex'}`}>
                            {selectedDispute ? (
                                <DisputeInspectorContent 
                                    dispute={selectedDispute}
                                    notes={notes}
                                    setNotes={setNotes}
                                    error={error}
                                    setError={setError}
                                    isSubmitting={isSubmitting}
                                    openConfirmModal={openConfirmModal}
                                    openLightbox={openLightbox}
                                    onBack={() => setSelectedId(null)}
                                />
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-[#FAF9F6]/50">
                                    <div className="w-14 h-14 bg-white border border-stone-200 rounded-2xl flex items-center justify-center mb-3 shadow-2xs text-stone-300">
                                        <ShieldAlert size={24} />
                                    </div>
                                    <h3 className="text-sm font-bold text-stone-900 mb-1">Select an Active Dispute</h3>
                                    <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
                                        Choose a dispute from the queue to examine the buyer request, artisan response, and resolve the order.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Photo Lightbox Modal */}
            <DisputeLightboxModal
                isOpen={lightboxState.open}
                onClose={() => setLightboxState(prev => ({ ...prev, open: false }))}
                photos={lightboxState.photos}
                currentIndex={lightboxState.currentIndex}
                onNext={nextPhoto}
                onPrev={prevPhoto}
            />

            {/* Arbitration Confirmation Modal */}
            <ArbitrationConfirmModal
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal({ open: false, decision: null })}
                decision={confirmModal.decision}
                dispute={selectedDispute}
                isSubmitting={isSubmitting}
                onConfirm={executeArbitration}
            />
        </>
    );
}

DisputeEscalationDashboard.layout = (page) => (
    <AdminLayout title="Order Disputes">{page}</AdminLayout>
);


/* global route */
import React, { useState, useEffect, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import ConfirmationModal from '@/Components/ConfirmationModal';
import { useToast } from '@/Components/ToastContext';
import { 
    ShieldAlert, 
    MessageSquare, 
    AlertTriangle, 
    Clock, 
    CheckCircle2, 
    Package, 
    UserX,
    ShieldOff,
    ShieldCheck
} from 'lucide-react';

import ReportedItemsInbox from '@/Components/Admin/Compliance/ReportedItemsInbox';
import ReportDetailsCard from '@/Components/Admin/Compliance/ReportDetailsCard';
import ModerationActionModal from '@/Components/Admin/Compliance/ModerationActionModal';

export default function ContentSafety({ flags, disputes = [], defaultFilter = 'active' }) {
    const { addToast } = useToast();

    // ----------------------------------------------------
    // UNIFIED TICKETS MODEL (Flags + Review Disputes)
    // ----------------------------------------------------
    const unifiedTickets = useMemo(() => {
        const flagTickets = (flags.data || []).map(flag => ({
            id: `flag-${flag.id}`,
            ticketType: 'flag',
            rawId: flag.id,
            targetType: flag.reportable_type ? flag.reportable_type.split('\\').pop() : 'Content',
            title: flag.reportable ? (flag.reportable.name || flag.reportable.title || `Item #${flag.reportable_id}`) : 'Content Deleted',
            reason: flag.reason,
            reporterName: flag.reporter?.name || 'Anonymous User',
            createdAt: flag.created_at,
            status: flag.status, // 'pending' | 'resolved' | 'dismissed'
            raw: flag,
        }));

        const disputeTickets = disputes.map(dispute => ({
            id: `dispute-${dispute.id}`,
            ticketType: 'dispute',
            rawId: dispute.id,
            targetType: 'Review',
            title: `${dispute.shop_name} · ${dispute.product_name || 'Review'}`,
            productName: dispute.product_name,
            shopName: dispute.shop_name,
            reason: dispute.reason,
            details: dispute.details,
            reviewComment: dispute.review_comment,
            rating: Number(dispute.review_rating || 0),
            resolutionNotes: dispute.resolution_notes,
            reporterName: dispute.reported_by,
            createdAt: dispute.reported_at,
            resolvedAt: dispute.resolved_at,
            status: dispute.status, // 'pending' | 'under_review' | 'resolved' | 'rejected'
            reviewHidden: dispute.review_hidden_from_marketplace,
            raw: dispute,
        }));

        // Combine and sort by createdAt descending
        return [...flagTickets, ...disputeTickets].sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
        });
    }, [flags.data, disputes]);

    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [confirmingFlagAction, setConfirmingFlagAction] = useState({ id: null, action: null });
    const [isMobile, setIsMobile] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    // Deep-linking: auto-select ticket when navigated from Global Search
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const search = params.get('search');
        if (search) {
            const found = unifiedTickets.find(t => 
                String(t.rawId) === String(search) || 
                t.title?.toLowerCase().includes(search.toLowerCase()) ||
                t.reason?.toLowerCase().includes(search.toLowerCase())
            );
            if (found) {
                setSelectedTicketId(found.id);
            }
        }
    }, [unifiedTickets]);

    // Track active selected ticket object from unified list
    const selectedTicket = useMemo(() => {
        if (!selectedTicketId) return unifiedTickets[0] || null;
        return unifiedTickets.find(t => t.id === selectedTicketId) || unifiedTickets[0] || null;
    }, [unifiedTickets, selectedTicketId]);

    useEffect(() => {
        const unbindStart = router.on('start', () => setIsNavigating(true));
        const unbindFinish = router.on('finish', () => setIsNavigating(false));
        return () => { unbindStart(); unbindFinish(); };
    }, []);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ----------------------------------------------------
    // CONTENT FLAG ACTIONS (Dismiss / Takedown / Suspend)
    // ----------------------------------------------------
    const handleFlagAction = (id, action) => {
        if (action === 'dismiss') {
            submitFlagAction(id, action);
        } else {
            setConfirmingFlagAction({ id, action });
        }
    };

    const submitFlagAction = (id, action) => {
        router.post(route(`admin.moderation.${action}`, id), {}, { 
            preserveScroll: true,
            onSuccess: () => {
                setConfirmingFlagAction({ id: null, action: null });
                addToast('Moderation action applied successfully.', 'success');
            }
        });
    };

    // ----------------------------------------------------
    // REVIEW DISPUTE ACTIONS (Review / Approve / Reject / Delete)
    // ----------------------------------------------------
    const [disputeModalState, setDisputeModalState] = useState({ open: false, dispute: null, status: 'under_review' });
    const [disputeDeleteState, setDisputeDeleteState] = useState({ open: false, dispute: null });
    const [disputeResolutionNotes, setDisputeResolutionNotes] = useState('');
    const [disputeProcessing, setDisputeProcessing] = useState(false);

    const openDisputeActionModal = (dispute, status) => {
        setDisputeModalState({ open: true, dispute, status });
        setDisputeResolutionNotes(dispute?.resolution_notes || '');
    };

    const closeDisputeActionModal = () => {
        if (disputeProcessing) return;
        setDisputeModalState({ open: false, dispute: null, status: 'under_review' });
    };

    const submitDisputeUpdate = () => {
        if (!disputeModalState.dispute) return;
        setDisputeProcessing(true);
        router.patch(route('admin.review-moderation.update', disputeModalState.dispute.id), {
            status: disputeModalState.status,
            resolution_notes: disputeResolutionNotes,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                addToast(
                    disputeModalState.status === 'resolved'
                        ? 'Request approved. The review is now hidden from the marketplace.'
                        : disputeModalState.status === 'rejected'
                            ? 'Request rejected. The review remains visible.'
                            : 'Moderation request moved into active review.',
                    'success'
                );
                setDisputeModalState({ open: false, dispute: null, status: 'under_review' });
                setDisputeResolutionNotes('');
            },
            onError: (errors) => {
                addToast(errors.resolution_notes || errors.status || 'Failed to save moderation decision.', 'error');
            },
            onFinish: () => setDisputeProcessing(false),
        });
    };

    const submitDisputeDelete = () => {
        if (!disputeDeleteState.dispute) return;
        setDisputeProcessing(true);
        router.delete(route('admin.review-moderation.destroy', disputeDeleteState.dispute.id), {
            preserveScroll: true,
            onSuccess: () => {
                addToast('Review dispute record removed.', 'success');
                setDisputeDeleteState({ open: false, dispute: null });
            },
            onError: () => {
                addToast('Failed to remove review dispute record.', 'error');
            },
            onFinish: () => setDisputeProcessing(false),
        });
    };

    return (
        <>
            <Head title="Content Safety & Moderation" />

            <div className="flex flex-col lg:h-[calc(100vh-140px)] min-h-[640px]">
                {/* Unified Master-Detail Console (Viewport Locked) */}
                <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0 overflow-hidden">
                    {/* Left: Unified Inbox */}
                    <ReportedItemsInbox 
                        tickets={unifiedTickets}
                        selectedTicket={selectedTicket}
                        setSelectedTicket={(ticket) => setSelectedTicketId(ticket?.id || null)}
                        handleFlagAction={handleFlagAction}
                        isNavigating={isNavigating}
                        flagsPagination={flags}
                    />

                    {/* Right: Rich Context-Aware Inspector & Action Card */}
                    <div className="hidden lg:flex flex-1 bg-white border border-stone-200/80 rounded-2xl shadow-2xs flex-col overflow-hidden h-full">
                        {selectedTicket ? (
                            <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl">
                                <ReportDetailsCard 
                                    selectedTicket={selectedTicket} 
                                    handleFlagAction={handleFlagAction}
                                    openDisputeActionModal={openDisputeActionModal}
                                    setDisputeDeleteState={setDisputeDeleteState}
                                    onClose={() => setSelectedTicketId(null)} 
                                />
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-[#FAF9F6]/50">
                                <div className="w-14 h-14 bg-white border border-stone-200 rounded-2xl flex items-center justify-center mb-3 shadow-2xs text-stone-300">
                                    <ShieldAlert size={24} />
                                </div>
                                <h3 className="text-sm font-bold text-stone-900 mb-1">Select a Moderation Ticket</h3>
                                <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
                                    Select a ticket from the inbox to inspect evidence, preview live content, and enforce disciplinary actions.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Mobile Detail Drawer */}
                    <SlideOverDrawer
                        show={!!selectedTicket && isMobile}
                        onClose={() => setSelectedTicketId(null)}
                        title={`Ticket #${selectedTicket?.rawId}`}
                        widthClass="max-w-xl"
                        className="lg:hidden"
                        bodyClassName="relative flex-1 overflow-hidden"
                    >
                        {selectedTicket && (
                            <div className="h-full">
                                <ReportDetailsCard 
                                    selectedTicket={selectedTicket} 
                                    handleFlagAction={handleFlagAction}
                                    openDisputeActionModal={openDisputeActionModal}
                                    setDisputeDeleteState={setDisputeDeleteState}
                                    onClose={() => setSelectedTicketId(null)}
                                    isMobile={true}
                                />
                            </div>
                        )}
                    </SlideOverDrawer>
                </div>

                {/* Dispute Status Decision & Delete Modal */}
                <ModerationActionModal 
                    isMobile={isMobile}
                    disputeModalState={disputeModalState}
                    closeDisputeActionModal={closeDisputeActionModal}
                    disputeResolutionNotes={disputeResolutionNotes}
                    setDisputeResolutionNotes={setDisputeResolutionNotes}
                    disputeProcessing={disputeProcessing}
                    submitDisputeUpdate={submitDisputeUpdate}
                    disputeDeleteState={disputeDeleteState}
                    setDisputeDeleteState={setDisputeDeleteState}
                    submitDisputeDelete={submitDisputeDelete}
                />

                {/* Flag Confirmation Dialog (Takedown Listing or Suspend User) */}
                <ConfirmationModal
                    isOpen={confirmingFlagAction.id !== null}
                    onClose={() => setConfirmingFlagAction({ id: null, action: null })}
                    onConfirm={() => submitFlagAction(confirmingFlagAction.id, confirmingFlagAction.action)}
                    title={confirmingFlagAction.action === 'suspend' ? 'Suspend User Account?' : 'Take Down Product Listing?'}
                    message={confirmingFlagAction.action === 'suspend' 
                        ? 'Are you sure you want to suspend this user account? This will block platform access and reject seller permissions.' 
                        : 'Are you sure you want to take down this product listing? It will immediately be hidden from the marketplace.'}
                    icon={confirmingFlagAction.action === 'suspend' ? UserX : ShieldOff}
                    iconBg={confirmingFlagAction.action === 'suspend' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}
                    confirmText={confirmingFlagAction.action === 'suspend' ? 'Suspend User' : 'Take Down Listing'}
                    confirmColor={confirmingFlagAction.action === 'suspend' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'}
                    isVeryHighRisk={confirmingFlagAction.action === 'suspend'}
                    isHighRisk={confirmingFlagAction.action === 'takedown'}
                />
            </div>
        </>
    );
}

ContentSafety.layout = (page) => (
    <AdminLayout title="Content Safety & Moderation">{page}</AdminLayout>
);


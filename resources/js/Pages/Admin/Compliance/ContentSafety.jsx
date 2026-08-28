/* global route */
import React, { useState, useEffect, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '@/Layouts/AdminLayout';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import ConfirmationModal from '@/Components/ConfirmationModal';
import { useToast } from '@/Components/ToastContext';
import { 
    ShieldAlert, 
    MessageSquare, 
    RotateCcw, 
    AlertTriangle, 
    Clock, 
    CheckCircle2, 
    Trash2, 
    Package, 
    FolderTree, 
    ShoppingBag,
    UserX,
    ShieldOff
} from 'lucide-react';

import ContentSafetyKPIs from '@/Components/Admin/Compliance/ContentSafetyKPIs';
import ReportedItemsInbox from '@/Components/Admin/Compliance/ReportedItemsInbox';
import ReportDetailsCard from '@/Components/Admin/Compliance/ReportDetailsCard';
import DisputesConsole from '@/Components/Admin/Compliance/DisputesConsole';
import TrashRestorationTable from '@/Components/Admin/Compliance/TrashRestorationTable';
import ModerationActionModal from '@/Components/Admin/Compliance/ModerationActionModal';

export default function ContentSafety({ flags, disputes = [], trashQueue = [], trashStats, defaultTab = 'flags' }) {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState(defaultTab || 'flags');
    const [prevDefaultTab, setPrevDefaultTab] = useState(defaultTab);

    if (defaultTab !== prevDefaultTab) {
        setPrevDefaultTab(defaultTab);
        setActiveTab(defaultTab || 'flags');
    }

    // ----------------------------------------------------
    // TAB 1: FLAGGED CONTENT (MODERATION QUEUE) STATES
    // ----------------------------------------------------
    const [selectedFlag, setSelectedFlag] = useState(null);
    const [confirmingFlagAction, setConfirmingFlagAction] = useState({ id: null, action: null });
    const [isMobile, setIsMobile] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

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

    const flagsKPIs = useMemo(() => {
        const total = flags.total || 0;
        const productsCount = (flags.data || []).filter(f => (f.reportable_type || '').includes('Product')).length;
        const usersCount = (flags.data || []).filter(f => (f.reportable_type || '').includes('User')).length;

        return [
            { title: "Pending Reports", value: total, icon: ShieldAlert, color: "text-amber-600", bg: "bg-amber-50", subtitle: "Requires staff review" },
            { title: "Flagged Products", value: productsCount, icon: Package, color: "text-clay-700", bg: "bg-clay-50", subtitle: "Listing violation reports" },
            { title: "Flagged Accounts", value: usersCount, icon: UserX, color: "text-rose-600", bg: "bg-rose-50", subtitle: "Account violation reports" },
            { title: "Queue Health", value: total === 0 ? "Clean" : `${total} Queued`, icon: CheckCircle2, color: total === 0 ? "text-emerald-600" : "text-sky-600", bg: total === 0 ? "bg-emerald-50" : "bg-sky-50", subtitle: "Active queue state" }
        ];
    }, [flags]);

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
                setSelectedFlag(null);
                setConfirmingFlagAction({ id: null, action: null });
                addToast('Flag status updated successfully.', 'success');
            }
        });
    };

    // ----------------------------------------------------
    // TAB 2: REVIEW DISPUTES STATES & HANDLERS
    // ----------------------------------------------------
    const [disputeModalState, setDisputeModalState] = useState({ open: false, dispute: null, status: 'under_review' });
    const [disputeDeleteState, setDisputeDeleteState] = useState({ open: false, dispute: null });
    const [disputeResolutionNotes, setDisputeResolutionNotes] = useState('');
    const [disputeProcessing, setDisputeProcessing] = useState(false);

    const disputeKPIs = useMemo(() => [
        { title: "Total Disputes", value: disputes.length, icon: MessageSquare, color: "text-stone-700", bg: "bg-stone-50", subtitle: "All recorded disputes" },
        { title: "Pending Review", value: disputes.filter((item) => item.status === 'pending').length, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", subtitle: "Awaiting initial check" },
        { title: "Under Review", value: disputes.filter((item) => item.status === 'under_review').length, icon: Clock, color: "text-sky-600", bg: "bg-sky-50", subtitle: "Active staff investigation" },
        { title: "Closed Disputes", value: disputes.filter((item) => ['resolved', 'rejected'].includes(item.status)).length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", subtitle: "Arbitrated & closed" }
    ], [disputes]);

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
                addToast('Moderation request removed.', 'success');
                setDisputeDeleteState({ open: false, dispute: null });
            },
            onError: () => {
                addToast('Failed to remove moderation request.', 'error');
            },
            onFinish: () => setDisputeProcessing(false),
        });
    };

    // ----------------------------------------------------
    // TAB 3: RESTORATION CENTER (TRASH) STATES & HANDLERS
    // ----------------------------------------------------
    const [confirmingRestore, setConfirmingRestore] = useState(null);
    const [confirmingDelete, setConfirmingDelete] = useState(null);

    const trashKPIs = useMemo(() => [
        { title: "Total Trash Items", value: trashStats?.totalItems || 0, icon: Trash2, color: "text-stone-700", bg: "bg-stone-50", subtitle: "Within 30-day retention" },
        { title: "Deleted Products", value: trashStats?.products || 0, icon: Package, color: "text-clay-700", bg: "bg-clay-50", subtitle: "Soft-deleted listings" },
        { title: "Deleted Categories", value: trashStats?.categories || 0, icon: FolderTree, color: "text-indigo-600", bg: "bg-indigo-50", subtitle: "Soft-deleted categories" },
        { title: "Deleted Orders", value: trashStats?.orders || 0, icon: ShoppingBag, color: "text-amber-600", bg: "bg-amber-50", subtitle: "Soft-deleted order entries" }
    ], [trashStats]);

    const handleRestore = () => {
        if (!confirmingRestore) return;
        router.post(route('admin.trash.restore'), {
            id: confirmingRestore.id,
            type: confirmingRestore.type
        }, {
            onSuccess: () => addToast(`${confirmingRestore.type} restored successfully.`, 'success'),
            onFinish: () => setConfirmingRestore(null)
        });
    };

    const handlePermanentDelete = () => {
        if (!confirmingDelete) return;
        router.post(route('admin.trash.permanent-delete'), {
            id: confirmingDelete.id,
            type: confirmingDelete.type
        }, {
            onSuccess: () => addToast(`${confirmingDelete.type} permanently deleted.`, 'success'),
            onFinish: () => setConfirmingDelete(null)
        });
    };

    // ----------------------------------------------------
    // TAB CONTROLLER
    // ----------------------------------------------------
    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tabName);
        window.history.replaceState(null, '', url.toString());
    };

    return (
        <>
            <Head title="Content Safety & Governance" />

            <div className="space-y-6">
                {/* Top Workspace Header with Segmented Navigation Tabs */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs">
                    <div>
                        <h1 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                            Content Safety & Governance
                        </h1>
                        <p className="text-xs text-stone-500 font-medium mt-0.5">
                            Monitor community reports, arbitrate seller review disputes, and restore soft-deleted items.
                        </p>
                    </div>

                    {/* Segmented Navigation Tabs */}
                    <div className="flex items-center gap-1.5 p-1 bg-stone-100/80 rounded-xl border border-stone-200/60 overflow-x-auto scrollbar-hide shrink-0">
                        <button
                            type="button"
                            onClick={() => handleTabChange('flags')}
                            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                activeTab === 'flags'
                                    ? 'bg-white text-stone-900 shadow-2xs'
                                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                            }`}
                        >
                            <ShieldAlert size={14} className={activeTab === 'flags' ? 'text-amber-600' : 'text-stone-400'} />
                            <span>Report Queue</span>
                            {flags.total > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                    activeTab === 'flags' ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-600'
                                }`}>
                                    {flags.total}
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => handleTabChange('disputes')}
                            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                activeTab === 'disputes'
                                    ? 'bg-white text-stone-900 shadow-2xs'
                                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                            }`}
                        >
                            <MessageSquare size={14} className={activeTab === 'disputes' ? 'text-clay-700' : 'text-stone-400'} />
                            <span>Review Disputes</span>
                            {disputes.length > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                    activeTab === 'disputes' ? 'bg-clay-100 text-clay-800' : 'bg-stone-200 text-stone-600'
                                }`}>
                                    {disputes.length}
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => handleTabChange('trash')}
                            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                activeTab === 'trash'
                                    ? 'bg-white text-stone-900 shadow-2xs'
                                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                            }`}
                        >
                            <RotateCcw size={14} className={activeTab === 'trash' ? 'text-indigo-600' : 'text-stone-400'} />
                            <span>Restoration Center</span>
                            {trashStats?.totalItems > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                    activeTab === 'trash' ? 'bg-indigo-100 text-indigo-800' : 'bg-stone-200 text-stone-600'
                                }`}>
                                    {trashStats.totalItems}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Tab Views */}
                <div className="min-h-[50vh]">
                    <AnimatePresence mode="wait">
                        {/* TAB 1: REPORT QUEUE */}
                        {activeTab === 'flags' && (
                            <motion.div
                                key="flags"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                <ContentSafetyKPIs items={flagsKPIs} />

                                <div className="flex flex-col lg:flex-row gap-5 h-auto lg:h-[calc(100vh-320px)] min-h-[520px]">
                                    <ReportedItemsInbox 
                                        flags={flags}
                                        selectedFlag={selectedFlag}
                                        setSelectedFlag={setSelectedFlag}
                                        handleFlagAction={handleFlagAction}
                                        isNavigating={isNavigating}
                                    />

                                    {/* Right Column: Flag Details View */}
                                    <div className="hidden lg:flex flex-1 bg-white border border-stone-200/80 rounded-2xl shadow-2xs flex-col overflow-hidden h-full">
                                        {selectedFlag ? (
                                            <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl">
                                                <ReportDetailsCard 
                                                    selectedFlag={selectedFlag} 
                                                    handleAction={handleFlagAction} 
                                                    onClose={() => setSelectedFlag(null)} 
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-[#FAF9F6]/50">
                                                <div className="w-14 h-14 bg-white border border-stone-200 rounded-2xl flex items-center justify-center mb-3 shadow-2xs text-stone-300">
                                                    <ShieldAlert size={24} />
                                                </div>
                                                <h3 className="text-sm font-bold text-stone-900 mb-1">Select a Report Ticket</h3>
                                                <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
                                                    Select a ticket from the left queue to inspect violation details, preview live content, and enforce disciplinary actions.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Mobile Detail Drawer */}
                                    <SlideOverDrawer
                                        show={!!selectedFlag && isMobile}
                                        onClose={() => setSelectedFlag(null)}
                                        title={`Ticket #${selectedFlag?.id}`}
                                        widthClass="max-w-xl"
                                        className="lg:hidden"
                                        bodyClassName="relative flex-1 overflow-hidden"
                                    >
                                        {selectedFlag && (
                                            <div className="h-full">
                                                <ReportDetailsCard 
                                                    selectedFlag={selectedFlag} 
                                                    handleAction={handleFlagAction} 
                                                    onClose={() => setSelectedFlag(null)}
                                                    isMobile={true}
                                                />
                                            </div>
                                        )}
                                    </SlideOverDrawer>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 2: REVIEW DISPUTES */}
                        {activeTab === 'disputes' && (
                            <motion.div
                                key="disputes"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                <ContentSafetyKPIs items={disputeKPIs} />

                                <DisputesConsole 
                                    disputes={disputes}
                                    openDisputeActionModal={openDisputeActionModal}
                                    setDisputeDeleteState={setDisputeDeleteState}
                                />

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
                            </motion.div>
                        )}

                        {/* TAB 3: RESTORATION CENTER (TRASH) */}
                        {activeTab === 'trash' && (
                            <motion.div
                                key="trash"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                <ContentSafetyKPIs items={trashKPIs} />

                                <TrashRestorationTable 
                                    trashQueue={trashQueue}
                                    setConfirmingRestore={setConfirmingRestore}
                                    setConfirmingDelete={setConfirmingDelete}
                                />

                                <ConfirmationModal 
                                    isOpen={!!confirmingRestore}
                                    onClose={() => setConfirmingRestore(null)}
                                    onConfirm={handleRestore}
                                    title={`Restore ${confirmingRestore?.type}?`}
                                    message={`This will return "${confirmingRestore?.name}" to the active database. It will be visible to users again.`}
                                    icon={RotateCcw}
                                    iconBg="bg-indigo-50 text-indigo-700"
                                    confirmText="Restore Item"
                                    confirmColor="bg-indigo-600 hover:bg-indigo-700"
                                />

                                <ConfirmationModal 
                                    isOpen={!!confirmingDelete}
                                    onClose={() => setConfirmingDelete(null)}
                                    onConfirm={handlePermanentDelete}
                                    title="Permanent Deletion"
                                    message={`Are you absolutely sure? This will permanently erase "${confirmingDelete?.name}" from the system. This action CANNOT be undone.`}
                                    icon={AlertTriangle}
                                    iconBg="bg-rose-50 text-rose-700"
                                    confirmText="Permanently Delete"
                                    confirmColor="bg-rose-600 hover:bg-rose-700"
                                    isVeryHighRisk={true}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Root-Level Confirmation Modal for Content Flag Actions */}
                <ConfirmationModal
                    isOpen={confirmingFlagAction.id !== null}
                    onClose={() => setConfirmingFlagAction({ id: null, action: null })}
                    onConfirm={() => submitFlagAction(confirmingFlagAction.id, confirmingFlagAction.action)}
                    title={confirmingFlagAction.action === 'suspend' ? 'Suspend User Account?' : 'Take Down Product Listing?'}
                    message={confirmingFlagAction.action === 'suspend' 
                        ? 'Are you sure you want to suspend this user account? This will block platform access and reject seller shop permissions.' 
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
    <AdminLayout title="Content Safety & Governance">{page}</AdminLayout>
);

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
    ShoppingBag 
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

    const handleFlagAction = (id, action) => {
        router.post(route(`admin.moderation.${action}`, id), {}, { 
            preserveScroll: true,
            onSuccess: () => {
                setSelectedFlag(null);
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
        { title: "Total Disputes", value: disputes.length, icon: MessageSquare, color: "text-stone-600" },
        { title: "Pending Review", value: disputes.filter((item) => item.status === 'pending').length, icon: AlertTriangle, color: "text-amber-600" },
        { title: "Under Review", value: disputes.filter((item) => item.status === 'under_review').length, icon: Clock, color: "text-blue-600" },
        { title: "Closed Disputes", value: disputes.filter((item) => ['resolved', 'rejected'].includes(item.status)).length, icon: CheckCircle2, color: "text-emerald-600" }
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
        { title: "Total Trash", value: trashStats?.totalItems || 0, icon: Trash2, color: "text-stone-600" },
        { title: "Deleted Products", value: trashStats?.products || 0, icon: Package, color: "text-clay-600" },
        { title: "Deleted Categories", value: trashStats?.categories || 0, icon: FolderTree, color: "text-indigo-600" },
        { title: "Deleted Orders", value: trashStats?.orders || 0, icon: ShoppingBag, color: "text-amber-600" }
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
            <Head title="Content Safety" />

            <div className="space-y-6">
                {/* --- HEADER TABS NAVIGATION --- */}
                <div className="border-b border-stone-200/80 bg-white rounded-t-2xl shadow-sm px-4 pt-4 sm:px-6">
                    <div className="flex space-x-6 overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'flags', label: 'Flagged Content', icon: ShieldAlert, badge: flags.total || null },
                            { id: 'disputes', label: 'Review Disputes', icon: MessageSquare, badge: disputes.filter(d => d.status === 'pending').length || null },
                            { id: 'trash', label: 'Restoration (Trash)', icon: RotateCcw, badge: trashStats?.totalItems || null },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`flex items-center gap-2 border-b-2 pb-4 px-1 text-xs sm:text-sm font-bold transition-all whitespace-nowrap outline-none ${
                                        activeTab === tab.id
                                            ? 'border-clay-600 text-clay-700'
                                            : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-200'
                                    }`}
                                >
                                    <Icon size={16} />
                                    <span>{tab.label}</span>
                                    {tab.badge !== null && (
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                            activeTab === tab.id ? 'bg-clay-600 text-white' : 'bg-stone-100 text-stone-600'
                                        }`}>
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* --- TAB PANEL CONTENTS --- */}
                <div className="min-h-[50vh]">
                    <AnimatePresence mode="wait">
                        {activeTab === 'flags' && (
                            <motion.div
                                key="flags"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100vh-180px)]"
                            >
                                <ReportedItemsInbox 
                                    flags={flags}
                                    selectedFlag={selectedFlag}
                                    setSelectedFlag={setSelectedFlag}
                                    handleFlagAction={handleFlagAction}
                                    isNavigating={isNavigating}
                                />

                                {/* Right Column: Flag Details View */}
                                <div className="hidden lg:flex flex-1 bg-white border border-stone-200 rounded-2xl shadow-sm flex-col overflow-hidden h-full">
                                    {selectedFlag ? (
                                        <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl">
                                            <ReportDetailsCard 
                                                selectedFlag={selectedFlag} 
                                                handleAction={handleFlagAction} 
                                                onClose={() => setSelectedFlag(null)} 
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-stone-50/30">
                                            <div className="w-16 h-16 bg-white border border-stone-200 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                                <ShieldAlert size={28} className="text-stone-300" />
                                            </div>
                                            <h3 className="text-sm font-bold text-stone-900 mb-1">Select a Report Ticket</h3>
                                            <p className="text-xs text-stone-500 max-w-xs">Click on a report from the queue on the left to review the content and take action.</p>
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
                                >
                                    {selectedFlag && (
                                        <div className="h-full -m-6">
                                            <ReportDetailsCard 
                                                selectedFlag={selectedFlag} 
                                                handleAction={handleFlagAction} 
                                                onClose={() => setSelectedFlag(null)}
                                                isMobile={true}
                                            />
                                        </div>
                                    )}
                                </SlideOverDrawer>
                            </motion.div>
                        )}

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
                                    iconBg="bg-indigo-50 text-indigo-600"
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
                                    iconBg="bg-rose-50 text-rose-600"
                                    confirmText="Permanently Delete"
                                    confirmColor="bg-rose-600 hover:bg-rose-700"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
}

ContentSafety.layout = (page) => (
    <AdminLayout title="Content Safety">{page}</AdminLayout>
);

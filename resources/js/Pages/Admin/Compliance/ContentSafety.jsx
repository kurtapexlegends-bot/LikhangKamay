import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '@/Layouts/AdminLayout';
import Modal from '@/Components/Modal';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import CompactPagination from '@/Components/CompactPagination';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import ConfirmationModal from '@/Components/ConfirmationModal';
import { useToast } from '@/Components/ToastContext';
import { 
    ShieldAlert, 
    MessageSquare, 
    RotateCcw, 
    Search, 
    X, 
    Check, 
    AlertTriangle, 
    Eye, 
    ShieldOff, 
    UserX, 
    Loader2, 
    Trash2, 
    Package, 
    FolderTree, 
    ShoppingBag, 
    History, 
    ChevronRight, 
    Clock, 
    Scale, 
    CheckCircle2, 
    ChevronDown,
    ChevronUp
} from 'lucide-react';

// --- STYLES & LABELS ---
const statusClasses = {
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
    under_review: 'border-blue-200 bg-blue-50 text-blue-700',
    resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rejected: 'border-stone-200 bg-stone-50 text-stone-600',
};

const statusLabels = {
    pending: 'Pending',
    under_review: 'Under Review',
    resolved: 'Approved',
    rejected: 'Rejected',
};

const outcomeClasses = {
    hidden: 'border-rose-200 bg-rose-50 text-rose-700',
    visible: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const getModerationOutcome = (dispute) => {
    if (dispute.status === 'resolved') {
        return dispute.review_hidden_from_marketplace
            ? { tone: 'hidden', label: 'Review hidden from marketplace' }
            : { tone: 'visible', label: 'Request approved, but review is still visible' };
    }
    if (dispute.status === 'rejected') {
        return { tone: 'visible', label: 'Review remains visible in the marketplace' };
    }
    if (dispute.status === 'under_review') {
        return { tone: null, label: 'Review is still visible while the request is being reviewed' };
    }
    return { tone: null, label: 'No review action yet. Start review or remove the request.' };
};

const SkeletonModeration = () => (
    <div className="divide-y divide-stone-100">
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-4 space-y-3 animate-pulse">
                <div className="flex justify-between">
                    <div className="h-2 w-16 bg-stone-100 rounded" />
                    <div className="h-2 w-12 bg-stone-100 rounded" />
                </div>
                <div className="h-4 w-3/4 bg-stone-100 rounded" />
                <div className="h-2 w-1/2 bg-stone-100 rounded" />
            </div>
        ))}
    </div>
);

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white rounded-2xl border border-clay-100 p-6 flex items-center gap-4 shadow-sm transition-all hover:shadow-md">
        <div className={`p-3 rounded-xl bg-stone-50 border border-stone-100 ${color}`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none mb-1">{title}</p>
            <p className="text-2xl font-black text-stone-900 tracking-tight leading-none">{value}</p>
        </div>
    </div>
);

export default function ContentSafety({ flags, disputes = [], trashQueue = [], trashStats, defaultTab = 'flags' }) {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState(defaultTab || 'flags');

    useEffect(() => {
        if (defaultTab) {
            setActiveTab(defaultTab);
        }
    }, [defaultTab]);

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
    const [disputeSearch, setDisputeSearch] = useState('');
    const [disputeStatusFilter, setDisputeStatusFilter] = useState('all');
    const [disputeQuickView, setDisputeQuickView] = useState('open');
    const [disputeModalState, setDisputeModalState] = useState({ open: false, dispute: null, status: 'under_review' });
    const [disputeDeleteState, setDisputeDeleteState] = useState({ open: false, dispute: null });
    const [disputeResolutionNotes, setDisputeResolutionNotes] = useState('');
    const [disputeProcessing, setDisputeProcessing] = useState(false);

    const filteredDisputes = useMemo(() => {
        const query = disputeSearch.trim().toLowerCase();
        return disputes.filter((dispute) => {
            if (disputeStatusFilter !== 'all' && dispute.status !== disputeStatusFilter) return false;
            if (disputeQuickView === 'open' && ['resolved', 'rejected'].includes(dispute.status)) return false;
            if (disputeQuickView === 'closed' && !['resolved', 'rejected'].includes(dispute.status)) return false;
            if (disputeQuickView === 'low_rating' && Number(dispute.review_rating || 0) > 2) return false;
            if (disputeQuickView === 'high_rating' && Number(dispute.review_rating || 0) < 4) return false;
            if (!query) return true;
            return [
                dispute.shop_name,
                dispute.product_name,
                dispute.reported_by,
                dispute.reason,
                dispute.review_comment,
            ].some((value) => String(value || '').toLowerCase().includes(query));
        });
    }, [disputes, disputeSearch, disputeStatusFilter, disputeQuickView]);

    const DISPUTES_ITEMS_PER_PAGE = 10;
    const [disputesCurrentPage, setDisputesCurrentPage] = useState(1);
    const disputesTotalPages = Math.max(1, Math.ceil(filteredDisputes.length / DISPUTES_ITEMS_PER_PAGE));
    const paginatedDisputes = useMemo(() => {
        const start = (disputesCurrentPage - 1) * DISPUTES_ITEMS_PER_PAGE;
        return filteredDisputes.slice(start, start + DISPUTES_ITEMS_PER_PAGE);
    }, [filteredDisputes, disputesCurrentPage]);

    useEffect(() => {
        setDisputesCurrentPage(1);
    }, [disputeSearch, disputeStatusFilter, disputeQuickView]);

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
    const [trashSearch, setTrashSearch] = useState('');
    const [confirmingRestore, setConfirmingRestore] = useState(null);
    const [confirmingDelete, setConfirmingDelete] = useState(null);

    const filteredTrashQueue = useMemo(() => {
        const query = trashSearch.trim().toLowerCase();
        if (!query) return trashQueue;
        return trashQueue.filter(item => 
            String(item.name || '').toLowerCase().includes(query) ||
            String(item.type || '').toLowerCase().includes(query) ||
            String(item.context || '').toLowerCase().includes(query)
        );
    }, [trashQueue, trashSearch]);

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
                                {/* Left Column: Flags Inbox List */}
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
                                                                    {flag.reportable_type.split('\\').pop()}
                                                                </span>
                                                                <span className="text-[9px] font-medium text-stone-400">
                                                                    {new Date(flag.created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                                                                {flag.reportable ? (flag.reportable.name || flag.reportable.title || `ID: ${flag.reportable_id}`) : 'Content Deleted'}
                                                            </p>
                                                            <p className="text-[11px] text-stone-500 mt-1 line-clamp-1">"{flag.reason}"</p>
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

                                {/* Right Column: Flag Details View */}
                                <div className="hidden lg:flex flex-1 bg-white border border-stone-200 rounded-2xl shadow-sm flex-col overflow-hidden h-full">
                                    {selectedFlag ? (
                                        <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl">
                                            <ReviewFlagContent 
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
                                            <ReviewFlagContent 
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
                                {/* Stat overview */}
                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                    <StatCard title="Total Disputes" value={disputes.length} icon={MessageSquare} color="text-stone-600" />
                                    <StatCard title="Pending Review" value={disputes.filter((item) => item.status === 'pending').length} icon={AlertTriangle} color="text-amber-600" />
                                    <StatCard title="Under Review" value={disputes.filter((item) => item.status === 'under_review').length} icon={Clock} color="text-blue-600" />
                                    <StatCard title="Closed Disputes" value={disputes.filter((item) => ['resolved', 'rejected'].includes(item.status)).length} icon={CheckCircle2} color="text-emerald-600" />
                                </div>

                                <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
                                    {/* Filters Header */}
                                    <div className="flex flex-col gap-3 border-b border-stone-100 bg-[#FCFBF9] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                        <div>
                                            <h4 className="text-sm font-bold text-stone-900">Review Dispute Queue</h4>
                                            <p className="text-[11px] font-medium text-stone-500 mt-0.5">Sellers can request review moderation for unfair store comments.</p>
                                        </div>
                                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                            <div className="relative w-full sm:w-72">
                                                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                                                <input
                                                    type="text"
                                                    value={disputeSearch}
                                                    onChange={(event) => setDisputeSearch(event.target.value)}
                                                    placeholder="Search shop, product, or reason"
                                                    className="w-full rounded-xl border border-stone-200 bg-white py-1.5 pl-9 pr-9 text-xs font-medium text-stone-900 placeholder-stone-400 focus:border-clay-300 focus:ring-0 shadow-sm"
                                                />
                                                {disputeSearch && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setDisputeSearch('')}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                            <select
                                                value={disputeStatusFilter}
                                                onChange={(event) => setDisputeStatusFilter(event.target.value)}
                                                className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-stone-600 outline-none shadow-sm focus:border-clay-300 focus:ring-0"
                                            >
                                                <option value="all">All statuses</option>
                                                <option value="pending">Pending</option>
                                                <option value="under_review">Under review</option>
                                                <option value="resolved">Approved</option>
                                                <option value="rejected">Rejected</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Quick Tabs filters */}
                                    <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-4 py-3 sm:px-6 bg-white">
                                        {[
                                            ['open', 'Open queue'],
                                            ['closed', 'Closed'],
                                            ['low_rating', '1-2 stars'],
                                            ['high_rating', '4-5 stars'],
                                        ].map(([key, label]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setDisputeQuickView(key)}
                                                className={`rounded-full border px-3 py-1 text-[10px] font-bold transition-colors ${
                                                    disputeQuickView === key
                                                        ? 'border-clay-200 bg-clay-50 text-clay-700'
                                                        : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDisputeQuickView('open');
                                                setDisputeStatusFilter('all');
                                                setDisputeSearch('');
                                            }}
                                            className="ml-auto rounded-full border border-stone-200 bg-white px-3 py-1 text-[10px] font-bold text-stone-500 hover:bg-stone-50"
                                        >
                                            Reset filters
                                        </button>
                                    </div>

                                    {/* Dispute Items list */}
                                    {paginatedDisputes.length > 0 ? (
                                        <div className="divide-y divide-stone-100">
                                            {paginatedDisputes.map((dispute) => {
                                                const outcome = getModerationOutcome(dispute);
                                                return (
                                                    <div key={dispute.id} className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between bg-white hover:bg-stone-50/20 transition-colors">
                                                        <div className="min-w-0 space-y-2">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusClasses[dispute.status] || statusClasses.pending}`}>
                                                                    {statusLabels[dispute.status] || String(dispute.status).replace(/_/g, ' ')}
                                                                </span>
                                                                <span className="text-[10px] font-medium text-stone-400">
                                                                    {dispute.reported_at ? new Date(dispute.reported_at).toLocaleString() : 'Unknown date'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs sm:text-sm font-bold text-stone-900">{dispute.product_name}</p>
                                                                <p className="text-[11px] text-stone-500">{dispute.shop_name} · Reported by {dispute.reported_by}</p>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                                                                <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-stone-600">
                                                                    {Number(dispute.review_rating || 0)} star review
                                                                </span>
                                                                {dispute.resolved_at && (
                                                                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-stone-400">
                                                                        Closed {new Date(dispute.resolved_at).toLocaleDateString()}
                                                                    </span>
                                                                )}
                                                                <span className={`rounded-full border px-2 py-0.5 ${outcome.tone ? outcomeClasses[outcome.tone] : 'border-stone-200 bg-stone-50 text-stone-500'}`}>
                                                                    {outcome.label}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs sm:text-sm font-medium text-stone-800 leading-relaxed"><span className="font-bold text-stone-500">Dispute Reason:</span> "{dispute.reason}"</p>
                                                            {dispute.review_comment && (
                                                                <p className="rounded-xl border border-stone-100 bg-[#FAF9F6] px-3 py-2 text-xs sm:text-sm text-stone-600">
                                                                    <span className="font-bold text-stone-500 text-[11px] uppercase tracking-wider block mb-1">Customer Review</span>
                                                                    "{dispute.review_comment}"
                                                                </p>
                                                            )}
                                                            {dispute.details && (
                                                                <p className="text-xs sm:text-sm text-stone-500"><span className="font-bold text-stone-400">Details:</span> {dispute.details}</p>
                                                            )}
                                                            {dispute.resolution_notes && (
                                                                <p className="text-[11px] text-stone-500 font-medium"><span className="font-bold text-stone-400">Resolution Notes:</span> {dispute.resolution_notes}</p>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-2 lg:justify-end shrink-0">
                                                            {dispute.status === 'pending' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openDisputeActionModal(dispute, 'under_review')}
                                                                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                                                                >
                                                                    Start Review
                                                                </button>
                                                            )}
                                                            {dispute.status === 'under_review' && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openDisputeActionModal(dispute, 'resolved')}
                                                                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                                                                    >
                                                                        Approve Request
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openDisputeActionModal(dispute, 'rejected')}
                                                                        className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-700 transition hover:bg-stone-100"
                                                                    >
                                                                        Reject Request
                                                                    </button>
                                                                </>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => setDisputeDeleteState({ open: true, dispute })}
                                                                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                                                            >
                                                                Remove Request
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="px-6 py-12 bg-white">
                                            <WorkspaceEmptyState
                                                icon={MessageSquare}
                                                title="No disputes found"
                                                description="Disputed customer reviews submitted by shop owners will populate in this view."
                                            />
                                        </div>
                                    )}

                                    <div className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between shrink-0">
                                        <CompactPagination
                                            currentPage={disputesCurrentPage}
                                            totalPages={disputesTotalPages}
                                            totalItems={filteredDisputes.length}
                                            itemsPerPage={DISPUTES_ITEMS_PER_PAGE}
                                            onPageChange={setDisputesCurrentPage}
                                            itemLabel="disputes"
                                        />
                                    </div>
                                </div>

                                {/* Disputes Status Update Modal */}
                                <Modal show={disputeModalState.open} onClose={closeDisputeActionModal} maxWidth="lg">
                                    <div className="space-y-4 p-6 bg-white">
                                        <div>
                                            <h3 className="text-sm font-bold text-stone-900">
                                                {disputeModalState.status === 'under_review' ? 'Start Dispute Review' : 
                                                 disputeModalState.status === 'resolved' ? 'Approve Moderation Request' : 'Reject Moderation Request'}
                                            </h3>
                                            <p className="mt-1 text-xs text-stone-500">
                                                {disputeModalState.status === 'under_review' ? 'Mark this dispute as active under_review so other staff are informed.' : 
                                                 disputeModalState.status === 'resolved' ? 'Approve this request. The review will be hidden from the product page.' : 
                                                 'Reject this request. The review comment will remain visible on the product catalog.'}
                                            </p>
                                        </div>
                                        <textarea
                                            value={disputeResolutionNotes}
                                            onChange={(event) => setDisputeResolutionNotes(event.target.value)}
                                            rows={4}
                                            placeholder="Provide resolution details or feedback for the seller..."
                                            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-800 focus:border-clay-300 focus:ring-0 outline-none"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={closeDisputeActionModal}
                                                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50"
                                                disabled={disputeProcessing}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={submitDisputeUpdate}
                                                className="rounded-xl bg-clay-600 px-4 py-2 text-xs font-bold text-white hover:bg-clay-700 disabled:opacity-50"
                                                disabled={disputeProcessing}
                                            >
                                                {disputeProcessing ? 'Saving...' : 'Confirm Decision'}
                                            </button>
                                        </div>
                                    </div>
                                </Modal>

                                {/* Dispute Delete Confirmation Modal */}
                                <Modal show={disputeDeleteState.open} onClose={() => !disputeProcessing && setDisputeDeleteState({ open: false, dispute: null })} maxWidth="sm">
                                    <div className="space-y-4 p-6 bg-white">
                                        <div>
                                            <h3 className="text-sm font-bold text-stone-900">Remove Moderation Request</h3>
                                            <p className="mt-1 text-xs text-stone-500">
                                                This deletes the moderation request record. If this request had already been approved, the linked review will be restored unless another approved request still exists.
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 text-xs text-stone-600">
                                            {disputeDeleteState.dispute?.product_name || 'Selected request'}
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setDisputeDeleteState({ open: false, dispute: null })}
                                                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50"
                                                disabled={disputeProcessing}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={submitDisputeDelete}
                                                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                                                disabled={disputeProcessing}
                                            >
                                                {disputeProcessing ? 'Removing...' : 'Remove Request'}
                                            </button>
                                        </div>
                                    </div>
                                </Modal>
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
                                {/* Stat cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <StatCard title="Total Trash" value={trashStats?.totalItems || 0} icon={Trash2} color="text-stone-600" />
                                    <StatCard title="Deleted Products" value={trashStats?.products || 0} icon={Package} color="text-clay-600" />
                                    <StatCard title="Deleted Categories" value={trashStats?.categories || 0} icon={FolderTree} color="text-indigo-600" />
                                    <StatCard title="Deleted Orders" value={trashStats?.orders || 0} icon={ShoppingBag} color="text-amber-600" />
                                </div>

                                {/* Trash Queue list */}
                                <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
                                    <div className="px-8 py-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-sm sm:text-base font-bold text-stone-900">Restoration Center (Trash Queue)</h3>
                                            <p className="text-xs text-stone-500 font-medium mt-0.5">Deleted items are held for 30 days before permanent removal</p>
                                        </div>
                                        
                                        <div className="relative w-full sm:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                                            <input 
                                                type="text" 
                                                placeholder="Search deleted items..."
                                                value={trashSearch}
                                                onChange={(e) => setTrashSearch(e.target.value)}
                                                className="pl-10 pr-4 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:border-clay-300 focus:ring-0 shadow-sm w-full"
                                            />
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-stone-50/50">
                                                    <th className="px-8 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">Item Type</th>
                                                    <th className="px-8 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">Name / Identifier</th>
                                                    <th className="px-8 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">Deleted By / Context</th>
                                                    <th className="px-8 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">Auto-Purge In</th>
                                                    <th className="px-8 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right border-b border-stone-100">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100">
                                                {filteredTrashQueue.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="px-8 py-16 text-center bg-white">
                                                            <div className="flex flex-col items-center gap-3">
                                                                <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center">
                                                                    <History className="text-stone-300" size={24} />
                                                                </div>
                                                                <p className="text-xs font-bold text-stone-400">Trash queue is empty</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredTrashQueue.map((item) => (
                                                        <tr key={`${item.type}-${item.id}`} className="group hover:bg-stone-50/50 transition-colors">
                                                            <td className="px-8 py-5">
                                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                                    item.type === 'Product' ? 'bg-clay-50 text-clay-700' :
                                                                    item.type === 'Category' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                                                                }`}>
                                                                    {item.type === 'Product' && <Package size={10} />}
                                                                    {item.type === 'Category' && <FolderTree size={10} />}
                                                                    {item.type === 'Order' && <ShoppingBag size={10} />}
                                                                    {item.type}
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <span className="text-xs font-bold text-stone-900">{item.name}</span>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <span className="text-xs font-medium text-stone-500 italic">{item.context}</span>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-mono font-bold text-stone-700">
                                                                        {Math.max(0, Math.ceil((new Date(item.expires_at) - new Date()) / (1000 * 60 * 60 * 24)))} Days
                                                                    </span>
                                                                    <span className="text-[9px] text-stone-400 font-medium">Expires: {new Date(item.expires_at).toLocaleDateString()}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-5 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button 
                                                                        onClick={() => setConfirmingRestore(item)}
                                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                        title="Restore Item"
                                                                    >
                                                                        <RotateCcw size={16} />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => setConfirmingDelete(item)}
                                                                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                                        title="Permanently Delete"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Restoration Confirmation Modals */}
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

// --- COMPONENT FOR FLAG ITEM DETAILS ---
const ReviewFlagContent = ({ selectedFlag, handleAction, onClose, isMobile = false }) => {
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className={`p-4 sm:p-6 border-b border-stone-100 shrink-0 ${isMobile ? 'bg-white' : 'bg-stone-50/30'}`}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        {!isMobile && <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight mb-1">Ticket #{selectedFlag.id}</h2>}
                        <p className="text-xs sm:text-sm text-stone-500">Reported by <span className="font-bold text-stone-700">{selectedFlag.reporter?.name || 'Unknown User'}</span></p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-700 border border-amber-200">
                        <AlertTriangle size={10} className="sm:w-3 sm:h-3" /> Pending Review
                    </span>
                </div>
                <div className="bg-[#FAF9F6] p-3 sm:p-4 rounded-xl border border-stone-200/60 shadow-sm">
                    <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Report Reason</h4>
                    <p className="text-xs sm:text-sm font-medium text-stone-800 leading-relaxed">"{selectedFlag.reason}"</p>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAF9F6]">
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
                                        <h3 className="text-sm sm:text-base font-bold text-stone-900">{selectedFlag.reportable.name || selectedFlag.reportable.title}</h3>
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
                        className={`flex items-center justify-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-xl font-bold text-xs hover:bg-stone-50 hover:text-stone-900 transition-colors shadow-sm ${isMobile ? 'w-full' : ''}`}
                    >
                        <X size={14} /> Dismiss (False Alarm)
                    </button>
                </div>
                <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
                    <button 
                        onClick={() => handleAction(selectedFlag.id, 'takedown')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-[11px] sm:text-xs hover:bg-amber-700 transition shadow-sm active:scale-95"
                    >
                        <ShieldOff size={14} /> Takedown
                    </button>
                    <button 
                        onClick={() => handleAction(selectedFlag.id, 'suspend')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-[11px] sm:text-xs hover:bg-red-700 transition shadow-sm active:scale-95"
                    >
                        <UserX size={14} /> Suspend User
                    </button>
                </div>
            </div>
        </div>
    );
};

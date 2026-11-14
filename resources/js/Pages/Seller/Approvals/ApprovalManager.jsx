import React, { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import KPICard from '@/Components/KPICard';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import CompactPagination from '@/Components/CompactPagination';
import ConfirmationModal from '@/Components/ConfirmationModal';
import ApprovalDiffCard from '@/Components/Seller/Approvals/ApprovalDiffCard';
import ApprovalDetailsDrawer from '@/Components/Seller/Approvals/ApprovalDetailsDrawer';
import ApprovalDeclineModal from '@/Components/Seller/Approvals/ApprovalDeclineModal';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import {
    Clock, CheckCircle2, XCircle, Users, Zap,
    ShieldCheck, PhilippinePeso
} from 'lucide-react';

const DOMAIN_OPTIONS = [
    { key: 'hr_payroll', label: 'Payroll Runs' },
    { key: 'procurement', label: 'Materials & Restocks' },
    { key: 'staff_rate', label: 'Pay Rates' },
    { key: 'refund', label: 'Cash Refunds' },
    { key: 'discount', label: 'Promos & Vouchers' },
    { key: 'product_draft', label: 'Product Drafts' },
];

export default function ApprovalManager({
    auth,
    approvals,
    stats = {},
    pendingCount = 0,
    filters = {},
    isElite = false,
    isOwnerReviewer = true,
    allowedDomains = [],
}) {
    const { openSidebar } = useSellerWorkspaceShell();
    const { addToast } = useToast();
    const { flash } = usePage().props;
    useFlashToast(flash, addToast);

    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [domainFilter, setDomainFilter] = useState(filters?.domain || '');
    const [selectedIds, setSelectedIds] = useState([]);
    const activeTab = filters?.status || 'pending';

    const [processingId, setProcessingId] = useState(null);
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);

    // Modal States
    const [inspectModal, setInspectModal] = useState({ isOpen: false, approval: null });
    const [approveModal, setApproveModal] = useState({ isOpen: false, approval: null });
    const [declineModal, setDeclineModal] = useState({ isOpen: false, approval: null, reason: '', revisionItems: [] });
    const [batchModal, setBatchModal] = useState({ isOpen: false, ids: [] });

    const pendingTotal = stats?.pending_count ?? pendingCount ?? 0;
    const approvedTotal = stats?.approved_count ?? 0;
    const declinedTotal = stats?.declined_count ?? 0;
    const activeStaffTotal = stats?.active_staff_count ?? 0;
    const pendingExposure = Number(stats?.pending_exposure_amount ?? 0);
    const domainCounts = stats?.domain_counts || {};

    const visibleDomainOptions = useMemo(() => {
        if (!Array.isArray(allowedDomains) || allowedDomains.length === 0) {
            return DOMAIN_OPTIONS;
        }
        return DOMAIN_OPTIONS.filter((opt) => allowedDomains.includes(opt.key));
    }, [allowedDomains]);

    const visitApprovals = (nextParams) => {
        setSelectedIds([]);
        router.get(
            route('seller.approvals.index'),
            nextParams,
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleTabChange = (statusKey) => {
        visitApprovals({
            status: statusKey,
            domain: domainFilter || undefined,
            search: searchQuery || undefined,
            page: 1,
        });
    };

    const handleDomainPillSelect = (nextDomain) => {
        setDomainFilter(nextDomain);
        visitApprovals({
            status: activeTab,
            domain: nextDomain || undefined,
            search: searchQuery || undefined,
            page: 1,
        });
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
    };

    const handleApplyFilters = () => {
        visitApprovals({
            status: activeTab,
            domain: domainFilter || undefined,
            search: searchQuery || undefined,
            page: 1,
        });
    };

    const handleResetFilters = () => {
        setDomainFilter('');
        setSearchQuery('');
        visitApprovals({ status: activeTab, page: 1 });
    };

    const toggleSelectCard = (approvalId) => {
        setSelectedIds((prev) =>
            prev.includes(approvalId)
                ? prev.filter((id) => id !== approvalId)
                : [...prev, approvalId]
        );
    };

    // Open Inspection Slide-Over Drawer
    const handleOpenInspectModal = (approval) => {
        setInspectModal({ isOpen: true, approval });
    };

    // Open Approval Confirmation Modal
    const handleOpenApproveModal = (approval) => {
        setApproveModal({ isOpen: true, approval });
    };

    const handleConfirmApprove = () => {
        if (!approveModal.approval) return;
        const targetId = approveModal.approval.id;
        setProcessingId(targetId);
        setApproveModal({ isOpen: false, approval: null });

        router.post(route('seller.approvals.approve', targetId), {}, {
            preserveScroll: true,
            onFinish: () => setProcessingId(null),
        });
    };

    // Open Decline Modal
    const handleOpenDeclineModal = (approval) => {
        setDeclineModal({ isOpen: true, approval, reason: '', revisionItems: [] });
    };

    const handleConfirmDecline = () => {
        if (!declineModal.approval) return;
        const targetId = declineModal.approval.id;
        const reason = declineModal.reason;
        const revisionItems = declineModal.revisionItems || [];
        setProcessingId(targetId);
        setDeclineModal({ isOpen: false, approval: null, reason: '', revisionItems: [] });

        router.post(
            route('seller.approvals.reject', targetId),
            {
                reason,
                revision_items: revisionItems,
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessingId(null),
            }
        );
    };

    // Open Batch Modal
    const handleOpenBatchModal = () => {
        if (!isElite || !approvals?.data) return;
        const pendingIds = approvals.data
            .filter((item) => item.status === 'pending')
            .map((item) => item.id);

        const targetIds = selectedIds.length > 0
            ? pendingIds.filter((id) => selectedIds.includes(id))
            : pendingIds;

        if (targetIds.length === 0) return;
        setBatchModal({ isOpen: true, ids: targetIds });
    };

    const handleConfirmBatchApprove = () => {
        if (!isElite || !batchModal.ids?.length) return;
        const idsToApprove = batchModal.ids;

        setBatchModal({ isOpen: false, ids: [] });
        setIsBatchProcessing(true);

        router.post(route('seller.approvals.batch-approve'), { approval_ids: idsToApprove }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds([]),
            onFinish: () => setIsBatchProcessing(false),
        });
    };

    const approvalList = approvals?.data || [];
    const pendingOnPage = approvalList.filter((item) => item.status === 'pending');
    const selectedPendingCount = pendingOnPage.filter((item) => selectedIds.includes(item.id)).length;

    return (
        <>
            <Head title="Team Requests - Artisan Workspace" />

            <SellerHeader
                title="Team Requests"
                subtitle={
                    isOwnerReviewer
                        ? "Review and approve operational requests, payroll, restocks, and pricing from your workshop team."
                        : "Review and approve assigned marketing campaigns, vouchers, and product drafts."
                }
                auth={auth}
                onMenuClick={openSidebar}
            />

            <main className="flex-1 w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 overflow-y-auto space-y-6 pb-28 sm:pb-20">
                {/* 4-Column KPI Grid */}
                <div className="flex overflow-x-auto pb-2 gap-3 flex-nowrap snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="w-[82vw] max-w-[260px] shrink-0 snap-center sm:w-auto">
                        <KPICard
                            title="Awaiting Review"
                            value={pendingTotal}
                            icon={Clock}
                            color="text-amber-600"
                            bg="bg-amber-50"
                        />
                    </div>
                    <div className="w-[82vw] max-w-[260px] shrink-0 snap-center sm:w-auto">
                        {isOwnerReviewer ? (
                            <KPICard
                                title="Pending Value"
                                value={`₱${pendingExposure.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                                icon={PhilippinePeso}
                                color="text-clay-600"
                                bg="bg-clay-50"
                            />
                        ) : (
                            <KPICard
                                title="Active Team"
                                value={activeStaffTotal}
                                icon={Users}
                                color="text-clay-600"
                                bg="bg-clay-50"
                            />
                        )}
                    </div>
                    <div className="w-[82vw] max-w-[260px] shrink-0 snap-center sm:w-auto">
                        <KPICard
                            title="Approved (30d)"
                            value={approvedTotal}
                            icon={CheckCircle2}
                            color="text-emerald-600"
                            bg="bg-emerald-50"
                        />
                    </div>
                    <div className="w-[82vw] max-w-[260px] shrink-0 snap-center sm:w-auto">
                        <KPICard
                            title="Declined (30d)"
                            value={declinedTotal}
                            icon={XCircle}
                            color="text-rose-600"
                            bg="bg-rose-50"
                        />
                    </div>
                </div>

                {/* Role Scope Strip for Delegated Shop Managers */}
                {!isOwnerReviewer && (
                    <div className="rounded-2xl border border-stone-200 bg-[#FAF7F2] px-4 py-3 flex items-center gap-3 text-xs text-stone-700">
                        <ShieldCheck size={16} className="text-clay-600 shrink-0" />
                        <span className="font-medium">
                            Showing <strong>Promos &amp; Vouchers</strong> and <strong>Product Drafts</strong> assigned for manager review. Payroll, restocks, pay rates, and cash refunds stay with the Shop Owner.
                        </span>
                    </div>
                )}

                {/* Content Container */}
                <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs relative min-h-[420px] space-y-4 p-3 sm:p-5">
                    {/* Standard Filter Toolbar Header */}
                    <FilterToolbarHeader
                        tabs={[
                            { key: 'pending', label: 'Pending Review', count: pendingTotal },
                            { key: 'reviewed', label: 'Approval History', count: approvedTotal + declinedTotal },
                        ]}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                        searchQuery={searchQuery}
                        onSearchChange={handleSearch}
                        searchPlaceholder="Search by title, employee, or summary..."
                        activeFiltersCount={domainFilter !== '' ? 1 : 0}
                        filterPopoverTitle="Filter by Category"
                        filterPopoverFields={
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                                    Category
                                </label>
                                <select
                                    value={domainFilter}
                                    onChange={(e) => setDomainFilter(e.target.value)}
                                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white min-h-[44px] sm:min-h-[38px]"
                                >
                                    <option value="">All Categories</option>
                                    {visibleDomainOptions.map((opt) => (
                                        <option key={opt.key} value={opt.key}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        }
                        onApplyFilters={handleApplyFilters}
                        onResetFilters={handleResetFilters}
                        extraActions={
                            isElite && activeTab === 'pending' && pendingOnPage.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={handleOpenBatchModal}
                                    disabled={isBatchProcessing}
                                    className="inline-flex items-center justify-center gap-1.5 px-3.5 h-11 sm:h-[38px] min-h-[44px] sm:min-h-[38px] rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-2xs transition active:scale-95 disabled:opacity-50 shrink-0"
                                >
                                    <Zap size={14} />
                                    <span className="hidden sm:inline">
                                        {selectedPendingCount > 0
                                            ? `Approve Selected (${selectedPendingCount})`
                                            : `Batch Approve (${pendingOnPage.length})`}
                                    </span>
                                    <span className="sm:hidden">
                                        {selectedPendingCount > 0 ? `Approve (${selectedPendingCount})` : 'Approve All'}
                                    </span>
                                </button>
                            ) : null
                        }
                    />

                    {/* Scannable Category Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        <button
                            type="button"
                            onClick={() => handleDomainPillSelect('')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition shrink-0 min-h-[36px] flex items-center gap-1.5 ${
                                domainFilter === ''
                                    ? 'bg-clay-600 text-white border-clay-600'
                                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                            }`}
                        >
                            <span>All</span>
                            {activeTab === 'pending' && pendingTotal > 0 && (
                                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                                    domainFilter === '' ? 'bg-white/20 text-white' : 'bg-stone-200/80 text-stone-700'
                                }`}>
                                    {pendingTotal}
                                </span>
                            )}
                        </button>

                        {visibleDomainOptions.map((opt) => {
                            const count = Number(domainCounts[opt.key] || 0);
                            const active = domainFilter === opt.key;
                            return (
                                <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => handleDomainPillSelect(opt.key)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition shrink-0 min-h-[36px] flex items-center gap-1.5 ${
                                        active
                                            ? 'bg-clay-600 text-white border-clay-600'
                                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                                    }`}
                                >
                                    <span>{opt.label}</span>
                                    {activeTab === 'pending' && count > 0 && (
                                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                                            active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Records List or Empty State */}
                    {approvalList.length > 0 ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {approvalList.map((approval) => (
                                    <ApprovalDiffCard
                                        key={approval.id}
                                        approval={approval}
                                        onInspect={handleOpenInspectModal}
                                        onApprove={handleOpenApproveModal}
                                        onReject={handleOpenDeclineModal}
                                        processing={processingId === approval.id}
                                        selectable={isElite && activeTab === 'pending' && approval.status === 'pending'}
                                        selected={selectedIds.includes(approval.id)}
                                        onToggleSelect={() => toggleSelectCard(approval.id)}
                                    />
                                ))}
                            </div>

                            {/* Pagination */}
                            {approvals && (
                                <CompactPagination
                                    currentPage={approvals.current_page}
                                    totalPages={approvals.last_page}
                                    totalItems={approvals.total}
                                    itemsPerPage={approvals.per_page}
                                    itemLabel="requests"
                                    onPageChange={(page) => {
                                        visitApprovals({
                                            status: activeTab,
                                            domain: domainFilter || undefined,
                                            search: searchQuery || undefined,
                                            page,
                                        });
                                    }}
                                />
                            )}
                        </div>
                    ) : (
                        <WorkspaceEmptyState
                            icon={ShieldCheck}
                            title={activeTab === 'pending' ? 'No Pending Approvals' : 'No Approval History'}
                            description={
                                activeTab === 'pending'
                                    ? 'All caught up. No staff submissions are waiting for review right now.'
                                    : 'Approved and declined requests will appear here.'
                            }
                        />
                    )}
                </div>
            </main>

            {/* Standardize Single Item Approve Confirmation Modal */}
            <ConfirmationModal
                isOpen={approveModal.isOpen}
                onClose={() => setApproveModal({ isOpen: false, approval: null })}
                onConfirm={handleConfirmApprove}
                title={`Approve "${approveModal.approval?.title}"?`}
                message="Changes will be applied immediately to your shop operations."
                icon={CheckCircle2}
                iconBg="bg-emerald-50 text-emerald-600"
                confirmText="Approve Request"
                confirmColor="bg-clay-600 hover:bg-clay-700"
                processing={processingId === approveModal.approval?.id}
            />

            {/* Standardize Batch Approve Confirmation Modal (Elite) */}
            <ConfirmationModal
                isOpen={batchModal.isOpen}
                onClose={() => setBatchModal({ isOpen: false, ids: [] })}
                onConfirm={handleConfirmBatchApprove}
                title={`Approve ${batchModal.ids?.length || 0} Pending Requests?`}
                message={`This will approve ${batchModal.ids?.length || 0} selected request(s) and apply their changes across your workshop.`}
                icon={Zap}
                iconBg="bg-emerald-50 text-emerald-600"
                confirmText="Approve Requests"
                confirmColor="bg-emerald-600 hover:bg-emerald-700"
                processing={isBatchProcessing}
            />

            <ApprovalDeclineModal
                declineModal={declineModal}
                setDeclineModal={setDeclineModal}
                onConfirm={handleConfirmDecline}
                processing={processingId !== null}
            />

            {/* Deep-Dive Inspection Slide-Over Drawer */}
            <ApprovalDetailsDrawer
                isOpen={inspectModal.isOpen}
                onClose={() => setInspectModal({ isOpen: false, approval: null })}
                approval={inspectModal.approval}
                onApprove={handleOpenApproveModal}
                onReject={handleOpenDeclineModal}
                processing={processingId === inspectModal.approval?.id}
            />
        </>
    );
}

ApprovalManager.layout = (page) => <SellerWorkspaceLayout active="approvals">{page}</SellerWorkspaceLayout>;

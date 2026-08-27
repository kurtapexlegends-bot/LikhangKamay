import React, { useState } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import KPICard from '@/Components/KPICard';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import CompactPagination from '@/Components/CompactPagination';
import ConfirmationModal from '@/Components/ConfirmationModal';
import ApprovalDiffCard from '@/Components/Seller/Approvals/ApprovalDiffCard';
import ApprovalDetailsDrawer from '@/Components/Seller/Approvals/ApprovalDetailsDrawer';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import { 
    Clock, CheckCircle2, XCircle, Users, Zap, 
    ShieldCheck, Sparkles, CheckCheck
} from 'lucide-react';

export default function ApprovalManager({ 
    auth, 
    approvals, 
    stats = {}, 
    pendingCount = 0, 
    filters = {}, 
    isElite = false, 
    isPremium = false 
}) {
    const { openSidebar } = useSellerWorkspaceShell();
    const { addToast } = useToast();
    const { flash } = usePage().props;
    useFlashToast(flash, addToast);

    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [domainFilter, setDomainFilter] = useState(filters?.domain || '');
    const activeTab = filters?.status || 'pending';

    const [processingId, setProcessingId] = useState(null);
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);

    // Modal States
    const [inspectModal, setInspectModal] = useState({ isOpen: false, approval: null });
    const [approveModal, setApproveModal] = useState({ isOpen: false, approval: null });
    const [declineModal, setDeclineModal] = useState({ isOpen: false, approval: null, reason: '' });
    const [batchModal, setBatchModal] = useState({ isOpen: false, count: 0 });

    const pendingTotal = stats?.pending_count ?? pendingCount ?? 0;
    const approvedTotal = stats?.approved_count ?? 0;
    const declinedTotal = stats?.declined_count ?? 0;
    const activeStaffTotal = stats?.active_staff_count ?? 0;

    const handleTabChange = (statusKey) => {
        router.get(
            route('seller.approvals.index'),
            {
                status: statusKey,
                domain: domainFilter || undefined,
                search: searchQuery || undefined,
                page: 1,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
    };

    const handleApplyFilters = () => {
        router.get(
            route('seller.approvals.index'),
            {
                status: activeTab,
                domain: domainFilter || undefined,
                search: searchQuery || undefined,
                page: 1,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleResetFilters = () => {
        setDomainFilter('');
        setSearchQuery('');
        router.get(
            route('seller.approvals.index'),
            { status: activeTab, page: 1 },
            { preserveState: true, preserveScroll: true }
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
        setDeclineModal({ isOpen: true, approval, reason: '' });
    };

    const handleConfirmDecline = () => {
        if (!declineModal.approval) return;
        const targetId = declineModal.approval.id;
        const reason = declineModal.reason;
        setProcessingId(targetId);
        setDeclineModal({ isOpen: false, approval: null, reason: '' });

        router.post(route('seller.approvals.reject', targetId), { reason }, {
            preserveScroll: true,
            onFinish: () => setProcessingId(null),
        });
    };

    // Open Batch Modal
    const handleOpenBatchModal = () => {
        if (!isElite || !approvals?.data) return;
        const pendingItems = approvals.data.filter((item) => item.status === 'pending');
        if (pendingItems.length === 0) return;
        setBatchModal({ isOpen: true, count: pendingItems.length });
    };

    const handleConfirmBatchApprove = () => {
        if (!isElite || !approvals?.data) return;
        const pendingIds = approvals.data
            .filter((item) => item.status === 'pending')
            .map((item) => item.id);

        if (pendingIds.length === 0) return;

        setBatchModal({ isOpen: false, count: 0 });
        setIsBatchProcessing(true);

        router.post(route('seller.approvals.batch-approve'), { approval_ids: pendingIds }, {
            preserveScroll: true,
            onFinish: () => setIsBatchProcessing(false),
        });
    };

    const approvalList = approvals?.data || [];

    return (
        <SellerWorkspaceLayout user={auth.user} title="Approvals" active="approvals">
            <Head title="Executive Approvals - Artisan Workspace" />

            <SellerHeader
                title="Executive Approvals"
                subtitle="Review staff requests, salary rate updates, purchase orders, and payroll."
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
                    <div className="w-[82vw] max-w-[260px] shrink-0 snap-center sm:w-auto">
                        <KPICard
                            title="Active Team Members"
                            value={activeStaffTotal}
                            icon={Users}
                            color="text-clay-600"
                            bg="bg-clay-50"
                        />
                    </div>
                </div>

                {/* Plan Upgrade Prompt for Standard Tier */}
                {!isPremium && !isElite && (
                    <div className="rounded-3xl border border-clay-200 bg-[#FAF7F2] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex gap-3.5 items-center">
                            <div className="p-3 bg-clay-100 rounded-2xl text-clay-700 shrink-0">
                                <Users size={22} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-stone-900">Delegate Operations to Workshop Staff</h3>
                                <p className="text-xs text-stone-600 mt-0.5 font-medium">
                                    Upgrade to <strong>Premium</strong> or <strong>Elite</strong> to invite staff members (HR, Finance, Supplies) and review their actions here.
                                </p>
                            </div>
                        </div>
                        <Link
                            href={route('seller.subscription')}
                            className="px-4 py-2 bg-clay-600 hover:bg-clay-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm transition flex items-center gap-1.5 min-h-[40px]"
                        >
                            <Sparkles size={14} /> Upgrade Plan
                        </Link>
                    </div>
                )}

                {/* Content Container */}
                <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs relative overflow-hidden space-y-4 p-3 sm:p-5">
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
                        searchPlaceholder="Search by title, employee, or reason..."
                        activeFiltersCount={domainFilter !== '' ? 1 : 0}
                        filterPopoverTitle="Filter by Domain"
                        filterPopoverFields={
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                                    Business Domain
                                </label>
                                <select
                                    value={domainFilter}
                                    onChange={(e) => setDomainFilter(e.target.value)}
                                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white"
                                >
                                    <option value="">All Business Domains</option>
                                    <option value="hr_payroll">Payroll Runs</option>
                                    <option value="staff_rate">Salary &amp; Rate Updates</option>
                                    <option value="procurement">Materials &amp; Supplies</option>
                                    <option value="discount">Promotions &amp; Discounts</option>
                                    <option value="refund">Disputes &amp; Refunds</option>
                                    <option value="product_draft">Product Listings</option>
                                </select>
                            </div>
                        }
                        onApplyFilters={handleApplyFilters}
                        onResetFilters={handleResetFilters}
                        extraActions={
                            isElite && activeTab === 'pending' && approvalList.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={handleOpenBatchModal}
                                    disabled={isBatchProcessing}
                                    className="inline-flex items-center justify-center gap-1.5 px-3.5 h-[38px] min-h-[38px] rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-2xs transition active:scale-95 disabled:opacity-50 shrink-0"
                                >
                                    <Zap size={14} />
                                    <span className="hidden sm:inline">Batch Approve ({approvalList.length})</span>
                                    <span className="sm:hidden">Approve All</span>
                                </button>
                            ) : null
                        }
                    />

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
                                        router.get(
                                            route('seller.approvals.index'),
                                            {
                                                status: activeTab,
                                                domain: domainFilter || undefined,
                                                search: searchQuery || undefined,
                                                page,
                                            },
                                            { preserveState: true, preserveScroll: true }
                                        );
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
                                    ? 'All caught up! There are currently no staff changes, salary updates, or purchase requests awaiting review.'
                                    : 'Reviewed actions, approved pay runs, and staff requests will be recorded here.'
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
                message="Are you sure you want to approve this request? The changes will be immediately applied and recorded in your shop operations."
                icon={CheckCircle2}
                iconBg="bg-emerald-50 text-emerald-600"
                confirmText="Approve Request"
                confirmColor="bg-clay-600 hover:bg-clay-700"
                processing={processingId === approveModal.approval?.id}
            />

            {/* Standardize Batch Approve Confirmation Modal (Elite) */}
            <ConfirmationModal
                isOpen={batchModal.isOpen}
                onClose={() => setBatchModal({ isOpen: false, count: 0 })}
                onConfirm={handleConfirmBatchApprove}
                title={`Batch Approve ${batchModal.count} Pending Requests?`}
                message={`This will instantly approve all ${batchModal.count} pending staff submissions and apply their respective changes across your workshop workspace.`}
                icon={Zap}
                iconBg="bg-emerald-50 text-emerald-600"
                confirmText="Approve All Requests"
                confirmColor="bg-emerald-600 hover:bg-emerald-700"
                processing={isBatchProcessing}
            />

            {/* Decline Request Modal with Feedback */}
            {declineModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
                        <div className="flex items-center gap-2.5 text-stone-900 font-bold">
                            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                                <XCircle size={20} />
                            </div>
                            <div>
                                <h4 className="text-base font-bold text-stone-900">Decline Request</h4>
                                <p className="text-[11px] text-stone-500 font-medium truncate max-w-[260px]">
                                    {declineModal.approval?.title}
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-stone-600 font-medium leading-relaxed">
                            Provide optional feedback to help your staff understand why this request was declined.
                        </p>

                        <textarea
                            rows={3}
                            value={declineModal.reason}
                            onChange={(e) => setDeclineModal((prev) => ({ ...prev, reason: e.target.value }))}
                            placeholder="e.g. Please verify the overtime hours first or adjust the restock quantity..."
                            className="w-full text-xs rounded-xl border border-stone-200 focus:border-clay-500 focus:ring-0 p-3 font-medium resize-none text-stone-800 placeholder:text-stone-400"
                        />

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setDeclineModal({ isOpen: false, approval: null, reason: '' })}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition min-h-[38px]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDecline}
                                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition min-h-[38px]"
                            >
                                Confirm Decline
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deep-Dive Inspection Slide-Over Drawer */}
            <ApprovalDetailsDrawer
                isOpen={inspectModal.isOpen}
                onClose={() => setInspectModal({ isOpen: false, approval: null })}
                approval={inspectModal.approval}
                onApprove={handleOpenApproveModal}
                onReject={handleOpenDeclineModal}
                processing={processingId === inspectModal.approval?.id}
            />
        </SellerWorkspaceLayout>
    );
}

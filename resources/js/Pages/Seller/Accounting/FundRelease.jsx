import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import SellerHeader from '@/Components/SellerHeader';
import Modal from '@/Components/Modal';
import CompactPagination from '@/Components/CompactPagination';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import WorkspaceLoadingState from '@/Components/WorkspaceLoadingState';
import ReadOnlyCapabilityNotice from '@/Components/ReadOnlyCapabilityNotice';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import useSellerModuleAccess from '@/hooks/useSellerModuleAccess';
import { AlertCircle, Banknote, Building2, CheckCircle, ClipboardList, Download, Eye, FileText, History, LoaderCircle, Pencil, Search, Users, X } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';

const formatMoney = (value) => `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatShortMoney = (value) => `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : 'N/A');
const formatDateTime = (value) => (value ? new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'N/A');
const formatRole = (role) => (role ? role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'Workspace requester');
const statusTone = (status) => {
    const normalized = String(status || '').toLowerCase();

    if (['paid', 'completed', 'accounting_approved', 'ordered', 'received', 'partially_received'].includes(normalized)) {
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }

    if (normalized === 'rejected') {
        return 'bg-red-50 text-red-600 border-red-100';
    }

    return 'bg-amber-50 text-amber-700 border-amber-100';
};
const typeTone = (type) => (type === 'payroll' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100');
const reviewLabel = (status) => {
    const normalized = String(status || '').toLowerCase();

    if (normalized === 'rejected') return 'Rejected';
    if (['paid', 'completed', 'accounting_approved', 'ordered', 'received', 'partially_received'].includes(normalized)) return 'Approved';

    return 'Pending Review';
};

const modalCloseButtonClass = 'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-400 transition hover:border-gray-300 hover:text-gray-700';

export default function FundRelease({ auth, pendingRequests, pendingPayrolls = [], history, payrollHistory = [], finances }) {
    const { openSidebar } = useSellerWorkspaceShell();
    const { flash } = usePage().props;
    const { addToast } = useToast();
    const { canEdit: canEditAccounting, isReadOnly: isAccountingReadOnly } = useSellerModuleAccess('accounting');
    const [activeTab, setActiveTab] = useState('pending');
    const [showBaseFundsModal, setShowBaseFundsModal] = useState(false);
    const [baseFundsValue, setBaseFundsValue] = useState(finances.baseFunds || 0);
    const [reviewModal, setReviewModal] = useState({ open: false, item: null, source: 'pending' });
    const [rejectReason, setRejectReason] = useState('');
    const [pendingPage, setPendingPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    const [baseFundsProcessing, setBaseFundsProcessing] = useState(false);
    const [reviewProcessing, setReviewProcessing] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [entryTypeFilter, setEntryTypeFilter] = useState('all');
    const deferredSearch = useDeferredValue(searchTerm);

    const allPending = useMemo(() => (
        [...pendingRequests, ...pendingPayrolls]
            .map((item) => ({ ...item, _date: new Date(item.created_at || Date.now()) }))
            .sort((a, b) => b._date - a._date)
    ), [pendingPayrolls, pendingRequests]);

    const allHistory = useMemo(() => (
        [...history, ...payrollHistory]
            .map((item) => ({ ...item, _date: new Date(item.updated_at || item.created_at || Date.now()) }))
            .sort((a, b) => b._date - a._date)
    ), [history, payrollHistory]);

    const itemsPerPage = 6;
    const filterLedgerEntries = (items) => {
        const normalizedSearch = deferredSearch.trim().toLowerCase();

        return items.filter((item) => {
            if (entryTypeFilter !== 'all' && item.type !== entryTypeFilter) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            return [
                item.id,
                item.type,
                item.month,
                item.requester?.name,
                item.requester?.role,
                item.supply?.name,
                item.supply?.category,
                item.status,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(normalizedSearch);
        });
    };

    const filteredPending = useMemo(() => filterLedgerEntries(allPending), [allPending, deferredSearch, entryTypeFilter]);
    const filteredHistory = useMemo(() => filterLedgerEntries(allHistory), [allHistory, deferredSearch, entryTypeFilter]);
    const totalPendingPages = Math.max(1, Math.ceil(filteredPending.length / itemsPerPage));
    const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));
    const paginatedPending = useMemo(() => {
        const startIndex = (pendingPage - 1) * itemsPerPage;
        return filteredPending.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredPending, pendingPage]);
    const paginatedHistory = useMemo(() => {
        const startIndex = (historyPage - 1) * itemsPerPage;
        return filteredHistory.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredHistory, historyPage]);

    useFlashToast(flash, addToast);

    useEffect(() => {
        if (pendingPage > totalPendingPages) {
            setPendingPage(totalPendingPages);
        }
    }, [pendingPage, totalPendingPages]);

    useEffect(() => {
        if (historyPage > totalHistoryPages) {
            setHistoryPage(totalHistoryPages);
        }
    }, [historyPage, totalHistoryPages]);

    useEffect(() => {
        setPendingPage(1);
        setHistoryPage(1);
    }, [deferredSearch, entryTypeFilter, activeTab]);

    const closeReviewModal = () => {
        setReviewModal((current) => ({ ...current, open: false }));
    };

    const resetReviewModal = () => {
        setReviewModal({ open: false, item: null, source: 'pending' });
        setRejectReason('');
    };

    const openReviewModal = (item, source = 'pending') => {
        setReviewModal({ open: true, item, source });
        setRejectReason(item?.rejection_reason || '');
    };

    const handleApprove = () => {
        if (!reviewModal.item || !canEditAccounting) return;

        router.post(route(reviewModal.item.type === 'payroll' ? 'accounting.approvePayroll' : 'accounting.approve', reviewModal.item.id), {}, {
            onStart: () => setReviewProcessing('approve'),
            onSuccess: closeReviewModal,
            onFinish: () => setReviewProcessing(null),
        });
    };

    const handleReject = () => {
        if (!reviewModal.item || !rejectReason.trim() || !canEditAccounting) return;

        router.post(route(reviewModal.item.type === 'payroll' ? 'accounting.rejectPayroll' : 'accounting.reject', reviewModal.item.id), {
            reason: rejectReason.trim(),
        }, {
            onStart: () => setReviewProcessing('reject'),
            onSuccess: closeReviewModal,
            onFinish: () => setReviewProcessing(null),
        });
    };

    const handleUpdateBaseFunds = (event) => {
        event.preventDefault();
        if (!canEditAccounting) return;

        router.post(route('accounting.update-funds'), {
            base_funds: baseFundsValue,
        }, {
            onStart: () => setBaseFundsProcessing(true),
            onSuccess: () => setShowBaseFundsModal(false),
            onFinish: () => setBaseFundsProcessing(false),
        });
    };

    const selectedItem = reviewModal.item;
    const isPayroll = selectedItem?.type === 'payroll';
    const isPendingReview = reviewModal.source === 'pending';

    return (
        <>
            <Head title="Finance & Approvals" />
            <SellerHeader
                title="Finance"
                subtitle="Business funds, payroll review, and inventory approvals"
                auth={auth}
                onMenuClick={openSidebar}
                badge={{ label: 'Enterprise', iconColor: 'text-emerald-400' }}
                actions={(
                    <a
                        href={route('accounting.export')}
                        className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-600 shadow-sm transition hover:bg-stone-50"
                    >
                        <Download size={15} />
                        <span>Export Ledger</span>
                    </a>
                )}
            />

            <main className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 space-y-6">
                {isAccountingReadOnly && (
                    <ReadOnlyCapabilityNotice label="Finance review is read only for your account. Approval and fund actions are disabled." />
                )}

                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                        <AlertCircle size={13} />
                        Pending requests stay here until reviewed
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                        <CheckCircle size={13} />
                        Approved releases post to the finance ledger
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-stone-600">
                        <History size={13} />
                        Rejections keep the reviewer note
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-2xl border border-stone-200 bg-white p-5">
                        <div className="mb-3 flex items-start justify-between">
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 text-emerald-600"><Banknote size={20} /></div>
                            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-600">Revenue</span>
                        </div>
                        <h3 className="mb-0.5 text-2xl font-bold text-gray-900">{formatShortMoney(finances.revenue)}</h3>
                        <p className="text-[10px] text-gray-400">Realized from completed orders</p>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white p-5">
                        <div className="mb-3 flex items-start justify-between">
                            <div className="rounded-xl border border-rose-100 bg-rose-50 p-2.5 text-rose-600"><ClipboardList size={20} /></div>
                            <span className="rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-[10px] font-bold uppercase text-rose-600">Expenses</span>
                        </div>
                        <h3 className="mb-0.5 text-2xl font-bold text-gray-900">{formatShortMoney(finances.expenses)}</h3>
                        <p className="text-[10px] text-gray-400">Stock purchases and payroll</p>
                    </div>

                    <div className="rounded-2xl border border-stone-900 bg-stone-900 p-5">
                        <div className="mb-3 flex items-start justify-between">
                            <div className="rounded-xl border border-white/10 bg-white/10 p-2.5 text-white"><Building2 size={20} /></div>
                            <button
                                onClick={() => setShowBaseFundsModal(true)}
                                disabled={!canEditAccounting}
                                className={`flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-900/30 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-300 transition ${canEditAccounting ? 'cursor-pointer hover:bg-emerald-800/50' : 'cursor-not-allowed opacity-50'}`}
                                title={canEditAccounting ? 'Edit Base Funds' : 'Read only'}
                            >
                                <Pencil size={10} /> Edit Base Funds
                            </button>
                        </div>
                        <h3 className="mb-0.5 text-3xl font-bold tracking-tight text-white">{formatShortMoney(finances.balance)}</h3>
                        <p className="mt-1 text-[10px] text-gray-400">Base: {formatShortMoney(finances.baseFunds || 0)} + Revenue - Expenses</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 border-b border-gray-200 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    <button onClick={() => setActiveTab('pending')} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${activeTab === 'pending' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
                        <AlertCircle size={16} /> Pending Approvals
                        {filteredPending.length > 0 && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-rose-600">{filteredPending.length}</span>}
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${activeTab === 'history' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
                        <History size={16} /> Transaction Ledger
                    </button>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="relative block w-full sm:max-w-sm">
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder={activeTab === 'pending' ? 'Search requester, supply, payroll month, or request ID' : 'Search ledger entries, requester, supply, or request ID'}
                            className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-10 text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-clay-400 focus:ring-clay-400"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 transition hover:text-stone-700"
                            >
                                Clear
                            </button>
                        )}
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                        {[
                            ['all', 'All entries'],
                            ['payroll', 'People & Payroll'],
                            ['stock_request', 'Inventory'],
                        ].map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setEntryTypeFilter(value)}
                                className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                                    entryTypeFilter === value
                                        ? 'border-clay-200 bg-clay-50 text-clay-700'
                                        : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                        <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-semibold text-stone-600">
                            {(activeTab === 'pending' ? filteredPending.length : filteredHistory.length)} visible
                        </span>
                    </div>
                </div>

                {activeTab === 'pending' && (
                    <div className="overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-stone-100 bg-[#FDFBF9] px-6 py-4">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="text-stone-400" size={18} strokeWidth={2.5} />
                                <h3 className="text-sm font-bold tracking-tight text-stone-900">Pending Review</h3>
                            </div>
                        </div>

                        <div className="divide-y divide-stone-100">
                            {paginatedPending.length > 0 ? paginatedPending.map((item) => (
                                <div key={`${item.type}-${item.id}`} className="group px-6 py-4 transition-colors hover:bg-stone-50/50 lg:flex lg:items-center lg:justify-between lg:gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 ${item.type === 'payroll' ? 'border-stone-200 bg-stone-50 text-stone-500' : 'border-clay-200 bg-[#FCF7F2] text-clay-600'}`}>
                                            {item.type === 'payroll' ? <Users size={18} strokeWidth={2.5} /> : <FileText size={18} strokeWidth={2.5} />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${typeTone(item.type)}`}>{item.type === 'payroll' ? 'People & Payroll' : 'Inventory'}</span>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                                                    #{item.id} &bull; {formatDate(item.created_at)}
                                                </span>
                                            </div>
                                            
                                            <h4 className="mt-1.5 text-[14px] font-bold leading-tight text-stone-900">{item.type === 'payroll' ? `Payroll for ${item.month}` : item.supply?.name}</h4>
                                            
                                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-stone-500">
                                                <span>Requested by <strong className="font-bold text-stone-700">{item.requester?.name || 'Seller owner'}</strong> <span className="text-stone-400 ml-1">({formatRole(item.requester?.role)})</span></span>
                                                <span className="h-1 w-1 rounded-full bg-stone-300" />
                                                <span>{item.type === 'payroll' ? `${item.employee_count} Employees` : `${item.quantity} ${item.supply?.unit || ''}`}</span>
                                                {item.activity?.submitted_at && (
                                                    <>
                                                        <span className="h-1 w-1 rounded-full bg-stone-300" />
                                                        <span>Submitted {formatDate(item.activity.submitted_at)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-col gap-3 sm:mt-0 sm:flex-row sm:items-center sm:justify-end lg:self-auto min-w-[200px]">
                                        <div className="text-left sm:text-right">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Amount Due</p>
                                            <p className="text-lg font-bold tracking-tight text-stone-900">{formatShortMoney(item.amount)}</p>
                                        </div>
                                        <button onClick={() => openReviewModal(item, 'pending')} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-sm transition hover:bg-clay-700 sm:w-auto">
                                            <Eye size={14} strokeWidth={2.5} /> Review
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <WorkspaceEmptyState
                                    icon={CheckCircle}
                                    title="No pending approvals"
                                    description={searchTerm || entryTypeFilter !== 'all'
                                        ? 'Try another search or clear the active filter to review more requests.'
                                        : 'Payroll and inventory requests that still need finance review will appear here.'}
                                    actionLabel="Review Inventory"
                                    actionHref={route('procurement.index')}
                                    secondaryActionLabel="Open HR"
                                    secondaryActionHref={route('hr.index')}
                                />
                            )}
                        </div>

                        <div className="border-t border-stone-100 bg-[#FDFBF9]">
                            <CompactPagination
                                currentPage={pendingPage}
                                totalPages={totalPendingPages}
                                totalItems={filteredPending.length}
                                itemsPerPage={itemsPerPage}
                                itemLabel="requests"
                                onPageChange={setPendingPage}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white shadow-sm">
                        <div className="border-b border-stone-100 bg-[#FDFBF9] px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <History className="text-stone-400" size={18} strokeWidth={2.5} />
                                <h3 className="text-sm font-bold tracking-tight text-stone-900">Transaction Ledger</h3>
                            </div>
                        </div>
                        <div className="divide-y divide-stone-100">
                            {paginatedHistory.length > 0 ? paginatedHistory.map((item) => {
                                const isApproved = ['paid', 'completed', 'accounting_approved', 'ordered', 'received', 'partially_received'].includes(String(item.status).toLowerCase());

                                return (
                                    <div key={`${item.type}-${item.id}`} className="group px-6 py-4 transition-colors hover:bg-stone-50/50 lg:flex lg:items-center lg:justify-between lg:gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 ${item.type === 'payroll' ? 'border-stone-200 bg-stone-50 text-stone-500' : 'border-clay-200 bg-[#FCF7F2] text-clay-600'}`}>
                                                {item.type === 'payroll' ? <Users size={18} strokeWidth={2.5} /> : <FileText size={18} strokeWidth={2.5} />}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${typeTone(item.type)}`}>{item.type === 'payroll' ? 'Finance Review' : 'Inventory Ops'}</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                                                        #{item.id} &bull; {formatDate(item.activity?.requested_at || item.created_at)}
                                                    </span>
                                                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${statusTone(item.status)}`}>
                                                        {String(item.status).replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                                
                                                <h4 className="mt-1.5 text-[14px] font-bold leading-tight text-stone-900">{item.type === 'payroll' ? `Payroll for ${item.month}` : item.supply?.name}</h4>
                                                
                                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-stone-500">
                                                    <span>Requested by <strong className="font-bold text-stone-700">{item.requester?.name || 'Seller owner'}</strong></span>
                                                    <span className="h-1 w-1 rounded-full bg-stone-300" />
                                                    <span>{item.type === 'payroll' ? `${item.employee_count} Employees` : `${item.quantity} ${item.supply?.unit || ''}`}</span>
                                                    {item.activity?.last_reviewed_at && (
                                                        <>
                                                            <span className="h-1 w-1 rounded-full bg-stone-300" />
                                                            <span>{reviewLabel(item.status)} {formatDate(item.activity.last_reviewed_at)}</span>
                                                        </>
                                                    )}
                                                </div>
                                                
                                                                                                {item.rejection_reason && <p className="mt-2 text-[11px] font-medium text-red-600">Note: {item.rejection_reason}</p>}
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-col gap-3 sm:mt-0 sm:flex-row sm:items-center sm:justify-end lg:self-auto min-w-[200px]">
                                            <div className="text-left sm:text-right">
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Action Amount</p>
                                                <p className="text-lg font-bold tracking-tight text-stone-900">{isApproved ? '- ' : ''}{formatShortMoney(item.amount)}</p>
                                            </div>
                                            <button onClick={() => openReviewModal(item, 'history')} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-stone-700 shadow-sm transition hover:bg-stone-50 hover:text-stone-900 sm:w-auto">
                                                <Eye size={14} strokeWidth={2.5} /> View
                                            </button>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <WorkspaceEmptyState
                                    compact
                                    icon={History}
                                    title="No transaction history yet"
                                    description={searchTerm || entryTypeFilter !== 'all'
                                        ? 'Try another search or clear the active filter to review more ledger history.'
                                        : 'Approved or rejected payroll and inventory releases will be recorded in this ledger.'}
                                />
                            )}
                        </div>

                        <div className="border-t border-stone-100 bg-[#FDFBF9]">
                            <CompactPagination
                                currentPage={historyPage}
                                totalPages={totalHistoryPages}
                                totalItems={filteredHistory.length}
                                itemsPerPage={itemsPerPage}
                                itemLabel="entries"
                                onPageChange={setHistoryPage}
                            />
                        </div>
                    </div>
                )}
            </main>

            <Modal show={showBaseFundsModal} onClose={() => setShowBaseFundsModal(false)} maxWidth="sm">
                <form onSubmit={handleUpdateBaseFunds} className="flex max-h-[85vh] flex-col">
                    <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
                        <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600"><Building2 size={24} /></div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Edit Starting Balance</h2>
                                <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                                    Set the initial business capital used in the finance balance.
                                </p>
                            </div>
                        </div>
                        <button type="button" disabled={baseFundsProcessing} onClick={() => setShowBaseFundsModal(false)} className={`${modalCloseButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className="overflow-y-auto px-6 py-6">
                        <p className="mb-6 text-xs leading-relaxed text-gray-500">
                            Available Funds will be calculated as:
                            <br />
                            <span className="mt-2 inline-block rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-[12px] font-bold text-gray-800">Base Funds + Revenue - Expenses</span>
                        </p>

                        <div className="mb-6 relative">
                            <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2 block">Base Funds Amount (PHP)</label>
                            <input type="number" min="0" step="any" value={baseFundsValue} onChange={(event) => setBaseFundsValue(event.target.value)} className="w-full rounded-xl border-gray-300 px-4 py-3 font-bold text-gray-900 transition focus:border-emerald-500 focus:ring-emerald-500" required />
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-6 py-4">
                        {baseFundsProcessing && (
                            <WorkspaceLoadingState
                                label="Saving balance"
                                detail="Updating accounting base funds"
                                className="mr-auto"
                            />
                        )}
                        <button type="button" disabled={baseFundsProcessing} onClick={() => setShowBaseFundsModal(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={baseFundsProcessing} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60">
                            {baseFundsProcessing && <LoaderCircle size={15} className="animate-spin" />}
                            {baseFundsProcessing ? 'Saving...' : 'Save Balance'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal show={reviewModal.open} onClose={closeReviewModal} afterLeave={resetReviewModal} maxWidth={isPayroll ? '5xl' : '2xl'}>
                <div className="flex max-h-[85vh] flex-col">
                    <div className="flex flex-col gap-2.5 border-b border-stone-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 bg-[#FDFBF9]">
                        <div className="flex items-start gap-4">
                            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${isPayroll ? 'border-stone-200 bg-stone-50 text-stone-500' : 'border-clay-200 bg-[#FCF7F2] text-clay-600'}`}>
                                {isPayroll ? <Users size={18} strokeWidth={2.5} /> : <FileText size={18} strokeWidth={2.5} />}
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${isPayroll ? 'bg-stone-100 text-stone-700 border-stone-200' : 'bg-[#FCF7F2] text-clay-700 border-[#E7D8C9]'}`}>{isPayroll ? 'Payroll Review' : 'Inventory Review'}</span>
                                    {selectedItem?.status && <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${statusTone(selectedItem.status)}`}>{String(selectedItem.status).replace(/_/g, ' ')}</span>}
                                </div>
                                <h2 className="mt-1.5 text-[15px] font-bold leading-tight text-stone-900 sm:text-base">{isPayroll ? `Payroll Review for ${selectedItem?.month || ''}` : `Stock Request #${selectedItem?.id || ''}`}</h2>
                                <p className="mt-1 text-[11px] font-medium text-stone-500 sm:text-[12px]">{isPendingReview ? 'Review the breakdown before approving or rejecting.' : 'Review the stored breakdown and any rejection reason.'}</p>
                            </div>
                        </div>
                        {isPayroll && (
                            <div className="rounded-[1.25rem] border border-[#E7D8C9] bg-[#FCF7F2] px-4 py-2.5 text-right">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-clay-500">Requested Amount</p>
                                <p className="mt-0.5 text-xl font-bold tracking-tight text-clay-900">{formatMoney(selectedItem?.amount)}</p>
                            </div>
                        )}
                        <button type="button" disabled={!!reviewProcessing} onClick={closeReviewModal} className={`${modalCloseButtonClass} sm:self-start disabled:cursor-not-allowed disabled:opacity-50`}>
                            <X size={18} strokeWidth={2.5} />
                        </button>
                    </div>

                    {selectedItem && (
                        <div className="mt-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6 align-stretch">
                            <div className="rounded-[1.25rem] border border-stone-200 bg-stone-50 px-4 py-3 text-[11px] font-medium leading-relaxed text-stone-600">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Review flow</p>
                                <p className="mt-1">{isPendingReview ? 'Approve to release it into the finance ledger, or reject it with a reason that the requester can review later.' : 'This record is already part of the stored finance trail, including the final review result.'}</p>
                            </div>

                            {!isPayroll && (
                                <div className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm">
                                    <div className="grid divide-y divide-stone-100 md:grid-cols-2 md:divide-x md:divide-y-0">
                                        <AuditSheet
                                            title="Request & Supply"
                                            rows={[
                                                {
                                                    label: 'Requester',
                                                    value: (
                                                        <div className="text-right">
                                                            <div className="font-bold text-stone-900 text-[13px]">{selectedItem.requester?.name || 'Seller owner'}</div>
                                                            <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-0.5">{formatRole(selectedItem.requester?.role)}</div>
                                                        </div>
                                                    ),
                                                },
                                                { label: 'Submitted', value: formatDate(selectedItem.created_at) },
                                                { label: 'Supply', value: selectedItem.supply?.name },
                                                { label: 'Category', value: selectedItem.supply?.category },
                                                { label: 'Supplier', value: selectedItem.supply?.supplier || 'Not provided' },
                                                { label: 'Unit', value: selectedItem.supply?.unit || 'N/A' },
                                            ]}
                                        />

                                        <AuditSheet
                                            title="Release & Inventory"
                                            rows={[
                                                { label: 'Requested', value: `${selectedItem.quantity} ${selectedItem.supply?.unit || ''}`.trim() },
                                                { label: 'Unit Cost', value: formatMoney(selectedItem.supply?.unit_cost) },
                                                { label: 'Total Cost', value: formatMoney(selectedItem.amount) },
                                                {
                                                    label: 'Funds',
                                                    value: (
                                                        <div className="text-right">
                                                            <div className="font-bold text-stone-900 text-[13px]">{formatMoney(selectedItem.fund_snapshot?.available_balance)}</div>
                                                            <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${Number(selectedItem.fund_snapshot?.remaining_balance) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                New: {formatMoney(selectedItem.fund_snapshot?.remaining_balance)}
                                                            </div>
                                                        </div>
                                                    ),
                                                },
                                                {
                                                    label: 'Stock',
                                                    value: `Cur ${selectedItem.supply?.current_stock ?? 'N/A'} | Min ${selectedItem.supply?.min_stock ?? 'N/A'}`,
                                                },
                                                { label: 'Capacity', value: selectedItem.supply?.available_capacity },
                                            ]}
                                        />
                                    </div>
                                </div>
                            )}

                            {isPayroll && (
                                <>
                                    <div className="grid gap-4 lg:grid-cols-2">
                                        <div className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Requester File</p>
                                            <div className="mt-3">
                                                <p className="text-[15px] font-bold text-stone-900">{selectedItem.requester?.name || 'Seller owner'}</p>
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mt-1">{formatRole(selectedItem.requester?.role)}</p>
                                                <p className="text-[11px] font-medium text-stone-400 mt-2">Submitted {formatDate(selectedItem.created_at)}</p>
                                            </div>
                                        </div>

                                        <div className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Treasury Check</p>
                                            <div className="mt-3 grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Current Balance</p>
                                                    <p className="mt-0.5 text-lg font-bold tracking-tight text-stone-900">{formatMoney(selectedItem.fund_snapshot?.available_balance)}</p>
                                                </div>
                                                <div className="border-l border-stone-100 pl-3">
                                                    <p className={`text-[9px] font-bold uppercase tracking-widest ${Number(selectedItem.fund_snapshot?.remaining_balance) < 0 ? 'text-red-500' : 'text-emerald-500'}`}>After Release</p>
                                                    <p className={`mt-0.5 text-lg font-bold tracking-tight ${Number(selectedItem.fund_snapshot?.remaining_balance) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{formatMoney(selectedItem.fund_snapshot?.remaining_balance)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-[1.5rem] border border-stone-200 bg-white shadow-sm overflow-hidden">
                                        <div className="px-5 py-4 border-b border-stone-100 bg-[#FDFBF9]">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Detailed Ledger</p>
                                            <p className="mt-1 text-[11px] font-medium text-stone-500">Employee specific deductions and runtime pay</p>
                                        </div>

                                        <div className="flex gap-4 px-5 py-4 border-b border-stone-100 bg-stone-50 overflow-x-auto text-[11px]">
                                            <span className="font-medium text-stone-500"><strong className="font-bold text-stone-900 mr-1.5">{selectedItem.employee_count}</strong>Employees</span>
                                            <span className="font-medium text-stone-500"><strong className="font-bold text-stone-900 mr-1.5">{formatMoney(selectedItem.amount)}</strong>Total Disbursed</span>
                                            {selectedItem.activity?.last_reviewed_at && <span className="font-medium text-stone-500 ml-auto whitespace-nowrap">Reviewed {formatDateTime(selectedItem.activity.last_reviewed_at)}</span>}
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[980px] text-left">
                                                <thead>
                                                    <tr className="border-b border-stone-100 text-[9px] font-bold uppercase tracking-widest text-stone-400">
                                                        <th className="px-5 py-3.5">Employee</th>
                                                        <th className="px-3 py-3.5 text-right">Base Salary</th>
                                                        <th className="px-3 py-3.5 text-right">Work Days</th>
                                                        <th className="px-3 py-3.5 text-right text-red-500">Abs/Und</th>
                                                        <th className="px-3 py-3.5 text-right text-emerald-500">Overtime</th>
                                                        <th className="px-5 py-3.5 text-right">Net Release</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-stone-100">
                                                    {selectedItem.line_items?.map((line) => (
                                                        <tr key={line.id} className="text-[12px] font-medium text-stone-600 transition-colors hover:bg-stone-50">
                                                            <td className="px-5 py-3 font-bold text-stone-900">{line.employee_name}</td>
                                                            <td className="px-3 py-3 text-right">{formatMoney(line.base_salary)}</td>
                                                            <td className="px-3 py-3 text-right">{line.days_worked}</td>
                                                            <td className="px-3 py-3 text-right text-red-600">-{formatMoney(Number(line.absence_deduction) + Number(line.undertime_deduction))}</td>
                                                            <td className="px-3 py-3 text-right text-emerald-600">+{formatMoney(line.overtime_pay)}</td>
                                                            <td className="px-5 py-3 text-right text-[13px] font-bold tracking-tight text-stone-900">{formatMoney(line.net_pay)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}

                            {selectedItem.rejection_reason && (
                                <div className="rounded-[1.25rem] border border-red-200/60 bg-red-50 px-5 py-4">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-red-500">Stored Rejection Reason</p>
                                    <p className="mt-1 text-[13px] font-bold text-red-800">{selectedItem.rejection_reason}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="border-t border-stone-100 px-5 py-4 sm:px-6 bg-[#FDFBF9]">
                        {isPendingReview ? (
                            <div className="space-y-4">
                                <div className="rounded-[1.25rem] border border-stone-200 bg-stone-50 p-4">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-stone-500">Rejection Reason</label>
                                    <textarea disabled={!canEditAccounting} className="mt-3 w-full resize-none rounded-xl border-stone-300 text-[13px] font-medium transition focus:border-red-500 focus:ring-red-500 shadow-sm disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500" rows={3} placeholder="State the exact finance reason if you reject this release..." value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />
                                    <p className="mt-2 text-[10px] font-medium text-stone-500 uppercase tracking-wide">A specific internal note is required before rejecting a financial release.</p>
                                </div>

                                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                    {reviewProcessing && (
                                        <WorkspaceLoadingState
                                            label={reviewProcessing === 'approve' ? 'Approving request' : 'Rejecting request'}
                                            detail="Updating accounting review safely"
                                            className="sm:mr-auto"
                                        />
                                    )}
                                    <button type="button" disabled={!!reviewProcessing} onClick={closeReviewModal} className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-stone-500 transition hover:bg-stone-50 hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-50">Close</button>
                                    <button type="button" onClick={handleReject} disabled={!canEditAccounting || !rejectReason.trim() || !!reviewProcessing} className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest transition shadow-sm ${canEditAccounting && rejectReason.trim() && !reviewProcessing ? 'bg-red-600 text-white hover:bg-red-700' : 'cursor-not-allowed border border-stone-200 bg-stone-100 text-stone-400'}`}>
                                        {reviewProcessing === 'reject' && <LoaderCircle size={15} className="animate-spin" />}
                                        {reviewProcessing === 'reject' ? 'Rejecting...' : 'Reject Request'}
                                    </button>
                                    <button type="button" onClick={handleApprove} disabled={!canEditAccounting || !!reviewProcessing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-sm transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-60">
                                        {reviewProcessing === 'approve' && <LoaderCircle size={15} className="animate-spin" />}
                                        {reviewProcessing === 'approve' ? 'Approving...' : (isPayroll ? 'Approve & Release' : 'Approve Amount')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-end">
                                <button type="button" disabled={!!reviewProcessing} onClick={closeReviewModal} className="rounded-xl bg-stone-900 border border-transparent px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-sm transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-60">Close Verification</button>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </>
    );
}

FundRelease.layout = (page) => <SellerWorkspaceLayout active="accounting">{page}</SellerWorkspaceLayout>;

function DetailTile({ label, value }) {
    return (
        <div className="rounded-[1.25rem] border border-stone-200 bg-white shadow-sm px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">{label}</p>
            <p className="mt-1 text-[13px] font-bold text-stone-900">{value ?? 'N/A'}</p>
        </div>
    );
}

function AuditSheet({ title, rows }) {
    return (
        <div className="px-4 py-3.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">{title}</p>
            <div className="mt-3 divide-y divide-stone-100">
                {rows.map(({ label, value }) => (
                    <div key={label} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mt-0.5">{label}</span>
                        <span className="max-w-[70%] text-right text-[13px] font-medium text-stone-900">{value ?? 'N/A'}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

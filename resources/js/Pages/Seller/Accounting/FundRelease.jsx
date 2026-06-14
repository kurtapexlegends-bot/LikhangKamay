import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import SellerHeader from '@/Layouts/SellerHeader';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import ReadOnlyCapabilityNotice from '@/Components/Seller/Shared/ReadOnlyCapabilityNotice';
import useSellerModuleAccess from '@/hooks/useSellerModuleAccess';
import { AlertCircle, History, Search, X } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import ExportButton from '@/Components/ExportButton';

// Subcomponents
import FundMetrics from '@/Components/Seller/Accounting/FundMetrics';
import BaseFundsModal from '@/Components/Seller/Accounting/BaseFundsModal';
import PendingApprovalsList from '@/Components/Seller/Accounting/PendingApprovalsList';
import TransactionLedgerTable from '@/Components/Seller/Accounting/TransactionLedgerTable';
import ReleaseRequestModal from '@/Components/Seller/Accounting/ReleaseRequestModal';

export default function FundRelease({ auth, pendingRequests, pendingPayrolls = [], history, payrollHistory = [], salesHistory = [], finances }) {
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
        [...history, ...payrollHistory, ...salesHistory]
            .map((item) => ({ ...item, _date: new Date(item.updated_at || item.created_at || Date.now()) }))
            .sort((a, b) => b._date - a._date)
    ), [history, payrollHistory, salesHistory]);

    const itemsPerPage = 10;
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
                item.order_number,
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
            onShadow: true,
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
            onShadow: true,
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

    return (
        <>
            <Head title="Finance & Approvals" />
            <SellerHeader
                title="Finance"
                subtitle="Track shop payouts, release requests, and billing."
                auth={auth}
                onMenuClick={openSidebar}
                badge={{ label: 'Enterprise', iconColor: 'text-emerald-400' }}
                actions={(
                    <ExportButton href={route('accounting.export')} variant="primary">
                        Export Ledger
                    </ExportButton>
                )}
            />

            <main className="flex-1 w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-6">
                {isAccountingReadOnly && (
                    <ReadOnlyCapabilityNotice label="Finance review is read only for your account. Approval and fund actions are disabled." />
                )}

                {/* Metrics Cards */}
                <FundMetrics
                    finances={finances}
                    canEditAccounting={canEditAccounting}
                    onEditBaseFunds={() => setShowBaseFundsModal(true)}
                />

                {/* Tabs */}
                <div className="flex items-center gap-4 border-b border-gray-200 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab('pending')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition min-h-[44px] ${
                            activeTab === 'pending'
                                ? 'border-gray-900 text-gray-900'
                                : 'border-transparent text-gray-400 hover:text-gray-700'
                        }`}
                    >
                        <AlertCircle size={16} /> Pending Approvals
                        {filteredPending.length > 0 && (
                            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-rose-600">
                                {filteredPending.length}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition min-h-[44px] ${
                            activeTab === 'history'
                                ? 'border-gray-900 text-gray-900'
                                : 'border-transparent text-gray-400 hover:text-gray-700'
                        }`}
                    >
                        <History size={16} /> Transaction Ledger
                    </button>
                </div>

                {/* Search & Filter Controls */}
                <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-sm">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder={
                                activeTab === 'pending'
                                    ? 'Search requester, supply, payroll month...'
                                    : 'Search ledger entries, requester...'
                            }
                            className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-clay-500 focus:border-clay-500 transition-shadow"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition min-h-[30px] min-w-[30px] flex items-center justify-center"
                                title="Clear search"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {[
                            ['all', 'All entries'],
                            ['sale', 'Sales Settlements'],
                            ['payroll', 'People & Payroll'],
                            ['stock_request', 'Inventory'],
                        ].map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setEntryTypeFilter(value)}
                                className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors min-h-[36px] sm:min-h-0 ${
                                    entryTypeFilter === value
                                        ? 'border-clay-200 bg-clay-50 text-clay-700'
                                        : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                        <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-[11px] font-semibold text-stone-600 min-h-[36px] sm:min-h-0">
                            {(activeTab === 'pending' ? filteredPending.length : filteredHistory.length)} visible
                        </span>
                    </div>
                </div>

                {/* Tab content views */}
                {activeTab === 'pending' && (
                    <PendingApprovalsList
                        paginatedPending={paginatedPending}
                        totalPendingPages={totalPendingPages}
                        currentPage={pendingPage}
                        onPageChange={setPendingPage}
                        onReview={openReviewModal}
                        filteredCount={filteredPending.length}
                        searchTerm={searchTerm}
                        entryTypeFilter={entryTypeFilter}
                    />
                )}

                {activeTab === 'history' && (
                    <TransactionLedgerTable
                        paginatedHistory={paginatedHistory}
                        totalHistoryPages={totalHistoryPages}
                        currentPage={historyPage}
                        onPageChange={setHistoryPage}
                        onView={openReviewModal}
                        filteredCount={filteredHistory.length}
                        searchTerm={searchTerm}
                        entryTypeFilter={entryTypeFilter}
                    />
                )}
            </main>


            {/* Base Funds Update Modal */}
            <BaseFundsModal
                show={showBaseFundsModal}
                onClose={() => setShowBaseFundsModal(false)}
                baseFundsValue={baseFundsValue}
                setBaseFundsValue={setBaseFundsValue}
                onSubmit={handleUpdateBaseFunds}
                processing={baseFundsProcessing}
            />

            {/* Release Request details modal drawer */}
            <ReleaseRequestModal
                isOpen={reviewModal.open}
                onClose={closeReviewModal}
                item={reviewModal.item}
                source={reviewModal.source}
                canEditAccounting={canEditAccounting}
                rejectReason={rejectReason}
                setRejectReason={setRejectReason}
                onApprove={handleApprove}
                onReject={handleReject}
                reviewProcessing={reviewProcessing}
            />
        </>
    );
}

FundRelease.layout = (page) => <SellerWorkspaceLayout active="accounting">{page}</SellerWorkspaceLayout>;

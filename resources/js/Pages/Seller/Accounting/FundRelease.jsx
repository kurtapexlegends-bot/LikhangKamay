import React, { useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import SellerHeader from '@/Layouts/SellerHeader';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import ReadOnlyCapabilityNotice from '@/Components/Seller/Shared/ReadOnlyCapabilityNotice';
import useSellerModuleAccess from '@/hooks/useSellerModuleAccess';
import { AlertCircle, History, Search, X, LoaderCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import ExportButton from '@/Components/ExportButton';

// Subcomponents
import FundMetrics from '@/Components/Seller/Accounting/FundMetrics';
import BaseFundsModal from '@/Components/Seller/Accounting/BaseFundsModal';
import PendingApprovalsList from '@/Components/Seller/Accounting/PendingApprovalsList';
import TransactionLedgerTable from '@/Components/Seller/Accounting/TransactionLedgerTable';
import ReleaseRequestDetails from '@/Components/Seller/Accounting/ReleaseRequestDetails';
import AccountingFilterPanel from '@/Components/Seller/Accounting/AccountingFilterPanel';

export default function FundRelease({ auth, pendingRequests, history, finances, filters = {} }) {
    const { openSidebar } = useSellerWorkspaceShell();
    const { url } = usePage();
    const { flash } = usePage().props;
    const { addToast } = useToast();
    const { canEdit: canEditAccounting, isReadOnly: isAccountingReadOnly } = useSellerModuleAccess('accounting');

    const [isTableShimmering, setIsTableShimmering] = useState(false);
    const [isSearchLoading, setIsSearchLoading] = useState(false);

    // Parse initial query params for state sync
    const getInitialQueryParam = (param, defaultVal) => {
        const urlParams = new URLSearchParams(url.includes('?') ? url.substring(url.indexOf('?')) : '');
        return urlParams.get(param) || defaultVal;
    };

    const [activeTab, setActiveTab] = useState(() => getInitialQueryParam('tab', 'pending'));
    const [showBaseFundsModal, setShowBaseFundsModal] = useState(false);
    const [baseFundsValue, setBaseFundsValue] = useState(finances.baseFunds || 0);
    const [reviewModal, setReviewModal] = useState({ open: false, item: null, source: 'pending' });
    const [rejectReason, setRejectReason] = useState('');
    const [baseFundsProcessing, setBaseFundsProcessing] = useState(false);
    const [reviewProcessing, setReviewProcessing] = useState(null);
    const [searchTerm, setSearchTerm] = useState(() => getInitialQueryParam('search', ''));
    const [entryTypeFilter, setEntryTypeFilter] = useState(() => getInitialQueryParam('type', 'all'));
    const [ledgerStatusFilter, setLedgerStatusFilter] = useState(() => getInitialQueryParam('ledger_status', 'all'));
    const [startDateFilter, setStartDateFilter] = useState(() => getInitialQueryParam('start_date', ''));
    const [endDateFilter, setEndDateFilter] = useState(() => getInitialQueryParam('end_date', ''));
    
    // Debounce the search input to avoid spamming server requests on every keystroke
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 400);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    // Sync state with URL navigation (e.g. back/forward button)
    useEffect(() => {
        const urlParams = new URLSearchParams(url.includes('?') ? url.substring(url.indexOf('?')) : '');
        const urlTab = urlParams.get('tab') || 'pending';
        const urlSearch = urlParams.get('search') || '';
        const urlType = urlParams.get('type') || 'all';
        const urlLedgerStatus = urlParams.get('ledger_status') || 'all';
        const urlStartDate = urlParams.get('start_date') || '';
        const urlEndDate = urlParams.get('end_date') || '';

        if (urlTab !== activeTab) setActiveTab(urlTab);
        if (urlType !== entryTypeFilter) setEntryTypeFilter(urlType);
        if (urlLedgerStatus !== ledgerStatusFilter) setLedgerStatusFilter(urlLedgerStatus);
        if (urlStartDate !== startDateFilter) setStartDateFilter(urlStartDate);
        if (urlEndDate !== endDateFilter) setEndDateFilter(urlEndDate);

        // Only sync search term from URL if the search input is not currently focused.
        if (document.activeElement?.id !== 'accounting-search' && urlSearch !== searchTerm) {
            setSearchTerm(urlSearch);
        }
    }, [url]);

    const reload = (newParams) => {
        const urlParams = new URLSearchParams(url.includes('?') ? url.substring(url.indexOf('?')) : '');
        const params = {
            tab: urlParams.get('tab') || 'pending',
            search: urlParams.get('search') || '',
            type: urlParams.get('type') || 'all',
            ledger_status: urlParams.get('ledger_status') || 'all',
            start_date: urlParams.get('start_date') || '',
            end_date: urlParams.get('end_date') || '',
            page_pending: urlParams.get('page_pending') || '1',
            page_history: urlParams.get('page_history') || '1',
            ...newParams
        };

        // Clean up empty params
        if (!params.search.trim()) delete params.search;
        if (params.type === 'all') delete params.type;
        if (params.ledger_status === 'all') delete params.ledger_status;
        if (!params.start_date) delete params.start_date;
        if (!params.end_date) delete params.end_date;

        if (params.tab === 'pending') {
            delete params.page_history;
        } else {
            delete params.page_pending;
        }

        const isSearchUpdate = 'search' in newParams;

        router.get(route('accounting.index'), params, {
            preserveState: true,
            preserveScroll: true,
            onStart: () => {
                if (isSearchUpdate) {
                    setIsSearchLoading(true);
                } else {
                    setIsTableShimmering(true);
                }
            },
            onFinish: () => {
                setIsSearchLoading(false);
                setIsTableShimmering(false);
            }
        });
    };

    const applyFilters = (filterObj) => {
        if ('type' in filterObj) setEntryTypeFilter(filterObj.type);
        if ('ledger_status' in filterObj) setLedgerStatusFilter(filterObj.ledger_status);
        if ('start_date' in filterObj) setStartDateFilter(filterObj.start_date);
        if ('end_date' in filterObj) setEndDateFilter(filterObj.end_date);
        closeReviewModal();
        reload({
            ...filterObj,
            page_pending: 1,
            page_history: 1,
        });
    };

    const resetFilters = () => {
        setEntryTypeFilter('all');
        setLedgerStatusFilter('all');
        setStartDateFilter('');
        setEndDateFilter('');
        closeReviewModal();
        reload({
            type: 'all',
            ledger_status: 'all',
            start_date: '',
            end_date: '',
            page_pending: 1,
            page_history: 1,
        });
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(url.includes('?') ? url.substring(url.indexOf('?')) : '');
        const urlSearch = urlParams.get('search') || '';
        if (debouncedSearch !== urlSearch) {
            closeReviewModal();
            reload({
                search: debouncedSearch,
                page_pending: 1,
                page_history: 1,
            });
        }
    }, [debouncedSearch]);

    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
        closeReviewModal();
        reload({
            tab: tabName,
            page_pending: 1,
            page_history: 1,
        });
    };

    const handleTypeChange = (typeVal) => {
        setEntryTypeFilter(typeVal);
        closeReviewModal();
        reload({
            type: typeVal,
            page_pending: 1,
            page_history: 1,
        });
    };

    const handlePageChange = (pageNum) => {
        closeReviewModal();
        if (activeTab === 'pending') {
            reload({ page_pending: pageNum });
        } else {
            reload({ page_history: pageNum });
        }
    };

    useFlashToast(flash, addToast);

    const closeReviewModal = () => {
        setReviewModal({ open: false, item: null, source: 'pending' });
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
            <Head title={reviewModal.item ? `Review: ${reviewModal.item.order_number || ('Request #' + reviewModal.item.id)}` : "Finance & Approvals"} />
            <SellerHeader
                title={reviewModal.item ? `Review Request #${reviewModal.item.id}` : "Finance & Fund Approvals"}
                subtitle={reviewModal.item ? `Audit details for request #${reviewModal.item.id}` : "Track enterprise balances, capital adjustments, and approve release requests."}
                auth={auth}
                onMenuClick={openSidebar}
                badge={{ label: 'Enterprise', iconColor: 'text-emerald-400' }}
                breadcrumbs={
                    reviewModal.item
                        ? [
                              { label: 'Finance & Approvals', href: route('accounting.index') },
                              { label: `Request #${reviewModal.item.id}` }
                          ]
                        : null
                }
                actions={
                    reviewModal.item ? null : (
                        <ExportButton href={route('accounting.export')} variant="primary">
                            EXPORT
                        </ExportButton>
                    )
                }
            />

            <main className="flex-1 w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-6 pb-8">
                {reviewModal.item ? (
                    <div className="max-w-5xl mx-auto">
                        <ReleaseRequestDetails
                            item={reviewModal.item}
                            source={reviewModal.source}
                            canEditAccounting={canEditAccounting}
                            rejectReason={rejectReason}
                            setRejectReason={setRejectReason}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            reviewProcessing={reviewProcessing}
                            onClose={closeReviewModal}
                            inline={true}
                        />
                    </div>
                ) : (
                    <>
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
                                onClick={() => handleTabChange('pending')}
                                className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition min-h-[44px] ${
                                    activeTab === 'pending'
                                        ? 'border-gray-900 text-gray-900'
                                        : 'border-transparent text-gray-400 hover:text-gray-700'
                                }`}
                            >
                                <AlertCircle size={16} /> Pending Approvals
                                {pendingRequests?.total > 0 && (
                                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-rose-600">
                                        {pendingRequests.total}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('history')}
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
                        <AccountingFilterPanel
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            isSearchLoading={isSearchLoading}
                            entryTypeFilter={entryTypeFilter}
                            setEntryTypeFilter={setEntryTypeFilter}
                            ledgerStatusFilter={ledgerStatusFilter}
                            setLedgerStatusFilter={setLedgerStatusFilter}
                            startDateFilter={startDateFilter}
                            setStartDateFilter={setStartDateFilter}
                            endDateFilter={endDateFilter}
                            setEndDateFilter={setEndDateFilter}
                            applyFilters={applyFilters}
                            resetFilters={resetFilters}
                            visibleCount={activeTab === 'pending' ? (pendingRequests?.total || 0) : (history?.total || 0)}
                        />

                        {/* List */}
                        <div className="space-y-6">
                            {activeTab === 'pending' && (
                                <PendingApprovalsList
                                    paginatedPending={pendingRequests?.data || []}
                                    totalPendingPages={pendingRequests?.last_page || 1}
                                    currentPage={pendingRequests?.current_page || 1}
                                    onPageChange={handlePageChange}
                                    onReview={openReviewModal}
                                    filteredCount={pendingRequests?.total || 0}
                                    searchTerm={searchTerm}
                                    entryTypeFilter={entryTypeFilter}
                                    selectedId={reviewModal.item?.id}
                                    selectedType={reviewModal.item?.type}
                                    isLoading={isTableShimmering}
                                    isSearching={isSearchLoading}
                                />
                            )}

                            {activeTab === 'history' && (
                                <TransactionLedgerTable
                                    paginatedHistory={history?.data || []}
                                    totalHistoryPages={history?.last_page || 1}
                                    currentPage={history?.current_page || 1}
                                    onPageChange={handlePageChange}
                                    onView={openReviewModal}
                                    filteredCount={history?.total || 0}
                                    searchTerm={searchTerm}
                                    entryTypeFilter={entryTypeFilter}
                                    selectedId={reviewModal.item?.id}
                                    selectedType={reviewModal.item?.type}
                                    isLoading={isTableShimmering}
                                    isSearching={isSearchLoading}
                                />
                            )}
                        </div>
                    </>
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
        </>
    );
}

FundRelease.layout = (page) => <SellerWorkspaceLayout active="accounting">{page}</SellerWorkspaceLayout>;

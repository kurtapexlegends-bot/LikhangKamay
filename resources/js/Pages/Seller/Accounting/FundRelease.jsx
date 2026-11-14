/* global route */
import React, { useCallback, useEffect, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import SellerHeader from '@/Layouts/SellerHeader';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import ReadOnlyCapabilityNotice from '@/Components/Seller/Shared/ReadOnlyCapabilityNotice';
import useSellerModuleAccess from '@/hooks/useSellerModuleAccess';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';

// Subcomponents
import FundMetrics from '@/Components/Seller/Accounting/FundMetrics';
import BaseFundsModal from '@/Components/Seller/Accounting/BaseFundsModal';
import PendingApprovalsList from '@/Components/Seller/Accounting/PendingApprovalsList';
import TransactionLedgerTable from '@/Components/Seller/Accounting/TransactionLedgerTable';
import ReleaseRequestDetails from '@/Components/Seller/Accounting/ReleaseRequestDetails';
import AccountingFilterPanel from '@/Components/Seller/Accounting/AccountingFilterPanel';

export default function FundRelease({ auth, pendingRequests, history, finances }) {
    const { openSidebar } = useSellerWorkspaceShell();
    const { url } = usePage();
    const { flash } = usePage().props;
    const { addToast } = useToast();
    const { canEdit: canEditAccounting, isReadOnly: isAccountingReadOnly } = useSellerModuleAccess('accounting');

    const [isTableShimmering, setIsTableShimmering] = useState(false);
    const [isSearchLoading, setIsSearchLoading] = useState(false);

    const normalizeCalendarDate = (value) => {
        if (typeof value !== 'string') return '';
        const trimmed = value.trim();
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
        if (!match) return '';

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const dt = new Date(Date.UTC(year, month - 1, day));

        if (
            dt.getUTCFullYear() !== year
            || (dt.getUTCMonth() + 1) !== month
            || dt.getUTCDate() !== day
        ) {
            return '';
        }

        return trimmed;
    };

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
    const [revisionItems, setRevisionItems] = useState([]);
    const [baseFundsProcessing, setBaseFundsProcessing] = useState(false);
    const [reviewProcessing, setReviewProcessing] = useState(null);
    const [searchTerm, setSearchTerm] = useState(() => getInitialQueryParam('search', ''));
    const [entryTypeFilter, setEntryTypeFilter] = useState(() => getInitialQueryParam('type', 'all'));
    const [ledgerStatusFilter, setLedgerStatusFilter] = useState(() => getInitialQueryParam('ledger_status', 'all'));
    const [startDateFilter, setStartDateFilter] = useState(() => normalizeCalendarDate(getInitialQueryParam('start_date', '')));
    const [endDateFilter, setEndDateFilter] = useState(() => normalizeCalendarDate(getInitialQueryParam('end_date', '')));
    const [paymentChannelFilter, setPaymentChannelFilter] = useState(() => getInitialQueryParam('payment_channel', 'all'));
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    
    const [prevUrl, setPrevUrl] = useState(url);

    // Sync state with URL navigation (e.g. back/forward button)
    if (url !== prevUrl) {
        setPrevUrl(url);
        const urlParams = new URLSearchParams(url.includes('?') ? url.substring(url.indexOf('?')) : '');
        const urlTab = urlParams.get('tab') || 'pending';
        const urlSearch = urlParams.get('search') || '';
        const urlType = urlParams.get('type') || 'all';
        const urlLedgerStatus = urlParams.get('ledger_status') || 'all';
        const urlStartDate = normalizeCalendarDate(urlParams.get('start_date') || '');
        const urlEndDate = normalizeCalendarDate(urlParams.get('end_date') || '');
        const urlPaymentChannel = urlParams.get('payment_channel') || 'all';

        if (urlTab !== activeTab) setActiveTab(urlTab);
        if (urlType !== entryTypeFilter) setEntryTypeFilter(urlType);
        if (urlLedgerStatus !== ledgerStatusFilter) setLedgerStatusFilter(urlLedgerStatus);
        if (urlStartDate !== startDateFilter) setStartDateFilter(urlStartDate);
        if (urlEndDate !== endDateFilter) setEndDateFilter(urlEndDate);
        if (urlPaymentChannel !== paymentChannelFilter) setPaymentChannelFilter(urlPaymentChannel);

        if (typeof document !== 'undefined' && document.activeElement?.id !== 'accounting-search' && urlSearch !== searchTerm) {
            setSearchTerm(urlSearch);
        }
    }

    const reload = useCallback((newParams) => {
        const urlParams = new URLSearchParams(url.includes('?') ? url.substring(url.indexOf('?')) : '');
        const params = {
            tab: urlParams.get('tab') || 'pending',
            search: urlParams.get('search') || '',
            type: urlParams.get('type') || 'all',
            ledger_status: urlParams.get('ledger_status') || 'all',
            start_date: urlParams.get('start_date') || '',
            end_date: urlParams.get('end_date') || '',
            payment_channel: urlParams.get('payment_channel') || 'all',
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
        if (params.payment_channel === 'all') delete params.payment_channel;

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
    }, [url]);

    const closeReviewModal = useCallback(() => {
        setReviewModal({ open: false, item: null, source: 'pending' });
        setRevisionItems([]);
    }, []);

    const resetReviewModal = () => {
        setReviewModal({ open: false, item: null, source: 'pending' });
        setRejectReason('');
        setRevisionItems([]);
    };

    const openReviewModal = (item, source = 'pending') => {
        setReviewModal({ open: true, item, source });
        setRejectReason(item?.rejection_reason || '');
        setRevisionItems([]);
    };

    const applyFilters = (filterObj) => {
        if ('type' in filterObj) setEntryTypeFilter(filterObj.type);
        if ('ledger_status' in filterObj) setLedgerStatusFilter(filterObj.ledger_status);
        if ('start_date' in filterObj) setStartDateFilter(filterObj.start_date);
        if ('end_date' in filterObj) setEndDateFilter(filterObj.end_date);
        if ('payment_channel' in filterObj) setPaymentChannelFilter(filterObj.payment_channel);
        const nextTab = (filterObj.payment_channel && filterObj.payment_channel !== 'all')
            ? 'history'
            : activeTab;
        if (nextTab !== activeTab) {
            setActiveTab(nextTab);
        }
        closeReviewModal();
        reload({
            ...filterObj,
            tab: nextTab,
            page_pending: 1,
            page_history: 1,
        });
    };

    const resetFilters = () => {
        setEntryTypeFilter('all');
        setLedgerStatusFilter('all');
        setStartDateFilter('');
        setEndDateFilter('');
        setPaymentChannelFilter('all');
        closeReviewModal();
        reload({
            type: 'all',
            ledger_status: 'all',
            start_date: '',
            end_date: '',
            payment_channel: 'all',
            page_pending: 1,
            page_history: 1,
        });
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(url.includes('?') ? url.substring(url.indexOf('?')) : '');
        const urlSearch = urlParams.get('search') || '';
        if (searchTerm === urlSearch) {
            return undefined;
        }

        const handler = setTimeout(() => {
            closeReviewModal();
            reload({
                search: searchTerm,
                page_pending: 1,
                page_history: 1,
            });
        }, 400);

        return () => clearTimeout(handler);
    }, [searchTerm, url, reload, closeReviewModal]);

    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
        closeReviewModal();
        reload({
            tab: tabName,
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
        if (!reviewModal.item || (!rejectReason.trim() && revisionItems.length === 0) || !canEditAccounting) return;

        router.post(
            route(reviewModal.item.type === 'payroll' ? 'accounting.rejectPayroll' : 'accounting.reject', reviewModal.item.id),
            {
                reason: rejectReason.trim(),
                revision_items: revisionItems,
            },
            {
                preserveScroll: true,
                onStart: () => setReviewProcessing('reject'),
                onShadow: true,
                onSuccess: resetReviewModal,
                onFinish: () => setReviewProcessing(null),
            }
        );
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
                title={reviewModal.item ? `Review Request #${reviewModal.item.id}` : "Finance"}
                subtitle={reviewModal.item ? `Audit details for request #${reviewModal.item.id}` : "Track shop balances, available funds, and review payout requests."}
                auth={auth}
                onMenuClick={openSidebar}
                badge={{ label: 'Enterprise', iconColor: 'text-emerald-400' }}
            />

            <main className="flex-1 w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-6 pb-8">
                {reviewModal.item ? (
                    <div className="max-w-5xl mx-auto space-y-4">
                        {/* ── BREADCRUMBS (in-content navigation) ── */}
                        <nav className="flex items-center gap-2 text-xs text-stone-500 font-medium overflow-x-auto scrollbar-none">
                            <button
                                type="button"
                                onClick={closeReviewModal}
                                className="hover:text-stone-900 transition shrink-0 font-medium cursor-pointer"
                            >
                                Finance &amp; Approvals
                            </button>
                            <ChevronRight size={12} className="text-stone-400 shrink-0" />
                            <span className="text-stone-400 font-medium shrink-0">Review Request</span>
                            <ChevronRight size={12} className="text-stone-400 shrink-0" />
                            <span className="text-stone-900 font-bold tracking-tight shrink-0">
                                {reviewModal.item.order_number || `#${reviewModal.item.id}`}
                            </span>
                        </nav>

                        <ReleaseRequestDetails
                            item={reviewModal.item}
                            source={reviewModal.source}
                            canEditAccounting={canEditAccounting}
                            rejectReason={rejectReason}
                            setRejectReason={setRejectReason}
                            revisionItems={revisionItems}
                            setRevisionItems={setRevisionItems}
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
                            <ReadOnlyCapabilityNotice label="Finance is in view-only mode for your role." />
                        )}

                        {/* Metrics Cards */}
                        <FundMetrics
                            finances={finances}
                            canEditAccounting={canEditAccounting}
                            onEditBaseFunds={() => setShowBaseFundsModal(true)}
                        />

                        {/* Missing Payout Alert */}
                        {auth.user?.role === 'artisan' && Number(finances.readyForPayout || 0) > 0 && !(auth.user?.has_payout_account ?? Boolean(auth.user?.payout_account_number)) && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                                <div className="flex items-start sm:items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                                        <AlertCircle size={16} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-amber-900">Add Your Payout Details</p>
                                        <p className="text-amber-700 font-medium mt-0.5">
                                            You have earnings ready for payout. Add your GCash or Maya e-wallet in Shop Settings so the platform can send your transfers.
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href={route('seller.settings.index')}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 self-start sm:self-auto transition shadow-2xs"
                                >
                                    <span>Update Details</span>
                                </Link>
                            </div>
                        )}

                        {/* Payout Rhythm Note */}
                        <div className="flex items-center justify-between text-[11px] text-stone-400 font-medium px-1">
                            <span>Payout Rhythm: Transfers are processed weekly for completed orders.</span>
                            <span>Direct to GCash &amp; Maya</span>
                        </div>

                        {/* Standardized Filter Toolbar Header & Filter Panel */}
                        <AccountingFilterPanel
                            tabs={[
                                { key: 'pending', label: 'Pending', count: pendingRequests?.total || 0 },
                                { key: 'history', label: 'Transactions' },
                            ]}
                            activeTab={activeTab}
                            onTabChange={handleTabChange}
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            isSearchLoading={isSearchLoading}
                            entryTypeFilter={entryTypeFilter}
                            ledgerStatusFilter={ledgerStatusFilter}
                            startDateFilter={startDateFilter}
                            endDateFilter={endDateFilter}
                            paymentChannelFilter={paymentChannelFilter}
                            applyFilters={applyFilters}
                            resetFilters={resetFilters}
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
                                    sortConfig={sortConfig}
                                    onSort={requestSort}
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
                                    sortConfig={sortConfig}
                                    onSort={requestSort}
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

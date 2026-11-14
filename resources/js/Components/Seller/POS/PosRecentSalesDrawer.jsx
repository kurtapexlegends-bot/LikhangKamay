/* global route, AbortController */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    X,
    Receipt,
    ExternalLink,
    Search,
    Calendar,
    History,
    ChevronLeft,
    ChevronRight,
    Loader2,
} from 'lucide-react';
import PosRecentSaleRow from '@/Components/Seller/POS/PosRecentSaleRow';

const formatCurrency = (value) =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    }).format(Number(value || 0));

const formatCount = (value) => Number(value || 0).toLocaleString('en-US');

const getManilaIsoDate = (daysAgo = 0) => {
    const target = new Date(Date.now() - daysAgo * 86400000);
    return target.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
};

const computeLocalSummary = (orders = []) => {
    const list = Array.isArray(orders) ? orders : [];
    let completed = 0;
    let voided = 0;
    let completedTotal = 0;

    for (const order of list) {
        if (order.status !== 'Completed' || order.payment_status === 'refunded') {
            voided += 1;
        } else {
            completed += 1;
            completedTotal += Number(order.total_amount || 0);
        }
    }

    return {
        all: list.length,
        completed,
        voided,
        completed_total: Math.round(completedTotal * 100) / 100,
    };
};

export default function PosRecentSalesDrawer({
    open,
    onClose,
    recentOrders = [],
    initialSummary = null,
    branches = [],
    canEditPos = false,
    canVoidPos = false,
    voidApprovers = [],
    onSelectOrder,
}) {
    const todayManila = useMemo(() => getManilaIsoDate(0), []);
    const yesterdayManila = useMemo(() => getManilaIsoDate(1), []);

    const [voidTargetId, setVoidTargetId] = useState(null);
    const [voidReason, setVoidReason] = useState('');
    const [voidSupervisorId, setVoidSupervisorId] = useState('');
    const [voidPin, setVoidPin] = useState('');
    const [voidProcessingId, setVoidProcessingId] = useState(null);
    const [voidError, setVoidError] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [statusTab, setStatusTab] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [dateRange, setDateRange] = useState('all');
    const [specificDate, setSpecificDate] = useState(() => getManilaIsoDate(1));
    const [dateFrom, setDateFrom] = useState(() => getManilaIsoDate(7));
    const [dateTo, setDateTo] = useState(() => getManilaIsoDate(0));
    const [branchFilter, setBranchFilter] = useState('all');
    const [page, setPage] = useState(1);

    const fallbackSummary = useMemo(
        () => initialSummary || computeLocalSummary(recentOrders),
        [initialSummary, recentOrders]
    );

    const [rows, setRows] = useState(recentOrders);
    const [summary, setSummary] = useState(fallbackSummary);
    const [meta, setMeta] = useState({
        current_page: 1,
        last_page: Math.max(1, Math.ceil((fallbackSummary.all || recentOrders.length) / 25)),
        per_page: 25,
        total: fallbackSummary.all || recentOrders.length,
        from: recentOrders.length > 0 ? 1 : 0,
        to: recentOrders.length,
    });
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const [refreshNonce, setRefreshNonce] = useState(0);

    const abortRef = useRef(null);
    const isDefaultQuery =
        page === 1 &&
        searchQuery.trim() === '' &&
        statusTab === 'all' &&
        paymentFilter === 'all' &&
        dateRange === 'all' &&
        branchFilter === 'all';

    useEffect(() => {
        if (isDefaultQuery) {
            setRows(recentOrders);
            setSummary(fallbackSummary);
            setMeta((prev) => ({
                ...prev,
                current_page: 1,
                total: fallbackSummary.all || recentOrders.length,
                last_page: Math.max(1, Math.ceil((fallbackSummary.all || recentOrders.length) / 25)),
                from: recentOrders.length > 0 ? 1 : 0,
                to: recentOrders.length,
            }));
        }
    }, [recentOrders, fallbackSummary, isDefaultQuery]);

    const defaultApproverId = useMemo(() => {
        if (!Array.isArray(voidApprovers) || voidApprovers.length === 0) return '';
        const withPin = voidApprovers.find((a) => a.has_pin);
        return String((withPin || voidApprovers[0]).id);
    }, [voidApprovers]);

    const activeSupervisorId = voidSupervisorId || defaultApproverId;
    const selectedApprover = useMemo(
        () => (Array.isArray(voidApprovers) ? voidApprovers.find((a) => String(a.id) === String(activeSupervisorId)) : null),
        [voidApprovers, activeSupervisorId]
    );

    const fetchHistory = useCallback(async () => {
        if (!open) return;

        if (abortRef.current) {
            abortRef.current.abort();
        }
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setFetchError('');

        try {
            const params = {
                page,
                per_page: 25,
                status: statusTab,
                payment_method: paymentFilter,
                date_range: dateRange,
            };
            if (dateRange === 'specific' && specificDate) {
                params.specific_date = specificDate;
            }
            if (dateRange === 'custom') {
                if (dateFrom) params.date_from = dateFrom;
                if (dateTo) params.date_to = dateTo;
            }
            if (searchQuery.trim() !== '') params.search = searchQuery.trim();
            if (branchFilter !== 'all') params.branch_id = branchFilter;

            const response = await fetch(route('seller.pos.history', params), {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error('Failed to load walk-in history');
            }

            const payload = await response.json();
            setRows(Array.isArray(payload.orders) ? payload.orders : []);
            if (payload.summary) setSummary(payload.summary);
            if (payload.meta) setMeta(payload.meta);
        } catch (err) {
            if (err?.name === 'AbortError') return;
            setFetchError('Unable to refresh full history right now.');
        } finally {
            if (abortRef.current === controller) {
                setLoading(false);
            }
        }
    }, [open, page, statusTab, paymentFilter, dateRange, specificDate, dateFrom, dateTo, searchQuery, branchFilter]);

    useEffect(() => {
        if (!open) return undefined;

        const delay = searchQuery.trim() !== '' ? 220 : 0;
        const timer = setTimeout(() => {
            fetchHistory();
        }, delay);

        return () => {
            clearTimeout(timer);
            if (abortRef.current) {
                abortRef.current.abort();
            }
        };
    }, [open, fetchHistory, searchQuery, refreshNonce]);

    if (!open) return null;

    const resetPageAndRun = (setter, value) => {
        setPage(1);
        setter(value);
    };

    const handleDatePresetChange = (nextPreset) => {
        setPage(1);
        setDateRange(nextPreset);
        if (nextPreset === 'specific' && !specificDate) {
            setSpecificDate(yesterdayManila);
        }
        if (nextPreset === 'custom') {
            if (!dateFrom) setDateFrom(getManilaIsoDate(7));
            if (!dateTo) setDateTo(todayManila);
        }
    };

    const handleConfirmVoid = (order) => {
        if (!canEditPos || voidProcessingId) return;

        const trimmedReason = voidReason.trim();
        if (trimmedReason.length < 5) {
            setVoidError('Enter a clear void reason (at least 5 characters).');
            return;
        }

        if (!activeSupervisorId) {
            setVoidError('Select an authorizing supervisor first.');
            return;
        }

        if (!/^\d{6}$/.test(voidPin)) {
            setVoidError('Enter the authorizing supervisor’s 6-digit Void PIN.');
            return;
        }

        setVoidError('');
        setVoidProcessingId(order.id);

        router.post(
            route('seller.pos.void', order.id),
            {
                reason: trimmedReason,
                supervisor_id: Number(activeSupervisorId),
                supervisor_pin: voidPin,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setVoidTargetId(null);
                    setVoidReason('');
                    setVoidPin('');
                    setRefreshNonce((n) => n + 1);
                },
                onError: (errors) => {
                    setVoidError(
                        errors?.supervisor_pin ||
                        errors?.supervisor_id ||
                        errors?.reason ||
                        errors?.order ||
                        'Unable to void walk-in receipt.'
                    );
                },
                onFinish: () => {
                    setVoidProcessingId(null);
                },
            }
        );
    };

    const totalPages = Math.max(1, Number(meta?.last_page || 1));

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/45 backdrop-blur-xs">
            <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

            <aside
                role="dialog"
                aria-modal="true"
                aria-labelledby="pos-recent-sales-title"
                className="relative w-full max-w-3xl bg-white h-full shadow-2xl border-l border-stone-200 flex flex-col pb-[env(safe-area-inset-bottom)]"
            >
                <div className="px-4 sm:px-5 py-3 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
                    <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                        <Receipt className="w-4 h-4 text-clay-600 shrink-0" />
                        <h3 id="pos-recent-sales-title" className="text-sm sm:text-base font-extrabold text-stone-900">
                            Recent Walk-In Sales
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-stone-200/80 text-[11px] font-bold text-stone-700">
                            {formatCount(summary.all)} {summary.all === 1 ? 'receipt' : 'receipts'}
                        </span>
                        <span className="text-[11px] font-bold text-clay-700">
                            Net {formatCurrency(summary.completed_total)}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close Recent Sales"
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-200/60 shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-4 py-2.5 border-b border-stone-200 bg-white space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1 min-w-0">
                            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => resetPageAndRun(setSearchQuery, e.target.value)}
                                placeholder="Search receipt #, item, customer, cashier, or ref..."
                                className="w-full h-9 pl-8 pr-8 rounded-lg border border-stone-200 bg-stone-50 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-clay-500 focus:ring-clay-500"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => resetPageAndRun(setSearchQuery, '')}
                                    aria-label="Clear history search"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 shrink-0">
                            <select
                                value={paymentFilter}
                                onChange={(e) => resetPageAndRun(setPaymentFilter, e.target.value)}
                                aria-label="Filter by payment method"
                                className="h-9 min-w-fit shrink-0 pl-3 pr-8 rounded-lg border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-700 focus:border-clay-500 focus:ring-clay-500"
                            >
                                <option value="all">All Payments</option>
                                <option value="POS Cash">POS Cash</option>
                                <option value="POS GCash">POS GCash</option>
                                <option value="POS Maya">POS Maya</option>
                            </select>

                            <select
                                value={dateRange}
                                onChange={(e) => handleDatePresetChange(e.target.value)}
                                aria-label="Filter by date range"
                                className="h-9 min-w-fit shrink-0 pl-3 pr-8 rounded-lg border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-700 focus:border-clay-500 focus:ring-clay-500"
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="yesterday">Yesterday</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                                <option value="specific">Specific Date</option>
                                <option value="custom">Custom Range</option>
                            </select>

                            {Array.isArray(branches) && branches.length > 1 && (
                                <select
                                    value={branchFilter}
                                    onChange={(e) => resetPageAndRun(setBranchFilter, e.target.value)}
                                    aria-label="Filter by branch"
                                    className="h-9 min-w-fit shrink-0 pl-3 pr-8 rounded-lg border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-700 focus:border-clay-500 focus:ring-clay-500"
                                >
                                    <option value="all">All Branches</option>
                                    {branches.map((branch) => (
                                        <option key={branch.id} value={branch.id}>
                                            {branch.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {(dateRange === 'specific' || dateRange === 'custom') && (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-stone-50/80 px-2.5 py-2 text-xs">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-600">
                                <Calendar className="w-3.5 h-3.5 text-clay-600" />
                                {dateRange === 'specific' ? 'Day:' : 'Range:'}
                            </span>

                            {dateRange === 'specific' ? (
                                <input
                                    type="date"
                                    value={specificDate}
                                    max={todayManila}
                                    onChange={(e) => resetPageAndRun(setSpecificDate, e.target.value)}
                                    aria-label="Select specific date"
                                    className="h-8 px-2.5 rounded-md border border-stone-200 bg-white text-xs font-medium text-stone-800 focus:border-clay-500 focus:ring-clay-500"
                                />
                            ) : (
                                <>
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        max={dateTo || todayManila}
                                        onChange={(e) => resetPageAndRun(setDateFrom, e.target.value)}
                                        aria-label="Start date"
                                        className="h-8 px-2.5 rounded-md border border-stone-200 bg-white text-xs font-medium text-stone-800 focus:border-clay-500 focus:ring-clay-500"
                                    />
                                    <span className="text-[11px] font-semibold text-stone-400">to</span>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        min={dateFrom || undefined}
                                        max={todayManila}
                                        onChange={(e) => resetPageAndRun(setDateTo, e.target.value)}
                                        aria-label="End date"
                                        className="h-8 px-2.5 rounded-md border border-stone-200 bg-white text-xs font-medium text-stone-800 focus:border-clay-500 focus:ring-clay-500"
                                    />
                                </>
                            )}

                            <button
                                type="button"
                                onClick={() => resetPageAndRun(setDateRange, 'all')}
                                className="ml-auto text-[11px] font-bold text-clay-700 hover:text-clay-800"
                            >
                                Reset
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-1">
                            {[
                                { id: 'all', label: `All (${formatCount(summary.all)})` },
                                { id: 'completed', label: `Completed (${formatCount(summary.completed)})` },
                                { id: 'voided', label: `Voided (${formatCount(summary.voided)})` },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => resetPageAndRun(setStatusTab, tab.id)}
                                    className={`h-8 px-3 rounded-lg text-[11px] font-bold transition-colors ${
                                        statusTab === tab.id
                                            ? 'bg-clay-600 text-white'
                                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {loading && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 shrink-0">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-clay-600" />
                                Syncing
                            </span>
                        )}
                    </div>

                    {fetchError && (
                        <p className="text-[11px] font-semibold text-amber-700">{fetchError}</p>
                    )}
                </div>

                <div className={`flex-1 min-h-0 overflow-y-auto divide-y divide-stone-100 transition-opacity ${loading ? 'opacity-75' : 'opacity-100'}`}>
                    {rows.length === 0 ? (
                        <div className="p-10 text-center">
                            <Receipt className="w-9 h-9 text-stone-300 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-stone-600">
                                {summary.all === 0 && !searchQuery.trim() && dateRange === 'all'
                                    ? 'No walk-in sales recorded yet'
                                    : 'No matching walk-in receipts'}
                            </p>
                        </div>
                    ) : (
                        rows.map((order) => (
                            <PosRecentSaleRow
                                key={order.id}
                                order={order}
                                canEditPos={canEditPos}
                                canVoidPos={canVoidPos}
                                isConfirmingVoid={voidTargetId === order.id}
                                onView={() => {
                                    onSelectOrder(order);
                                    onClose();
                                }}
                                onToggleVoid={() => {
                                    setVoidError('');
                                    setVoidReason('');
                                    setVoidPin('');
                                    setVoidSupervisorId(defaultApproverId);
                                    setVoidTargetId(voidTargetId === order.id ? null : order.id);
                                }}
                                voidApprovers={voidApprovers}
                                activeSupervisorId={activeSupervisorId}
                                onSupervisorChange={(nextId) => {
                                    setVoidSupervisorId(nextId);
                                    setVoidPin('');
                                    if (voidError) setVoidError('');
                                }}
                                selectedApprover={selectedApprover}
                                voidPin={voidPin}
                                onVoidPinChange={(nextPin) => {
                                    setVoidPin(nextPin);
                                    if (voidError) setVoidError('');
                                }}
                                voidReason={voidReason}
                                onVoidReasonChange={(nextReason) => {
                                    setVoidReason(nextReason);
                                    if (voidError) setVoidError('');
                                }}
                                voidError={voidError}
                                isVoidProcessing={voidProcessingId === order.id}
                                onConfirmVoid={() => handleConfirmVoid(order)}
                                onCancelVoid={() => {
                                    setVoidTargetId(null);
                                    setVoidPin('');
                                    setVoidError('');
                                }}
                            />
                        ))
                    )}
                </div>

                <div className="px-4 py-3 border-t border-stone-200 bg-stone-50 space-y-2.5">
                    {meta.total > 0 && (
                        <div className="flex items-center justify-between gap-2 text-[11px] text-stone-600">
                            <span className="font-semibold">
                                Showing {formatCount(meta.from)}–{formatCount(meta.to)} of {formatCount(meta.total)}
                            </span>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={loading || meta.current_page <= 1}
                                    className="h-8 px-2.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-45 font-bold text-stone-700 inline-flex items-center gap-1"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                    Prev
                                </button>
                                <span className="px-2 font-bold text-stone-700">
                                    Page {formatCount(meta.current_page)} of {formatCount(totalPages)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={loading || meta.current_page >= totalPages}
                                    className="h-8 px-2.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-45 font-bold text-stone-700 inline-flex items-center gap-1"
                                >
                                    Next
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <Link
                            href={route('orders.index', { status: 'Walk-In' })}
                            className="flex-1 min-h-[40px] px-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-xs font-bold text-stone-800 inline-flex items-center justify-center gap-1.5"
                        >
                            <span>Walk-In Orders</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                            href={route('audit-log.index')}
                            className="min-h-[40px] px-3.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-xs font-bold text-stone-700 inline-flex items-center justify-center gap-1.5"
                        >
                            <History className="w-3.5 h-3.5 text-clay-600" />
                            <span>Audit Log</span>
                        </Link>
                    </div>
                </div>
            </aside>
        </div>
    );
}

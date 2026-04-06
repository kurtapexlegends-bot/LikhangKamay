import React, { useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import SellerHeader from '@/Components/SellerHeader';
import Modal from '@/Components/Modal';
import CompactPagination from '@/Components/CompactPagination';
import { AlertCircle, Banknote, Building2, ClipboardList, Eye, FileText, History, Pencil, Users } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';

const formatMoney = (value) => `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatShortMoney = (value) => `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : 'N/A');
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

export default function FundRelease({ auth, pendingRequests, pendingPayrolls = [], history, payrollHistory = [], finances }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { flash } = usePage().props;
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('pending');
    const [showBaseFundsModal, setShowBaseFundsModal] = useState(false);
    const [baseFundsValue, setBaseFundsValue] = useState(finances.baseFunds || 0);
    const [reviewModal, setReviewModal] = useState({ open: false, item: null, source: 'pending' });
    const [rejectReason, setRejectReason] = useState('');
    const [pendingPage, setPendingPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);

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
    const totalPendingPages = Math.max(1, Math.ceil(allPending.length / itemsPerPage));
    const totalHistoryPages = Math.max(1, Math.ceil(allHistory.length / itemsPerPage));
    const paginatedPending = useMemo(() => {
        const startIndex = (pendingPage - 1) * itemsPerPage;
        return allPending.slice(startIndex, startIndex + itemsPerPage);
    }, [allPending, pendingPage]);
    const paginatedHistory = useMemo(() => {
        const startIndex = (historyPage - 1) * itemsPerPage;
        return allHistory.slice(startIndex, startIndex + itemsPerPage);
    }, [allHistory, historyPage]);

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
        if (!reviewModal.item) return;

        router.post(route(reviewModal.item.type === 'payroll' ? 'accounting.approvePayroll' : 'accounting.approve', reviewModal.item.id), {}, {
            onSuccess: closeReviewModal,
        });
    };

    const handleReject = () => {
        if (!reviewModal.item || !rejectReason.trim()) return;

        router.post(route(reviewModal.item.type === 'payroll' ? 'accounting.rejectPayroll' : 'accounting.reject', reviewModal.item.id), {
            reason: rejectReason.trim(),
        }, {
            onSuccess: closeReviewModal,
        });
    };

    const handleUpdateBaseFunds = (event) => {
        event.preventDefault();

        router.post(route('accounting.update-funds'), {
            base_funds: baseFundsValue,
        }, {
            onSuccess: () => setShowBaseFundsModal(false),
        });
    };

    const selectedItem = reviewModal.item;
    const isPayroll = selectedItem?.type === 'payroll';
    const isPendingReview = reviewModal.source === 'pending';

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="Accounting - Fund Release" />
            <SellerSidebar active="accounting" user={auth.user} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all duration-300">
                <SellerHeader title="Accounting" subtitle="Fund Release & Treasury" auth={auth} onMenuClick={() => setSidebarOpen(true)} badge={{ label: 'Enterprise', iconColor: 'text-emerald-400' }} />

                <main className="p-4 sm:p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition duration-300">
                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100"><Banknote size={20} /></div>
                                <span className="text-[9px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">Total Revenue</span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-0.5 relative z-10">{formatShortMoney(finances.revenue)}</h3>
                            <p className="text-[10px] text-gray-400 font-medium relative z-10">Realized from Completed Orders</p>
                            <Banknote size={70} className="absolute -right-4 -bottom-4 text-emerald-500/5 rotate-12 group-hover:scale-110 transition-transform duration-700" />
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition duration-300">
                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100"><ClipboardList size={20} /></div>
                                <span className="text-[9px] uppercase font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full border border-rose-100">Total Expenses</span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-0.5 relative z-10">{formatShortMoney(finances.expenses)}</h3>
                            <p className="text-[10px] text-gray-400 font-medium relative z-10">Stock Purchases & Payroll</p>
                            <ClipboardList size={70} className="absolute -right-4 -bottom-4 text-rose-500/5 rotate-12 group-hover:scale-110 transition-transform duration-700" />
                        </div>

                        <div className="bg-gray-900 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:shadow-2xl transition duration-300">
                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <div className="p-2.5 bg-white/10 text-white rounded-xl border border-white/10 backdrop-blur-sm"><Building2 size={20} /></div>
                                <button onClick={() => setShowBaseFundsModal(true)} className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-emerald-300 bg-emerald-900/30 px-2.5 py-1.5 rounded-full border border-emerald-500/30 backdrop-blur-sm hover:bg-emerald-800/50 transition cursor-pointer">
                                    <Pencil size={10} /> Edit Base Funds
                                </button>
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-0.5 relative z-10 tracking-tight">{formatShortMoney(finances.balance)}</h3>
                            <p className="text-[10px] text-gray-400 font-medium relative z-10 mt-1">Base: {formatShortMoney(finances.baseFunds || 0)} + Revenue - Expenses</p>
                            <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
                            <Building2 size={80} className="absolute -right-4 -bottom-4 text-white/5 rotate-12 group-hover:scale-105 transition-transform duration-700 pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 border-b border-gray-200 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                        <button onClick={() => setActiveTab('pending')} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${activeTab === 'pending' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
                            <AlertCircle size={16} /> Pending Approvals
                            {allPending.length > 0 && <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full text-[10px]">{allPending.length}</span>}
                        </button>
                        <button onClick={() => setActiveTab('history')} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${activeTab === 'history' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
                            <History size={16} /> Transaction Ledger
                        </button>
                    </div>

                    {activeTab === 'pending' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="text-gray-400" size={18} />
                                    <h3 className="font-bold text-gray-900 text-sm">Action Needed</h3>
                                </div>
                            </div>

                            <div className="divide-y divide-gray-50">
                                {paginatedPending.length > 0 ? paginatedPending.map((item) => (
                                    <div key={`${item.type}-${item.id}`} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-gray-50/50 transition">
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2.5 bg-white border border-gray-100 rounded-xl shadow-sm ${item.type === 'payroll' ? 'text-indigo-600' : 'text-clay-600'}`}>
                                                {item.type === 'payroll' ? <Users size={20} /> : <FileText size={20} />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-gray-900">{item.type === 'payroll' ? `Payroll for ${item.month}` : item.supply?.name}</h4>
                                                <p className="text-[11px] text-gray-500 mt-0.5">{item.type === 'payroll' ? `Employees: ${item.employee_count}` : `Quantity: ${item.quantity} ${item.supply?.unit || ''}`}</p>
                                                <p className="text-[11px] text-gray-500 mt-1">Requested by <span className="font-bold text-gray-700">{item.requester?.name || 'Seller owner'}</span><span className="text-gray-400"> | {formatRole(item.requester?.role)}</span></p>
                                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${typeTone(item.type)}`}>{item.type === 'payroll' ? 'HR Payroll' : 'Inventory'}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><ClipboardList size={10} /> #{item.id}</span>
                                                    <span className="text-[10px] font-bold text-gray-400">{formatDate(item.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 self-end lg:self-auto">
                                            <div className="text-right">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Amount Due</p>
                                                <p className="text-xl font-bold text-gray-900">{formatShortMoney(item.amount)}</p>
                                            </div>
                                            <button onClick={() => openReviewModal(item, 'pending')} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-900 text-white text-[11px] font-bold uppercase tracking-wide rounded-lg hover:bg-gray-800 transition shadow-sm active:scale-95">
                                                <Eye size={14} /> Review
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-12 text-center text-gray-400">
                                        <CheckCircle size={48} className="mx-auto mb-4 text-gray-200" />
                                        <p>No pending approvals needed.</p>
                                    </div>
                                )}
                            </div>

                            <CompactPagination
                                currentPage={pendingPage}
                                totalPages={totalPendingPages}
                                totalItems={allPending.length}
                                itemsPerPage={itemsPerPage}
                                itemLabel="requests"
                                onPageChange={setPendingPage}
                            />
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <History className="text-gray-400" size={16} />
                                    <h3 className="font-bold text-gray-900 text-sm">Transaction Ledger</h3>
                                </div>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {paginatedHistory.length > 0 ? paginatedHistory.map((item) => {
                                    const isApproved = ['paid', 'completed', 'accounting_approved', 'ordered', 'received', 'partially_received'].includes(String(item.status).toLowerCase());

                                    return (
                                        <div key={`${item.type}-${item.id}`} className="px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs hover:bg-gray-50/50 transition duration-150">
                                            <div className="flex items-start gap-4">
                                                <div className={`p-2 rounded-lg bg-gray-50 border border-gray-100 ${item.type === 'payroll' ? 'text-indigo-500' : 'text-clay-500'}`}>
                                                    {item.type === 'payroll' ? <Users size={16} /> : <FileText size={16} />}
                                                </div>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                                        <span className="font-bold text-gray-900 text-sm">{item.type === 'payroll' ? `Payroll for ${item.month}` : item.supply?.name}</span>
                                                        <span className={`text-[8px] uppercase font-bold px-2 py-0.5 rounded-full border ${typeTone(item.type)}`}>{item.type === 'payroll' ? 'HR' : 'Procurement'}</span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 text-gray-500 text-[10px]">
                                                        <span>{formatDate(item.updated_at || item.created_at)}</span>
                                                        <span>|</span>
                                                        <span>{item.type === 'payroll' ? `${item.employee_count} Employees` : `${item.quantity} ${item.supply?.unit || ''}`}</span>
                                                        <span>|</span>
                                                        <span>Requester: {item.requester?.name || 'Seller owner'}</span>
                                                    </div>
                                                    {item.rejection_reason && <p className="mt-1 text-[11px] text-red-600">Reason: {item.rejection_reason}</p>}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 self-end lg:self-auto">
                                                <div className="text-right">
                                                    <span className="font-bold text-gray-900 block text-sm">{isApproved ? '- ' : ''}{formatShortMoney(item.amount)}</span>
                                                    <span className={`mt-1 inline-flex text-[9px] px-2.5 py-1 rounded-full font-bold uppercase border ${statusTone(item.status)}`}>{String(item.status).replace(/_/g, ' ')}</span>
                                                </div>
                                                <button onClick={() => openReviewModal(item, 'history')} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 text-[11px] font-bold uppercase tracking-wide rounded-lg hover:bg-gray-50 transition">
                                                    <Eye size={14} /> View
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }) : <div className="p-8 text-center text-gray-400 text-sm">No transaction history yet.</div>}
                            </div>

                            <CompactPagination
                                currentPage={historyPage}
                                totalPages={totalHistoryPages}
                                totalItems={allHistory.length}
                                itemsPerPage={itemsPerPage}
                                itemLabel="entries"
                                onPageChange={setHistoryPage}
                            />
                        </div>
                    )}
                </main>
            </div>

            <Modal show={showBaseFundsModal} onClose={() => setShowBaseFundsModal(false)} maxWidth="sm">
                <form onSubmit={handleUpdateBaseFunds} className="p-6">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 border border-emerald-100 shadow-sm"><Building2 size={24} /></div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Edit Starting Balance</h2>
                    <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                        Input your initial business capital. Your total Available Funds will be calculated as:
                        <br />
                        <span className="font-bold text-gray-800 bg-gray-50 px-2 py-1 rounded inline-block mt-2 border border-gray-100">Base Funds + Revenue - Expenses</span>
                    </p>

                    <div className="mb-6 relative">
                        <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2 block">Base Funds Amount (PHP)</label>
                        <input type="number" min="0" step="any" value={baseFundsValue} onChange={(event) => setBaseFundsValue(event.target.value)} className="w-full px-4 py-3 border-gray-300 rounded-xl text-gray-900 font-bold focus:border-emerald-500 focus:ring-emerald-500 shadow-sm transition" required />
                    </div>

                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
                        <button type="button" onClick={() => setShowBaseFundsModal(false)} className="px-5 py-2.5 text-gray-500 text-sm font-bold hover:bg-gray-50 rounded-xl transition">Cancel</button>
                        <button type="submit" className="px-6 py-2.5 bg-gray-900 text-white text-sm rounded-xl font-bold hover:bg-gray-800 transition shadow-sm active:scale-95">Save Balance</button>
                    </div>
                </form>
            </Modal>

            <Modal show={reviewModal.open} onClose={closeReviewModal} afterLeave={resetReviewModal} maxWidth={isPayroll ? '5xl' : '2xl'}>
                <div className="p-3.5">
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                            <div className={`mt-0.5 rounded-2xl border p-2 ${isPayroll ? 'border-indigo-100 bg-indigo-50 text-indigo-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
                                {isPayroll ? <Users size={18} /> : <FileText size={18} />}
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-[15px] font-bold text-gray-900 sm:text-base">{isPayroll ? `Payroll Review - ${selectedItem?.month || ''}` : `Stock Request Review - #${selectedItem?.id || ''}`}</h2>
                                    {selectedItem?.status && <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${statusTone(selectedItem.status)}`}>{String(selectedItem.status).replace(/_/g, ' ')}</span>}
                                </div>
                                <p className="mt-0.5 text-[11px] text-gray-500 sm:text-xs">{isPendingReview ? 'Review the breakdown before approving or rejecting this request.' : 'Review the stored breakdown and any rejection reason for this action.'}</p>
                            </div>
                        </div>
                        {isPayroll && (
                            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2 text-right">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Requested Amount</p>
                                <p className="mt-1 text-lg font-bold text-gray-900">{formatMoney(selectedItem?.amount)}</p>
                            </div>
                        )}
                    </div>

                    {selectedItem && (
                        <div className="mt-3.5 space-y-3">
                            {!isPayroll && (
                                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                                    <div className="grid divide-y divide-gray-100 md:grid-cols-2 md:divide-x md:divide-y-0">
                                        <AuditSheet
                                            title="Request & Supply"
                                            rows={[
                                                {
                                                    label: 'Requester',
                                                    value: (
                                                        <div className="text-right">
                                                            <div className="font-bold text-gray-900">{selectedItem.requester?.name || 'Seller owner'}</div>
                                                            <div className="text-[11px] text-gray-500">{formatRole(selectedItem.requester?.role)}</div>
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
                                                            <div className="font-bold text-gray-900">{formatMoney(selectedItem.fund_snapshot?.available_balance)}</div>
                                                            <div className={`text-[11px] font-semibold ${Number(selectedItem.fund_snapshot?.remaining_balance) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                                                After release: {formatMoney(selectedItem.fund_snapshot?.remaining_balance)}
                                                            </div>
                                                        </div>
                                                    ),
                                                },
                                                {
                                                    label: 'Stock',
                                                    value: `Current ${selectedItem.supply?.current_stock ?? 'N/A'} | Min ${selectedItem.supply?.min_stock ?? 'N/A'} | Max ${selectedItem.supply?.max_stock ?? 'N/A'}`,
                                                },
                                                { label: 'Capacity', value: selectedItem.supply?.available_capacity },
                                            ]}
                                        />
                                    </div>
                                </div>
                            )}

                            {isPayroll && (
                                <>
                                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                                        <div className="rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Requester</p>
                                            <div className="mt-2.5 space-y-1">
                                                <p className="text-base font-bold text-gray-900">{selectedItem.requester?.name || 'Seller owner'}</p>
                                                <p className="text-sm text-gray-500">{formatRole(selectedItem.requester?.role)}</p>
                                                <p className="text-xs text-gray-400">Submitted on {formatDate(selectedItem.created_at)}</p>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Fund Snapshot</p>
                                            <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                                <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Available Balance</p>
                                                    <p className="mt-1 text-base font-bold text-gray-900">{formatMoney(selectedItem.fund_snapshot?.available_balance)}</p>
                                                </div>
                                                <div className={`rounded-xl border px-3 py-2.5 ${Number(selectedItem.fund_snapshot?.remaining_balance) < 0 ? 'border-red-100 bg-red-50' : 'border-emerald-100 bg-emerald-50'}`}>
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">After Release</p>
                                                    <p className={`mt-1 text-base font-bold ${Number(selectedItem.fund_snapshot?.remaining_balance) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{formatMoney(selectedItem.fund_snapshot?.remaining_balance)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid gap-3 md:grid-cols-3">
                                            <DetailTile label="Payroll Month" value={selectedItem.month} />
                                            <DetailTile label="Employee Count" value={selectedItem.employee_count} />
                                            <DetailTile label="Total Payroll Amount" value={formatMoney(selectedItem.amount)} />
                                        </div>

                                        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Per-Employee Breakdown</p>
                                                <p className="mt-1 text-sm text-gray-500">Detailed salary, attendance, and net-pay view before accounting action.</p>
                                            </div>

                                            <div className="mt-4 overflow-x-auto">
                                                <table className="w-full min-w-[980px] text-left">
                                                    <thead>
                                                        <tr className="border-b border-gray-100 text-[10px] uppercase tracking-[0.18em] text-gray-400">
                                                            <th className="py-3 pr-4 font-bold">Employee</th>
                                                            <th className="py-3 pr-4 font-bold text-right">Base Salary</th>
                                                            <th className="py-3 pr-4 font-bold text-right">Days Worked</th>
                                                            <th className="py-3 pr-4 font-bold text-right">Absences</th>
                                                            <th className="py-3 pr-4 font-bold text-right">Absence Deduction</th>
                                                            <th className="py-3 pr-4 font-bold text-right">Undertime</th>
                                                            <th className="py-3 pr-4 font-bold text-right">Undertime Deduction</th>
                                                            <th className="py-3 pr-4 font-bold text-right">Overtime</th>
                                                            <th className="py-3 pr-4 font-bold text-right">Overtime Pay</th>
                                                            <th className="py-3 font-bold text-right">Net Pay</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {selectedItem.line_items?.map((line) => (
                                                            <tr key={line.id} className="text-sm text-gray-700">
                                                                <td className="py-3 pr-4 font-bold text-gray-900">{line.employee_name}</td>
                                                                <td className="py-3 pr-4 text-right">{formatMoney(line.base_salary)}</td>
                                                                <td className="py-3 pr-4 text-right">{line.days_worked}</td>
                                                                <td className="py-3 pr-4 text-right">{line.absences_days}</td>
                                                                <td className="py-3 pr-4 text-right text-red-600">{formatMoney(line.absence_deduction)}</td>
                                                                <td className="py-3 pr-4 text-right">{line.undertime_hours}</td>
                                                                <td className="py-3 pr-4 text-right text-red-600">{formatMoney(line.undertime_deduction)}</td>
                                                                <td className="py-3 pr-4 text-right">{line.overtime_hours}</td>
                                                                <td className="py-3 pr-4 text-right text-emerald-700">{formatMoney(line.overtime_pay)}</td>
                                                                <td className="py-3 text-right font-bold text-gray-900">{formatMoney(line.net_pay)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {selectedItem.rejection_reason && (
                                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500">Stored Rejection Reason</p>
                                    <p className="mt-2 text-sm font-medium text-red-700">{selectedItem.rejection_reason}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-3.5 border-t border-gray-100 pt-3">
                        {isPendingReview ? (
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Rejection Reason</label>
                                    <textarea className="mt-3 w-full rounded-xl border-gray-300 text-sm focus:border-red-500 focus:ring-red-500 shadow-sm transition resize-none" rows={4} placeholder="State the exact accounting reason if you reject this request." value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />
                                    <p className="mt-2 text-xs text-gray-500">A rejection reason is required before Accounting can reject this request, and the requester will see this exact reason.</p>
                                </div>

                                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                    <button type="button" onClick={closeReviewModal} className="px-4 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition">Close</button>
                                    <button type="button" onClick={handleReject} disabled={!rejectReason.trim()} className={`px-4 py-2.5 text-sm font-bold rounded-xl transition shadow-sm ${rejectReason.trim() ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-100 text-red-300 cursor-not-allowed'}`}>Reject With Reason</button>
                                    <button type="button" onClick={handleApprove} className="px-4 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition shadow-sm">{isPayroll ? 'Approve Payroll Release' : 'Approve Fund Release'}</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-end">
                                <button type="button" onClick={closeReviewModal} className="px-4 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition shadow-sm">Close</button>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function DetailTile({ label, value }) {
    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">{label}</p>
            <p className="mt-1 text-sm font-bold text-gray-900">{value ?? 'N/A'}</p>
        </div>
    );
}

function AuditSheet({ title, rows }) {
    return (
        <div className="px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">{title}</p>
            <div className="mt-2.5 divide-y divide-gray-100">
                {rows.map(({ label, value }) => (
                    <div key={label} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                        <span className="text-[11px] font-medium text-gray-500">{label}</span>
                        <span className="max-w-[65%] text-right text-sm font-bold text-gray-900">{value ?? 'N/A'}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

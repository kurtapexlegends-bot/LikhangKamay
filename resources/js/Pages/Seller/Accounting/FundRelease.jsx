import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import SellerHeader from '@/Components/SellerHeader';
import Modal from '@/Components/Modal';
import { 
    Banknote, CheckCircle, AlertCircle, Clock, 
    ArrowRight, Wallet, History, FileText, XCircle,
    Building2, Users, Pencil
} from 'lucide-react';

export default function FundRelease({ auth, pendingRequests, pendingPayrolls = [], history, payrollHistory = [], finances }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { flash } = usePage().props;
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');

    // TABS STATE
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'

    // MERGED ARRAYS 
    const allPending = [
        ...pendingRequests.map(req => ({ ...req, _type: 'procurement', _date: new Date(req.created_at) })),
        ...pendingPayrolls.map(pay => ({ ...pay, _type: 'payroll', _date: new Date(pay.created_at) }))
    ].sort((a, b) => b._date - a._date);

    const allHistory = [
        ...history.map(req => ({ ...req, _type: 'procurement', _date: new Date(req.updated_at || req.created_at) })),
        ...payrollHistory.map(pay => ({ ...pay, _type: 'payroll', _date: new Date(pay.updated_at || pay.created_at) }))
    ].sort((a, b) => b._date - a._date);

    React.useEffect(() => {
        if (flash.success) {
            setToastType('success');
            setToastMessage(flash.success);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
        if (flash.error) {
            setToastType('error');
            setToastMessage(flash.error);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 5000);
        }
    }, [flash]);
    
    // MODAL STATES
    const [showReleaseModal, setShowReleaseModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showBaseFundsModal, setShowBaseFundsModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [baseFundsValue, setBaseFundsValue] = useState(finances.baseFunds || 0);

    const [rejectReason, setRejectReason] = useState('');

    const handleRelease = () => {
        router.post(route('accounting.approve', selectedRequest.id), {}, {
            onSuccess: () => {
                setShowReleaseModal(false);
                setSelectedRequest(null);
            }
        });
    };

    const handleReject = () => {
        router.post(route('accounting.reject', selectedRequest.id), {
            reason: rejectReason
        }, {
            onSuccess: () => {
                setShowRejectModal(false);
                setSelectedRequest(null);
                setRejectReason('');
            }
        });
    };

    const handleUpdateBaseFunds = (e) => {
        e.preventDefault();
        router.post(route('accounting.update-funds'), {
            base_funds: baseFundsValue
        }, {
            onSuccess: () => {
                setShowBaseFundsModal(false);
            }
        });
    };


    // PAYROLL HANDLERS
    const [showPayrollReleaseModal, setShowPayrollReleaseModal] = useState(false);
    const [showPayrollRejectModal, setShowPayrollRejectModal] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState(null);
    const [payrollRejectReason, setPayrollRejectReason] = useState('');

    const handleReleasePayroll = () => {
        router.post(route('accounting.approvePayroll', selectedPayroll.id), {}, {
            onSuccess: () => {
                setShowPayrollReleaseModal(false);
                setSelectedPayroll(null);
            }
        });
    };

    const handleRejectPayroll = () => {
        router.post(route('accounting.rejectPayroll', selectedPayroll.id), {
            reason: payrollRejectReason
        }, {
            onSuccess: () => {
                setShowPayrollRejectModal(false);
                setSelectedPayroll(null);
                setPayrollRejectReason('');
            }
        });
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="Accounting - Fund Release" />
            <SellerSidebar active="accounting" user={auth.user} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all duration-300">
                <SellerHeader 
                    title="Accounting" 
                    subtitle="Fund Release & Treasury"
                    auth={auth} 
                    onMenuClick={() => setSidebarOpen(true)}
                    badge={{ label: 'Enterprise', iconColor: 'text-emerald-400' }}
                />

                <main className="p-6 space-y-6">
                    {/* FINANCIAL DASHBOARD */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* REVENUE */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition duration-300">
                             <div className="flex justify-between items-start mb-3 relative z-10">
                                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                                    <Banknote size={20} />
                                </div>
                                <span className="text-[9px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                    Total Revenue
                                </span>
                             </div>
                             <h3 className="text-2xl font-bold text-gray-900 mb-0.5 relative z-10">
                                ₱{Number(finances.revenue).toLocaleString()}
                             </h3>
                             <p className="text-[10px] text-gray-400 font-medium relative z-10">Realized from Completed Orders</p>
                             <Banknote size={70} className="absolute -right-4 -bottom-4 text-emerald-500/5 rotate-12 group-hover:scale-110 transition-transform duration-700" />
                        </div>

                        {/* EXPENSES */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition duration-300">
                             <div className="flex justify-between items-start mb-3 relative z-10">
                                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                                    <Wallet size={20} />
                                </div>
                                <span className="text-[9px] uppercase font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full border border-rose-100">
                                    Total Expenses
                                </span>
                             </div>
                             <h3 className="text-2xl font-bold text-gray-900 mb-0.5 relative z-10">
                                ₱{Number(finances.expenses).toLocaleString()}
                             </h3>
                             <p className="text-[10px] text-gray-400 font-medium relative z-10">Stock Purchases & Payroll</p>
                             <Wallet size={70} className="absolute -right-4 -bottom-4 text-rose-500/5 rotate-12 group-hover:scale-110 transition-transform duration-700" />
                        </div>

                        {/* BALANCE (TOTAL MONEY) */}
                        <div className="bg-gray-900 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:shadow-2xl transition duration-300">
                             <div className="flex justify-between items-start mb-3 relative z-10">
                                <div className="p-2.5 bg-white/10 text-white rounded-xl border border-white/10 backdrop-blur-sm">
                                    <Building2 size={20} />
                                </div>
                                <button 
                                    onClick={() => setShowBaseFundsModal(true)}
                                    className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-emerald-300 bg-emerald-900/30 px-2.5 py-1.5 rounded-full border border-emerald-500/30 backdrop-blur-sm hover:bg-emerald-800/50 transition cursor-pointer"
                                >
                                    <Pencil size={10} /> Edit Base Funds
                                </button>
                             </div>
                             <h3 className="text-3xl font-bold text-white mb-0.5 relative z-10 tracking-tight">
                                ₱{Number(finances.balance).toLocaleString()}
                             </h3>
                             <p className="text-[10px] text-gray-400 font-medium relative z-10 mt-1">
                                Base: ₱{Number(finances.baseFunds || 0).toLocaleString()} + Rev - Exp
                             </p>
                             <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none"></div>
                             <Building2 size={80} className="absolute -right-4 -bottom-4 text-white/5 rotate-12 group-hover:scale-105 transition-transform duration-700 pointer-events-none" />
                        </div>
                    </div>

                    {/* TABS */}
                    <div className="flex items-center gap-4 border-b border-gray-200">
                        <button 
                            onClick={() => setActiveTab('pending')}
                            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${activeTab === 'pending' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                        >
                            <AlertCircle size={16} /> Pending Approvals 
                            {allPending.length > 0 && <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full text-[10px]">{allPending.length}</span>}
                        </button>
                        <button 
                            onClick={() => setActiveTab('history')}
                            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${activeTab === 'history' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                        >
                            <History size={16} /> Transaction Ledger
                        </button>
                    </div>

                    {/* CONTENT AREA */}
                    {activeTab === 'pending' && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="text-gray-400" size={18} />
                                    <h3 className="font-bold text-gray-900 text-sm">Action Needed</h3>
                                </div>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {allPending.length > 0 ? (
                                    allPending.map(item => (
                                        <div key={`${item._type}-${item.id}`} className="p-5 flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-gray-50/50 transition">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 bg-white border border-gray-100 rounded-xl shadow-sm ${item._type === 'payroll' ? 'text-indigo-600' : 'text-clay-600'}`}>
                                                    {item._type === 'payroll' ? <Users size={20} /> : <FileText size={20} />}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-gray-900">
                                                        {item._type === 'payroll' ? `Payroll for ${item.month}` : item.supply?.name}
                                                    </h4>
                                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                                        {item._type === 'payroll' 
                                                            ? <span>Employees: <span className="font-bold">{item.employee_count}</span></span>
                                                            : <span>Quantity: <span className="font-bold">{item.quantity} {item.supply?.unit}</span></span>
                                                        }
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                                            item._type === 'payroll' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                                                        }`}>
                                                            {item._type === 'payroll' ? 'HR Payroll' : 'Inventory'}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                            <Clock size={10} /> Pending
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-400">
                                                            {item._date.toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-5">
                                                <div className="text-right">
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Amount Due</p>
                                                    <p className="text-xl font-bold text-gray-900">₱{parseFloat(item.total_cost || item.total_amount).toLocaleString()}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            if (item._type === 'payroll') {
                                                                setSelectedPayroll(item);
                                                                setShowPayrollReleaseModal(true);
                                                            } else {
                                                                setSelectedRequest(item);
                                                                setShowReleaseModal(true);
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-wide rounded-lg hover:bg-gray-800 transition shadow-sm active:scale-95"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            if (item._type === 'payroll') {
                                                                setSelectedPayroll(item);
                                                                setShowPayrollRejectModal(true);
                                                            } else {
                                                                setSelectedRequest(item);
                                                                setShowRejectModal(true);
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 bg-white border border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wide rounded-lg hover:bg-gray-50 transition active:scale-95"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-12 text-center text-gray-400">
                                        <CheckCircle size={48} className="mx-auto mb-4 text-gray-200" />
                                        <p>No pending approvals needed!</p>
                                    </div>
                                )}
                            </div>
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
                            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                                {allHistory.length > 0 ? (
                                    allHistory.map(item => {
                                        const isPaid = item.status === 'Paid' || item.status === 'completed';
                                        
                                        return (
                                            <div key={`${item._type}-${item.id}`} className="px-5 py-4 flex items-center justify-between text-xs hover:bg-gray-50/50 transition duration-150">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-lg bg-gray-50 border border-gray-100 ${item._type === 'payroll' ? 'text-indigo-500' : 'text-clay-500'}`}>
                                                        {item._type === 'payroll' ? <Users size={16} /> : <FileText size={16} />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="font-bold text-gray-900 text-sm">
                                                                {item._type === 'payroll' ? `Payroll for ${item.month}` : item.supply?.name}
                                                            </span>
                                                            <span className={`text-[8px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                                                item._type === 'payroll' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                                                            }`}>
                                                                {item._type === 'payroll' ? 'HR' : 'Procurement'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-gray-500 text-[10px]">
                                                            <span>{item._date.toLocaleDateString()}</span>
                                                            <span>•</span>
                                                            <span>
                                                                {item._type === 'payroll' 
                                                                    ? `${item.employee_count} Employees`
                                                                    : `${item.quantity} ${item.supply?.unit}`
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-5">
                                                    <div className="text-right">
                                                        <span className="font-bold text-gray-900 block text-sm">
                                                            {isPaid ? '- ' : ''}₱{parseFloat(item.total_cost || item.total_amount).toLocaleString()}
                                                        </span>
                                                        {item.status === 'Rejected' && item.rejection_reason && (
                                                            <span className="text-[9px] text-red-500 block max-w-[150px] truncate" title={item.rejection_reason}>
                                                                Note: {item.rejection_reason}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase min-w-[70px] text-center ${
                                                        isPaid 
                                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                            : 'bg-red-50 text-red-600 border border-red-100'
                                                    }`}>
                                                        {item.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-8 text-center text-gray-400 text-sm">
                                        No transaction history yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* BASE FUNDS MODAL */}
            <Modal show={showBaseFundsModal} onClose={() => setShowBaseFundsModal(false)} maxWidth="sm">
                <form onSubmit={handleUpdateBaseFunds} className="p-6">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 border border-emerald-100 shadow-sm">
                        <Wallet size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Edit Starting Balance</h2>
                    <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                        Input your initial business capital. Your total Available Funds will be calculated as: 
                        <br/><span className="font-bold text-gray-800 bg-gray-50 px-2 py-1 rounded inline-block mt-2 border border-gray-100">Base Funds + Revenue - Expenses</span>
                    </p>

                    <div className="mb-6 relative">
                        <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2 block">Base Funds Amount (₱)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₱</span>
                            <input 
                                type="number" 
                                min="0"
                                step="any"
                                value={baseFundsValue}
                                onChange={e => setBaseFundsValue(e.target.value)}
                                className="w-full pl-8 pr-4 py-3 border-gray-300 rounded-xl text-gray-900 font-bold focus:border-emerald-500 focus:ring-emerald-500 shadow-sm transition"
                                required
                            />
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
                        <button 
                            type="button"
                            onClick={() => setShowBaseFundsModal(false)}
                            className="px-5 py-2.5 text-gray-500 text-sm font-bold hover:bg-gray-50 rounded-xl transition"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="px-6 py-2.5 bg-gray-900 text-white text-sm rounded-xl font-bold hover:bg-gray-800 transition shadow-sm active:scale-95 flex items-center gap-2"
                        >
                            Save Balance
                        </button>
                    </div>
                </form>
            </Modal>

            {/* RELEASE MODAL */}
            <Modal show={showReleaseModal} onClose={() => setShowReleaseModal(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100 shadow-sm">
                        <Wallet size={24} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Release Funds?</h2>
                    <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                        Are you sure you want to authorize the release of <span className="font-bold text-gray-900">₱{Number(selectedRequest?.total_cost).toLocaleString()}</span> for <strong>{selectedRequest?.supply?.name}</strong>?
                        <br/><br/>
                        This will notify <strong>Procurement</strong> to proceed with the purchase.
                    </p>
                    <div className="flex justify-center gap-2">
                        <button 
                            onClick={() => setShowReleaseModal(false)}
                            className="px-4 py-2 text-gray-500 text-sm font-bold hover:bg-gray-50 rounded-xl transition"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleRelease}
                            className="px-5 py-2 bg-gray-900 text-white text-sm rounded-xl font-bold hover:bg-gray-800 transition shadow-sm active:scale-95"
                        >
                            Confirm Release
                        </button>
                    </div>
                </div>
            </Modal>

            {/* REJECT MODAL */}
            <Modal show={showRejectModal} onClose={() => setShowRejectModal(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-100 shadow-sm">
                        <XCircle size={24} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Reject Release?</h2>
                    <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                        Do you really want to reject the fund release for <strong>{selectedRequest?.supply?.name}</strong>? 
                        This action cannot be undone.
                    </p>

                    <div className="text-left mb-5">
                        <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1 block">Reason for Rejection</label>
                        <textarea 
                            className="w-full border-gray-300 rounded-xl text-xs focus:border-red-500 focus:ring-red-500 shadow-sm transition resize-none"
                            rows={3}
                            placeholder="e.g., Insufficient funds, Request needs revision..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex justify-center gap-2">
                        <button 
                            onClick={() => setShowRejectModal(false)}
                            className="px-4 py-2 text-gray-500 text-sm font-bold hover:bg-gray-50 rounded-xl transition"
                        >
                            Dismiss
                        </button>
                        <button 
                            onClick={handleReject}
                            className="px-5 py-2 bg-red-600 text-white text-sm rounded-xl font-bold hover:bg-red-700 transition shadow-sm active:scale-95"
                        >
                            Confirm Rejection
                        </button>
                    </div>
                </div>
            </Modal>
            {/* PAYROLL RELEASE MODAL */}
            <Modal show={showPayrollReleaseModal} onClose={() => setShowPayrollReleaseModal(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-indigo-100 shadow-sm">
                        <Wallet size={24} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Release Payroll?</h2>
                    <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                        Authorize payment of <span className="font-bold text-gray-900">₱{Number(selectedPayroll?.total_amount).toLocaleString()}</span> for <span className="font-bold">{selectedPayroll?.month}</span>?
                        <br/>
                        <span className="text-[10px] text-gray-400">Funds will be deducted from your Available Balance.</span>
                    </p>
                    <div className="flex justify-center gap-2">
                        <button 
                            onClick={() => setShowPayrollReleaseModal(false)}
                            className="px-4 py-2 text-gray-500 text-sm font-bold hover:bg-gray-50 rounded-xl transition"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleReleasePayroll}
                            className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-xl font-bold hover:bg-indigo-700 transition shadow-sm active:scale-95"
                        >
                            Confirm Payment
                        </button>
                    </div>
                </div>
            </Modal>

            {/* PAYROLL REJECT MODAL */}
            <Modal show={showPayrollRejectModal} onClose={() => setShowPayrollRejectModal(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-100 shadow-sm">
                        <XCircle size={24} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Reject Payroll?</h2>
                    <p className="text-xs text-gray-500 mb-5">
                        This will mark the payroll as <span className="font-bold text-red-600">Rejected</span>. HR will need to delete or regenerate it.
                    </p>
                    
                    <div className="text-left mb-5">
                        <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1 block">Reason for Rejection</label>
                        <textarea 
                            className="w-full border-gray-300 rounded-xl text-xs focus:border-red-500 focus:ring-red-500 shadow-sm transition resize-none"
                            rows={3}
                            placeholder="e.g., Error in computed amount, missing deductions..."
                            value={payrollRejectReason}
                            onChange={(e) => setPayrollRejectReason(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex justify-center gap-2">
                        <button 
                            onClick={() => setShowPayrollRejectModal(false)}
                            className="px-4 py-2 text-gray-500 text-sm font-bold hover:bg-gray-50 rounded-xl transition"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleRejectPayroll}
                            className="px-5 py-2 bg-red-600 text-white text-sm rounded-xl font-bold hover:bg-red-700 transition shadow-sm active:scale-95"
                        >
                            Confirm Reject
                        </button>
                    </div>
                </div>
            </Modal>
            {/* TOAST NOTIFICATION */}
            {showToast && (
                <div className={`fixed bottom-4 right-4 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-slide-up ${
                    toastType === 'success' ? 'bg-gray-900/95 text-white' : 'bg-red-500 text-white'
                }`}>
                    {toastType === 'success' ? <CheckCircle size={20} className="text-emerald-400" /> : <AlertCircle size={20} />}
                    <p className="font-bold text-sm tracking-wide">{toastMessage}</p>
                </div>
            )}
        </div>
    );
}

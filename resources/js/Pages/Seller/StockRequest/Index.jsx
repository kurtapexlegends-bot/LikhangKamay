import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown';
import Modal from '@/Components/Modal';
import { 
    FileQuestion, CheckCircle, Clock, XCircle, AlertTriangle, 
    Search, ChevronDown, Menu, User, LogOut, Banknote, ShoppingBag, Truck, Package, ArrowRight, Building2,
    ClipboardList, Timer, BadgeCheck, PackageCheck, RotateCcw, Inbox
} from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceAccountSummary from '@/Components/WorkspaceAccountSummary';

const STATUS_TABS = [
    { id: 'all', label: 'All Requests', icon: ClipboardList },
    { id: 'pending', label: 'Pending Approval', icon: Timer },
    { id: 'finance_approved', label: 'Budget Approved', icon: Banknote },
    { id: 'accounting_approved', label: 'Ready to Order', icon: BadgeCheck },
    { id: 'ordered', label: 'On Process', icon: Truck },
    { id: 'partially_received', label: 'Partially Received', icon: PackageCheck },
    { id: 'received', label: 'In Buffer', icon: Inbox },
    { id: 'completed', label: 'Completed', icon: CheckCircle },
    { id: 'rejected', label: 'Rejected', icon: XCircle },
];

const pesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const formatPeso = (value) => pesoFormatter.format(Number(value || 0));

export default function StockRequestIndex({ auth, requests }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [processingId, setProcessingId] = useState(null);
    
    // Modal States
    const [receiveModal, setReceiveModal] = useState({ open: false, id: null, max: null });
    const [transferModal, setTransferModal] = useState({ open: false, id: null, max: null });
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [qtyInput, setQtyInput] = useState('');

    // Counts per status
    const getCount = (status) => {
        if (status === 'all') return requests.length;
        if (status === 'pending') return requests.filter(r => r.status === 'pending').length;
        return requests.filter(r => r.status === status).length;
    };

    // Filter requests based on tab
    const filteredRequests = requests.filter(req => {
        if (activeTab === 'all') return true;
        if (activeTab === 'pending') return req.status === 'pending';
        return req.status === activeTab;
    });

    // --- FLASH MESSAGE HANDLING ---
    const { flash } = usePage().props;
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');

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

    // 1. Mark as Ordered
    const handleMarkAsOrdered = () => {
        router.post(route('stock-requests.ordered', selectedRequest.id), {}, {
            onSuccess: () => {
                setShowOrderModal(false);
                setSelectedRequest(null);
            }
        });
    };

    // 2. Receive Items
    const openReceiveModal = (req) => {
        const remaining = req.quantity - req.received_quantity;
        setReceiveModal({ open: true, id: req.id, max: remaining });
        setQtyInput(remaining); 
    };

    const submitReceive = (e) => {
        e.preventDefault();
        router.post(route('stock-requests.receive', receiveModal.id), { quantity: qtyInput }, {
            onSuccess: () => setReceiveModal({ open: false, id: null, max: null })
        });
    };

    // 3. Transfer to Inventory
    const openTransferModal = (req) => {
        const available = req.received_quantity - req.transferred_quantity;
        setTransferModal({ open: true, id: req.id, max: available });
        setQtyInput(available); // Default to max available
    };

    const submitTransfer = (e) => {
        e.preventDefault();
        router.post(route('stock-requests.transfer', transferModal.id), { quantity: qtyInput }, {
            onSuccess: () => setTransferModal({ open: false, id: null, max: null })
        });
    };

    const getStatusBadge = (status) => {
        const styles = {
            'pending': 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-100',
            'finance_approved': 'bg-stone-100 text-stone-700 border-stone-200 ring-1 ring-stone-100',
            'accounting_approved': 'bg-[#F8EEE6] text-clay-700 border-[#E7D8C9] ring-1 ring-[#F4E7DB]',
            'ordered': 'bg-[#FBF1E8] text-clay-700 border-[#E7D8C9] ring-1 ring-[#F4E7DB]',
            'partially_received': 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-100',
            'received': 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100',
            'completed': 'bg-green-50 text-green-700 border-green-200 ring-1 ring-green-100',
            'rejected': 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100',
        };

        const labels = {
            'pending': 'Pending Accounting',
            'finance_approved': 'Pending Accounting',
            'accounting_approved': 'Funds Released',
            'ordered': 'Ordered',
            'partially_received': 'Partially Received',
            'received': 'Received (Buffer)',
            'completed': 'Completed',
            'rejected': 'Rejected',
        };

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${styles[status] || styles['pending']}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                    status === 'completed' ? 'bg-green-500' :
                    status === 'rejected' ? 'bg-red-500' :
                    status === 'ordered' || status === 'accounting_approved' ? 'bg-clay-500' :
                    status === 'received' ? 'bg-emerald-500' :
                    'bg-amber-500'
                }`} />
                {labels[status] || status}
            </span>
        );
    };

    // KPI Data
    const kpiCards = [
        { label: 'Total Requests', value: requests.length, icon: ClipboardList, color: 'text-stone-700', bg: 'bg-stone-50', border: 'border-stone-200' },
        { label: 'Pending', value: getCount('pending'), icon: Timer, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
        { label: 'In Process', value: getCount('ordered') + getCount('partially_received'), icon: Truck, color: 'text-clay-700', bg: 'bg-[#FBF1E8]', border: 'border-[#E7D8C9]' },
        { label: 'Completed', value: getCount('completed'), icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    ];

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="Stock Requests" />
            
            <SellerSidebar active="stock-requests" user={auth.user} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all duration-300">
                <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 sticky top-0 z-40">
                    <div className="flex min-w-0 items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-clay-600">
                            <Menu size={24} />
                        </button>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="truncate text-lg sm:text-xl font-bold text-gray-900">Stock Requests</h1>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-900 text-[10px] font-bold uppercase tracking-wider text-gray-300">
                                    <Building2 size={10} className="text-clay-400" /> Enterprise
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Track purchasing, receiving, and buffer transfers</p>
                        </div>
                    </div>

                                        
                    <div className="flex items-center gap-2 sm:gap-6">
                        <div className="flex items-center gap-3">
                            <NotificationDropdown />
                        </div>
                        <div className="hidden sm:block h-8 w-px bg-gray-200"></div>
                        <div className="relative">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button type="button" className="inline-flex items-center gap-2 px-1 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-transparent hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                                            <div className="hidden lg:block">
                                                <WorkspaceAccountSummary user={auth.user} />
                                            </div>
                                            <UserAvatar user={auth.user} />
                                            <ChevronDown size={16} className="text-gray-400" />
                                        </button>
                                    </span>
                                </Dropdown.Trigger>

                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')} className="flex items-center gap-2">
                                        <User size={16} /> Profile
                                    </Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button" className="flex items-center gap-2 text-red-600 hover:text-red-700">
                                        <LogOut size={16} /> Log Out
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                </header>

                <main className="p-4 sm:p-6 space-y-4">
                    {/* KPI SUMMARY CARDS */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {kpiCards.map((card, i) => (
                            <div key={i} className={`${card.bg} border ${card.border} rounded-2xl p-3 transition-all duration-200 hover:shadow-sm`}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.label}</span>
                                    <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center`}>
                                        <card.icon size={14} className={card.color} />
                                    </div>
                                </div>
                                <p className={`text-xl font-extrabold ${card.color}`}>{card.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* STATUS TABS */}
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm">
                        <div className="overflow-x-auto border-b border-gray-100">
                            <div className="flex min-w-max gap-1 p-1.5">
                            {STATUS_TABS.map(tab => {
                                const count = getCount(tab.id);
                                const isActive = activeTab === tab.id;
                                const TabIcon = tab.icon;
                                return (
                                    <button 
                                        key={tab.id} 
                                        onClick={() => setActiveTab(tab.id)} 
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-200 ${
                                            isActive 
                                                ? 'bg-clay-600 text-white shadow-sm shadow-clay-100' 
                                                : 'text-gray-500 hover:bg-[#FCF7F2] hover:text-clay-700'
                                        }`}
                                    >
                                        <TabIcon size={12} />
                                        {tab.label}
                                        {count > 0 && (
                                            <span className={`ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                                                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                            </div>
                        </div>

                        {/* TABLE */}
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[980px] text-left">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Request ID</th>
                                        <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item</th>
                                        <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Requested</th>
                                        <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Progress</th>
                                        <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Cost</th>
                                        <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredRequests.length > 0 ? (
                                        filteredRequests.map((req) => (
                                            <tr key={req.id} className="group hover:bg-[#FCF7F2] transition-colors duration-150">
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1 font-mono text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                                        #{req.id}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-bold text-gray-900 text-sm">{req.supply?.name || 'Unknown Item'}</p>
                                                    <p className="text-[11px] text-gray-400 mt-0.5">{req.supply?.category}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm font-bold text-gray-900">{req.quantity}</span>
                                                    <span className="text-xs text-gray-400 ml-1">{req.supply?.unit}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="text-gray-400 w-20">Received</span>
                                                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
                                                                <div 
                                                                    className="h-full bg-green-500 rounded-full transition-all duration-500" 
                                                                    style={{ width: `${req.quantity > 0 ? ((req.received_quantity || 0) / req.quantity * 100) : 0}%` }}
                                                                />
                                                            </div>
                                                            <span className="font-bold text-green-600 min-w-[20px]">{req.received_quantity || 0}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="text-gray-400 w-20">Transferred</span>
                                                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
                                                                <div 
                                                                    className="h-full bg-clay-500 rounded-full transition-all duration-500" 
                                                                    style={{ width: `${req.quantity > 0 ? ((req.transferred_quantity || 0) / req.quantity * 100) : 0}%` }}
                                                                />
                                                            </div>
                                                            <span className="font-bold text-clay-700 min-w-[20px]">{req.transferred_quantity || 0}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm font-bold text-clay-700">{formatPeso(req.total_cost)}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {getStatusBadge(req.status)}
                                                    {req.status === 'rejected' && req.rejection_reason && (
                                                        <div className="mt-1.5 text-[10px] text-red-600 bg-red-50/80 px-2 py-1 rounded inline-block border border-red-100/50">
                                                            <span className="font-bold uppercase tracking-wider block mb-0.5" style={{ fontSize: '8px' }}>Reason for Rejection</span>
                                                            {req.rejection_reason}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {req.status === 'accounting_approved' && (
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedRequest(req);
                                                                    setShowOrderModal(true);
                                                                }} 
                                                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-clay-600 text-white text-[10px] font-bold rounded-lg hover:bg-clay-700 transition-all active:scale-95 shadow-sm shadow-clay-100"
                                                            >
                                                                <Truck size={13} /> Mark Ordered
                                                            </button>
                                                        )}
                                                        {(req.status === 'ordered' || req.status === 'partially_received' || req.status === 'received') && (
                                                            <button onClick={() => openReceiveModal(req)} className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-600 text-white text-[10px] font-bold rounded-lg hover:bg-amber-700 transition-all active:scale-95 shadow-sm shadow-amber-100">
                                                                <Package size={13} /> Receive
                                                            </button>
                                                        )}
                                                        {(req.status === 'received' && (req.received_quantity - req.transferred_quantity > 0)) && (
                                                            <button onClick={() => openTransferModal(req)} className="inline-flex items-center gap-1.5 px-2 py-1 bg-stone-700 text-white text-[10px] font-bold rounded-lg hover:bg-stone-800 transition-all active:scale-95 shadow-sm shadow-stone-200">
                                                                <ArrowRight size={13} /> Transfer
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-16">
                                                <div className="flex flex-col items-center justify-center text-center">
                                                    <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                                                        <Inbox size={28} className="text-gray-300" />
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-400">No requests found</p>
                                                    <p className="text-xs text-gray-300 mt-1 max-w-xs">
                                                        {activeTab === 'all' 
                                                            ? 'Stock requests from inventory will appear here once created.'
                                                            : `No requests with "${STATUS_TABS.find(t => t.id === activeTab)?.label}" status.`
                                                        }
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* TABLE FOOTER */}
                        {filteredRequests.length > 0 && (
                            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                                <p className="text-xs text-gray-400">
                                    Showing <span className="font-bold text-gray-600">{filteredRequests.length}</span> of <span className="font-bold text-gray-600">{requests.length}</span> requests
                                </p>
                            </div>
                        )}
                    </div>
                </main>

                {/* RECEIVE MODAL */}
                <Modal show={receiveModal.open} onClose={() => setReceiveModal({ open: false, id: null, max: null })}>
                    <form onSubmit={submitReceive} className="p-5 sm:p-6">
                        <div className="w-10 h-10 bg-[#F8EEE6] text-clay-700 rounded-lg flex items-center justify-center mb-3 border border-[#E7D8C9]">
                            <Package size={20} />
                        </div>
                        <h2 className="text-base font-bold text-gray-900 mb-1">Receive Items into Buffer</h2>
                        <p className="text-xs text-gray-400 mb-4">Record items received from the supplier</p>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Quantity Received</label>
                            <input type="number" min="1" max={receiveModal.max} value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} className="w-full border-gray-200 rounded-lg shadow-sm focus:border-clay-500 focus:ring-clay-500 font-bold text-base py-2" required />
                            <p className="text-xs text-gray-400 mt-2">Remaining needed: <span className="font-bold text-clay-700">{receiveModal.max}</span></p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setReceiveModal({ open: false, id: null, max: null })} className="px-3 py-2 text-xs text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-clay-600 text-white text-xs font-bold rounded-lg hover:bg-clay-700 transition shadow-sm shadow-clay-100 active:scale-95">Receive Items</button>
                        </div>
                    </form>
                </Modal>

                {/* TRANSFER MODAL */}
                <Modal show={transferModal.open} onClose={() => setTransferModal({ open: false, id: null, max: null })}>
                    <form onSubmit={submitTransfer} className="p-5 sm:p-6">
                        <div className="w-10 h-10 bg-[#FBF1E8] text-clay-700 rounded-lg flex items-center justify-center mb-3 border border-[#E7D8C9]">
                            <ArrowRight size={20} />
                        </div>
                        <h2 className="text-base font-bold text-gray-900 mb-1">Transfer to Active Inventory</h2>
                        <p className="text-xs text-gray-400 mb-4">Move items from buffer stock to your active inventory</p>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Quantity to Transfer</label>
                            <input type="number" min="1" max={transferModal.max} value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} className="w-full border-gray-200 rounded-lg shadow-sm focus:border-clay-500 focus:ring-clay-500 font-bold text-base py-2" required />
                            <p className="text-xs text-gray-400 mt-2">Available in Buffer: <span className="font-bold text-clay-700">{transferModal.max}</span></p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setTransferModal({ open: false, id: null, max: null })} className="px-3 py-2 text-xs text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-clay-600 text-white text-xs font-bold rounded-lg hover:bg-clay-700 transition shadow-sm shadow-clay-100 active:scale-95">Transfer</button>
                        </div>
                    </form>
                </Modal>

                {/* ORDER MODAL */}
                <Modal show={showOrderModal} onClose={() => setShowOrderModal(false)} maxWidth="sm">
                    <div className="p-5 sm:p-6 text-center">
                        <div className="w-12 h-12 bg-[#FBF1E8] text-clay-700 rounded-xl flex items-center justify-center mx-auto mb-3 border border-[#E7D8C9] shadow-sm">
                            <Truck size={24} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Confirm Order Placed?</h2>
                        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                            Are you sure you have placed the order for <strong>{selectedRequest?.supply?.name}</strong> with the supplier?
                            <br/><br/>
                            This will move the request to <strong>On Process</strong> status.
                        </p>
                        <div className="flex justify-center gap-3">
                            <button 
                                onClick={() => setShowOrderModal(false)}
                                className="px-4 py-2 text-xs text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleMarkAsOrdered}
                                className="px-4 py-2 bg-clay-600 text-white rounded-lg text-xs font-bold hover:bg-clay-700 transition shadow-sm shadow-clay-100 active:scale-95"
                            >
                                Confirm Order
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
            {/* TOAST NOTIFICATION */}
            {showToast && (
                <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom duration-300 ${toastType === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                    {toastType === 'error' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                    <p className="font-bold text-sm">{toastMessage}</p>
                    <button onClick={() => setShowToast(false)} className="ml-2 hover:opacity-80"><XCircle size={16} /></button>
                </div>
            )}
        </div>
    );
}



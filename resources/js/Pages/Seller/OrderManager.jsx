import React, { useState, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown';
import WorkspaceLogoutLink from '@/Components/WorkspaceLogoutLink';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { 
    Package, ShoppingBag, Search, Filter, Truck, CheckCircle2, 
    Clock, XCircle, Printer, AlertCircle, MessageCircle, X, 
    ChevronDown, User, LogOut, AlertTriangle, Hash, MapPin, 
    PackageCheck, RotateCcw, Box, Eye, Wallet, DollarSign, Menu, Camera as CameraIcon,
    CheckCircle, Calendar, ChevronLeft, ChevronRight
} from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceAccountSummary from '@/Components/WorkspaceAccountSummary';

const KPICard = ({ title, value, icon: Icon, color, bg, trend }) => (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wide mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>
            </div>
            <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex items-center justify-center shadow-sm`}>
                <Icon size={20} />
            </div>
        </div>
    </div>
);

const Tab = ({ label, count, active, onClick, color = 'clay' }) => (
    <button 
        onClick={onClick}
        className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            active 
            ? 'border-clay-600 text-clay-700 bg-clay-50/30' 
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        }`}
    >
        {label}
        {count > 0 && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                active ? 'bg-clay-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
                {count}
            </span>
        )}
    </button>
);

const StatusBadge = ({ status }) => {
    const config = {
        'Pending': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
        'Accepted': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: PackageCheck },
        'Shipped': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', icon: Truck },
        'Ready for Pickup': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', icon: PackageCheck },
        'Delivered': { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', icon: MapPin },
        'Completed': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
        'Refund/Return': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', icon: RotateCcw },
        'Rejected': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
        'Cancelled': { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', icon: XCircle },
    };
    
    const { bg, text, border, icon: Icon } = config[status] || config['Pending'];

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${bg} ${text} ${border}`}>
            <Icon size={12} />
            {status}
        </span>
    );
};

// Payment Status Badge
const PaymentStatusBadge = ({ status, method }) => {
    const config = {
        'pending': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Unpaid' },
        'paid': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', label: 'Paid' },
        'refunded': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', label: 'Refunded' },
    };
    
    const { bg, text, border, label } = config[status] || config['pending'];
    
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${bg} ${text} ${border}`}>
            <Wallet size={10} />
            {label} - {method || 'COD'}
        </span>
    );
};

const humanizeAddressType = (value) => {
    if (!value) return null;

    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

// --- MAIN COMPONENT ---
export default function OrderManager({ auth, orders = [] }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- FLASH MESSAGE HANDLING ---
    const { flash, sellerSidebar } = usePage().props;
    const canAccessMessages = sellerSidebar?.visibleModules?.includes('messages');
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success'); // 'success' or 'error'

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

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        action: null,
        isDestructive: false
    });

    // Shipping Modal State
    const [shippingModal, setShippingModal] = useState({
        isOpen: false,
        orderId: null,
        trackingNumber: '',
        shippingNotes: '',
        proofOfDelivery: null,
        previewUrl: null,
        isPickup: false
    });

    const [replacementModal, setReplacementModal] = useState({
        isOpen: false,
        orderId: null,
        resolutionDescription: '',
        error: '',
        processing: false,
    });

    // --- FILTER LOGIC ---
    const filteredOrders = useMemo(() => {
        let result = orders;

        // Status Filtering
        if (activeTab === 'Cancelled') {
            result = result.filter(o => ['Cancelled', 'Rejected'].includes(o.status));
        } else if (activeTab === 'Shipped') {
            result = result.filter(o => o.status === 'Shipped'); // Only Delivery
        } else if (activeTab === 'To Pickup') {
            result = result.filter(o => o.status === 'Ready for Pickup'); // Only Pickup
        } else if (activeTab !== 'All') {
            result = result.filter(o => o.status === activeTab || (activeTab === 'Processing' && o.status === 'Accepted'));
        }

        // Search Filtering
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(o => 
                o.id.toLowerCase().includes(query) ||
                o.customer.toLowerCase().includes(query) ||
                o.items.some(i => i.name.toLowerCase().includes(query))
            );
        }

        // Date Filtering
        if (dateRange.start || dateRange.end) {
            result = result.filter(o => {
                const orderDateStr = o.date.split(' •')[0];
                const orderDate = new Date(orderDateStr);
                orderDate.setHours(0, 0, 0, 0);

                let isAfterStart = true;
                let isBeforeEnd = true;

                if (dateRange.start) {
                    const start = new Date(dateRange.start);
                    start.setHours(0, 0, 0, 0);
                    isAfterStart = orderDate >= start;
                }
                if (dateRange.end) {
                    const end = new Date(dateRange.end);
                    end.setHours(0, 0, 0, 0);
                    isBeforeEnd = orderDate <= end;
                }

                return isAfterStart && isBeforeEnd;
            });
        }

        return result;
    }, [orders, activeTab, searchQuery, dateRange]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const paginatedOrders = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredOrders, currentPage]);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, activeTab, dateRange]);

    // --- ACTIONS ---
    const initiateStatusUpdate = (orderId, newStatus) => {
        let title = "Update Order Status";
        let message = `Mark this order as ${newStatus}?`;
        let isDestructive = false;

        if (newStatus === 'Cancelled') {
            title = "Approve Return & Refund";
            message = "This will cancel the order and approve the refund. This action cannot be undone.";
            isDestructive = true;
        } else if (newStatus === 'Rejected') {
            title = "Reject Order";
            message = "Are you sure you want to reject this order?";
            isDestructive = true;
        } else if (newStatus === 'Completed') {
            const order = orders.find(o => o.id === orderId);
            if (order && order.status === 'Refund/Return') {
                title = "Reject Return Request";
                message = "This will reject the buyer's return request and mark the order as completed.";
                isDestructive = true;
            } else {
                title = "Complete Transaction";
                message = "This will define the order as successfully completed and release the payment.";
                isDestructive = false;
            }
        }

        setConfirmModal({
            isOpen: true,
            title,
            message,
            isDestructive,
            action: () => {
                router.post(route('orders.update', orderId), { status: newStatus }, {
                    preserveScroll: true,
                    onSuccess: () => setConfirmModal({ ...confirmModal, isOpen: false })
                });
            }
        });
    };

    const openShippingModal = (order) => {
        setShippingModal({
            isOpen: true,
            orderId: order.id,
            trackingNumber: '',
            shippingNotes: '',
            proofOfDelivery: null,
            previewUrl: null,
            isPickup: order.shipping_method === 'Pick Up'
        });
    };

    const openReplacementModal = (orderId) => {
        setReplacementModal({
            isOpen: true,
            orderId,
            resolutionDescription: '',
            error: '',
            processing: false,
        });
    };

    const closeReplacementModal = () => {
        setReplacementModal({
            isOpen: false,
            orderId: null,
            resolutionDescription: '',
            error: '',
            processing: false,
        });
    };

    const submitShipping = () => {
        const formData = new FormData();
        const status = shippingModal.isPickup ? 'Ready for Pickup' : 'Shipped';
        
        formData.append('status', status);
        if (shippingModal.trackingNumber) formData.append('tracking_number', shippingModal.trackingNumber);
        if (shippingModal.shippingNotes) formData.append('shipping_notes', shippingModal.shippingNotes);
        if (shippingModal.proofOfDelivery) formData.append('proof_of_delivery', shippingModal.proofOfDelivery);

        router.post(route('orders.update', shippingModal.orderId), formData, {
            preserveScroll: true,
            onSuccess: () => setShippingModal({ ...shippingModal, isOpen: false }),
            forceFormData: true,
        });
    };

    const submitReplacementApproval = () => {
        const description = replacementModal.resolutionDescription.trim();

        if (!description) {
            setReplacementModal((current) => ({
                ...current,
                error: 'Compensation or resolution details are required before approving a replacement.',
            }));
            return;
        }

        router.post(route('orders.approve-return', replacementModal.orderId), {
            action_type: 'replace',
            replacement_resolution_description: description,
        }, {
            preserveScroll: true,
            onStart: () => setReplacementModal((current) => ({ ...current, processing: true, error: '' })),
            onError: (errors) => setReplacementModal((current) => ({
                ...current,
                processing: false,
                error: errors.replacement_resolution_description || errors.action_type || 'Unable to approve replacement.',
            })),
            onSuccess: () => closeReplacementModal(),
            onFinish: () => setReplacementModal((current) => ({ ...current, processing: false })),
        });
    };

    const openChat = (userId) => {
        if (!canAccessMessages) return;
        router.visit(route('chat.index', { user_id: userId }));
    };

    const getCount = (status) => {
        if (status === 'Cancelled') return orders.filter(o => ['Cancelled', 'Rejected'].includes(o.status)).length;
        if (status === 'Shipped') return orders.filter(o => o.status === 'Shipped').length;
        if (status === 'Ready for Pickup') return orders.filter(o => o.status === 'Ready for Pickup').length;
        return orders.filter(o => o.status === status).length;
    };

    // Get urgent count (pending + returns)
    const urgentCount = getCount('Pending') + getCount('Refund/Return');

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="Order Manager" />
            
            <SellerSidebar active="orders" user={auth.user} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all duration-300">
                
                {/* --- HEADER --- */}
                <header className="bg-white/90 backdrop-blur-xl border-b border-gray-100 flex flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8 sm:flex-row sm:items-center sm:justify-between sticky top-0 z-40 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-clay-600">
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Order Management</h1>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Process orders, track shipments & manage returns</p>
                        </div>
                    </div>

                                        
                    <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap sm:gap-6">
                        {/* 1. Actions */}
                        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                            <a 
                                href={route('orders.export')} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition shadow-sm"
                            >
                                <Printer size={16} /> Export
                            </a>

                            <NotificationDropdown />
                        </div>

                        {/* Divider */}
                        <div className="hidden sm:block h-8 w-px bg-gray-200"></div>

                        {/* 2. Profile Dropdown */}
                        <div className="relative">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button type="button" className="inline-flex items-center gap-2 sm:gap-3 px-1 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-transparent hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                                            <WorkspaceAccountSummary user={auth.user} className="hidden lg:block text-right" />
                                            <UserAvatar user={auth.user} />
                                            <ChevronDown size={16} className="text-gray-400" />
                                        </button>
                                    </span>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')} className="flex items-center gap-2">
                                        <User size={16} /> Profile
                                    </Dropdown.Link>
                                    <WorkspaceLogoutLink className="flex items-center gap-2 text-red-600 hover:text-red-700">
                                        <LogOut size={16} /> Log Out
                                    </WorkspaceLogoutLink>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
                    
                    {/* 1. KPI CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KPICard 
                            title="Needs Action" 
                            value={urgentCount} 
                            icon={AlertCircle} 
                            color="text-amber-600" 
                            bg="bg-amber-50" 
                        />
                        <KPICard 
                            title="Processing" 
                            value={getCount('Accepted')} 
                            icon={Package} 
                            color="text-blue-600" 
                            bg="bg-blue-50" 
                        />
                        <KPICard 
                            title="In Transit / Ready" 
                            value={getCount('Shipped') + getCount('Delivered') + getCount('Ready for Pickup')}  
                            icon={Truck} 
                            color="text-indigo-600" 
                            bg="bg-indigo-50" 
                        />
                        <KPICard 
                            title="Completed" 
                            value={getCount('Completed')} 
                            icon={CheckCircle2} 
                            color="text-green-600" 
                            bg="bg-green-50" 
                        />
                    </div>

                    {/* 2. ORDER BOARD */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        
                        {/* Tabs */}
                        <div className="flex border-b border-gray-100 px-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                            <Tab label="All" count={orders.length} active={activeTab === 'All'} onClick={() => setActiveTab('All')} />
                            <Tab label="Pending" count={getCount('Pending')} active={activeTab === 'Pending'} onClick={() => setActiveTab('Pending')} />
                            <Tab label="Processing" count={getCount('Accepted')} active={activeTab === 'Processing'} onClick={() => setActiveTab('Processing')} />
                            <Tab label="Shipped" count={getCount('Shipped')} active={activeTab === 'Shipped'} onClick={() => setActiveTab('Shipped')} />
                            <Tab label="To Pickup" count={getCount('Ready for Pickup')} active={activeTab === 'To Pickup'} onClick={() => setActiveTab('To Pickup')} />
                            <Tab label="Delivered" count={getCount('Delivered')} active={activeTab === 'Delivered'} onClick={() => setActiveTab('Delivered')} />
                            <Tab label="Returns" count={getCount('Refund/Return')} active={activeTab === 'Returns'} onClick={() => setActiveTab('Returns')} />
                            <Tab label="Completed" count={getCount('Completed')} active={activeTab === 'Completed'} onClick={() => setActiveTab('Completed')} />
                            <Tab label="Cancelled" count={getCount('Cancelled')} active={activeTab === 'Cancelled'} onClick={() => setActiveTab('Cancelled')} />
                        </div>

                        {/* Filters & Search */}
                        <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex flex-col gap-3 items-stretch md:flex-row md:items-center">
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input 
                                    type="text" 
                                    placeholder="Search Order ID, Customer..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-clay-200 focus:border-clay-500 transition-all shadow-sm" 
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-clay-200 focus-within:border-clay-500 transition-all shadow-sm w-full md:w-auto">
                                <Calendar className="text-gray-400" size={14} />
                                <div className="flex flex-wrap items-center gap-2">
                                    <input 
                                        type="date" 
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                        className="border-none bg-transparent p-0 text-xs font-medium focus:ring-0 text-gray-600 placeholder-gray-400 cursor-pointer"
                                    />
                                    <span className="text-gray-300 font-medium text-xs">to</span>
                                    <input 
                                        type="date" 
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                        className="border-none bg-transparent p-0 text-xs font-medium focus:ring-0 text-gray-600 placeholder-gray-400 cursor-pointer"
                                    />
                                </div>
                                {(dateRange.start || dateRange.end) && (
                                    <button 
                                        onClick={() => setDateRange({ start: '', end: '' })}
                                        className="text-gray-400 hover:text-red-500 transition-colors ml-1 p-0.5 rounded-md hover:bg-red-50"
                                        title="Clear dates"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Order List */}
                        <div className="divide-y divide-gray-100">
                            {paginatedOrders.length > 0 ? (
                                paginatedOrders.map((order) => (
                                    <div key={order.id} className="p-4 sm:p-5 hover:bg-gray-50/50 transition-all group">
                                        
                                        {/* Order Header */}
                                        <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 min-w-0">
                                                <div>
                                                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">Order</span>
                                                    <h3 className="font-bold text-gray-900 text-sm">{order.id}</h3>
                                                </div>
                                                <div className="hidden sm:block h-8 w-px bg-gray-200" />
                                                <div className="flex items-center gap-1.5 text-gray-500">
                                                    <Clock size={12} />
                                                    <span className="text-xs font-medium">{order.date}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-gray-700">
                                                    <User size={12} />
                                                    <span className="text-xs font-bold">{order.customer}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <PaymentStatusBadge status={order.payment_status} method={order.payment_method} />
                                                <StatusBadge status={order.status} />
                                            </div>
                                        </div>

                                        {/* Info Badges */}
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {order.payment_status === 'pending' && order.payment_method === 'COD' && ['Pending', 'Accepted', 'Shipped', 'Ready for Pickup', 'Delivered'].includes(order.status) && (
                                                <button
                                                    onClick={() => router.post(route('orders.payment-status', order.id), { payment_status: 'paid' })}
                                                    className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-green-700 hover:bg-green-100 transition"
                                                >
                                                    <DollarSign size={12} />
                                                    Mark as Paid
                                                </button>
                                            )}
                                            {order.tracking_number && (
                                                <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1.5">
                                                    <Hash size={12} className="text-indigo-600" />
                                                    <span className="text-[10px] font-bold text-indigo-700">{order.tracking_number}</span>
                                                </div>
                                            )}
                                            {order.proof_of_delivery && (
                                                <a 
                                                    href={order.proof_of_delivery} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition group/proof"
                                                >
                                                    <PackageCheck size={12} className="text-gray-400 group-hover/proof:text-gray-600" />
                                                    Proof
                                                </a>
                                            )}
                                            {order.shipping_address && (
                                                <div className="inline-flex items-center gap-1.5 text-gray-500 text-xs">
                                                    <MapPin size={12} />
                                                    <span className="truncate max-w-[200px]">{order.shipping_address}</span>
                                                    {order.shipping_address_type && (
                                                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                                                            {humanizeAddressType(order.shipping_address_type)}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Order Items + Actions */}
                                        <div className="flex flex-col lg:flex-row gap-6">
                                            
                                            {/* Items */}
                                            <div className="flex-1 space-y-3">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex flex-col gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 sm:flex-row sm:items-center sm:gap-4">
                                                        <div className="w-14 h-14 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden shrink-0">
                                                            <img 
                                                                src={item.img.startsWith('http') || item.img.startsWith('/storage') ? item.img : `/storage/${item.img}`} 
                                                                alt={item.name} 
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                                                            <p className="text-xs text-gray-500">Var: {item.variant} • x{item.qty}</p>
                                                        </div>
                                                        <div className="text-sm font-bold text-gray-700">₱{Number(item.price).toLocaleString()}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Action Panel */}
                                            <div className="border-t border-gray-100 pt-4 lg:w-72 lg:pt-0 lg:pl-6 lg:border-l lg:border-t-0">
                                                <div className="text-left lg:text-right mb-4">
                                                    <p className="text-xs text-gray-400 font-medium">Total Amount</p>
                                                    <p className="text-2xl font-bold text-clay-700">₱{order.total}</p>
                                                </div>
                                                
                                                {/* Status-specific Actions */}
                                                <div className="space-y-2">
                                                    
                                                    {order.status === 'Pending' && (
                                                        <>
                                                            {canAccessMessages && (
                                                                <button 
                                                                    onClick={() => openChat(order.user_id)} 
                                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 bg-white rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition shadow-sm"
                                                                >
                                                                    <MessageCircle size={16} /> Discuss Shipping
                                                                </button>
                                                            )}
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    onClick={() => initiateStatusUpdate(order.id, 'Rejected')} 
                                                                    className="flex-1 px-3 py-2.5 border border-red-200 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition"
                                                                >
                                                                    <XCircle size={14} className="inline mr-1" /> Reject
                                                                </button>
                                                                <button 
                                                                    onClick={() => initiateStatusUpdate(order.id, 'Accepted')} 
                                                                    className="flex-1 px-3 py-2.5 bg-clay-600 text-white rounded-xl text-xs font-bold hover:bg-clay-700 shadow-md transition"
                                                                >
                                                                    <CheckCircle2 size={14} className="inline mr-1" /> Accept
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}

                                                    {order.status === 'Accepted' && (
                                                        <>
                                                            {/* SHIPPING GUARD: Prevent shipping if unpaid & not COD */}
                                                            {(order.payment_method !== 'COD' && order.payment_status !== 'paid') ? (
                                                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-center">
                                                                    <div className="flex items-center justify-center gap-2 text-red-600 font-bold text-xs mb-1">
                                                                        <AlertTriangle size={14} />
                                                                        <span>Payment Pending</span>
                                                                    </div>
                                                                    <p className="text-[10px] text-red-500">
                                                                        Wait for payment before shipping.
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => openShippingModal(order)} 
                                                                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl text-sm font-bold shadow-lg transition-all hover:-translate-y-0.5 ${
                                                                        order.shipping_method === 'Pick Up' 
                                                                        ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' 
                                                                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                                                                    }`}
                                                                >
                                                                    {order.shipping_method === 'Pick Up' ? (
                                                                        <><PackageCheck size={18} /> Mark as Ready for Pickup</>
                                                                    ) : (
                                                                        <><Truck size={18} /> Mark as Shipped</>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </>
                                                    )}

                                                    {(order.status === 'Shipped' || order.status === 'Ready for Pickup') && (
                                                        <div className="text-center p-4 bg-blue-50 rounded-xl border-2 border-dashed border-blue-200">
                                                            <Truck size={20} className="mx-auto text-blue-400 mb-2" />
                                                            <p className="text-xs font-bold text-blue-600">
                                                                {order.status === 'Ready for Pickup' ? 'Ready for Pickup' : 'Shipment in Progress'}
                                                            </p>
                                                            <p className="text-[10px] text-blue-400 mt-1">Waiting for Buyer to Receive</p>
                                                        </div>
                                                    )}

                                                    {order.status === 'Delivered' && !order.replacement_in_progress && (
                                                        <div className="space-y-3">
                                                            <div className="text-center p-4 bg-green-50 rounded-xl border-2 border-dashed border-green-200">
                                                                <CheckCircle2 size={20} className="mx-auto text-green-500 mb-2" />
                                                                <p className="text-xs font-bold text-green-700">Delivered & Received</p>
                                                                <p className="text-[10px] text-green-600 mt-1">Buyer confirmed receipt</p>
                                                            </div>
                                                            <button 
                                                                onClick={() => initiateStatusUpdate(order.id, 'Completed')} 
                                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-all hover:-translate-y-0.5"
                                                            >
                                                                <CheckCircle2 size={18} /> Complete Transaction
                                                            </button>
                                                        </div>
                                                    )}

                                                    {order.status === 'Delivered' && order.replacement_in_progress && (
                                                        <div className="space-y-3">
                                                            <div className="text-center p-4 bg-teal-50 rounded-xl border-2 border-dashed border-teal-200">
                                                                <PackageCheck size={20} className="mx-auto text-teal-500 mb-2" />
                                                                <p className="text-xs font-bold text-teal-700">Waiting for Buyer Confirmation</p>
                                                                <p className="text-[10px] text-teal-600 mt-1">Replacement stays unresolved until the buyer officially receives it.</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {order.replacement_in_progress && (
                                                        <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50 p-3 text-left">
                                                            <div className="flex items-center gap-2">
                                                                <PackageCheck size={16} className="text-teal-600" />
                                                                <p className="text-sm font-bold text-teal-700">Replacement in Progress</p>
                                                            </div>
                                                            {order.replacement_started_at && (
                                                                <p className="mt-2 text-[11px] font-medium text-teal-700">
                                                                    Restarted on {order.replacement_started_at}
                                                                </p>
                                                            )}
                                                            {order.replacement_resolution_description && (
                                                                <div className="mt-2 rounded-lg border border-teal-100 bg-white/80 p-2 text-xs text-teal-900 whitespace-pre-wrap">
                                                                    <span className="mb-1 block font-bold">Compensation / Resolution</span>
                                                                    {order.replacement_resolution_description}
                                                                </div>
                                                            )}
                                                            <p className="mt-2 text-[11px] text-teal-700">
                                                                This order is back in the normal delivery loop and must be received by the buyer before it can be considered resolved.
                                                            </p>
                                                        </div>
                                                    )}

                                                    {order.replacement_resolved_at && (
                                                        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-left">
                                                            <div className="flex items-center gap-2">
                                                                <CheckCircle2 size={16} className="text-emerald-600" />
                                                                <p className="text-sm font-bold text-emerald-700">Replacement Resolved</p>
                                                            </div>
                                                            <p className="mt-2 text-[11px] text-emerald-700">
                                                                Buyer confirmed receipt on {order.replacement_resolved_at}.
                                                            </p>
                                                        </div>
                                                    )}

                                                    {order.status === 'Refund/Return' && (
                                                        <>
                                                            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl mb-4 text-left">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <RotateCcw size={16} className="text-orange-600" />
                                                                    <p className="text-sm font-bold text-orange-700">Return Requested</p>
                                                                </div>
                                                                <div className="text-xs text-orange-900 bg-white/50 p-2 rounded-lg border border-orange-100 mb-2 whitespace-pre-wrap">
                                                                    <span className="font-bold block mb-1">Reason:</span>
                                                                    {order.return_reason || 'No reason provided.'}
                                                                </div>
                                                                {order.return_proof_image && (
                                                                    <a 
                                                                        href={order.return_proof_image} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-800 transition bg-white px-2 py-1.5 rounded-lg border border-orange-200 shadow-sm"
                                                                    >
                                                                        <CameraIcon size={14} /> View Proof Image
                                                                    </a>
                                                                )}
                                                            </div>
                                                            {canAccessMessages && (
                                                                <button 
                                                                    onClick={() => openChat(order.user_id)} 
                                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-clay-600 text-white rounded-xl text-sm font-bold hover:bg-clay-700 transition shadow-md"
                                                                >
                                                                    <MessageCircle size={16} /> Negotiate
                                                                </button>
                                                            )}
                                                            <div className="flex flex-col gap-2 mt-2">
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        onClick={() => router.post(route('orders.approve-return', order.id), { action_type: 'refund' }, { preserveScroll: true })} 
                                                                        className="flex-1 px-2 py-2 border border-gray-200 text-gray-700 bg-white rounded-lg text-[10px] font-bold hover:bg-gray-50 transition shadow-sm"
                                                                        title="Refunds money without deducting stock"
                                                                    >
                                                                        Approve (Refund)
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => openReplacementModal(order.id)} 
                                                                        className="flex-1 px-2 py-2 border border-gray-200 text-gray-700 bg-white rounded-lg text-[10px] font-bold hover:bg-gray-50 transition shadow-sm"
                                                                        title="Restarts the delivery cycle and requires a compensation note"
                                                                    >
                                                                        Approve (Replace)
                                                                    </button>
                                                                </div>
                                                                <button 
                                                                    onClick={() => initiateStatusUpdate(order.id, 'Completed')} 
                                                                    className="w-full px-2 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[10px] font-bold hover:bg-red-100 transition"
                                                                >
                                                                    Reject Return
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}

                                                    {order.status === 'Completed' && (
                                                        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-green-600 font-bold text-sm hover:underline">
                                                            <Printer size={16} /> View Receipt
                                                        </button>
                                                    )}

                                                    {(order.status === 'Cancelled' || order.status === 'Rejected') && (
                                                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                                                            <p className="text-xs font-medium text-gray-500">Order {order.status.toLowerCase()}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center">
                                    <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Box size={32} className="text-gray-300" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-600">No orders found</p>
                                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filter</p>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center gap-4 sm:justify-between">
                                <span className="text-sm text-gray-500 font-medium whitespace-nowrap">
                                    Showing <span className="font-bold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-gray-900">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> of <span className="font-bold text-gray-900">{filteredOrders.length}</span> orders
                                </span>
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto" style={{ scrollbarWidth: 'none' }}>
                                    <button 
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                        className="p-2 border border-gray-200 bg-white rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {[...Array(totalPages)].map((_, i) => (
                                            <button 
                                                key={i}
                                                onClick={() => setCurrentPage(i + 1)}
                                                className={`w-9 h-9 rounded-lg text-sm font-bold flex items-center justify-center transition-all shrink-0 ${
                                                    currentPage === i + 1 
                                                    ? 'bg-clay-600 text-white shadow-md' 
                                                    : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm'
                                                }`}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                    <button 
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                        className="p-2 border border-gray-200 bg-white rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* --- CONFIRMATION MODAL --- */}
            <Modal show={confirmModal.isOpen} onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${confirmModal.isDestructive ? 'bg-red-100 text-red-600' : 'bg-clay-100 text-clay-600'}`}>
                        {confirmModal.isDestructive ? <AlertTriangle size={28} /> : <CheckCircle2 size={28} />}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">{confirmModal.title}</h2>
                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">{confirmModal.message}</p>
                    <div className="flex justify-center gap-3">
                        <button 
                            onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
                            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmModal.action} 
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 ${confirmModal.isDestructive ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200' : 'bg-clay-600 hover:bg-clay-700 shadow-lg shadow-clay-200'}`}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </Modal>

            {/* --- SHIPPING MODAL --- */}
            <Modal show={shippingModal.isOpen} onClose={() => setShippingModal({ ...shippingModal, isOpen: false })} maxWidth="md">
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${shippingModal.isPickup ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                            {shippingModal.isPickup ? <PackageCheck size={24} /> : <Truck size={24} />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                {shippingModal.isPickup ? 'Ready for Pickup' : 'Mark as Shipped'}
                            </h2>
                            <p className="text-xs text-gray-500">
                                {shippingModal.isPickup ? 'Notify buyer that item is ready' : 'Add tracking info for the buyer'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="space-y-5">
                        {!shippingModal.isPickup && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    <Hash size={14} className="inline mr-1" />
                                    Tracking Number
                                </label>
                                <TextInput 
                                    value={shippingModal.trackingNumber}
                                    onChange={(e) => setShippingModal({ ...shippingModal, trackingNumber: e.target.value })}
                                    placeholder="e.g. LALA-12345678"
                                    className="w-full"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Lalamove, Grab, J&T, etc.</p>
                            </div>
                        )}
                        
                        {/* Proof of Delivery / Handover - ONLY for Shipping */}
                        {!shippingModal.isPickup && (
                            <div>
                                 <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Proof of Delivery <span className="text-red-500">*</span>
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 transition relative overflow-hidden group">
                                    <input 
                                        type="file" 
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                setShippingModal({
                                                    ...shippingModal,
                                                    proofOfDelivery: file,
                                                    previewUrl: URL.createObjectURL(file)
                                                });
                                            }
                                        }}
                                    />
                                    {shippingModal.previewUrl ? (
                                        <img src={shippingModal.previewUrl} alt="Proof" className="h-32 w-full object-contain mx-auto rounded-lg" />
                                    ) : (
                                        <div className="text-gray-400">
                                            <CameraIcon className="mx-auto mb-2" size={24} />
                                            <p className="text-xs">Click to upload photo of item/package</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                {shippingModal.isPickup ? 'Pickup Instructions' : 'Shipping Notes'} <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <textarea 
                                value={shippingModal.shippingNotes}
                                onChange={(e) => setShippingModal({ ...shippingModal, shippingNotes: e.target.value })}
                                placeholder={shippingModal.isPickup ? "e.g. Meet at lobby, look for blue shirt" : "e.g. Driver contact: 0917-XXX-XXXX"}
                                rows={3}
                                className="w-full border-gray-200 rounded-xl focus:border-clay-500 focus:ring-clay-200 shadow-sm text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                        <button 
                            onClick={() => setShippingModal({ ...shippingModal, isOpen: false })} 
                            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={submitShipping}
                            disabled={!shippingModal.isPickup && !shippingModal.proofOfDelivery}
                            className={`px-6 py-2.5 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all hover:-translate-y-0.5 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${shippingModal.isPickup ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
                        >
                            <CheckCircle2 size={16} /> Confirm {shippingModal.isPickup ? 'Ready' : 'Shipment'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal show={replacementModal.isOpen} onClose={closeReplacementModal} maxWidth="md">
                <div className="p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-full bg-teal-100 p-3 text-teal-600">
                            <PackageCheck size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Approve Replacement</h2>
                            <p className="text-sm text-gray-500">Describe the compensation or resolution the buyer will receive.</p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-xs text-teal-800">
                        The order will return to the normal delivery lifecycle and must be officially received by the buyer again.
                    </div>

                    <div className="mt-4">
                        <label className="mb-2 block text-sm font-bold text-gray-700">Compensation / Resolution Description</label>
                        <textarea
                            rows={4}
                            value={replacementModal.resolutionDescription}
                            onChange={(event) => setReplacementModal((current) => ({
                                ...current,
                                resolutionDescription: event.target.value,
                                error: '',
                            }))}
                            className="w-full rounded-xl border-gray-300 text-sm shadow-sm focus:border-teal-500 focus:ring-teal-500"
                            placeholder="Example: We will send a replacement item with reinforced packaging and include a small courtesy item for the inconvenience."
                        />
                        {replacementModal.error && (
                            <p className="mt-2 text-sm font-medium text-red-600">{replacementModal.error}</p>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <button
                            type="button"
                            onClick={closeReplacementModal}
                            disabled={replacementModal.processing}
                            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={submitReplacementApproval}
                            disabled={replacementModal.processing}
                            className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-teal-200 hover:bg-teal-700 disabled:opacity-50"
                        >
                            {replacementModal.processing ? 'Approving...' : 'Approve Replacement'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* --- TOAST NOTIFICATION --- */}
            <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[100] transition-all duration-500 transform ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                <div className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl border ${toastType === 'success' ? 'bg-white border-green-100' : 'bg-white border-red-100'}`}>
                    <div className={`p-2 rounded-full ${toastType === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {toastType === 'success' ? <CheckCircle size={20} className="stroke-2" /> : <AlertCircle size={20} className="stroke-2" />}
                    </div>
                    <div>
                        <h4 className={`text-sm font-bold ${toastType === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                            {toastType === 'success' ? 'Success' : 'Error'}
                        </h4>
                        <p className="text-xs text-gray-500">{toastMessage}</p>
                    </div>
                    <button onClick={() => setShowToast(false)} className="ml-2 text-gray-400 hover:text-gray-600"><X size={14} /></button>
                </div>
            </div>
        </div>
    );
}



/* global route */
import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import { 
    Truck, Package, CheckCircle2, 
    Search, Check, MapPin, Calendar,
    MessageSquare, ShoppingCart, Boxes, X, Phone,
    ChevronDown, ChevronRight, Hash, Copy, CheckCheck,
    CreditCard, ArrowRight, Store, Clock, AlertCircle
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import ConfirmationModal from '@/Components/ConfirmationModal';
import CompactPagination from '@/Components/CompactPagination';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SourcingOrders({
    orders,
    activeOrdersCount = 0,
    deliveredOrdersCount = 0,
    completedOrdersCount = 0,
    cancelledOrdersCount = 0,
    myPublishedCount = 0,
    wholesaleSalesCount = 0,
    filters = {},
}) {
    const { flash, cartCount = 0 } = usePage().props;
    const { addToast } = useToast();
    const { openSidebar } = useSellerWorkspaceShell();
    useFlashToast(flash, addToast);

    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, order: null });
    const [confirmingId, setConfirmingId] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    // Expandable accordion state sets
    const [expandedPricingDetails, setExpandedPricingDetails] = useState(new Set());
    const [expandedTimelines, setExpandedTimelines] = useState(new Set());

    const togglePricingDetailsExpansion = (orderId) => {
        setExpandedPricingDetails((prev) => {
            const next = new Set(prev);
            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }
            return next;
        });
    };

    const toggleTimelineExpansion = (orderId) => {
        setExpandedTimelines((prev) => {
            const next = new Set(prev);
            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }
            return next;
        });
    };

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(String(text));
        setCopiedId(id);
        addToast({
            type: 'info',
            title: 'Copied to Clipboard',
            message: String(text),
        });
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('seller.supply-hub.orders'), {
            ...filters,
            search: searchTerm,
            page: 1,
        }, { preserveState: true });
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        router.get(route('seller.supply-hub.orders'), {
            ...filters,
            search: '',
            page: 1,
        }, { preserveState: true });
    };

    const handleFilterStatus = (status) => {
        router.get(route('seller.supply-hub.orders'), {
            ...filters,
            status,
            page: 1,
        }, { preserveState: true });
    };

    const handleConfirmReceipt = (order) => {
        if (!order) return;
        const targetId = order.db_id || order.id;
        setConfirmingId(targetId);
        router.post(route('seller.supply-hub.orders.confirm', targetId), {}, {
            preserveScroll: true,
            onSuccess: () => {
                setConfirmingId(null);
                setConfirmModal({ isOpen: false, order: null });
                addToast({
                    type: 'success',
                    title: 'Delivery Confirmed & Restocked',
                    message: `Materials from order #${order.id} have been added to your studio inventory.`,
                });
            },
            onError: (err) => {
                setConfirmingId(null);
                addToast({
                    type: 'error',
                    title: 'Confirmation Failed',
                    message: Object.values(err)[0] || 'Failed to confirm delivery.',
                });
            },
            onFinish: () => {
                setConfirmingId(null);
            },
        });
    };

    const resolveCourierLabel = (order) => {
        if (order.delivery?.provider === 'lalamove') {
            return 'Lalamove Courier';
        }
        if (order.shipping_method) {
            return order.shipping_method.toLowerCase().includes('delivery')
                ? order.shipping_method
                : `${order.shipping_method} Delivery`;
        }
        return 'Studio Delivery';
    };

    const orderList = orders?.data || [];
    const activeTab = filters.status || 'all';

    return (
        <>
            <Head title="Inbound Material Orders - Supply Hub" />
            <SellerHeader
                title="Supply Hub"
                subtitle="Track and manage inbound material shipments and verify delivery from peer workshops."
                onMenuClick={openSidebar}
                badge={{ label: 'Wholesale Supplies', iconColor: 'text-clay-500' }}
            />

            <div className="p-3 sm:p-6 lg:p-8 space-y-3 sm:space-y-4 lg:space-y-6 pb-12">
                
                {/* Top Sub-Navigation Pill Tabs & Cart Row */}
                <div className="flex items-center justify-between gap-2 border-b border-stone-200/80 pb-2.5 sm:pb-3">
                    <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none py-0.5 -mx-1 px-1">
                        <div className="p-1 bg-stone-100/70 rounded-2xl inline-flex items-center gap-1">
                            <Link
                                href={route('seller.supply-hub.index')}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 text-stone-500 hover:text-stone-800 font-semibold"
                            >
                                <span>Browse Supplies</span>
                            </Link>

                            <Link
                                href={route('seller.supply-hub.my-listings')}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 text-stone-500 hover:text-stone-800 font-semibold"
                            >
                                <span>My Supplies</span>
                                {myPublishedCount > 0 && (
                                    <span className="px-1.5 py-0.2 text-[10px] rounded-full font-black bg-stone-200 text-stone-600">
                                        {myPublishedCount}
                                    </span>
                                )}
                            </Link>

                            <Link
                                href={route('seller.supply-hub.orders')}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-white text-clay-800 shadow-xs font-black"
                            >
                                <span>Material Purchases</span>
                                {activeOrdersCount > 0 && (
                                    <span className="px-1.5 py-0.2 text-[10px] rounded-full font-black bg-clay-600 text-white">
                                        {activeOrdersCount}
                                    </span>
                                )}
                            </Link>

                            <Link
                                href={route('seller.supply-hub.sales')}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 text-stone-500 hover:text-stone-800 font-semibold"
                            >
                                <span>Wholesale Sales</span>
                                {wholesaleSalesCount > 0 && (
                                    <span className="px-1.5 py-0.2 text-[10px] rounded-full font-black bg-stone-200 text-stone-600">
                                        {wholesaleSalesCount}
                                    </span>
                                )}
                            </Link>
                        </div>
                    </div>

                    {/* Right Cart & Studio Shortcuts */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <Link
                            href={route('procurement.index')}
                            className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition shadow-2xs"
                            title="Studio Inventory"
                        >
                            <Boxes size={14} className="text-stone-500" />
                            <span>Studio Inventory</span>
                        </Link>
                        <Link
                            href={route('seller.supply-hub.cart')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold transition shadow-2xs cursor-pointer"
                            title="View Cart"
                        >
                            <ShoppingCart size={14} className="text-clay-600" />
                            <span className="hidden sm:inline">View Cart</span>
                            <span className="inline sm:hidden">Cart</span>
                            {cartCount > 0 && (
                                <span className="flex h-4 min-w-[18px] items-center justify-center rounded-full bg-clay-600 text-white px-1 text-[10px] font-black">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                {/* Filter Toolbar: Segment Pills + Search */}
                <div className="bg-white rounded-2xl border border-stone-200/80 p-3 sm:p-4 shadow-xs space-y-3">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        {/* Status Pills */}
                        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none p-1 bg-stone-100/70 rounded-2xl text-xs font-bold">
                            {[
                                { id: 'all', label: 'All Orders' },
                                { id: 'active', label: 'Active Shipments', count: activeOrdersCount },
                                { id: 'delivered', label: 'Delivered (Action Needed)', count: deliveredOrdersCount, alert: deliveredOrdersCount > 0 },
                                { id: 'completed', label: 'Completed', count: completedOrdersCount },
                                { id: 'cancelled', label: 'Cancelled', count: cancelledOrdersCount },
                            ].map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => handleFilterStatus(tab.id)}
                                        className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                            isActive
                                                ? 'bg-white text-stone-900 shadow-xs font-extrabold'
                                                : 'text-stone-600 hover:text-stone-900 font-semibold'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        {tab.count !== undefined && tab.count > 0 && (
                                            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                                                isActive 
                                                    ? 'bg-clay-100 text-clay-800' 
                                                    : tab.alert 
                                                        ? 'bg-amber-100 text-amber-900 font-black animate-pulse' 
                                                        : 'bg-stone-200 text-stone-700'
                                            }`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search Input */}
                        <form onSubmit={handleSearch} className="relative w-full md:w-64">
                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search purchases or materials..."
                                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-1.5 pl-9 pr-8 text-xs font-medium text-stone-800 placeholder-stone-400 focus:bg-white focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                                    title="Clear search"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </form>
                    </div>
                </div>

                {/* Orders List with Transparent & Detailed Layout */}
                {orderList.length > 0 ? (
                    <div className="space-y-4">
                        {orderList.map((order) => {
                            const isDelivered = order.status === 'Delivered';
                            const isCompleted = order.status === 'Completed';
                            const isShipped = order.status === 'Shipped' || order.status === 'Ready for Pickup';
                            const isPricingExpanded = expandedPricingDetails.has(order.id);
                            const isTimelineExpanded = expandedTimelines.has(order.id);
                            const courierLabel = resolveCourierLabel(order);

                            return (
                                <div 
                                    key={order.id}
                                    className={`rounded-2xl border bg-white p-3.5 sm:p-5 shadow-2xs transition-all hover:shadow-xs ${
                                        isDelivered 
                                            ? 'border-amber-300 ring-2 ring-amber-100/80 hover:border-amber-400' 
                                            : 'border-stone-200/90 hover:border-stone-300'
                                    }`}
                                >
                                    {/* 1. Order Header */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3 mb-3">
                                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                                            <span className="text-xs sm:text-sm font-black text-stone-900 tracking-tight">
                                                Order #{order.id}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(order.id, `id-${order.id}`)}
                                                className="text-stone-400 hover:text-stone-700 p-0.5 rounded transition cursor-pointer"
                                                title="Copy Order ID"
                                            >
                                                {copiedId === `id-${order.id}` ? (
                                                    <CheckCheck size={13} className="text-emerald-600" />
                                                ) : (
                                                    <Copy size={13} />
                                                )}
                                            </button>
                                            <span className="text-stone-300">&bull;</span>
                                            <span className="text-[11px] font-medium text-stone-500">
                                                {order.date}
                                            </span>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-clay-100 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-clay-800">
                                                Material Inbound
                                            </span>
                                        </div>

                                        {/* Status Badges */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {/* Payment Badge */}
                                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-tight ${
                                                order.payment_status === 'paid' 
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                            }`}>
                                                <CreditCard size={10} />
                                                <span>{order.payment_status === 'paid' ? 'Paid' : 'Payment Pending'}</span>
                                            </span>

                                            {/* Order Status Badge */}
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                isDelivered
                                                    ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs' 
                                                    : isCompleted
                                                    ? 'bg-emerald-100 text-emerald-900' 
                                                    : isShipped
                                                    ? 'bg-purple-100 text-purple-900'
                                                    : order.status === 'Accepted' || order.status === 'Processing'
                                                    ? 'bg-blue-100 text-blue-900'
                                                    : order.status === 'Pending'
                                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                                    : 'bg-stone-100 text-stone-700'
                                            }`}>
                                                {isDelivered ? 'Delivered (Action Needed)' : order.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 2. Supplier Studio & Logistics Strip */}
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 py-2 px-3 bg-stone-50/70 rounded-xl border border-stone-100">
                                        {/* Left: Supplier Studio Details */}
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="h-8 w-8 rounded-full bg-clay-100 border border-clay-200 flex items-center justify-center overflow-hidden shrink-0 text-clay-700 font-black text-xs">
                                                {order.supplier_avatar ? (
                                                    <img src={order.supplier_avatar} alt={order.supplier_name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <Store size={14} />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="text-xs font-bold text-stone-900 truncate">
                                                        {order.supplier_name}
                                                    </p>
                                                    {order.supplier_city && (
                                                        <span className="inline-flex items-center gap-0.5 rounded bg-stone-200/80 px-1.5 py-0.2 text-[9px] font-bold text-stone-700">
                                                            <MapPin size={9} />
                                                            {order.supplier_city}
                                                        </span>
                                                    )}
                                                </div>
                                                {order.shipping_contact_phone && (
                                                    <p className="text-[10px] text-stone-400 font-medium flex items-center gap-1">
                                                        <Phone size={9} /> {order.shipping_contact_phone}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Chat button with supplier */}
                                            {order.supplier_id && (
                                                <button
                                                    type="button"
                                                    onClick={() => router.get(route('chat.index'), { recipient: order.supplier_id })}
                                                    className="ml-1 px-2 py-1 text-clay-700 hover:text-clay-900 bg-white hover:bg-clay-50 border border-stone-200 rounded-lg transition-all flex items-center gap-1 shrink-0 shadow-2xs text-[11px] font-bold cursor-pointer"
                                                    title="Message Supplier Studio"
                                                >
                                                    <MessageSquare size={11} className="text-clay-600" />
                                                    <span className="hidden sm:inline">Message Studio</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Right: Logistics details */}
                                        <div className="flex flex-wrap items-center gap-2 text-[11px] min-w-0">
                                            {order.shipping_address && (
                                                <div className="flex items-center gap-1 min-w-0 max-w-[280px]">
                                                    <MapPin size={11} className="text-stone-400 shrink-0" />
                                                    <span className="truncate text-stone-600 font-medium" title={order.shipping_address}>
                                                        {order.shipping_address}
                                                    </span>
                                                </div>
                                            )}
                                            <span className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-0.5 text-[9px] font-extrabold uppercase text-stone-600 tracking-tight shadow-2xs">
                                                <Truck size={10} className="text-stone-500" />
                                                <span>{courierLabel}</span>
                                            </span>
                                            {order.tracking_number && (
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(order.tracking_number, `track-${order.id}`)}
                                                    className="inline-flex items-center gap-1 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-md px-2 py-0.5 text-[9px] font-extrabold text-sky-700 tracking-tight shadow-2xs cursor-pointer transition"
                                                    title="Copy tracking number"
                                                >
                                                    <Hash size={9} />
                                                    <span>{order.tracking_number}</span>
                                                    {copiedId === `track-${order.id}` ? (
                                                        <CheckCheck size={9} className="text-emerald-600 ml-0.5" />
                                                    ) : (
                                                        <Copy size={9} className="text-sky-500 ml-0.5" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3. Main 2-Column Split: Items Breakdown & Transparent Financials */}
                                    <div className="flex flex-col lg:flex-row gap-3">
                                        {/* Left Column: Order Items */}
                                        <div className="flex-1 space-y-2 min-w-0">
                                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-0.5">
                                                Ordered Raw Materials ({order.items.length} {order.items.length === 1 ? 'item' : 'items'})
                                            </p>
                                            <div className="space-y-2">
                                                {order.items.map((item, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className="flex items-center gap-3 rounded-xl border border-stone-150 bg-stone-50/40 p-2.5 sm:p-3"
                                                    >
                                                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-white">
                                                            <img 
                                                                src={item.img} 
                                                                alt={item.name}
                                                                className="h-full w-full object-cover"
                                                                onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="truncate text-xs font-bold text-stone-900">{item.name}</p>
                                                            <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5 flex-wrap">
                                                                <span>Quantity: <strong className="text-stone-900">{item.qty} {item.supply_unit}</strong></span>
                                                                <span>&bull;</span>
                                                                <span className="text-stone-600 font-medium">Unit Rate: {formatCurrency(item.price)} / {item.supply_unit}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-xs font-black text-stone-900">{formatCurrency(item.price * item.qty)}</p>
                                                            <p className="text-[10px] text-stone-400 font-medium">Line Total</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {order.shipping_notes && (
                                                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2 text-xs text-amber-900">
                                                    <strong className="font-bold">Shipping Instructions: </strong>
                                                    <span className="italic">{order.shipping_notes}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Column: Transparent Financials, Timeline & Restock Action */}
                                        <div className="border-t border-stone-100 pt-3 lg:w-72 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0 shrink-0 space-y-2">
                                            {/* Transparent Pricing Card */}
                                            <div className="rounded-xl border border-stone-200/80 bg-stone-50/40 p-1 shadow-2xs">
                                                <button
                                                    type="button"
                                                    onClick={() => togglePricingDetailsExpansion(order.id)}
                                                    className={`flex items-center justify-between w-full cursor-pointer select-none px-2.5 py-1.5 rounded-lg hover:bg-stone-100/60 transition-colors text-left focus:outline-none ${
                                                        isPricingExpanded ? "border-b border-stone-200/60 pb-2 mb-1.5" : ""
                                                    }`}
                                                >
                                                    <div>
                                                        <p className="text-[8px] font-extrabold text-stone-400 uppercase tracking-wider">
                                                            Total Investment
                                                        </p>
                                                        <p className="text-xs font-bold text-stone-800">
                                                            PHP {order.total}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-right">
                                                        <div>
                                                            <p className="text-[8px] font-extrabold text-stone-500 uppercase tracking-wider">
                                                                Materials Cost
                                                            </p>
                                                            <p className="text-xs font-bold text-stone-700">
                                                                PHP {Number(order.merchandise_subtotal).toLocaleString(undefined, {
                                                                    minimumFractionDigits: 2
                                                                })}
                                                            </p>
                                                        </div>
                                                        {isPricingExpanded ? (
                                                            <ChevronDown size={13} className="text-stone-400 self-center" />
                                                        ) : (
                                                            <ChevronRight size={13} className="text-stone-400 self-center" />
                                                        )}
                                                    </div>
                                                </button>

                                                {isPricingExpanded && (
                                                    <div className="space-y-1.5 text-[10.5px] mt-2 px-2.5 pb-1.5">
                                                        <div className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">Procurement Cost Breakdown</div>
                                                        <div className="flex justify-between text-stone-600">
                                                            <span>Materials Subtotal:</span>
                                                            <span className="font-semibold text-stone-800">
                                                                PHP {Number(order.merchandise_subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between text-stone-600">
                                                            <span>Courier Delivery Fee:</span>
                                                            <span className="font-semibold text-stone-800">
                                                                PHP {Number(order.shipping_fee_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                        {order.convenience_fee_amount > 0 && (
                                                            <div className="flex justify-between text-stone-500">
                                                                <span>Payment Convenience Fee:</span>
                                                                <span className="font-semibold text-stone-700">
                                                                    PHP {Number(order.convenience_fee_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between font-bold pt-1.5 border-t border-stone-100/80">
                                                            <span className="text-stone-900">Total Studio Cost:</span>
                                                            <span className="text-clay-700 font-black text-xs">
                                                                PHP {Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Delivery Audit Timeline Dropdown */}
                                            {order.timeline && order.timeline.length > 0 && (
                                                <div className="rounded-xl border border-stone-200/80 bg-stone-50/40 p-1 shadow-2xs">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleTimelineExpansion(order.id)}
                                                        className="flex items-center justify-between w-full cursor-pointer select-none px-2.5 py-1.5 text-xs font-bold text-stone-700 hover:text-stone-900"
                                                    >
                                                        <span className="flex items-center gap-1 text-[10.5px]">
                                                            <Clock size={11} className="text-clay-600" />
                                                            <span>Delivery Progress</span>
                                                        </span>
                                                        {isTimelineExpanded ? (
                                                            <ChevronDown size={12} className="text-stone-400" />
                                                        ) : (
                                                            <ChevronRight size={12} className="text-stone-400" />
                                                        )}
                                                    </button>
                                                    {isTimelineExpanded && (
                                                        <div className="p-2 border-t border-stone-100 text-[10.5px] space-y-2">
                                                            {order.timeline.map((step, sIdx) => (
                                                                <div key={sIdx} className="flex items-start gap-2">
                                                                    <div className={`h-2 w-2 rounded-full mt-1 shrink-0 ${step.completed ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className={`font-semibold ${step.completed ? 'text-stone-800' : 'text-stone-400'}`}>{step.title}</p>
                                                                        {step.timestamp && (
                                                                            <p className="text-[9px] text-stone-400">{step.timestamp}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Order Action Buttons */}
                                            <div className="pt-1">
                                                {isDelivered && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmModal({
                                                            isOpen: true,
                                                            order: order,
                                                        })}
                                                        disabled={confirmingId === (order.db_id || order.id)}
                                                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition active:scale-95 cursor-pointer disabled:opacity-50"
                                                    >
                                                        <CheckCircle2 size={14} />
                                                        <span>Confirm Delivery & Restock</span>
                                                    </button>
                                                )}

                                                {isCompleted && (
                                                    <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
                                                        <Check size={13} className="text-emerald-600" />
                                                        <span>Synced to Studio Inventory</span>
                                                    </div>
                                                )}

                                                {isShipped && !isDelivered && (
                                                    <div className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-50 px-3 py-2 text-[11px] font-bold text-purple-800 border border-purple-200">
                                                        <Truck size={13} className="text-purple-600" />
                                                        <span>Materials In Transit</span>
                                                    </div>
                                                )}

                                                {(order.status === 'Pending' || order.status === 'Accepted' || order.status === 'Processing') && (
                                                    <div className="flex items-center justify-center gap-1.5 rounded-xl bg-stone-100 px-3 py-2 text-[11px] font-bold text-stone-700 border border-stone-200">
                                                        <Clock size={13} className="text-stone-500" />
                                                        <span>Supplier Preparing Order</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Pagination */}
                        {orders && orders.last_page > 1 && (
                            <div className="mt-6">
                                <CompactPagination
                                    currentPage={orders.current_page}
                                    totalPages={orders.last_page}
                                    totalItems={orders.total}
                                    itemsPerPage={orders.per_page}
                                    onPageChange={(page) => {
                                        router.get(route('seller.supply-hub.orders'), {
                                            ...filters,
                                            page,
                                        }, { preserveState: true });
                                    }}
                                    itemLabel="purchases"
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center space-y-3 shadow-2xs">
                        <Package size={40} className="mx-auto text-stone-300" />
                        <h4 className="font-bold text-stone-900 text-sm">No Inbound Sourcing Orders Found</h4>
                        <p className="text-xs text-stone-500 max-w-sm mx-auto">
                            You have no inbound raw material orders matching this filter. Browse peer artisan supplies to restock your studio with clay, timber, or glazes.
                        </p>
                        <Link
                            href={route('seller.supply-hub.index')}
                            className="inline-flex items-center gap-2 rounded-xl bg-clay-600 px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-clay-700 transition-colors mt-2 cursor-pointer"
                        >
                            <span>Browse Peer Supplies</span>
                            <ArrowRight size={13} />
                        </Link>
                    </div>
                )}
            </div>

            {/* Confirm Delivery Modal */}
            <ConfirmationModal
                show={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, order: null })}
                onConfirm={() => handleConfirmReceipt(confirmModal.order)}
                title="Confirm Material Delivery & Restock"
                message={`Have you inspected and received the materials for order #${confirmModal.order?.id} from ${confirmModal.order?.supplier_name || 'the supplier'}? Confirming receipt will automatically add or update these materials in your Studio Materials Inventory with weighted-average unit costing.`}
                confirmText="Confirm & Restock Studio"
                confirmVariant="primary"
            />
        </>
    );
}

SourcingOrders.layout = (page) => <SellerWorkspaceLayout active="supply-hub">{page}</SellerWorkspaceLayout>;

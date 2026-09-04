/* global route */
import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import { 
    Truck, CheckCircle2, 
    Search, Check, MapPin,
    MessageSquare, ShoppingCart, Boxes, X, Phone,
    ChevronDown, ChevronRight, Hash, Copy, CheckCheck,
    CreditCard, Store, Clock
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import DispatchOrderModal from '@/Components/Seller/Orders/DispatchOrderModal';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function WholesaleSales({
    orders,
    activeSalesCount = 0,
    pendingSalesCount = 0,
    processingSalesCount = 0,
    shippedSalesCount = 0,
    deliveredSalesCount = 0,
    completedSalesCount = 0,
    cancelledSalesCount = 0,
    myPublishedCount = 0,
    activeOrdersCount = 0,
    filters = {},
}) {
    const { flash, cartCount = 0, sellerSidebar } = usePage().props;
    const isPremium = sellerSidebar?.isPremium ?? true;
    const { addToast } = useToast();
    const { openSidebar } = useSellerWorkspaceShell();
    useFlashToast(flash, addToast);

    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [actionModal, setActionModal] = useState({ isOpen: false, order: null, nextStatus: '', trackingNumber: '', notes: '' });
    const [dispatchModal, setDispatchModal] = useState({ isOpen: false, order: null });
    const [isSubmitting, setIsSubmitting] = useState(false);
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
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        addToast({
            type: 'info',
            title: 'Copied to Clipboard',
            message: text,
        });
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('seller.supply-hub.sales'), {
            ...filters,
            search: searchTerm,
        }, { preserveState: true });
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        router.get(route('seller.supply-hub.sales'), {
            ...filters,
            search: '',
        }, { preserveState: true });
    };

    const handleFilterStatus = (status) => {
        router.get(route('seller.supply-hub.sales'), {
            ...filters,
            status,
        }, { preserveState: true });
    };

    const handleOpenActionModal = (order, nextStatus) => {
        setActionModal({
            isOpen: true,
            order,
            nextStatus,
            trackingNumber: order.tracking_number || '',
            notes: '',
        });
    };

    const handleUpdateStatus = (e) => {
        e.preventDefault();
        if (!actionModal.order || !actionModal.nextStatus) return;

        setIsSubmitting(true);
        router.post(route('seller.supply-hub.sales.status', actionModal.order.id), {
            status: actionModal.nextStatus,
            tracking_number: actionModal.trackingNumber,
            shipping_notes: actionModal.notes,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSubmitting(false);
                setActionModal({ isOpen: false, order: null, nextStatus: '', trackingNumber: '', notes: '' });
                addToast({
                    type: 'success',
                    title: 'Order Status Updated',
                    message: `Order #${actionModal.order.id} updated to ${actionModal.nextStatus}.`,
                });
            },
            onError: (err) => {
                setIsSubmitting(false);
                addToast({
                    type: 'error',
                    title: 'Update Failed',
                    message: Object.values(err)[0] || 'Failed to update order status.',
                });
            },
        });
    };

    const orderList = orders?.data || [];
    const activeTab = filters.status || 'all';

    return (
        <>
            <Head title="Supplies Sold - Supply Hub" />
            <SellerHeader
                title="Supply Hub"
                subtitle="Fulfill workshop supplies ordered by peer artisan studios."
                onMenuClick={openSidebar}
                badge={{ label: 'Supplies Sold', iconColor: 'text-clay-500' }}
            />

            <div className="p-3 sm:p-6 lg:p-8 space-y-3 sm:space-y-4 lg:space-y-6 pb-12">
                
                {/* Top Sub-Navigation Pill Tabs & Cart Row */}
                <div className="flex items-center justify-between gap-2 border-b border-stone-200/80 pb-2.5 sm:pb-3">
                    <div 
                        className="flex-1 min-w-0 overflow-x-auto scrollbar-none py-0.5 -mx-1 px-1 touch-pan-x overscroll-x-contain"
                        onWheel={(e) => {
                            if (e.currentTarget.scrollWidth > e.currentTarget.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                                e.currentTarget.scrollLeft += e.deltaY;
                            }
                        }}
                    >
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
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 text-stone-500 hover:text-stone-800 font-semibold"
                            >
                                <span>Supplies Ordered</span>
                                {activeOrdersCount > 0 && (
                                    <span className="px-1.5 py-0.2 text-[10px] rounded-full font-black bg-stone-200 text-stone-600">
                                        {activeOrdersCount}
                                    </span>
                                )}
                            </Link>

                            <Link
                                href={route('seller.supply-hub.sales')}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-white text-clay-800 shadow-xs font-black"
                            >
                                <span>Supplies Sold</span>
                                {activeSalesCount > 0 && (
                                    <span className="px-1.5 py-0.2 text-[10px] rounded-full font-black bg-clay-600 text-white">
                                        {activeSalesCount}
                                    </span>
                                )}
                            </Link>
                        </div>
                    </div>

                    {/* Right Cart Shortcut */}
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
                        <div 
                            className="flex items-center gap-1 overflow-x-auto scrollbar-none p-1 bg-stone-100/70 rounded-2xl text-xs font-bold touch-pan-x overscroll-x-contain"
                            onWheel={(e) => {
                                if (e.currentTarget.scrollWidth > e.currentTarget.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                                    e.currentTarget.scrollLeft += e.deltaY;
                                }
                            }}
                        >
                            {[
                                { id: 'all', label: 'All Orders' },
                                { id: 'pending', label: 'Needs Decision', count: pendingSalesCount, alert: pendingSalesCount > 0 },
                                { id: 'processing', label: 'In Production / Packing', count: processingSalesCount },
                                { id: 'shipped', label: 'In Transit', count: shippedSalesCount },
                                { id: 'delivered', label: 'Delivered (Awaiting Confirmation)', count: deliveredSalesCount, alert: deliveredSalesCount > 0 },
                                { id: 'completed', label: 'Completed & Settled', count: completedSalesCount },
                                { id: 'cancelled', label: 'Cancelled', count: cancelledSalesCount },
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
                                                        ? 'bg-amber-100 text-amber-900 font-black' 
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
                                placeholder="Search supply orders..."
                                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-1.5 pl-9 pr-8 text-xs font-medium text-stone-800 placeholder-stone-400 focus:bg-white focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
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
                            const isPricingExpanded = expandedPricingDetails.has(order.id);
                            const isTimelineExpanded = expandedTimelines.has(order.id);

                            return (
                                <div 
                                    key={order.id}
                                    className="rounded-2xl border border-stone-200/90 bg-white p-3.5 sm:p-5 shadow-2xs transition-all hover:shadow-xs hover:border-stone-300"
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
                                                Workshop Supplies
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
                                                order.status === 'Pending' 
                                                    ? 'bg-amber-100 text-amber-900' 
                                                    : order.status === 'Accepted' || order.status === 'Processing'
                                                    ? 'bg-blue-100 text-blue-900'
                                                    : order.status === 'Shipped' || order.status === 'Ready for Pickup'
                                                    ? 'bg-purple-100 text-purple-900'
                                                    : order.status === 'Delivered'
                                                    ? 'bg-amber-100 text-amber-900'
                                                    : order.status === 'Completed'
                                                    ? 'bg-emerald-100 text-emerald-900'
                                                    : order.status === 'Cancelled' || order.status === 'Refunded'
                                                    ? 'bg-rose-100 text-rose-900'
                                                    : 'bg-stone-100 text-stone-700'
                                            }`}>
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 2. Buyer & Logistics Summary Strip */}
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 py-2 px-3 bg-stone-50/70 rounded-xl border border-stone-100">
                                        {/* Left: Buyer Details */}
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="h-8 w-8 rounded-full bg-clay-100 border border-clay-200 flex items-center justify-center overflow-hidden shrink-0 text-clay-700 font-black text-xs">
                                                {order.customer_avatar ? (
                                                    <img src={order.customer_avatar} alt={order.customer} className="h-full w-full object-cover" />
                                                ) : (
                                                    order.customer?.charAt(0) || 'A'
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="text-xs font-bold text-stone-900 truncate">{order.customer}</p>
                                                    {order.buyer_shop_name && (
                                                        <span className="inline-flex items-center gap-1 rounded bg-stone-200/80 px-1.5 py-0.2 text-[9px] font-bold text-stone-700">
                                                            <Store size={9} />
                                                            {order.buyer_shop_name}
                                                        </span>
                                                    )}
                                                </div>
                                                {order.shipping_contact_phone && (
                                                    <p className="text-[10px] text-stone-400 font-medium flex items-center gap-1">
                                                        <Phone size={9} /> {order.shipping_contact_phone}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Chat button */}
                                            {order.user_id && (
                                                <button
                                                    type="button"
                                                    onClick={() => router.visit(route('chat.index', { user_id: order.user_id }))}
                                                    className="ml-1 p-1.5 text-clay-600 hover:text-clay-800 bg-white hover:bg-clay-50 border border-stone-200 rounded-lg transition-all flex items-center justify-center shrink-0 shadow-2xs cursor-pointer"
                                                    title="Chat with peer artisan"
                                                >
                                                    <MessageSquare size={12} />
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
                                            <span className="inline-flex rounded-md border border-stone-200 bg-white px-2 py-0.5 text-[9px] font-extrabold uppercase text-stone-600 tracking-tight shadow-2xs">
                                                {order.shipping_method || 'Delivery'}
                                            </span>
                                            {order.tracking_number && (
                                                <span className="inline-flex items-center gap-1 bg-sky-50 border border-sky-200 rounded-md px-2 py-0.5 text-[9px] font-extrabold text-sky-700 tracking-tight shadow-2xs">
                                                    <Hash size={9} /> {order.tracking_number}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3. Main 2-Column Split: Items Breakdown & Transparent Actions */}
                                    <div className="flex flex-col lg:flex-row gap-3">
                                        {/* Left Column: Order Items */}
                                        <div className="flex-1 space-y-2 min-w-0">
                                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-0.5">
                                                Ordered Raw Supplies ({order.items.length} {order.items.length === 1 ? 'item' : 'items'})
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
                                                                onError={(e) => { e.target.src = '/images/placeholder.svg'; }}
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="truncate text-xs font-bold text-stone-900">{item.name}</p>
                                                            <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5 flex-wrap">
                                                                <span>Quantity: <strong className="text-stone-900">{item.qty} {item.supply_unit}</strong></span>
                                                                <span>&bull;</span>
                                                                <span className="text-stone-600 font-medium">Wholesale Rate: {formatCurrency(item.price)} / {item.supply_unit}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-xs font-black text-stone-900">{formatCurrency(item.price * item.qty)}</p>
                                                            <p className="text-[10px] text-stone-400 font-medium">Subtotal</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {order.shipping_notes && (
                                                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2 text-xs text-amber-900">
                                                    <strong className="font-bold">Artisan Note: </strong>
                                                    <span className="italic">{order.shipping_notes}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Column: Transparent Financials & Logistics Actions */}
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
                                                            Buyer Total
                                                        </p>
                                                        <p className="text-xs font-bold text-stone-800">
                                                            PHP {order.total}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-right">
                                                        <div>
                                                            <p className="text-[8px] font-extrabold text-emerald-600 uppercase tracking-wider">
                                                                Your Net Payout
                                                            </p>
                                                            <p className="text-xs font-bold text-emerald-600">
                                                                PHP {Number(order.seller_net_amount).toLocaleString(undefined, {
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
                                                        <div className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">Your Revenue Breakdown</div>
                                                        <div className="flex justify-between text-stone-600">
                                                            <span>Merchandise Subtotal:</span>
                                                            <span className="font-semibold text-stone-800">
                                                                PHP {Number(order.merchandise_subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between text-stone-500">
                                                            <span>Platform Fee:</span>
                                                            <span className="font-semibold text-emerald-600">0% (₱0.00)</span>
                                                        </div>
                                                        <div className="flex justify-between font-bold pt-1.5 border-t border-stone-100/80 mb-2">
                                                            <span className="text-stone-900">Net Shop Payout:</span>
                                                            <span className="text-emerald-600 font-black text-xs">
                                                                PHP {Number(order.seller_net_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>

                                                        <div className="pt-2 border-t border-stone-100/80 text-stone-400 space-y-1">
                                                            <div className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">Paid by Buyer (Separate)</div>
                                                            <div className="flex justify-between">
                                                                <span>Shipping Fee:</span>
                                                                <span className="font-medium text-stone-600">
                                                                    PHP {Number(order.shipping_fee_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>Convenience Fee:</span>
                                                                <span className="font-medium text-stone-600">
                                                                    PHP {Number(order.convenience_fee_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
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

                                            {/* Status Transition Action Buttons */}
                                            <div className="pt-1 flex flex-col gap-1.5">
                                                {order.status === 'Pending' && (
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenActionModal(order, 'Accepted')}
                                                            className="flex items-center justify-center gap-1 rounded-xl bg-clay-700 py-2 text-xs font-bold text-white shadow-2xs hover:bg-clay-800 transition active:scale-95"
                                                        >
                                                            <Check size={12} />
                                                            <span>Accept</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenActionModal(order, 'Cancelled')}
                                                            className="flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition active:scale-95"
                                                        >
                                                            <X size={12} />
                                                            <span>Decline</span>
                                                        </button>
                                                    </div>
                                                )}

                                                {(order.status === 'Accepted' || order.status === 'Processing') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setDispatchModal({ isOpen: true, order })}
                                                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-clay-700 py-2 text-xs font-bold text-white hover:bg-clay-800 transition shadow-2xs active:scale-95"
                                                    >
                                                        <Truck size={13} />
                                                        <span>Mark Dispatched</span>
                                                    </button>
                                                )}

                                                {order.status === 'Shipped' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenActionModal(order, 'Delivered')}
                                                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition shadow-2xs active:scale-95"
                                                    >
                                                        <CheckCircle2 size={13} />
                                                        <span>Mark Delivered</span>
                                                    </button>
                                                )}

                                                {order.status === 'Delivered' && (
                                                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2 text-center text-xs font-bold text-amber-900 flex items-center justify-center gap-1.5">
                                                        <Clock size={14} className="text-amber-700" />
                                                        <span>Delivered • Awaiting Buyer Confirmation</span>
                                                    </div>
                                                )}

                                                {order.status === 'Completed' && (
                                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2 text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                                                        <CheckCircle2 size={14} className="text-emerald-600" />
                                                        <span>Completed & Settled</span>
                                                    </div>
                                                )}

                                                {(order.status === 'Cancelled' || order.status === 'Refunded') && (
                                                    <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-2 text-center text-xs font-bold text-rose-800 flex items-center justify-center gap-1.5">
                                                        <X size={14} className="text-rose-600" />
                                                        <span>{order.status}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Pagination */}
                        {orders.links && orders.links.length > 3 && (
                            <div className="flex items-center justify-center gap-1 pt-4">
                                {orders.links.map((link, i) => (
                                    <button
                                        key={i}
                                        disabled={!link.url || link.active}
                                        onClick={() => router.get(link.url, {}, { preserveState: true })}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                            link.active
                                                ? 'bg-stone-900 text-white shadow-xs'
                                                : link.url
                                                ? 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                                                : 'text-stone-300 cursor-not-allowed'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-stone-200/80 bg-white p-10 text-center shadow-xs">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 mb-3">
                            <Truck size={24} />
                        </div>
                        <h3 className="text-sm font-bold text-stone-800">No Supply Orders Found</h3>
                        <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
                            {filters.status && filters.status !== 'all'
                                ? `No supply orders currently match the "${filters.status}" filter.`
                                : 'When other artisans order your published workshop materials, their orders will appear here for packing and dispatch.'}
                        </p>
                    </div>
                )}

            </div>

            {/* Action Modal for Order Status Transition */}
            {actionModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-xl border border-stone-200">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                            <h3 className="text-sm font-bold text-stone-900">
                                Update Supply Order #{actionModal.order?.id}
                            </h3>
                            <button
                                onClick={() => setActionModal({ isOpen: false, order: null, nextStatus: '', trackingNumber: '', notes: '' })}
                                className="text-stone-400 hover:text-stone-600 p-1"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateStatus} className="space-y-4">
                            <p className="text-xs text-stone-600">
                                Mark this order as <strong className="text-stone-900 uppercase font-bold">{actionModal.nextStatus}</strong>?
                            </p>

                            {actionModal.nextStatus === 'Shipped' && (
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                                        Tracking / Freight Waybill Number
                                    </label>
                                    <input
                                        type="text"
                                        value={actionModal.trackingNumber}
                                        onChange={(e) => setActionModal({ ...actionModal, trackingNumber: e.target.value })}
                                        placeholder="e.g. LLM-9823412 or Truck Plate #"
                                        className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                                    Dispatch Notes (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    value={actionModal.notes}
                                    onChange={(e) => setActionModal({ ...actionModal, notes: e.target.value })}
                                    placeholder="Optional notes for buyer artisan..."
                                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                                <button
                                    type="button"
                                    onClick={() => setActionModal({ isOpen: false, order: null, nextStatus: '', trackingNumber: '', notes: '' })}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 transition disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Updating...' : `Confirm ${actionModal.nextStatus}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <DispatchOrderModal
                isOpen={dispatchModal.isOpen}
                onClose={() => setDispatchModal({ isOpen: false, order: null })}
                order={dispatchModal.order}
                isPremium={isPremium}
            />
        </>
    );
}

WholesaleSales.layout = (page) => <SellerWorkspaceLayout active="supply-hub">{page}</SellerWorkspaceLayout>;

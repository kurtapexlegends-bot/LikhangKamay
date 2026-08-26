import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import { 
    Store, Truck, Package, CheckCircle2, Clock, 
    Search, ArrowRight, Check, AlertCircle, MapPin, Calendar, ExternalLink,
    MessageSquare, ShoppingCart, Boxes, Layers, ChevronRight, X
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import ConfirmationModal from '@/Components/ConfirmationModal';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (dateString) => {
    if (!dateString) return 'Recent';
    try {
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? 'Recent' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return 'Recent';
    }
};

export default function SourcingOrders({
    orders,
    activeOrdersCount = 0,
    deliveredOrdersCount = 0,
    myPublishedCount = 0,
    filters = {},
}) {
    const { auth, flash, cartCount = 0 } = usePage().props;
    const { addToast } = useToast();
    const { openSidebar } = useSellerWorkspaceShell();
    useFlashToast(flash, addToast);

    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, orderId: null, orderNumber: '' });
    const [confirmingId, setConfirmingId] = useState(null);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('seller.supply-hub.orders'), {
            ...filters,
            search: searchTerm,
        }, { preserveState: true });
    };

    const handleFilterStatus = (status) => {
        router.get(route('seller.supply-hub.orders'), {
            ...filters,
            status,
        }, { preserveState: true });
    };

    const handleConfirmReceipt = (orderId) => {
        setConfirmingId(orderId);
        router.post(route('seller.supply-hub.orders.confirm', orderId), {}, {
            preserveScroll: true,
            onFinish: () => {
                setConfirmingId(null);
                setConfirmModal({ isOpen: false, orderId: null, orderNumber: '' });
            },
        });
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
                                <span>Material Orders</span>
                                {activeOrdersCount > 0 && (
                                    <span className="px-1.5 py-0.2 text-[10px] rounded-full font-black bg-clay-100 text-clay-800">
                                        {activeOrdersCount}
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

                {/* Filter Toolbar: Status Segment Pills + Search */}
                <div className="bg-white rounded-2xl border border-stone-200/80 p-3 sm:p-4 shadow-xs space-y-3">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        {/* Status Pills */}
                        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none p-1 bg-stone-100/70 rounded-2xl text-xs font-bold">
                            {[
                                { id: 'all', label: 'All Orders' },
                                { id: 'active', label: 'Active Shipments', count: activeOrdersCount },
                                { id: 'delivered', label: 'Delivered (Action Needed)', count: deliveredOrdersCount, alert: deliveredOrdersCount > 0 },
                                { id: 'completed', label: 'Completed' },
                                { id: 'cancelled', label: 'Cancelled' },
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
                                                        ? 'bg-amber-100 text-amber-900 animate-pulse' 
                                                        : 'bg-stone-200 text-stone-700'
                                            }`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search Bar */}
                        <form onSubmit={handleSearch} className="relative w-full md:w-64">
                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search orders or materials..."
                                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 pl-9 pr-8 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm('');
                                        router.get(route('seller.supply-hub.orders'), { ...filters, search: '' }, { preserveState: true });
                                    }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </form>
                    </div>
                </div>

                {/* Orders List in Buyer Order UI/UX Style */}
                {orderList.length === 0 ? (
                    <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center space-y-3 shadow-2xs">
                        <Package size={40} className="mx-auto text-stone-300" />
                        <h4 className="font-bold text-stone-900 text-sm">No Inbound Sourcing Orders Found</h4>
                        <p className="text-xs text-stone-500 max-w-sm mx-auto">
                            You have no inbound raw material orders matching this filter. Browse peer artisan supplies to restock your studio with clay, timber, or glazes.
                        </p>
                        <Link
                            href={route('seller.supply-hub.index')}
                            className="inline-flex items-center gap-2 rounded-xl bg-clay-600 px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-clay-700 transition-colors mt-2"
                        >
                            <span>Browse Peer Supplies</span>
                            <ArrowRight size={13} />
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orderList.map((order) => {
                            const isDelivered = order.status === 'Delivered';
                            const isCompleted = order.status === 'Completed';
                            const isShipped = order.status === 'Shipped';
                            const supplier = order.seller?.shop_name || order.seller?.name || 'Peer Artisan Studio';
                            const supplierId = order.seller_id || order.artisan_id || order.seller?.id;
                            const orderDate = formatDate(order.created_at);

                            const merchandiseSubtotal = order.items?.reduce((sum, item) => sum + ((item.unit_price || item.price) * item.quantity), 0) || 0;
                            const shippingFee = Math.max(0, (order.total_amount || order.total || 0) - merchandiseSubtotal);

                            return (
                                <div
                                    key={order.id}
                                    className={`rounded-2xl border bg-white shadow-2xs transition-all overflow-hidden ${
                                        isDelivered 
                                            ? 'border-amber-300 ring-2 ring-amber-100' 
                                            : 'border-stone-200/90 hover:border-stone-300'
                                    }`}
                                >
                                    {/* Order Card Header (Buyer Order Style) */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-5 bg-stone-50/70 border-b border-stone-150">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-8 w-8 rounded-full bg-clay-100 text-clay-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                <Store size={15} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-stone-900 text-xs sm:text-sm truncate">{supplier}</span>
                                                    {order.seller?.city && (
                                                        <span className="text-[10px] text-stone-400 flex items-center gap-0.5 shrink-0">
                                                            <MapPin size={9} />
                                                            {order.seller.city}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono">
                                                    <span>#{order.order_number || order.id}</span>
                                                    <span className="text-stone-300">•</span>
                                                    <span className="text-stone-400 flex items-center gap-1 font-sans">
                                                        <Calendar size={11} />
                                                        {orderDate}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status & Message Header Actions */}
                                        <div className="flex items-center gap-2 self-start sm:self-auto">
                                            {supplierId && (
                                                <Link
                                                    href={route('chat.index', { user_id: supplierId })}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 transition-colors shadow-2xs"
                                                    title="Message Supplier Studio"
                                                >
                                                    <MessageSquare size={13} className="text-clay-600" />
                                                    <span>Message Studio</span>
                                                </Link>
                                            )}

                                            <span className={`rounded-xl px-3 py-1 text-xs font-extrabold ${
                                                isDelivered 
                                                    ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                                                    : isCompleted
                                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                                        : isShipped
                                                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                                            : 'bg-stone-100 text-stone-700'
                                            }`}>
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Order Content Body */}
                                    <div className="p-4 sm:p-5 space-y-4">
                                        {/* Courier Delivery Detail Banner */}
                                        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-stone-50 border border-stone-150 text-xs">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="p-1.5 bg-white rounded-lg shadow-2xs text-clay-600 shrink-0">
                                                    <Truck size={14} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-stone-800 text-xs truncate">
                                                        {order.delivery?.provider === 'lalamove' ? 'Lalamove Courier Delivery' : `${order.shipping_method || 'Studio'} Delivery`}
                                                    </p>
                                                    {order.shipping_address && (
                                                        <p className="text-[11px] text-stone-500 truncate">
                                                            {order.shipping_address}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {order.delivery?.tracking_number && (
                                                <span className="font-mono text-[10px] text-stone-500 bg-white px-2 py-1 rounded-md border border-stone-200 shrink-0">
                                                    Track: {order.delivery.tracking_number}
                                                </span>
                                            )}
                                        </div>

                                        {/* Items List */}
                                        <div className="divide-y divide-stone-100 space-y-3">
                                            {order.items?.map((item) => (
                                                <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3 text-xs">
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-stone-100 border border-stone-200">
                                                            <img
                                                                src={item.product?.img || item.product?.cover_photo_path || '/images/placeholder.svg'}
                                                                alt={item.name}
                                                                className="h-full w-full object-cover"
                                                                onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                                                            />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-bold text-stone-900 truncate text-xs sm:text-sm">{item.name}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[11px] text-stone-500">
                                                                    Qty: <strong className="text-stone-800">{item.quantity} {item.supply_unit || 'pcs'}</strong>
                                                                </span>
                                                                <span className="text-stone-300">•</span>
                                                                <span className="text-[11px] text-stone-500">
                                                                    {formatCurrency(item.unit_price || item.price)} / {item.supply_unit || 'unit'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <span className="font-extrabold text-stone-900 text-xs sm:text-sm shrink-0">
                                                        {formatCurrency((item.unit_price || item.price) * item.quantity)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Card Footer: Financial Breakdown & Primary Actions */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:px-5 bg-stone-50/50 border-t border-stone-150 text-xs">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-stone-500 text-xs">Order Total:</span>
                                            <span className="text-base font-black text-stone-900">
                                                {formatCurrency(order.total_amount || order.total)}
                                            </span>
                                            {shippingFee > 0 && (
                                                <span className="text-[10px] text-stone-400 font-medium">
                                                    (incl. {formatCurrency(shippingFee)} courier)
                                                </span>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2">
                                            {isDelivered && (
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmModal({
                                                        isOpen: true,
                                                        orderId: order.id,
                                                        orderNumber: order.order_number || String(order.id),
                                                    })}
                                                    disabled={confirmingId === order.id}
                                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-all active:scale-95 cursor-pointer min-h-[40px]"
                                                >
                                                    <CheckCircle2 size={14} />
                                                    <span>Confirm Delivery & Restock Inventory</span>
                                                </button>
                                            )}

                                            {isCompleted && (
                                                <div className="inline-flex items-center gap-1.5 text-emerald-800 text-[11px] font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                                                    <Check size={13} />
                                                    <span>Synced to Studio Inventory</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Confirm Delivery Modal */}
            <ConfirmationModal
                show={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, orderId: null, orderNumber: '' })}
                onConfirm={() => handleConfirmReceipt(confirmModal.orderId)}
                title="Confirm Material Delivery"
                message={`Have you inspected and received order #${confirmModal.orderNumber}? Confirming receipt will automatically add or update these materials in your Studio Materials Inventory with weighted-average unit costing.`}
                confirmText="Confirm & Restock Workshop"
                confirmVariant="primary"
            />
        </>
    );
}

SourcingOrders.layout = (page) => <SellerWorkspaceLayout active="supply-hub">{page}</SellerWorkspaceLayout>;

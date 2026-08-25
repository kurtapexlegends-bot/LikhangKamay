import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import { 
    Store, Truck, Package, CheckCircle2, Clock, 
    Search, ArrowRight, Check, AlertCircle, MapPin, Calendar, ExternalLink,
    MessageSquare, ShoppingBag
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import ConfirmationModal from '@/Components/ConfirmationModal';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
            <Head title="Inbound Material Orders - Artisan Supply Hub" />
            <SellerHeader
                title="Inbound Material Orders"
                user={auth?.user}
                onMenuClick={openSidebar}
            />

            <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                
                {/* Top Action Tabs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                        <Link
                            href={route('seller.supply-hub.index')}
                            className="inline-flex items-center gap-2 rounded-xl bg-stone-100 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-200 transition-colors shrink-0"
                        >
                            <Package size={14} className="text-stone-500" />
                            <span>Browse Peer Supplies</span>
                        </Link>

                        <Link
                            href={route('seller.supply-hub.my-listings')}
                            className="inline-flex items-center gap-2 rounded-xl bg-stone-100 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-200 transition-colors shrink-0"
                        >
                            <Store size={14} className="text-stone-500" />
                            <span>My Wholesale Listings</span>
                            {myPublishedCount > 0 && (
                                <span className="rounded-full bg-stone-200 text-stone-700 px-1.5 py-0.2 text-[10px]">
                                    {myPublishedCount}
                                </span>
                            )}
                        </Link>

                        <Link
                            href={route('seller.supply-hub.orders')}
                            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white shadow-2xs shrink-0"
                        >
                            <Truck size={14} className="text-clay-400" />
                            <span>Inbound Material Orders</span>
                            {activeOrdersCount > 0 && (
                                <span className="rounded-full bg-clay-600 text-white px-1.5 py-0.2 text-[10px] font-black">
                                    {activeOrdersCount}
                                </span>
                            )}
                        </Link>

                        <Link
                            href={route('seller.supply-hub.cart')}
                            className="inline-flex items-center gap-2 rounded-xl bg-stone-100 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-200 transition-colors shrink-0"
                        >
                            <ShoppingBag size={14} className="text-stone-500" />
                            <span>Sourcing Cart</span>
                            {cartCount > 0 && (
                                <span className="rounded-full bg-stone-200 text-stone-700 px-1.5 py-0.2 text-[10px]">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                    </div>

                    {/* Search Form */}
                    <form onSubmit={handleSearch} className="relative w-full sm:w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search orders or materials..."
                            className="w-full rounded-xl border border-stone-200 bg-white py-1.5 pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                        />
                    </form>
                </div>

                {/* Status Segment Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
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
                                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-bold transition-all shrink-0 cursor-pointer ${
                                    isActive
                                        ? 'bg-clay-600 text-white shadow-2xs'
                                        : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                                }`}
                            >
                                <span>{tab.label}</span>
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                                        isActive 
                                            ? 'bg-white text-clay-800' 
                                            : tab.alert 
                                                ? 'bg-amber-100 text-amber-900 animate-pulse' 
                                                : 'bg-stone-100 text-stone-700'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Orders List */}
                {orderList.length === 0 ? (
                    <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center space-y-3 shadow-2xs">
                        <Package size={40} className="mx-auto text-stone-300" />
                        <h4 className="font-bold text-stone-900 text-sm">No Sourcing Orders Found</h4>
                        <p className="text-xs text-stone-500 max-w-sm mx-auto">
                            You have no inbound raw material orders matching this filter. Browse peer artisan supplies to stock up on clay, timber, or glazes.
                        </p>
                        <Link
                            href={route('seller.supply-hub.index')}
                            className="inline-flex items-center gap-2 rounded-xl bg-clay-600 px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-clay-700 transition-colors mt-2"
                        >
                            <span>Browse Supply Hub</span>
                            <ArrowRight size={13} />
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orderList.map((order) => {
                            const isDelivered = order.status === 'Delivered';
                            const isCompleted = order.status === 'Completed';
                            const isShipped = order.status === 'Shipped';
                            const supplier = order.seller?.shop_name || order.seller?.name || 'Artisan Supplier';

                            return (
                                <div
                                    key={order.id}
                                    className={`rounded-2xl border bg-white p-5 shadow-2xs space-y-4 transition-all ${
                                        isDelivered ? 'border-amber-300 ring-2 ring-amber-100' : 'border-stone-200'
                                    }`}
                                >
                                    {/* Order Top Bar */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-150 pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5 font-bold text-stone-900 text-xs">
                                                <Store size={14} className="text-clay-600" />
                                                <span>{supplier}</span>
                                            </div>
                                            <span className="text-stone-300">•</span>
                                            <span className="font-mono text-xs text-stone-500 font-bold">
                                                #{order.order_number || order.id}
                                            </span>
                                            <span className="text-stone-300 hidden sm:inline">•</span>
                                            <span className="text-[11px] text-stone-400 hidden sm:inline flex items-center gap-1">
                                                <Calendar size={11} />
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </span>
                                        </div>

                                        {/* Status Pill & Message Action */}
                                        <div className="flex items-center gap-2">
                                            {(order.seller_id || order.artisan_id) && (
                                                <Link
                                                    href={route('chat.index', { user_id: order.seller_id || order.artisan_id })}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl text-[11px] font-bold text-stone-700 transition-colors shadow-2xs"
                                                    title="Message Supplier Studio"
                                                >
                                                    <MessageSquare size={13} className="text-stone-500" />
                                                    <span>Message Studio</span>
                                                </Link>
                                            )}

                                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                                isDelivered 
                                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
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

                                    {/* Items List */}
                                    <div className="divide-y divide-stone-100 space-y-2">
                                        {order.items?.map((item) => (
                                            <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-stone-100 border border-stone-200">
                                                        <img
                                                            src={item.product?.img || item.product?.cover_photo_path || '/images/placeholder.svg'}
                                                            alt={item.name}
                                                            className="h-full w-full object-cover"
                                                            onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-stone-900 truncate">{item.name}</p>
                                                        <span className="text-[10px] text-stone-400 font-mono">
                                                            Qty: {item.quantity} × {formatCurrency(item.unit_price || item.price)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <span className="font-bold text-stone-900 shrink-0">
                                                    {formatCurrency((item.unit_price || item.price) * item.quantity)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action Bar & Total Footer */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-stone-150 text-xs">
                                        <div className="flex items-center gap-4 text-stone-500 text-[11px]">
                                            <span className="flex items-center gap-1">
                                                <Truck size={13} className="text-clay-600" />
                                                <span>{order.shipping_method || 'Delivery'}</span>
                                            </span>
                                            <span>
                                                Total: <strong className="text-stone-900 font-bold">{formatCurrency(order.total_amount || order.total)}</strong>
                                            </span>
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
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-all active:scale-95 cursor-pointer"
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

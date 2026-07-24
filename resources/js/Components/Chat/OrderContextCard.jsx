import React, { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    CheckCircle2,
    ChevronDown,
    Clock3,
    CreditCard,
    MapPin,
    Package,
    ShoppingBag,
    Truck,
    XCircle,
    X,
} from 'lucide-react';
import Modal from '@/Components/Modal';

const statusStyles = {
    Pending: {
        badge: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: Clock3,
        note: 'Awaiting seller confirmation.',
    },
    Accepted: {
        badge: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: CheckCircle2,
        note: 'Order approved and being prepared.',
    },
    Shipped: {
        badge: 'bg-sky-100 text-sky-700 border-sky-200',
        icon: Truck,
        note: 'Shipment is already in progress.',
    },
    'Ready for Pickup': {
        badge: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: Package,
        note: 'Order is ready for pickup.',
    },
    Delivered: {
        badge: 'bg-teal-100 text-teal-700 border-teal-200',
        icon: Truck,
        note: 'Order has been delivered and is waiting for buyer confirmation.',
    },
    'Refund/Return': {
        badge: 'bg-rose-100 text-rose-700 border-rose-200',
        icon: XCircle,
        note: 'A return or refund request is in progress.',
    },
};

const currency = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function getStatusConfig(status) {
    return statusStyles[status] || {
        badge: 'bg-stone-100 text-stone-700 border-stone-200',
        icon: ShoppingBag,
        note: 'This order is available for reference only.',
    };
}

function ItemImage({ item }) {
    if (!item?.img) {
        return (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-stone-100 bg-stone-50 text-stone-400">
                <Package size={18} />
            </div>
        );
    }

    return (
        <img
            src={item.img}
            alt={item.name}
            className="h-14 w-14 rounded-2xl border border-stone-100 bg-stone-50 object-cover"
        />
    );
}

export default function OrderContextCard({ order: initialOrder, viewer = 'buyer' }) {
    const [expanded, setExpanded] = useState(true);
    const [isCardExpanded, setIsCardExpanded] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const activeOrders = useMemo(() => {
        if (!initialOrder) return [];
        return initialOrder.activeOrders || [initialOrder];
    }, [initialOrder]);

    const order = useMemo(() => {
        return activeOrders[activeIndex] || initialOrder;
    }, [activeOrders, activeIndex, initialOrder]);

    // Reset index if orders list changes
    React.useEffect(() => {
        setActiveIndex(0);
    }, [activeOrders.length]);

    const lineCount = useMemo(() => {
        if (!order) {
            return 0;
        }

        return order.lineItemsCount || order.itemsCount || order.items?.length || 0;
    }, [order]);

    const unitsCount = useMemo(() => {
        if (!order) {
            return 0;
        }

        if (order.unitsCount) {
            return order.unitsCount;
        }

        return (order.items || []).reduce((total, item) => total + Number(item.quantity || 0), 0);
    }, [order]);

    if (!order) {
        return null;
    }

    const orderItems = order.items || [];
    const activeOrdersCount = activeOrders.length;
    const hasMultipleActiveOrders = activeOrdersCount > 1;

    const statusConfig = getStatusConfig(order.status);
    const StatusIcon = statusConfig.icon;
    const heading = viewer === 'seller' ? 'Current Buyer Order' : 'Current Order';

    const handleHeaderClick = () => {
        setIsDrawerOpen(true);
    };

    const detailsContent = (
        <div className="px-1">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{heading}</p>
                    {hasMultipleActiveOrders && (
                        <div className="flex items-center gap-1 bg-gray-100/80 p-0.5 rounded-lg border border-gray-200">
                            <button
                                type="button"
                                disabled={activeIndex === 0}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveIndex(prev => Math.max(0, prev - 1));
                                }}
                                className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                                title="Previous Order"
                            >
                                <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <span className="px-1.5 text-[10px] font-bold text-gray-700 select-none">
                                {activeIndex + 1} of {activeOrdersCount} active
                            </span>
                            <button
                                type="button"
                                disabled={activeIndex === activeOrdersCount - 1}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveIndex(prev => Math.min(activeOrdersCount - 1, prev + 1));
                                }}
                                className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                                title="Next Order"
                            >
                                <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    )}
                </div>
                <Link
                    href={order.detailsRoute}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-clay-600 transition hover:text-clay-700 bg-clay-50/50 hover:bg-clay-50 px-3 py-1.5 rounded-lg shadow-sm"
                >
                    <ShoppingBag size={14} />
                    View Full Order Page
                </Link>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-gray-50/50"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-gray-100 rounded-lg text-gray-500">
                            <Package size={16} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">Order Items</p>
                            <p className="text-xs text-gray-500 font-medium">
                                {unitsCount} total unit{unitsCount === 1 ? '' : 's'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                        <span className="text-xs font-medium mr-1">{expanded ? 'Hide' : 'Show'} items</span>
                        <ChevronDown size={16} className={`transition-transform duration-200 ${expanded ? 'rotate-180 text-gray-800' : ''}`} />
                    </div>
                </button>
                {expanded && (
                    <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/30">
                        <div className="grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(240px,1fr)] lg:grid-cols-[minmax(0,1.25fr)_280px]">
                            <div className="space-y-3 pr-2">
                                {orderItems.length > 0 ? (
                                    orderItems.map((item) => {
                                        const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);

                                        return (
                                            <div key={item.id || item.name} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                                                <ItemImage item={item} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-bold text-gray-900">{item.name}</p>
                                                    {item.variant && <p className="text-xs text-gray-500 mt-0.5">{item.variant}</p>}
                                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-600">
                                                        <span className="rounded-md bg-gray-100 px-2 py-1 leading-none">Qty {item.quantity}</span>
                                                        <span className="text-gray-400">&times;</span>
                                                        <span>{currency.format(item.price || 0)}</span>
                                                    </div>
                                                </div>
                                                <div className="text-left sm:text-right mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                                                    <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 hidden sm:block mb-1">Line Total</p>
                                                    <p className="text-sm font-bold text-gray-900">{currency.format(lineTotal)}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="rounded-xl border border-dashed border-gray-200 bg-white p-4 text-center text-xs font-medium text-gray-500">
                                        1 item in order • Total: {currency.format(order.totalAmount || 0)}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3 border-b border-gray-50 pb-2">Order Details</p>
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                                        {order.customerName && (
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500">Customer</p>
                                                <p className="mt-1 text-sm font-medium text-gray-900">{order.customerName}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500">Payment</p>
                                            <div className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-900">
                                                <CreditCard size={14} className="text-clay-500" />
                                                {order.paymentMethod || 'COD'}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500">Shipping Method</p>
                                            <div className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-900">
                                                <Truck size={14} className="text-clay-500" />
                                                {order.shippingMethod || 'Standard Delivery'}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500">Tracking</p>
                                            <p className="mt-1 text-sm font-medium text-gray-900">{order.trackingNumber || 'Not available yet'}</p>
                                        </div>
                                    </div>
                                </div>

                                {order.shippingAddress && (
                                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                                        <div className="flex items-start gap-2">
                                            <MapPin size={16} className="mt-0.5 shrink-0 text-clay-500" />
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500">Shipping Address</p>
                                                <p className="mt-1 text-sm font-medium leading-relaxed text-gray-900">{order.shippingAddress}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {order.shippingNotes && (
                                    <div className="rounded-xl border border-gray-100 bg-yellow-50 p-4 shadow-sm">
                                        <p className="text-xs font-semibold text-yellow-800">Notes from checkout</p>
                                        <p className="mt-1 text-sm leading-relaxed text-yellow-900">{order.shippingNotes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <section className="flex flex-col border-b border-gray-200 bg-white shadow-sm z-10 transition-all shrink-0">
            {/* COMPACT STRIP (Always visible) */}
            <div 
                className="px-3 py-2 sm:px-4 sm:py-2.5 lg:px-6 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-50/80 transition-colors"
                onClick={handleHeaderClick}
            >
                <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-clay-50/80 border border-clay-100 text-clay-600 rounded-xl shadow-sm">
                        <ShoppingBag size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-bold text-gray-900">{order.orderNumber}</span>
                            <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold leading-none ${statusConfig.badge}`}>
                                <StatusIcon size={12} />
                                {order.status}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-gray-500 mt-1 font-medium">
                            <span>{unitsCount} item{unitsCount === 1 ? '' : 's'}</span>
                            <span>•</span>
                            <span className="text-green-700 font-bold">{currency.format(order.totalAmount || 0)}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <span className="text-xs font-bold text-clay-600 bg-clay-50 hover:bg-clay-100 px-2.5 py-1 rounded-lg transition items-center gap-1">
                        View Details
                    </span>
                    {hasMultipleActiveOrders && (
                        <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600 hidden sm:block">
                            1 of {activeOrdersCount} active
                        </span>
                    )}
                </div>
            </div>

            {/* EXPANDED CONTENT (Desktop Inline fallback - capped height to prevent clipping) */}
            {isCardExpanded && (
                <div className="hidden sm:block px-3 py-3 sm:px-4 lg:px-6 overflow-y-auto custom-scrollbar w-full max-h-[260px] bg-[#FDFBF9] border-t border-gray-100 shadow-inner animate-in slide-in-from-top-2 fade-in duration-200 pb-6">
                    {detailsContent}
                </div>
            )}

            {/* ORDER DETAILS MODAL / DRAWER (Clean, unclipped full view for all viewports) */}
            <Modal show={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} maxWidth="2xl">
                <div className="flex flex-col max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{heading}</h3>
                            <p className="text-xs text-gray-500 font-semibold mt-0.5">{order.orderNumber}</p>
                        </div>
                        <button 
                            onClick={() => setIsDrawerOpen(false)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none"
                            type="button"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FDFBF9] pb-8">
                        {detailsContent}
                    </div>
                </div>
            </Modal>
        </section>
    );
}

export function SellerOrderActionBar({ order, onApprove, onReject }) {
    if (!order) {
        return null;
    }

    const statusConfig = getStatusConfig(order.status);
    const StatusIcon = statusConfig.icon;

    return (
        <div className="mb-3 rounded-xl border border-gray-200 bg-white p-3 shadow-md">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Order Status</p>
                        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold leading-none ${statusConfig.badge}`}>
                            <StatusIcon size={14} />
                            {order.status}
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 font-medium">{statusConfig.note}</p>
                </div>

                {order.canRespond ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                            type="button"
                            onClick={onApprove}
                            className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg bg-clay-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-clay-700 hover:shadow active:scale-[0.98]"
                        >
                            <CheckCircle2 size={18} />
                            Approve Order
                        </button>
                        <button
                            type="button"
                            onClick={onReject}
                            className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition-all hover:bg-red-50 hover:text-red-700 active:scale-[0.98]"
                        >
                            <XCircle size={18} />
                            Reject Order
                        </button>
                    </div>
                ) : (
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 sm:max-w-sm">
                        This order is no longer awaiting confirmation.
                    </div>
                )}
            </div>
        </div>
    );
}

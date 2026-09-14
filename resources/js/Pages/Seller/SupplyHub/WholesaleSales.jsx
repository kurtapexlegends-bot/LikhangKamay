/* global route */
import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import { Truck, Search, ShoppingCart, Boxes, X } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import DispatchOrderModal from '@/Components/Seller/Orders/DispatchOrderModal';
import WholesaleOrderStatusModal from '@/Components/Seller/SupplyHub/WholesaleOrderStatusModal';
import WholesaleInvoiceModal from '@/Components/Seller/SupplyHub/WholesaleInvoiceModal';
import WholesaleOrderCard from '@/Components/Seller/SupplyHub/WholesaleOrderCard';

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
    openOrdersCount,
    filters = {},
}) {
    const { auth, flash, cartCount = 0, sellerSidebar } = usePage().props;
    const isPremium = sellerSidebar?.isPremium ?? true;
    const sellerShopName = sellerSidebar?.shopName || auth?.user?.shop_name || 'Studio Workshop';
    const sellerName = auth?.user?.name || '';
    const { addToast } = useToast();
    const { openSidebar } = useSellerWorkspaceShell();
    useFlashToast(flash, addToast);

    const totalOpenInboundOrders = openOrdersCount !== undefined
        ? Number(openOrdersCount)
        : Number(activeOrdersCount || 0);

    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [actionModal, setActionModal] = useState({ isOpen: false, order: null, nextStatus: '', trackingNumber: '', notes: '' });
    const [dispatchModal, setDispatchModal] = useState({ isOpen: false, order: null });
    const [invoiceModal, setInvoiceModal] = useState({ isOpen: false, order: null });
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
                badge={{ label: 'Enterprise', iconColor: 'text-emerald-400' }}
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
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 text-stone-500 hover:text-stone-800"
                            >
                                <span>Browse Supplies</span>
                            </Link>

                            <Link
                                href={route('seller.supply-hub.my-listings')}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 text-stone-500 hover:text-stone-800"
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
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 text-stone-500 hover:text-stone-800"
                            >
                                <span>Supplies Ordered</span>
                                {totalOpenInboundOrders > 0 && (
                                    <span className="px-1.5 py-0.2 text-[10px] rounded-full font-black bg-stone-200 text-stone-600">
                                        {totalOpenInboundOrders}
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
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </form>
                    </div>
                </div>

                {/* Orders List */}
                {orderList.length > 0 ? (
                    <div className="space-y-4">
                        {orderList.map((order) => (
                            <WholesaleOrderCard
                                key={order.id}
                                order={order}
                                copiedId={copiedId}
                                onCopy={copyToClipboard}
                                isPricingExpanded={expandedPricingDetails.has(order.id)}
                                onTogglePricing={togglePricingDetailsExpansion}
                                isTimelineExpanded={expandedTimelines.has(order.id)}
                                onToggleTimeline={toggleTimelineExpansion}
                                onOpenActionModal={handleOpenActionModal}
                                onOpenDispatchModal={(ord) => setDispatchModal({ isOpen: true, order: ord })}
                                onViewInvoice={(ord) => setInvoiceModal({ isOpen: true, order: ord })}
                            />
                        ))}

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
                                                ? 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 cursor-pointer'
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
            <WholesaleOrderStatusModal
                isOpen={actionModal.isOpen}
                onClose={() => setActionModal({ isOpen: false, order: null, nextStatus: '', trackingNumber: '', notes: '' })}
                order={actionModal.order}
                nextStatus={actionModal.nextStatus}
                trackingNumber={actionModal.trackingNumber}
                setTrackingNumber={(val) => setActionModal(prev => ({ ...prev, trackingNumber: val }))}
                notes={actionModal.notes}
                setNotes={(val) => setActionModal(prev => ({ ...prev, notes: val }))}
                onSubmit={handleUpdateStatus}
                isSubmitting={isSubmitting}
            />

            {/* Printable Wholesale Invoice Modal */}
            <WholesaleInvoiceModal
                isOpen={invoiceModal.isOpen}
                onClose={() => setInvoiceModal({ isOpen: false, order: null })}
                order={invoiceModal.order}
                sellerShopName={sellerShopName}
                sellerName={sellerName}
            />

            {/* In-House / Lalamove Dispatch Modal */}
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

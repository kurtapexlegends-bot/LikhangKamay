/* global route */
import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import { 
    ShoppingCart, Boxes, ArrowRight, Package
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import ConfirmationModal from '@/Components/ConfirmationModal';
import CompactPagination from '@/Components/CompactPagination';
import SourcingOrderFilterToolbar from './SourcingOrderFilterToolbar';
import SourcingOrderCard from './SourcingOrderCard';

export default function SourcingOrders({
    orders,
    activeOrdersCount = 0,
    deliveredOrdersCount = 0,
    completedOrdersCount = 0,
    cancelledOrdersCount = 0,
    openOrdersCount,
    myPublishedCount = 0,
    wholesaleSalesCount = 0,
    filters = {},
}) {
    const { flash, cartCount = 0 } = usePage().props;
    const { addToast } = useToast();
    const { openSidebar } = useSellerWorkspaceShell();
    useFlashToast(flash, addToast);

    const totalOpenOrders = openOrdersCount !== undefined
        ? Number(openOrdersCount)
        : (Number(activeOrdersCount || 0) + Number(deliveredOrdersCount || 0));

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
            <Head title="Supplies Ordered - Supply Hub" />
            <SellerHeader
                title="Supply Hub"
                subtitle="Track and manage shipments of workshop supplies ordered from peer studios."
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
                                className="px-3.5 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 shrink-0 text-stone-500 hover:text-stone-800 font-semibold"
                            >
                                <span>Browse Supplies</span>
                            </Link>

                            <Link
                                href={route('seller.supply-hub.my-listings')}
                                className="px-3.5 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 shrink-0 text-stone-500 hover:text-stone-800 font-semibold"
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
                                className="px-3.5 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 shrink-0 bg-white text-clay-800 shadow-xs font-black"
                            >
                                <span>Supplies Ordered</span>
                                {totalOpenOrders > 0 && (
                                    <span className="px-1.5 py-0.2 text-[10px] rounded-full font-black bg-clay-600 text-white">
                                        {totalOpenOrders}
                                    </span>
                                )}
                            </Link>

                            <Link
                                href={route('seller.supply-hub.sales')}
                                className="px-3.5 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 shrink-0 text-stone-500 hover:text-stone-800 font-semibold"
                            >
                                <span>Supplies Sold</span>
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
                <SourcingOrderFilterToolbar
                    activeTab={activeTab}
                    activeOrdersCount={activeOrdersCount}
                    deliveredOrdersCount={deliveredOrdersCount}
                    completedOrdersCount={completedOrdersCount}
                    cancelledOrdersCount={cancelledOrdersCount}
                    onFilterStatus={handleFilterStatus}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    onSearch={handleSearch}
                    onClearSearch={handleClearSearch}
                />

                {/* Orders List with Transparent & Detailed Layout */}
                {orderList.length > 0 ? (
                    <div className="space-y-4">
                        {orderList.map((order) => (
                            <SourcingOrderCard
                                key={order.id}
                                order={order}
                                copiedId={copiedId}
                                onCopyToClipboard={copyToClipboard}
                                isPricingExpanded={expandedPricingDetails.has(order.id)}
                                onTogglePricingDetails={togglePricingDetailsExpansion}
                                isTimelineExpanded={expandedTimelines.has(order.id)}
                                onToggleTimeline={toggleTimelineExpansion}
                                confirmingId={confirmingId}
                                onRequestConfirm={(ord) => setConfirmModal({ isOpen: true, order: ord })}
                                courierLabel={resolveCourierLabel(order)}
                            />
                        ))}

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
                        <h4 className="font-bold text-stone-900 text-sm">No Ordered Supplies Found</h4>
                        <p className="text-xs text-stone-500 max-w-sm mx-auto">
                            You have no supply orders matching this filter. Browse peer artisan supplies to restock your studio with clay, timber, or glazes.
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

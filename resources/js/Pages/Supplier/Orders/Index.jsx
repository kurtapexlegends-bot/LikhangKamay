/* global route */
import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import SupplierLayout from '@/Layouts/SupplierLayout';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import {
    ClipboardList, Package, X, Phone, MapPin, Building2, Search, Clock, CreditCard, Truck
} from 'lucide-react';

const STATUS_STYLES = {
    Pending: 'bg-amber-50 text-amber-800 border-amber-200',
    Accepted: 'bg-blue-50 text-blue-800 border-blue-200',
    Processing: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    Shipped: 'bg-sky-50 text-sky-800 border-sky-200',
    'Ready for Pickup': 'bg-sky-50 text-sky-800 border-sky-200',
    Delivered: 'bg-teal-50 text-teal-800 border-teal-200',
    Completed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Cancelled: 'bg-stone-100 text-stone-500 border-stone-200',
};

const STATUS_TABS = [
    { id: 'all', label: 'All Orders' },
    { id: 'Pending', label: 'Pending' },
    { id: 'Accepted', label: 'Accepted' },
    { id: 'Processing', label: 'Processing' },
    { id: 'Shipped', label: 'Shipped' },
    { id: 'Ready for Pickup', label: 'Ready for Pickup' },
    { id: 'Delivered', label: 'Delivered' },
    { id: 'Cancelled', label: 'Cancelled' },
];

const formatPeso = (value) =>
    `₱${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SupplierOrdersIndex({ orders, currentFilter = 'all', filters = {} }) {
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [search, setSearch] = useState(filters.search || '');

    const { data, setData, post, processing, errors, reset } = useForm({
        status: '',
        notes: '',
    });

    const orderList = orders?.data || [];

    const filterByStatus = (status) => {
        router.get(route('supplier.orders.index'), { status, search }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const submitSearch = (e) => {
        e.preventDefault();
        router.get(route('supplier.orders.index'), { status: currentFilter, search }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearSearch = () => {
        setSearch('');
        router.get(route('supplier.orders.index'), { status: currentFilter }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const openStatusModal = (order) => {
        setSelectedOrder(order);
        setData({
            status: order.status || 'Accepted',
            notes: '',
        });
        setStatusModalOpen(true);
    };

    const closeStatusModal = () => {
        setStatusModalOpen(false);
        setSelectedOrder(null);
        reset();
    };

    const submitStatusUpdate = (e) => {
        e.preventDefault();
        if (!selectedOrder) return;

        post(route('supplier.orders.status', selectedOrder.id), {
            preserveScroll: true,
            onSuccess: () => closeStatusModal(),
        });
    };

    const emptyDescription = (() => {
        if (filters.search) {
            return `No wholesale orders match "${filters.search}".`;
        }
        if (currentFilter !== 'all') {
            return `No wholesale orders are currently "${currentFilter}".`;
        }
        return 'When Cavite artisan studios order your raw materials, their procurement orders appear here for packing and dispatch.';
    })();

    return (
        <SupplierLayout active="orders">
            <Head title="Artisan Workshop Orders" />

            {/* Filter Toolbar: Status Pills + Search */}
            <div className="rounded-2xl border border-stone-200/80 bg-white p-3 sm:p-4 shadow-2xs">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto lg:flex-wrap lg:overflow-visible scrollbar-none p-1 bg-stone-100/70 rounded-2xl text-xs font-bold touch-pan-y overscroll-contain">
                        {STATUS_TABS.map((tab) => {
                            const isActive = currentFilter === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => filterByStatus(tab.id)}
                                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer min-h-[44px] sm:min-h-0 ${
                                        isActive
                                            ? 'bg-white text-stone-900 shadow-xs font-extrabold'
                                            : 'text-stone-600 hover:text-stone-900 font-semibold'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <form onSubmit={submitSearch} className="relative w-full lg:w-64 shrink-0">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Order no. or studio"
                            className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-1.5 pl-9 pr-8 text-xs font-medium text-stone-800 placeholder-stone-400 focus:bg-white focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                                title="Clear search"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </form>
                </div>
            </div>

            {/* Orders Feed */}
            {orderList.length === 0 ? (
                <div className="py-10">
                    <WorkspaceEmptyState
                        compact
                        icon={ClipboardList}
                        title="No wholesale orders found"
                        description={emptyDescription}
                    />
                </div>
            ) : (
                <div className="space-y-3.5">
                    {orderList.map((order) => (
                        <div
                            key={order.id}
                            className="rounded-2xl border border-stone-200/80 bg-white p-3.5 sm:p-5 shadow-2xs transition-all hover:shadow-xs hover:border-stone-300 space-y-3.5"
                        >
                            {/* Header: Order No., Status, Placed On, Action */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                    <div>
                                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">
                                            Order
                                        </span>
                                        <h3 className="font-bold text-stone-900 text-xs sm:text-sm leading-none font-mono mt-0.5">
                                            #{order.order_number}
                                        </h3>
                                    </div>

                                    <div className="hidden sm:block h-4 w-px bg-stone-200" />

                                    <div className="flex items-center gap-1.5 text-stone-400">
                                        <Clock size={11} />
                                        <span className="text-[11px] font-medium text-stone-600">
                                            {order.created_at}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-tight whitespace-nowrap ${STATUS_STYLES[order.status] || STATUS_STYLES.Pending}`}>
                                        {order.status}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => openStatusModal(order)}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 shadow-2xs transition min-h-[44px] sm:min-h-[36px] cursor-pointer"
                                    >
                                        Update Status
                                    </button>
                                </div>
                            </div>

                            {/* Client Workshop & Fulfillment */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-stone-50/60 p-3.5 rounded-xl border border-stone-100">
                                <div>
                                    <span className="font-bold uppercase tracking-wider text-stone-400 text-[10px] block mb-1">
                                        Client Workshop
                                    </span>
                                    <p className="font-bold text-stone-900 flex items-center gap-1.5">
                                        <Building2 size={13} className="text-clay-600 shrink-0" />
                                        {order.buyer?.shop_name || order.buyer?.name}
                                    </p>
                                    <p className="text-stone-600 mt-0.5">
                                        {order.buyer?.name}
                                        {order.buyer?.city ? ` • ${order.buyer.city}` : ''}
                                    </p>
                                    {order.buyer?.phone && (
                                        <p className="text-stone-500 flex items-center gap-1 mt-0.5">
                                            <Phone size={11} /> {order.buyer.phone}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <span className="font-bold uppercase tracking-wider text-stone-400 text-[10px] block mb-1">
                                        Fulfillment
                                    </span>
                                    <p className="font-bold text-stone-800 flex items-center gap-1.5">
                                        <Truck size={13} className="text-stone-400 shrink-0" />
                                        {order.shipping_method || 'Courier Hub'}
                                    </p>
                                    <p className="text-stone-600 flex items-center gap-1 mt-0.5">
                                        <CreditCard size={11} className="text-stone-400 shrink-0" />
                                        {order.payment_method} ({order.payment_status})
                                    </p>
                                    {order.shipping_address && (
                                        <p className="text-stone-600 flex items-start gap-1 mt-0.5">
                                            <MapPin size={11} className="mt-0.5 text-stone-400 shrink-0" />
                                            <span>{order.shipping_address}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Order Items */}
                            <div className="divide-y divide-stone-100">
                                {order.items.map((item) => (
                                    <div key={item.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Package size={13} className="text-stone-400 shrink-0" />
                                            <span className="font-semibold text-stone-900 truncate">{item.product_name}</span>
                                            <span className="text-stone-500 shrink-0">
                                                × {item.quantity} {item.supply_unit}
                                            </span>
                                        </div>
                                        <span className="font-bold text-stone-900 tabular-nums shrink-0">
                                            {formatPeso(item.price * item.quantity)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Total */}
                            <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                                    Wholesale Total
                                </span>
                                <span className="text-sm font-extrabold text-stone-900 tabular-nums">
                                    {formatPeso(order.total_amount)}
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Pagination */}
                    {orders.links && orders.links.length > 3 && (
                        <div className="flex items-center justify-center gap-1 pt-2">
                            {orders.links.map((link, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    disabled={!link.url || link.active}
                                    onClick={() => router.get(link.url, {}, { preserveState: true, preserveScroll: true })}
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
            )}

            {/* Modal: Update Order Status */}
            <Modal show={statusModalOpen} onClose={closeStatusModal} maxWidth="md">
                <form onSubmit={submitStatusUpdate} className="p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                        <h2 className="text-base font-bold text-stone-900">
                            Update Order #{selectedOrder?.order_number}
                        </h2>
                        <button
                            type="button"
                            onClick={closeStatusModal}
                            className="text-stone-400 hover:text-stone-600 cursor-pointer"
                            title="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div>
                        <InputLabel htmlFor="order_status" value="Fulfillment Status" />
                        <select
                            id="order_status"
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
                            className="mt-1 block w-full rounded-xl border-stone-300 shadow-sm focus:border-clay-500 focus:ring-clay-500 text-xs py-2 px-3"
                            required
                        >
                            <option value="Accepted">Accepted (Confirmed inventory)</option>
                            <option value="Processing">Processing (Packing materials)</option>
                            <option value="Ready for Pickup">Ready for Pickup (Warehouse ready)</option>
                            <option value="Shipped">Shipped (Dispatched with courier)</option>
                            <option value="Delivered">Delivered (Handed over)</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                        <InputError message={errors.status} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel htmlFor="notes" value="Dispatch Note / Waybill (Optional)" />
                        <textarea
                            id="notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={3}
                            placeholder="Add tracking number or courier driver notes..."
                            className="mt-1 block w-full rounded-xl border-stone-300 shadow-sm focus:border-clay-500 focus:ring-clay-500 text-xs p-3"
                        />
                        <InputError message={errors.notes} className="mt-1" />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                        <SecondaryButton onClick={closeStatusModal} type="button" className="min-h-[44px]">
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={processing} className="min-h-[44px]">
                            {processing ? 'Updating...' : 'Save Status'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </SupplierLayout>
    );
}

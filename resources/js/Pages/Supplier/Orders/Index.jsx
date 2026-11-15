/* global route */
import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import SupplierLayout from '@/Layouts/SupplierLayout';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { 
    ClipboardList, Truck, Package, CheckCircle2, 
    X, Clock, Phone, MapPin, Building2, AlertCircle 
} from 'lucide-react';

export default function SupplierOrdersIndex({ orders, currentFilter = 'all' }) {
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [statusModalOpen, setStatusModalOpen] = useState(false);

    const { data, setData, post, processing, reset } = useForm({
        status: '',
        notes: '',
    });

    const statusOptions = [
        'all', 'Pending', 'Accepted', 'Processing', 'Shipped', 'Ready for Pickup', 'Delivered', 'Cancelled'
    ];

    const filterByStatus = (status) => {
        router.get(route('supplier.orders.index'), { status }, {
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

    return (
        <SupplierLayout active="orders">
            <Head title="Artisan Workshop Orders" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 font-serif">
                        Workshop Orders
                    </h1>
                    <p className="mt-1 text-xs text-stone-600">
                        Inbound raw material procurement orders placed by verified artisan studios.
                    </p>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="mt-6 flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-stone-200">
                {statusOptions.map((st) => (
                    <button
                        key={st}
                        onClick={() => filterByStatus(st)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-colors ${
                            currentFilter === st
                                ? 'bg-stone-900 text-white'
                                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                        }`}
                    >
                        {st === 'all' ? 'All Orders' : st}
                    </button>
                ))}
            </div>

            {/* Orders Feed */}
            <div className="mt-6 space-y-4">
                {orders.data.length === 0 ? (
                    <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-stone-400">
                        <ClipboardList size={36} className="mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-medium">No wholesale orders found in this category.</p>
                    </div>
                ) : (
                    orders.data.map((order) => (
                        <div key={order.id} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-extrabold text-stone-900 font-mono">
                                            #{order.order_number}
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                            order.status === 'Delivered'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : order.status === 'Cancelled'
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-amber-100 text-amber-900'
                                        }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-stone-400 mt-0.5">Placed on {order.created_at}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openStatusModal(order)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 px-3 py-1.5 text-xs font-bold text-stone-800 transition-colors"
                                    >
                                        Update Status
                                    </button>
                                </div>
                            </div>

                            {/* Workshop Client & Delivery Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-stone-50/75 p-4 rounded-xl border border-stone-100">
                                <div>
                                    <span className="font-bold uppercase tracking-wider text-stone-400 text-[10px] block mb-1">
                                        Client Workshop
                                    </span>
                                    <p className="font-bold text-stone-900 flex items-center gap-1.5">
                                        <Building2 size={13} className="text-clay-600" />
                                        {order.buyer?.shop_name}
                                    </p>
                                    <p className="text-stone-600 mt-0.5">{order.buyer?.name} • {order.buyer?.email}</p>
                                    {order.buyer?.phone && (
                                        <p className="text-stone-500 flex items-center gap-1 mt-0.5">
                                            <Phone size={12} /> {order.buyer.phone}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <span className="font-bold uppercase tracking-wider text-stone-400 text-[10px] block mb-1">
                                        Fulfillment & Destination
                                    </span>
                                    <p className="font-bold text-stone-800">
                                        Method: {order.shipping_method} • Payment: {order.payment_method} ({order.payment_status})
                                    </p>
                                    {order.shipping_address && (
                                        <p className="text-stone-600 flex items-start gap-1 mt-0.5">
                                            <MapPin size={13} className="mt-0.5 text-stone-400 shrink-0" />
                                            <span>{order.shipping_address}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Order Items Table */}
                            <div className="divide-y divide-stone-100">
                                {order.items.map((item) => (
                                    <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <Package size={14} className="text-stone-400" />
                                            <span className="font-semibold text-stone-900">{item.product_name}</span>
                                            <span className="text-stone-500">
                                                × {item.quantity} {item.supply_unit}
                                            </span>
                                        </div>
                                        <span className="font-bold text-stone-900 font-serif">
                                            ₱{(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Total Footer */}
                            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                                <span className="font-bold text-stone-600 uppercase tracking-wider">Wholesale Total</span>
                                <span className="text-base font-extrabold text-stone-900 font-serif">
                                    ₱{order.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal: Update Order Status */}
            <Modal show={statusModalOpen} onClose={closeStatusModal} maxWidth="md">
                <form onSubmit={submitStatusUpdate} className="p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                        <h2 className="text-base font-bold text-stone-900 font-serif">
                            Update Order #{selectedOrder?.order_number}
                        </h2>
                        <button type="button" onClick={closeStatusModal} className="text-stone-400 hover:text-stone-600">
                            <X size={18} />
                        </button>
                    </div>

                    <div>
                        <InputLabel htmlFor="order_status" value="Fulfillment Status" />
                        <select
                            id="order_status"
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
                            className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-clay-500 focus:ring-clay-500 text-xs"
                            required
                        >
                            <option value="Accepted">Accepted (Confirmed inventory)</option>
                            <option value="Processing">Processing (Packing materials)</option>
                            <option value="Ready for Pickup">Ready for Pickup (Warehouse ready)</option>
                            <option value="Shipped">Shipped (Dispatched with courier)</option>
                            <option value="Delivered">Delivered (Handed over)</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div>
                        <InputLabel htmlFor="notes" value="Dispatch Note / Waybill (Optional)" />
                        <textarea
                            id="notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={3}
                            placeholder="Add tracking number or courier driver notes..."
                            className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-clay-500 focus:ring-clay-500 text-xs"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                        <SecondaryButton onClick={closeStatusModal} type="button">Cancel</SecondaryButton>
                        <PrimaryButton disabled={processing}>
                            {processing ? 'Updating...' : 'Save Status'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </SupplierLayout>
    );
}

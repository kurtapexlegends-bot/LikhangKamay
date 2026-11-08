import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { 
    Truck, CheckCircle2, 
    Check, MapPin, MessageSquare, 
    Phone, ChevronDown, ChevronRight, Hash, Copy, CheckCheck,
    CreditCard, Store, Clock, Printer, Activity, X
} from 'lucide-react';
import Modal from '@/Components/Modal';
import OrderCourierTracking from '@/Components/Seller/Orders/OrderCourierTracking';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SourcingOrderCard({
    order,
    copiedId,
    onCopyToClipboard,
    isPricingExpanded = false,
    onTogglePricingDetails,
    isTimelineExpanded = false,
    onToggleTimeline,
    confirmingId,
    onRequestConfirm,
    courierLabel = 'Studio Delivery',
}) {
    const [showTimelineModal, setShowTimelineModal] = useState(false);
    const isDelivered = order.status === 'Delivered';
    const isCompleted = order.status === 'Completed';
    const isShipped = order.status === 'Shipped' || order.status === 'Ready for Pickup';
    const timelineCount = order.timeline?.length || 0;

    return (
        <div 
            className={`group relative mb-3.5 rounded-2xl border bg-white p-3.5 sm:p-5 shadow-2xs transition-all hover:shadow-xs ${
                isDelivered 
                    ? 'border-amber-300 ring-2 ring-amber-100/80 hover:border-amber-400' 
                    : 'border-stone-200/80 hover:border-stone-300'
            }`}
        >
            {/* 1. Order Header: ID, Date, B2B Tag, Timeline Modal Trigger, Statuses */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5 mb-2.5">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <div>
                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">
                            Order
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                            <h3 className="font-bold text-stone-900 text-xs sm:text-sm leading-none font-mono">
                                #{order.id}
                            </h3>
                            <button
                                type="button"
                                onClick={() => onCopyToClipboard(order.id, `id-${order.id}`)}
                                className="text-stone-400 hover:text-stone-700 p-0.5 rounded transition cursor-pointer"
                                title="Copy Order ID"
                            >
                                {copiedId === `id-${order.id}` ? (
                                    <CheckCheck size={12} className="text-emerald-600" />
                                ) : (
                                    <Copy size={12} />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="hidden sm:block h-4 w-px bg-stone-200" />

                    <div className="flex items-center gap-1.5 text-stone-400">
                        <Clock size={11} />
                        <span className="text-[11px] font-medium text-stone-600">
                            {order.date}
                        </span>
                    </div>

                    {/* Dedicated Timeline Modal Event Trigger (Order Manager Parity) */}
                    {timelineCount > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowTimelineModal(true)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-stone-600 bg-stone-100 hover:bg-stone-200/80 rounded-md transition cursor-pointer"
                            title="Click to view full delivery timeline"
                        >
                            <Activity size={10} className="text-stone-400" />
                            <span>{timelineCount} {timelineCount === 1 ? 'event' : 'events'}</span>
                        </button>
                    )}
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
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 py-1.5 px-2.5 bg-stone-50/60 rounded-xl border border-stone-100">
                {/* Left: Supplier Studio Details */}
                <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-clay-100 border border-clay-200 flex items-center justify-center overflow-hidden shrink-0 text-clay-700 font-black text-xs">
                        {order.supplier_avatar ? (
                            <img
                                src={order.supplier_avatar}
                                alt={order.supplier_name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = '/images/placeholder.svg';
                                }}
                            />
                        ) : (
                            <Store size={13} />
                        )}
                    </div>
                    <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-stone-850 truncate">
                            {order.supplier_name}
                        </span>
                        {order.supplier_city && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-stone-200/70 px-1.5 py-0.2 text-[9px] font-bold text-stone-700">
                                <MapPin size={9} />
                                {order.supplier_city}
                            </span>
                        )}
                        {order.shipping_contact_phone && (
                            <span className="text-[10px] text-stone-400 font-medium hidden sm:inline">
                                &bull; {order.shipping_contact_phone}
                            </span>
                        )}
                    </div>

                    {/* Chat button with supplier */}
                    {order.supplier_id && (
                        <button
                            type="button"
                            onClick={() => router.visit(route('chat.index', { user_id: order.supplier_id }))}
                            className="p-1 text-clay-600 hover:text-clay-800 bg-clay-50 hover:bg-clay-100 rounded-md transition cursor-pointer"
                            title="Message Supplier Studio"
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
                    {(!order.tracking_number || courierLabel === 'Pick Up') && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-0.5 text-[9px] font-extrabold uppercase text-stone-600 tracking-tight shadow-2xs">
                            <Truck size={10} className="text-stone-500" />
                            <span>{courierLabel}</span>
                        </span>
                    )}
                    {order.tracking_number && (
                        <button
                            type="button"
                            onClick={() => onCopyToClipboard(order.tracking_number, `track-${order.id}`)}
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
                        Ordered Raw Materials ({order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'})
                    </p>
                    <div className="space-y-2">
                        {order.items?.map((item, idx) => (
                            <div 
                                key={idx}
                                className="flex items-center gap-3 rounded-xl border border-stone-150 bg-stone-50/40 p-2.5 sm:p-3"
                            >
                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-white">
                                    <img 
                                        src={item.img} 
                                        alt={item.name}
                                        className="h-full w-full object-cover"
                                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/placeholder.svg'; }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="truncate text-xs font-bold text-stone-900">{item.name}</p>
                                    <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5 flex-wrap">
                                        <span>Quantity: <strong className="text-stone-900 font-extrabold">{item.qty} {item.supply_unit}</strong></span>
                                        <span>&bull;</span>
                                        <span className="text-stone-600 font-medium">{formatCurrency(item.price)} / {item.supply_unit}</span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xs font-black text-stone-900">{formatCurrency(item.price * item.qty)}</p>
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

                {/* Right Column: Transparent Financials & Fulfillment Actions */}
                <div className="border-t border-stone-100 pt-3 lg:w-72 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0 shrink-0 space-y-2">
                    {/* Transparent Pricing Card */}
                    <div className="rounded-xl border border-stone-200/80 bg-stone-50/40 p-1 shadow-2xs">
                        <button
                            type="button"
                            onClick={() => onTogglePricingDetails(order.id)}
                            className={`flex items-center justify-between w-full cursor-pointer select-none px-2.5 py-1.5 rounded-lg hover:bg-stone-100/60 transition-colors text-left focus:outline-none ${
                                isPricingExpanded ? 'border-b border-stone-200/60 pb-2 mb-1.5' : ''
                            }`}
                        >
                            <div>
                                <p className="text-[8px] font-extrabold text-stone-400 uppercase tracking-wider">
                                    Total
                                </p>
                                <p className="text-xs font-bold text-stone-800">
                                    ₱{order.total}
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 text-right">
                                <div>
                                    <p className="text-[8px] font-extrabold text-stone-500 uppercase tracking-wider">
                                        Merchandise
                                    </p>
                                    <p className="text-xs font-bold text-stone-700">
                                        {formatCurrency(order.merchandise_subtotal)}
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
                                <div className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">Cost Breakdown</div>
                                <div className="flex justify-between text-stone-600">
                                    <span>Materials Subtotal:</span>
                                    <span className="font-semibold text-stone-800">
                                        {formatCurrency(order.merchandise_subtotal)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-stone-600">
                                    <span>Shipping Fee:</span>
                                    <span className="font-semibold text-stone-800">
                                        {formatCurrency(order.shipping_fee_amount)}
                                    </span>
                                </div>
                                {order.convenience_fee_amount > 0 && (
                                    <div className="flex justify-between text-stone-500">
                                        <span>Service Fee:</span>
                                        <span className="font-semibold text-stone-700">
                                            {formatCurrency(order.convenience_fee_amount)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold pt-1.5 border-t border-stone-100/80">
                                    <span className="text-stone-900">Total Studio Cost:</span>
                                    <span className="text-clay-700 font-black text-xs">
                                        {formatCurrency(order.total_amount || order.total)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Live Courier Tracking & GPS Route Map */}
                    <OrderCourierTracking order={order} role="buyer" />

                    {/* Order Action Buttons */}
                    <div className="pt-1">
                        {order.payment_status === 'pending' && order.payment_method !== 'COD' && order.status !== 'Cancelled' && (
                            <a
                                href={route('payment.pay', order.order_number || order.id)}
                                className="mb-2 w-full flex items-center justify-center gap-1.5 rounded-xl bg-clay-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-clay-700 transition active:scale-95 cursor-pointer"
                            >
                                <CreditCard size={14} />
                                <span>Pay Now</span>
                            </a>
                        )}

                        {isDelivered && (
                            <button
                                type="button"
                                onClick={() => onRequestConfirm(order)}
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
                                <span>Synced to Inventory</span>
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

                        {order.status !== 'Pending' && (
                            <a
                                href={route('seller.supply-hub.orders.invoice', order.order_number || order.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 w-full flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 hover:text-stone-900 transition active:scale-95 cursor-pointer"
                            >
                                <Printer size={13} className="text-stone-500" />
                                <span>View Invoice</span>
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Dedicated Delivery Activity Timeline Modal (Order Manager Parity) */}
            <Modal show={showTimelineModal} onClose={() => setShowTimelineModal(false)} maxWidth="md">
                <div className="p-4 sm:p-5 bg-white rounded-2xl">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Delivery Audit</span>
                            <h4 className="text-sm font-bold text-stone-900 font-mono">Order #{order.id}</h4>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowTimelineModal(false)}
                            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {order.timeline && order.timeline.length > 0 ? (
                            order.timeline.map((step, sIdx) => (
                                <div key={sIdx} className="flex items-start gap-3">
                                    <div className={`h-3 w-3 rounded-full mt-1 shrink-0 ${step.completed ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-stone-300'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-bold ${step.completed ? 'text-stone-900' : 'text-stone-500'}`}>{step.title}</p>
                                        {step.timestamp && (
                                            <p className="text-[10px] text-stone-400 mt-0.5">{step.timestamp}</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6 text-xs text-stone-500">
                                No activity recorded yet.
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}

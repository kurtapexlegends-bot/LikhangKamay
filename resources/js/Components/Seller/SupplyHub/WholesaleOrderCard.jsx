/* global route */
import React from 'react';
import { router } from '@inertiajs/react';
import {
    Truck, CheckCircle2, MapPin,
    MessageSquare, Phone, ChevronDown, ChevronRight,
    Hash, Copy, CheckCheck, CreditCard, Store, Clock, Printer, Check, X
} from 'lucide-react';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function WholesaleOrderCard({
    order,
    copiedId,
    onCopy,
    isPricingExpanded,
    onTogglePricing,
    isTimelineExpanded,
    onToggleTimeline,
    onOpenActionModal,
    onOpenDispatchModal,
    onViewInvoice,
}) {
    return (
        <div className="rounded-2xl border border-stone-200/90 bg-white p-3.5 sm:p-5 shadow-2xs transition-all hover:shadow-xs hover:border-stone-300">
            {/* 1. Order Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-xs sm:text-sm font-black text-stone-900 tracking-tight">
                        Order #{order.id}
                    </span>
                    <button
                        type="button"
                        onClick={() => onCopy(order.id, `id-${order.id}`)}
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
                            onClick={() => onTogglePricing(order.id)}
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
                                        PHP {Number(order.seller_net_amount ?? order.total ?? 0).toLocaleString(undefined, {
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
                                        PHP {Number(order.merchandise_subtotal ?? order.total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex justify-between text-stone-500">
                                    <span>Platform Fee:</span>
                                    <span className="font-semibold text-emerald-600">0% (₱0.00)</span>
                                </div>
                                <div className="flex justify-between font-bold pt-1.5 border-t border-stone-100/80 mb-2">
                                    <span className="text-stone-900">Net Shop Payout:</span>
                                    <span className="text-emerald-600 font-black text-xs">
                                        PHP {Number(order.seller_net_amount ?? order.total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                                onClick={() => onToggleTimeline(order.id)}
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
                                    onClick={() => onOpenActionModal(order, 'Accepted')}
                                    className="flex items-center justify-center gap-1 rounded-xl bg-clay-700 py-2 text-xs font-bold text-white shadow-2xs hover:bg-clay-800 transition active:scale-95"
                                >
                                    <Check size={12} />
                                    <span>Accept</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onOpenActionModal(order, 'Cancelled')}
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
                                onClick={() => onOpenDispatchModal(order)}
                                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-clay-700 py-2 text-xs font-bold text-white hover:bg-clay-800 transition shadow-2xs active:scale-95"
                            >
                                <Truck size={13} />
                                <span>Mark Dispatched</span>
                            </button>
                        )}

                        {order.status === 'Shipped' && (
                            <button
                                type="button"
                                onClick={() => onOpenActionModal(order, 'Delivered')}
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

                        <button
                            type="button"
                            onClick={() => onViewInvoice(order)}
                            className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 hover:text-stone-900 transition active:scale-95 cursor-pointer"
                        >
                            <Printer size={13} className="text-stone-500" />
                            <span>View Wholesale Invoice</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

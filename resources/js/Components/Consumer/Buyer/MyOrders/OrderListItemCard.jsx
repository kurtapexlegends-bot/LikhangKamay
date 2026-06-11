import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Clock, Store, MapPin, ShoppingBag, AlertCircle, AlertTriangle, MessageCircle, ExternalLink, Hash, CheckCircle, PackageCheck, Truck, RotateCcw, XCircle, CreditCard, Star, Activity, Printer, EllipsisVertical, ChevronDown, ChevronRight } from 'lucide-react';
import Dropdown from '@/Components/Dropdown';
import { StatusBadge, PaymentStatusBadge } from './StatusBadges';
import OrderTimeline from './OrderTimeline';
import CourierTrackingCard from './CourierTrackingCard';
import { buyerDeliverySummary, buyerIssueSummary, buyerProofLabel, humanizeAddressType } from '@/utils/orderHelpers';

export default function OrderListItemCard({
    order,
    onContactSeller,
    onBuyAgain,
    onOpenModal, // for confirm modals: 'cancel', 'receive', 'cancelReturn'
    onOpenReturnModal,
    onOpenEscalateModal,
    onOpenRatingModal,
}) {
    const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
    const [isCourierTrackingExpanded, setIsCourierTrackingExpanded] = useState(false);

    const deliverySummary = buyerDeliverySummary(order);
    const issueSummary = buyerIssueSummary(order);

    const toggleCourierTrackingExpansion = () => {
        setIsCourierTrackingExpanded(!isCourierTrackingExpanded);
    };

    const toggleOrderExpansion = () => {
        setIsTimelineExpanded(!isTimelineExpanded);
    };

    // Mobile Secondary Actions Selector
    const getMobileSecondaryActions = () => {
        const actions = [];
        
        // Receipt (Always available)
        actions.push({
            label: 'Receipt',
            icon: Printer,
            href: `/my-orders/${order.id}/receipt`,
            type: 'link'
        });

        // Chat (Only if order is not completed)
        if (order.status !== 'Completed') {
            actions.push({
                label: 'Chat',
                icon: MessageCircle,
                onClick: () => onContactSeller(order.seller_id),
                type: 'button'
            });
        }

        // Cancel Order
        if (order.can_cancel) {
            actions.push({
                label: 'Cancel Order',
                icon: XCircle,
                onClick: () => onOpenModal('cancel', order.id),
                type: 'button',
                danger: true
            });
        }

        // Buy Again
        if (order.status === 'Completed') {
            actions.push({
                label: 'Buy Again',
                icon: ShoppingBag,
                onClick: () => onBuyAgain(order.id),
                type: 'button'
            });
        }

        // Return
        if (order.status === 'Completed' && order.can_return) {
            actions.push({
                label: 'Return',
                icon: RotateCcw,
                onClick: () => onOpenReturnModal(order),
                type: 'button',
                warning: true
            });
        }

        // Escalate to Admin
        if (order.status === 'Refund/Return' && ['seller_proposed_replacement', 'seller_rejected'].includes(order.dispute?.status)) {
            actions.push({
                label: 'Escalate to Admin',
                icon: AlertTriangle,
                onClick: () => onOpenEscalateModal(order.dispute.id),
                type: 'button',
                warning: true
            });
        }

        // Cancel Return
        if (order.status === 'Refund/Return') {
            actions.push({
                label: 'Cancel Return',
                icon: XCircle,
                onClick: () => onOpenModal('cancelReturn', order.id),
                type: 'button',
                danger: true
            });
        }

        return actions;
    };

    const finalMobileSecondaryActions = (() => {
        const actions = getMobileSecondaryActions();
        
        // Determine if Chat is promoted directly on mobile
        const isChatPromoted = !(['Pending', 'Accepted'].includes(order.status) && order.payment_status === 'pending' && order.payment_method !== 'COD') &&
             !(order.status === 'Delivered' && !order.received_at) &&
             !(order.status === 'Completed' && !order.replacement_in_progress && (order.items.some(item => !item.is_rated) || order.items.some(item => item.review?.can_manage_review))) &&
             !(order.status === 'Refund/Return') &&
             order.status !== 'Completed';

        // Determine if Buy Again is promoted directly on mobile
        const isBuyAgainPromoted = order.status === 'Completed' && 
             !(order.status === 'Completed' && !order.replacement_in_progress && (order.items.some(item => !item.is_rated) || order.items.some(item => item.review?.can_manage_review)));

        return actions.filter(act => {
            if (isChatPromoted && act.label === 'Chat') return false;
            if (isBuyAgainPromoted && act.label === 'Buy Again') return false;
            return true;
        });
    })();

    return (
        <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-colors hover:border-stone-300">
            
            {/* Order Header */}
            <div className="px-3.5 py-2.5 bg-[#FDFBF9] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-stone-100">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-stone-500 mb-0.5">
                        <Store size={10} />
                        <span className="text-[10px] font-black uppercase tracking-tight">{order.seller_name || 'Shop'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h3 className="font-black tracking-tight text-stone-900 text-[12px]">#{order.order_number?.slice(-8) || order.id}</h3>
                        <div className="h-3 w-px bg-stone-200" />
                        <span className="text-[10px] font-medium text-stone-400">{order.date}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <PaymentStatusBadge status={order.payment_status} method={order.payment_method} />
                    <StatusBadge status={order.status} />
                </div>
            </div>

            {/* Timeline Section - Collapsible on Mobile */}
            <div className="border-b border-stone-50">
                <button 
                    type="button"
                    onClick={toggleOrderExpansion}
                    className="flex w-full items-center justify-between bg-white px-4 py-3 sm:hidden min-h-[44px]"
                >
                    <div className="flex items-center gap-2">
                        <Activity size={12} className="text-clay-500" />
                        <span className="text-[11px] font-bold text-stone-700">Track Order</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-stone-400">
                            {isTimelineExpanded ? 'Hide' : 'View'} History
                        </span>
                        <div className={`transition-transform duration-300 ${isTimelineExpanded ? 'rotate-180' : ''}`}>
                            <ExternalLink size={10} className="text-stone-300" />
                        </div>
                    </div>
                </button>
                
                <div className={`${isTimelineExpanded ? 'block' : 'hidden'} sm:block`}>
                    <OrderTimeline status={order.status} isPickup={order.shipping_method === 'Pick Up'} />
                </div>
            </div>

            {/* Order Content */}
            <div className="p-4 sm:p-6 space-y-4">
                {/* Pickup / Delivery Info */}
                <div className="space-y-1.5">
                    {deliverySummary && (
                        <div className={`rounded-xl border px-3 py-2 ${deliverySummary.tone}`}>
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-[12px] font-bold text-stone-900">{deliverySummary.title}</p>
                                    <p className="text-[10px] leading-snug text-stone-600">{deliverySummary.detail}</p>
                                    {order.shipping_method === 'Pick Up' && order.proof_of_delivery && (
                                        <a 
                                            href={order.proof_of_delivery} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-[#FFFDFB] px-2.5 py-1.5 text-[10px] font-bold text-orange-650 hover:bg-orange-50 transition shadow-sm min-h-[44px] sm:min-h-[28px] mt-1.5"
                                        >
                                            <PackageCheck size={12} /> {buyerProofLabel(order)}
                                        </a>
                                    )}
                                </div>
                                {deliverySummary.latestEventTime && (
                                    <span className="rounded-full border border-white/80 bg-white/80 px-2 py-0.5 text-[9px] font-bold text-stone-500">
                                        {deliverySummary.latestEventTime}
                                    </span>
                                )}
                            </div>
                            {deliverySummary.latestEvent && (
                                <p className="mt-1 text-[9px] font-medium text-stone-500">
                                    Latest update: {deliverySummary.latestEvent.label}
                                </p>
                            )}
                        </div>
                    )}

                    {order.shipping_method !== 'Pick Up' && (
                    <>
                        {/* Address row */}
                        <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                            <div className="flex items-start gap-2">
                                <div className="p-1 bg-white rounded shadow-sm text-blue-600 shrink-0 mt-0.5">
                                    <MapPin size={13} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <p className="text-[12px] font-bold text-gray-900">
                                            {order.delivery?.provider === 'lalamove' ? 'Lalamove Delivery' : 'Standard Delivery'}
                                        </p>
                                        {order.shipping_address_type && (
                                            <span className="inline-flex rounded border border-blue-200 bg-white px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide text-blue-700">
                                                {humanizeAddressType(order.shipping_address_type)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-500 leading-snug">{order.shipping_address}</p>
                                    {(order.shipping_recipient_name || order.shipping_contact_phone) && (
                                        <p className="text-[10px] text-gray-400">
                                            {order.shipping_recipient_name}
                                            {order.shipping_recipient_name && order.shipping_contact_phone ? ' | ' : ''}
                                            {order.shipping_contact_phone}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {order.tracking_number && (
                                            <span className="text-[9px] bg-white px-1.5 py-0 rounded border border-blue-200 text-blue-600 font-medium">
                                                Tracker: {order.tracking_number}
                                            </span>
                                        )}
                                        {order.shipping_notes && (
                                            <span className="text-[9px] bg-white px-1.5 py-0 rounded border border-blue-200 text-blue-600 font-medium">
                                                Note: {order.shipping_notes}
                                            </span>
                                        )}
                                        {order.proof_of_delivery && (
                                            <a 
                                                href={order.proof_of_delivery} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-blue-650 hover:bg-blue-50 transition shadow-sm min-h-[44px] sm:min-h-[28px] mt-1"
                                            >
                                                <PackageCheck size={12} /> {buyerProofLabel(order)}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Courier tracking card */}
                        {order.delivery && (
                            <CourierTrackingCard 
                                order={order}
                                isExpanded={isCourierTrackingExpanded}
                                onToggle={toggleCourierTrackingExpansion}
                            />
                        )}
                    </>
                    )}
                </div>

                {issueSummary && (
                    <div className={`rounded-xl border px-3 py-2.5 ${issueSummary.tone}`}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <issueSummary.icon size={13} className="shrink-0 text-current" />
                                    <p className="text-[12px] font-bold text-stone-900">{issueSummary.title}</p>
                                </div>
                                <p className="mt-1 text-[10px] leading-snug text-stone-600">{issueSummary.detail}</p>
                            </div>
                            {issueSummary.timestampValue && (
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold ${issueSummary.badgeTone}`}>
                                    {issueSummary.timestampLabel}: {issueSummary.timestampValue}
                                </span>
                            )}
                        </div>

                        {issueSummary.infoValue && (
                            <div className="mt-2 rounded-lg border border-white/80 bg-white/75 px-2.5 py-2 text-[10px] text-stone-700 whitespace-pre-wrap leading-snug">
                                <span className="font-bold">{issueSummary.infoLabel}: </span>{issueSummary.infoValue}
                            </div>
                        )}

                        {issueSummary.proofHref && (
                            <a
                                href={issueSummary.proofHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/80 px-2 py-1 text-[9px] font-bold text-stone-700 hover:bg-white"
                            >
                                <PackageCheck size={10} /> {issueSummary.proofLabel}
                            </a>
                        )}

                        {issueSummary.proofPhotos?.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {issueSummary.proofPhotos.map((photo, i) => (
                                    <a
                                        key={i}
                                        href={photo}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-12 w-12 rounded-lg border border-white/80 overflow-hidden shadow-sm hover:opacity-85 transition-opacity"
                                    >
                                        <img src={photo} alt={`Proof ${i + 1}`} className="h-full w-full object-cover" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {order.items.length > 0 && (
                    <div className="overflow-hidden rounded-lg border border-stone-100 bg-[#FCFAF7]">
                        <div className="divide-y divide-stone-100/70">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex items-start sm:items-center gap-4 p-4 transition-colors hover:bg-white w-full min-w-0">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-lg border border-stone-200 overflow-hidden shrink-0 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
                                        <img 
                                            src={item.img} 
                                            alt={item.name} 
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.target.src = '/images/placeholder.svg'; }}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-stone-900 text-[14px] line-clamp-2 sm:truncate">{item.name}</h4>
                                            <div className="mt-1 flex items-center gap-3 text-[12px] text-stone-500">
                                                <span>Var: {item.variant}</span>
                                                <span className="h-1 w-1 rounded-full bg-stone-300"></span>
                                                <span>Qty: {item.qty}</span>
                                            </div>
                                            <div className="mt-1.5 sm:hidden">
                                                <p className="font-black tracking-tight text-stone-900 text-[14px]">PHP {Number(item.price).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="hidden sm:block shrink-0 text-right">
                                            <p className="font-black tracking-tight text-stone-900 text-[16px]">PHP {Number(item.price).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Warranty Info (if applicable) */}
            {(order.status === 'Completed' && order.can_return) && (
                <div className="px-4 sm:px-6 pb-4">
                    <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 animate-pulse w-full sm:w-auto">
                        <AlertTriangle size={14} className="text-amber-600" />
                        <span className="text-xs font-medium text-amber-700">
                            Return expires: <span className="font-bold">{order.warranty_expires_at}</span>
                        </span>
                    </div>
                </div>
            )}

            {/* Order Footer & Actions */}
            <div className="flex flex-col gap-4 border-t border-stone-100 bg-[#FDFBF9] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="w-full sm:w-auto">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-1.5">Order Breakdown</p>
                    <div className="divide-y divide-stone-200/60 sm:divide-y-0 text-[12px] text-stone-500 sm:space-y-1">
                        <div className="flex items-center justify-between gap-4 py-2 sm:py-0 sm:justify-start">
                            <span className="min-w-[120px]">Subtotal</span>
                            <span className="shrink-0 whitespace-nowrap text-right font-bold text-stone-800">PHP {order.merchandise_subtotal}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-2 sm:py-0 sm:justify-start">
                            <span className="min-w-[120px]">Fee (3%)</span>
                            <span className="shrink-0 whitespace-nowrap text-right font-bold text-[#c8764b]">PHP {order.convenience_fee_amount}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-2 sm:py-0 sm:justify-start">
                            <span className="min-w-[120px]">Shipping Fee</span>
                            <span className="shrink-0 whitespace-nowrap text-right font-bold text-stone-800">
                                {order.shipping_method === 'Pick Up'
                                    ? 'Free'
                                    : `PHP ${order.shipping_fee_amount}`}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-2.5 pt-3 sm:py-0 sm:pt-1.5 sm:justify-start border-t border-stone-200/60 sm:border-t-0">
                            <span className="min-w-[120px] font-bold text-stone-900 text-[13px]">Total</span>
                            <span className="shrink-0 whitespace-nowrap text-right text-[15px] font-black tracking-tight text-[#c8764b]">PHP {order.total}</span>
                        </div>
                    </div>
                </div>

                {/* --- DESKTOP FOOTER ACTIONS (Strictly Preserved) --- */}
                <div className="hidden sm:flex flex-row items-center gap-2 flex-wrap justify-end overflow-visible">
                    {/* Download Receipt */}
                    <a 
                        href={`/my-orders/${order.id}/receipt`}
                        target="_blank"
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-4 text-[12px] font-bold text-stone-600 shadow-sm transition hover:border-stone-305 hover:bg-stone-50 min-h-[38px] cursor-pointer"
                    >
                        <Printer size={15} /> Receipt
                    </a>

                    {/* Contact Seller */}
                    {order.status !== 'Completed' && (
                        <button 
                            onClick={() => onContactSeller(order.seller_id)}
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-4 border border-stone-200 bg-white rounded-lg text-[12px] font-bold text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition shadow-sm min-h-[38px]"
                        >
                            <MessageCircle size={15} /> Chat
                        </button>
                    )}

                    {/* PENDING/ACCEPTED: Pay Now */}
                    {['Pending', 'Accepted'].includes(order.status) && order.payment_status === 'pending' && order.payment_method !== 'COD' && (
                        <a 
                            href={route('payment.pay', order.order_number)}
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-5 bg-blue-600 text-white rounded-lg text-[12px] font-bold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all hover:-translate-y-0.5 min-h-[38px]"
                        >
                            <CreditCard size={15} /> Pay Now
                        </a>
                    )}

                    {/* PENDING: Cancel */}
                    {order.can_cancel && (
                        <button 
                            onClick={() => onOpenModal('cancel', order.id)}
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-4 border border-red-200 bg-red-50 rounded-lg text-[12px] font-bold text-red-655 hover:bg-red-100 transition min-h-[38px]"
                        >
                            <XCircle size={15} /> Cancel
                        </button>
                    )}

                    {/* DELIVERED: Confirm Receipt */}
                    {(order.status === 'Delivered' && !order.received_at) && (
                        <button 
                            onClick={() => onOpenModal('receive', order.id)}
                            className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-5 rounded-lg text-[12px] font-bold shadow-md transition-all hover:-translate-y-0.5 min-h-[38px] ${
                                order.shipping_method === 'Pick Up'
                                ? 'bg-orange-650 text-white hover:bg-orange-700 shadow-orange-200'
                                : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                            }`}
                        >
                            {order.shipping_method === 'Pick Up' ? <PackageCheck size={16} /> : <CheckCircle size={16} />}
                            {order.shipping_method === 'Pick Up' ? 'Confirm Pick Up' : 'Order Received'}
                        </button>
                    )}

                    {/* COMPLETED: Rate & Return */}
                    {order.status === 'Completed' && (
                        <>
                            <button 
                                onClick={() => onBuyAgain(order.id)}
                                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-4 border border-clay-200 bg-clay-50 text-clay-700 rounded-lg text-[12px] font-bold hover:bg-clay-100 transition shadow-sm min-h-[38px]"
                            >
                                <ShoppingBag size={15} /> Buy Again
                            </button>

                            {(!order.replacement_in_progress && (
                                order.items.some(item => !item.is_rated) ||
                                order.items.some(item => item.review?.can_manage_review)
                            )) && (
                                <button 
                                    onClick={() => onOpenRatingModal(order)}
                                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-5 bg-clay-600 text-white rounded-lg text-[12px] font-bold hover:bg-clay-700 shadow-md shadow-clay-200 transition-all hover:-translate-y-0.5 min-h-[38px]"
                                >
                                    <Star size={15} /> {order.items.some(item => item.review?.can_manage_review) ? 'Manage Reviews' : 'Rate'}
                                </button>
                            )}

                            {order.can_return && (
                                <button 
                                    onClick={() => onOpenReturnModal(order)}
                                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-4 border border-orange-200 bg-orange-50 rounded-lg text-[12px] font-bold text-orange-655 hover:bg-orange-100 transition min-h-[38px]"
                                >
                                    <RotateCcw size={15} /> Return
                                </button>
                            )}
                        </>
                    )}
                    
                    {/* REFUND/RETURN */}
                    {order.status === 'Refund/Return' && (
                        <>
                            {order.dispute?.status === 'seller_proposed_replacement' && (
                                <button 
                                    onClick={() => router.post(route('disputes.react', order.dispute.id), { action: 'accept_replacement' })}
                                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-5 bg-teal-600 text-white rounded-lg text-[12px] font-bold hover:bg-teal-700 shadow-md shadow-teal-200 transition-all hover:-translate-y-0.5 min-h-[38px] animate-pulse"
                                >
                                    <CheckCircle size={15} /> Accept Replacement
                                </button>
                            )}
                            
                            {['seller_proposed_replacement', 'seller_rejected'].includes(order.dispute?.status) && (
                                <button 
                                    onClick={() => onOpenEscalateModal(order.dispute.id)}
                                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-4 border border-amber-200 bg-amber-50 text-amber-700 rounded-lg text-[12px] font-bold hover:bg-amber-100 transition shadow-sm min-h-[38px] animate-pulse"
                                >
                                    <AlertTriangle size={15} /> Escalate to Admin
                                </button>
                            )}

                            <button 
                                onClick={() => onOpenModal('cancelReturn', order.id)}
                                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-4 border border-red-200 bg-red-50 text-red-655 rounded-lg text-[12px] font-bold hover:bg-red-100 transition shadow-sm min-h-[38px]"
                            >
                                <XCircle size={15} /> Cancel Return
                            </button>
                            <button 
                                onClick={() => onContactSeller(order.seller_id)}
                                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-5 bg-orange-500 text-white rounded-lg text-[12px] font-bold hover:bg-orange-600 shadow-md shadow-orange-200 transition-all hover:-translate-y-0.5 min-h-[38px]"
                            >
                                <MessageCircle size={15} /> Negotiate Return
                            </button>
                        </>
                    )}
                </div>

                {/* --- MOBILE FOOTER ACTIONS WITH DROPDOWN (Sticky Bottom Bar Pattern on Mobile) --- */}
                <div className="sticky bottom-0 sm:relative bg-white z-10 border-t border-stone-100 sm:border-t-0 py-2.5 px-4 sm:p-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] sm:shadow-none flex sm:hidden w-full flex-row items-center gap-2 justify-end">
                    {/* Primary Actions Promoted directly on Mobile */}
                    {/* 1. Pay Now */}
                    {['Pending', 'Accepted'].includes(order.status) && order.payment_status === 'pending' && order.payment_method !== 'COD' && (
                        <a 
                            href={route('payment.pay', order.order_number)}
                            className="flex-1 inline-flex h-11 items-center justify-center gap-1.5 px-5 bg-blue-600 text-white rounded-lg text-[12px] font-bold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all active:scale-95 min-h-[44px]"
                        >
                            <CreditCard size={15} /> Pay Now
                        </a>
                    )}

                    {/* 2. Confirm Receipt / Pick Up */}
                    {(order.status === 'Delivered' && !order.received_at) && (
                        <button 
                            onClick={() => onOpenModal('receive', order.id)}
                            className={`flex-1 inline-flex h-11 items-center justify-center gap-1.5 px-5 rounded-lg text-[12px] font-bold shadow-md transition-all active:scale-95 min-h-[44px] ${
                                order.shipping_method === 'Pick Up'
                                ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-200'
                                : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                            }`}
                        >
                            {order.shipping_method === 'Pick Up' ? <PackageCheck size={16} /> : <CheckCircle size={16} />}
                            {order.shipping_method === 'Pick Up' ? 'Confirm Pick Up' : 'Order Received'}
                        </button>
                    )}

                    {/* 3. Rate / Manage Reviews */}
                    {(order.status === 'Completed' && !order.replacement_in_progress && (
                        order.items.some(item => !item.is_rated) ||
                        order.items.some(item => item.review?.can_manage_review)
                    )) && (
                        <button 
                            onClick={() => onOpenRatingModal(order)}
                            className="flex-1 inline-flex h-11 items-center justify-center gap-1.5 px-5 bg-clay-600 text-white rounded-lg text-[12px] font-bold hover:bg-clay-700 shadow-md shadow-clay-200 transition-all active:scale-95 min-h-[44px]"
                        >
                            <Star size={15} /> {order.items.some(item => item.review?.can_manage_review) ? 'Manage Reviews' : 'Rate'}
                        </button>
                    )}

                    {/* 4. Accept Replacement */}
                    {(order.status === 'Refund/Return' && order.dispute?.status === 'seller_proposed_replacement') && (
                        <button 
                            onClick={() => router.post(route('disputes.react', order.dispute.id), { action: 'accept_replacement' })}
                            className="flex-1 inline-flex h-11 items-center justify-center gap-1.5 px-5 bg-teal-600 text-white rounded-lg text-[12px] font-bold hover:bg-teal-700 shadow-md shadow-teal-200 transition-all active:scale-95 min-h-[44px] animate-pulse"
                        >
                            <CheckCircle size={15} /> Accept Replacement
                        </button>
                    )}

                    {/* 5. Negotiate Return */}
                    {(order.status === 'Refund/Return') && (
                        <button 
                            onClick={() => onContactSeller(order.seller_id)}
                            className="flex-1 inline-flex h-11 items-center justify-center gap-1.5 px-5 bg-orange-500 text-white rounded-lg text-[12px] font-bold hover:bg-orange-600 shadow-md shadow-orange-200 transition-all active:scale-95 min-h-[44px]"
                        >
                            <MessageCircle size={15} /> Negotiate Return
                        </button>
                    )}

                    {/* Promoted Secondary Actions when no direct primary action is available */}
                    {/* Promoting Chat */}
                    {(!(['Pending', 'Accepted'].includes(order.status) && order.payment_status === 'pending' && order.payment_method !== 'COD') &&
                     !(order.status === 'Delivered' && !order.received_at) &&
                     !(order.status === 'Completed' && !order.replacement_in_progress && (order.items.some(item => !item.is_rated) || order.items.some(item => item.review?.can_manage_review))) &&
                     !(order.status === 'Refund/Return') &&
                     order.status !== 'Completed') && (
                        <button 
                            onClick={() => onContactSeller(order.seller_id)}
                            className="flex-1 inline-flex h-11 items-center justify-center gap-1.5 px-4 border border-stone-200 bg-white rounded-lg text-[12px] font-bold text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition shadow-sm active:scale-95 min-h-[44px]"
                        >
                            <MessageCircle size={15} /> Chat
                        </button>
                    )}

                    {/* Promoting Buy Again */}
                    {(order.status === 'Completed' && 
                      !(order.status === 'Completed' && !order.replacement_in_progress && (order.items.some(item => !item.is_rated) || order.items.some(item => item.review?.can_manage_review)))) && (
                        <button 
                            onClick={() => onBuyAgain(order.id)}
                            className="flex-1 inline-flex h-11 items-center justify-center gap-1.5 px-4 border border-clay-200 bg-clay-50 text-clay-700 rounded-lg text-[12px] font-bold hover:bg-clay-100 transition shadow-sm active:scale-95 min-h-[44px]"
                        >
                            <ShoppingBag size={15} /> Buy Again
                        </button>
                    )}

                    {/* Secondary Dropdown Actions */}
                    {(() => {
                        const isChatPromoted = !(['Pending', 'Accepted'].includes(order.status) && order.payment_status === 'pending' && order.payment_method !== 'COD') &&
                             !(order.status === 'Delivered' && !order.received_at) &&
                             !(order.status === 'Completed' && !order.replacement_in_progress && (order.items.some(item => !item.is_rated) || order.items.some(item => item.review?.can_manage_review))) &&
                             !(order.status === 'Refund/Return') &&
                             order.status !== 'Completed';

                        const isBuyAgainPromoted = order.status === 'Completed' && 
                             !(order.status === 'Completed' && !order.replacement_in_progress && (order.items.some(item => !item.is_rated) || order.items.some(item => item.review?.can_manage_review)));

                        const finalMobileSecondaryActions = getMobileSecondaryActions().filter(act => {
                            if (isChatPromoted && act.label === 'Chat') return false;
                            if (isBuyAgainPromoted && act.label === 'Buy Again') return false;
                            return true;
                        });

                        if (finalMobileSecondaryActions.length === 0) return null;

                        if (finalMobileSecondaryActions.length === 1) {
                            const act = finalMobileSecondaryActions[0];
                            const Icon = act.icon;
                            if (act.type === 'link') {
                                return (
                                    <a
                                        href={act.href}
                                        target="_blank"
                                        className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-4 text-[12px] font-bold text-stone-600 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 active:scale-95 min-h-[44px]"
                                    >
                                        <Icon size={15} /> {act.label}
                                    </a>
                                );
                            }
                            return (
                                <button
                                    type="button"
                                    onClick={act.onClick}
                                    className={`inline-flex h-11 shrink-0 items-center justify-center gap-1.5 px-4 border rounded-lg text-[12px] font-bold shadow-sm transition active:scale-95 min-h-[44px] ${
                                        act.danger
                                            ? 'border-red-200 bg-red-50 text-red-655 hover:bg-red-100'
                                            : act.warning
                                                ? 'border-amber-200 bg-amber-50 text-amber-750 hover:bg-amber-100'
                                                : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:border-stone-300'
                                    }`}
                                >
                                    <Icon size={15} /> {act.label}
                                </button>
                            );
                        }

                        return (
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button 
                                        type="button" 
                                        className="flex h-11 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-stone-500 hover:bg-stone-50 transition shadow-sm min-w-[44px] active:scale-95"
                                    >
                                        <EllipsisVertical size={16} />
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content align="top-right" width="48" contentClasses="py-1 bg-white">
                                    {finalMobileSecondaryActions.map((act, i) => {
                                        const Icon = act.icon;
                                        if (act.type === 'link') {
                                            return (
                                                <a
                                                    key={i}
                                                    href={act.href}
                                                    target="_blank"
                                                    className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-[13px] font-bold text-stone-700 hover:bg-stone-50 transition-colors"
                                                >
                                                    <Icon size={14} className="text-stone-400" />
                                                    {act.label}
                                                </a>
                                            );
                                        }
                                        return (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={act.onClick}
                                                className={`flex items-center gap-2 w-full px-4 py-2.5 text-left text-[13px] font-bold transition-colors ${
                                                    act.danger 
                                                        ? 'text-red-655 hover:bg-red-50' 
                                                        : act.warning 
                                                            ? 'text-amber-700 hover:bg-amber-50' 
                                                            : 'text-stone-700 hover:bg-stone-50'
                                                }`}
                                            >
                                                <Icon size={14} className={act.danger ? 'text-red-400' : act.warning ? 'text-amber-400' : 'text-stone-400'} />
                                                {act.label}
                                            </button>
                                        );
                                    })}
                                </Dropdown.Content>
                            </Dropdown>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}

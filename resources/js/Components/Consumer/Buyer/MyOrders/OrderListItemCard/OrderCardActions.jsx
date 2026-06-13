import React from 'react';
import { router } from '@inertiajs/react';
import { 
    Printer, MessageCircle, CreditCard, XCircle, PackageCheck, 
    CheckCircle, ShoppingBag, Star, RotateCcw, AlertTriangle, EllipsisVertical 
} from 'lucide-react';
import Dropdown from '@/Components/Dropdown';

export default function OrderCardActions({
    order,
    onContactSeller,
    onBuyAgain,
    onOpenModal,
    onOpenReturnModal,
    onOpenEscalateModal,
    onOpenRatingModal,
}) {
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

    return (
        <div className="flex flex-col gap-4 border-t border-stone-100 bg-[#FDFBF9] px-4 py-3 sm:flex-row sm:items-center sm:justify-between w-full">
            {/* Total Pricing / Breakdown summary */}
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
                    rel="noreferrer"
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-4 text-[12px] font-bold text-stone-600 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 min-h-[38px] cursor-pointer"
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
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-4 border border-red-200 bg-red-50 rounded-lg text-[12px] font-bold text-red-600 hover:bg-red-100 transition min-h-[38px]"
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
                            ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-200'
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
                                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-4 border border-orange-200 bg-orange-50 rounded-lg text-[12px] font-bold text-orange-600 hover:bg-orange-100 transition min-h-[38px]"
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
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-4 border border-red-200 bg-red-50 text-red-600 rounded-lg text-[12px] font-bold hover:bg-red-100 transition shadow-sm min-h-[38px]"
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
                                    rel="noreferrer"
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
                                        ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                                        : act.warning
                                            ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
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
                                                rel="noreferrer"
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
                                                    ? 'text-red-600 hover:bg-red-50' 
                                                    : act.warning 
                                                        ? 'text-amber-700 hover:bg-amber-50' 
                                                        : 'text-stone-700 hover:bg-stone-50'
                                            }`}
                                        >
                                            <Icon size={14} className={act.danger ? 'text-red-500' : act.warning ? 'text-amber-500' : 'text-stone-400'} />
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
    );
}

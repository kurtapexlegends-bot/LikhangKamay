import React, { useState } from 'react';
import axios from 'axios';
import {
    Receipt,
    Clock,
    CheckCircle2,
    ShieldCheck,
    CreditCard,
    AlertCircle,
    XCircle,
    ArrowRight,
    Loader2,
} from 'lucide-react';

const STATUS_CONFIGS = {
    awaiting_deposit: {
        label: 'Awaiting Downpayment',
        badge: 'bg-amber-50 text-amber-800 border-amber-200/80',
        icon: Clock,
        step: 1,
    },
    in_progress: {
        label: 'Deposit Paid • In Crafting',
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
        icon: CheckCircle2,
        step: 2,
    },
    ready_for_balance: {
        label: 'Craft Complete • Balance Due',
        badge: 'bg-blue-50 text-blue-800 border-blue-200/80',
        icon: Clock,
        step: 3,
    },
    completed: {
        label: 'Completed & Paid in Full',
        badge: 'bg-teal-50 text-teal-800 border-teal-200/80',
        icon: ShieldCheck,
        step: 4,
    },
    cancelled: {
        label: 'Commission Cancelled',
        badge: 'bg-stone-100 text-stone-600 border-stone-200',
        icon: XCircle,
        step: 0,
    },
};

const formatPeso = (val) =>
    '₱' + (parseFloat(val) || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

export default function CommissionMilestoneCard({ msg, viewer = 'buyer' }) {
    const initialCommission = msg?.commission;
    const [commission, setCommission] = useState(initialCommission);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [actionError, setActionError] = useState(null);

    if (!commission) {
        return null;
    }

    const config = STATUS_CONFIGS[commission.status] || STATUS_CONFIGS.awaiting_deposit;
    const StatusIcon = config.icon;
    const isBuyer = viewer === 'buyer';
    const isSeller = viewer === 'seller';

    // Buyer action: Pay Deposit
    const handlePayDeposit = async () => {
        setIsActionLoading(true);
        setActionError(null);
        try {
            const res = await axios.post(
                route('chat.commissions.checkout-deposit', commission.id)
            );

            if (res.data?.checkout_url) {
                window.location.href = res.data.checkout_url;
            } else if (res.data?.paid || res.data?.success) {
                setCommission((prev) => ({
                    ...prev,
                    status: 'in_progress',
                    deposit_paid_at: 'Just now',
                }));
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('app-toast', {
                        detail: { type: 'success', message: 'Initial downpayment verified successfully.' },
                    }));
                }
            }
        } catch (err) {
            setActionError(err.response?.data?.error || 'Payment initialization failed. Please try again.');
        } finally {
            setIsActionLoading(false);
        }
    };

    // Seller action: Mark Craft Complete
    const handleMarkComplete = async () => {
        setIsActionLoading(true);
        setActionError(null);
        try {
            const res = await axios.post(
                route('chat.commissions.mark-ready', commission.id)
            );
            if (res.data?.success) {
                setCommission((prev) => ({
                    ...prev,
                    status: 'ready_for_balance',
                }));
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('app-toast', {
                        detail: { type: 'success', message: 'Notified customer that craft is complete and final balance is due.' },
                    }));
                }
            }
        } catch (err) {
            setActionError(err.response?.data?.message || 'Failed to update commission status.');
        } finally {
            setIsActionLoading(false);
        }
    };

    // Buyer action: Pay Final Balance
    const handlePayBalance = async () => {
        setIsActionLoading(true);
        setActionError(null);
        try {
            const res = await axios.post(
                route('chat.commissions.checkout-balance', commission.id)
            );

            if (res.data?.checkout_url) {
                window.location.href = res.data.checkout_url;
            } else if (res.data?.paid || res.data?.success) {
                setCommission((prev) => ({
                    ...prev,
                    status: 'completed',
                    balance_paid_at: 'Just now',
                }));
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('app-toast', {
                        detail: { type: 'success', message: 'Final balance verified! Order generated for fulfillment.' },
                    }));
                }
            }
        } catch (err) {
            setActionError(err.response?.data?.error || 'Balance payment failed. Please try again.');
        } finally {
            setIsActionLoading(false);
        }
    };

    // Cancel action
    const handleCancel = async () => {
        if (!window.confirm('Are you sure you want to cancel this commission request?')) return;
        setIsActionLoading(true);
        try {
            const res = await axios.post(route('chat.commissions.cancel', commission.id));
            if (res.data?.success) {
                setCommission((prev) => ({ ...prev, status: 'cancelled' }));
            }
        } catch (err) {
            setActionError('Failed to cancel commission.');
        } finally {
            setIsActionLoading(false);
        }
    };

    return (
        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-sm text-stone-900 w-full max-w-md my-1 font-sans">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-clay-50 border border-clay-200/60 flex items-center justify-center text-clay-700 shrink-0">
                        <Receipt size={17} />
                    </div>
                    <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block font-mono">
                            {commission.commission_number}
                        </span>
                        <h4 className="font-bold text-sm text-stone-900 truncate">
                            {commission.title}
                        </h4>
                    </div>
                </div>

                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold shrink-0 ${config.badge}`}>
                    <StatusIcon size={12} />
                    <span>{config.label}</span>
                </div>
            </div>

            {/* Description */}
            {commission.description && (
                <p className="text-xs text-stone-600 mt-2.5 leading-relaxed line-clamp-2">
                    {commission.description}
                </p>
            )}

            {/* Total Summary */}
            <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200/60">
                <span className="text-xs font-semibold text-stone-500">Agreed Total Price</span>
                <span className="text-sm font-extrabold text-stone-900">{formatPeso(commission.total_amount)}</span>
            </div>

            {/* 2-Phase Milestone Schedule */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {/* Phase 1 */}
                <div className={`p-2.5 rounded-xl border transition ${
                    commission.status === 'awaiting_deposit'
                        ? 'border-amber-300 bg-amber-50/40'
                        : commission.deposit_paid_at
                            ? 'border-emerald-200 bg-emerald-50/30'
                            : 'border-stone-200 bg-stone-50/50'
                }`}>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-stone-400">
                        <span>Phase 1 • Deposit</span>
                        {commission.deposit_percentage && <span>{commission.deposit_percentage}%</span>}
                    </div>
                    <p className="mt-1 font-bold text-sm text-stone-900">
                        {formatPeso(commission.deposit_amount)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-stone-500">
                        {commission.deposit_paid_at ? `Paid: ${commission.deposit_paid_at}` : 'Required to begin'}
                    </p>
                </div>

                {/* Phase 2 */}
                <div className={`p-2.5 rounded-xl border transition ${
                    commission.status === 'ready_for_balance'
                        ? 'border-blue-300 bg-blue-50/40'
                        : commission.balance_paid_at
                            ? 'border-emerald-200 bg-emerald-50/30'
                            : 'border-stone-200 bg-stone-50/50'
                }`}>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-stone-400">
                        <span>Phase 2 • Balance</span>
                    </div>
                    <p className="mt-1 font-bold text-sm text-stone-900">
                        {formatPeso(commission.balance_amount)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-stone-500">
                        {commission.balance_paid_at ? `Paid: ${commission.balance_paid_at}` : 'Due upon completion'}
                    </p>
                </div>
            </div>

            {actionError && (
                <div className="mt-2.5 flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                    <AlertCircle size={13} className="shrink-0" />
                    <span>{actionError}</span>
                </div>
            )}

            {/* Context Actions */}
            <div className="mt-3.5 pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
                {/* Buyer: Pay Initial Downpayment */}
                {isBuyer && commission.status === 'awaiting_deposit' && (
                    <button
                        type="button"
                        onClick={handlePayDeposit}
                        disabled={isActionLoading}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50 min-h-[44px]"
                    >
                        {isActionLoading ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <>
                                <CreditCard size={14} />
                                <span>Pay Downpayment ({formatPeso(commission.deposit_amount)})</span>
                            </>
                        )}
                    </button>
                )}

                {/* Seller: Mark Craft Complete */}
                {isSeller && commission.status === 'in_progress' && (
                    <button
                        type="button"
                        onClick={handleMarkComplete}
                        disabled={isActionLoading}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50 min-h-[44px]"
                    >
                        {isActionLoading ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <>
                                <CheckCircle2 size={14} />
                                <span>Mark Craft Complete & Request Balance</span>
                            </>
                        )}
                    </button>
                )}

                {/* Buyer: Pay Final Balance */}
                {isBuyer && commission.status === 'ready_for_balance' && (
                    <button
                        type="button"
                        onClick={handlePayBalance}
                        disabled={isActionLoading}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50 min-h-[44px]"
                    >
                        {isActionLoading ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <>
                                <CreditCard size={14} />
                                <span>Pay Final Balance ({formatPeso(commission.balance_amount)})</span>
                            </>
                        )}
                    </button>
                )}

                {/* Completed state summary */}
                {commission.status === 'completed' && (
                    <div className="w-full text-center py-1 text-xs text-teal-700 font-bold flex items-center justify-center gap-1.5">
                        <ShieldCheck size={15} />
                        <span>Commission paid in full • Cleared for delivery</span>
                    </div>
                )}

                {/* Seller awaiting downpayment: show status & cancel */}
                {isSeller && commission.status === 'awaiting_deposit' && (
                    <div className="w-full flex items-center justify-between">
                        <span className="text-xs text-stone-500 font-medium">Awaiting buyer payment</span>
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isActionLoading}
                            className="text-xs text-stone-400 hover:text-stone-700 font-medium underline"
                        >
                            Cancel Request
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

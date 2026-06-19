import React from 'react';
import { CheckCircle2, Clock3, X, XCircle, ChevronRight } from 'lucide-react';

const formatTransactionStamp = (value) => value
    ? new Date(value).toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
    : null;

const transactionTone = (status) => {
    if (status === 'paid') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (status === 'failed') return 'border-red-200 bg-red-50 text-red-700';
    if (status === 'cancelled') return 'border-stone-200 bg-stone-100 text-stone-600';
    return 'border-amber-200 bg-amber-50 text-amber-700';
};

const transactionLabel = (status) => {
    if (status === 'paid') return 'Paid';
    if (status === 'failed') return 'Failed';
    if (status === 'cancelled') return 'Cancelled';
    return 'Pending';
};

const transactionIcon = (status) => {
    if (status === 'paid') return CheckCircle2;
    if (status === 'failed') return XCircle;
    if (status === 'cancelled') return X;
    return Clock3;
};

export default function BillingActivity({ recentTransactions = [] }) {
    return (
        <section className="mx-auto max-w-[1020px] rounded-[1.5rem] border border-stone-200 bg-white px-5 py-4 shadow-[0_18px_42px_-40px_rgba(15,23,42,0.28)] sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-[15px] font-black tracking-tight text-stone-900">Recent Billing Activity</h3>
                    <p className="mt-1 text-[12px] text-stone-500">Review your latest subscription payment attempts and plan changes.</p>
                </div>
                <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">
                    {recentTransactions.length} recent {recentTransactions.length === 1 ? 'entry' : 'entries'}
                </span>
            </div>

            <div className="mt-4 space-y-2.5">
                {recentTransactions.length > 0 ? recentTransactions.map((transaction) => {
                    const StatusIcon = transactionIcon(transaction.status);
                    const primaryStamp = transaction.paidAt || transaction.cancelledAt || transaction.updatedAt || transaction.createdAt;
                    const canContinuePayment = transaction.status === 'pending' && !!transaction.checkoutUrl;

                    return (
                        <div key={transaction.id} className="rounded-[1.1rem] border border-stone-200 bg-stone-50/60 px-4 py-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-[13px] font-bold text-stone-900">
                                            {transaction.fromPlanLabel} to {transaction.toPlanLabel}
                                        </p>
                                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${transactionTone(transaction.status)}`}>
                                            <StatusIcon className="h-3.5 w-3.5" />
                                            {transactionLabel(transaction.status)}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-[11px] text-stone-500">
                                        Ref {transaction.referenceNumber} • {new Intl.NumberFormat('en-PH', { style: 'currency', currency: transaction.currency || 'PHP', minimumFractionDigits: 2 }).format(Number(transaction.amount || 0))}
                                    </p>
                                    {(transaction.error || transaction.result || transaction.paymentStatus || transaction.sessionStatus) && (
                                        <p className="mt-1 text-[11px] leading-5 text-stone-600">
                                            {transaction.error
                                                ? transaction.error
                                                : transaction.result
                                                    ? `Result: ${String(transaction.result).replace(/_/g, ' ')}`
                                                    : `Payment: ${transaction.paymentStatus || 'pending'} • Session: ${transaction.sessionStatus || 'pending'}`}
                                        </p>
                                    )}
                                    {primaryStamp && (
                                        <p className="mt-1 text-[10px] font-medium text-stone-400">
                                            {transaction.status === 'paid'
                                                ? `Verified ${formatTransactionStamp(primaryStamp)}`
                                                : transaction.status === 'cancelled'
                                                    ? `Cancelled ${formatTransactionStamp(primaryStamp)}`
                                                    : transaction.status === 'failed'
                                                        ? `Failed ${formatTransactionStamp(primaryStamp)}`
                                                        : `Started ${formatTransactionStamp(primaryStamp)}`}
                                        </p>
                                    )}
                                </div>

                                {canContinuePayment && (
                                    <button
                                        type="button"
                                        onClick={() => window.location.assign(transaction.checkoutUrl)}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-2 text-[12px] font-bold text-white transition-all active:scale-95 hover:bg-orange-700"
                                    >
                                        Continue Payment
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                }) : (
                    <div className="rounded-[1.1rem] border border-dashed border-stone-200 bg-stone-50/40 px-4 py-5 text-center text-[12px] text-stone-500">
                        No recent billing activity yet.
                    </div>
                )}
            </div>
        </section>
    );
}

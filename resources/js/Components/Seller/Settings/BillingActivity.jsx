import React, { useState } from 'react';
import { CheckCircle2, Clock3, X, XCircle, ChevronRight, ChevronDown, ChevronUp, History } from 'lucide-react';

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

const INITIAL_VISIBLE_COUNT = 3;

export default function BillingActivity({ recentTransactions = [] }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showAll, setShowAll] = useState(false);

    const count = recentTransactions.length;
    const hasTransactions = count > 0;
    const visibleTransactions = showAll ? recentTransactions : recentTransactions.slice(0, INITIAL_VISIBLE_COUNT);
    const hasMore = count > INITIAL_VISIBLE_COUNT;

    return (
        <section className="mx-auto max-w-[1020px] rounded-[1.5rem] border border-stone-200 bg-white px-5 py-4 shadow-[0_18px_42px_-40px_rgba(15,23,42,0.28)] sm:px-6 transition-all duration-200">
            {/* Header: Clickable toggle */}
            <div
                className="flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                onClick={() => setIsCollapsed((prev) => !prev)}
                role="button"
                tabIndex={0}
                aria-expanded={!isCollapsed}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsCollapsed((prev) => !prev);
                    }
                }}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
                        <History size={16} />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-black tracking-tight text-stone-900">Recent Billing Activity</h3>
                        <p className="mt-0.5 text-[12px] text-stone-500">Review your subscription payment attempts and plan changes.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">
                        {count} {count === 1 ? 'entry' : 'entries'}
                    </span>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsCollapsed((prev) => !prev);
                        }}
                        aria-label={isCollapsed ? 'Expand recent billing activity' : 'Collapse recent billing activity'}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100 transition-colors"
                    >
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                    </button>
                </div>
            </div>

            {/* Collapsible Content */}
            {!isCollapsed && (
                <div className="mt-4 space-y-2.5">
                    {hasTransactions ? (
                        <>
                            <div className={`space-y-2.5 ${showAll && count > 5 ? 'max-h-[500px] overflow-y-auto pr-1 [scrollbar-gutter:stable]' : ''}`}>
                                {visibleTransactions.map((transaction) => {
                                    const StatusIcon = transactionIcon(transaction.status);
                                    const primaryStamp = transaction.paidAt || transaction.cancelledAt || transaction.updatedAt || transaction.createdAt;
                                    const canContinuePayment = transaction.status === 'pending' && !!transaction.checkoutUrl;

                                    return (
                                        <div key={transaction.id} className="rounded-[1.1rem] border border-stone-200 bg-stone-50/60 px-4 py-3 transition hover:bg-stone-50">
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
                                })}
                            </div>

                            {/* Show More / Show Less Toggle Button */}
                            {hasMore && (
                                <div className="pt-1 text-center">
                                    <button
                                        type="button"
                                        onClick={() => setShowAll((prev) => !prev)}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-[11px] font-bold text-stone-700 hover:bg-stone-100 transition"
                                    >
                                        {showAll ? (
                                            <>
                                                <ChevronUp className="h-3.5 w-3.5" />
                                                Show Less
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="h-3.5 w-3.5" />
                                                Show All ({count} entries)
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="rounded-[1.1rem] border border-dashed border-stone-200 bg-stone-50/40 px-4 py-5 text-center text-[12px] text-stone-500">
                            No recent billing activity yet.
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

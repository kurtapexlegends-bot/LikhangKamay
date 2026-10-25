import React from 'react';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, Clock3, Send, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';

const shortDateTime = (value) => value
    ? new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(value))
    : '-';

export default function PayrollHeroHeader({ payroll }) {
    const isDraft = payroll?.status === 'Draft';
    const isPaid = payroll?.status === 'Paid';
    const isPending = payroll?.status === 'Pending';
    const isDeclined = payroll?.status === 'Rejected' || payroll?.status === 'Declined';
    const [submitting, setSubmitting] = React.useState(false);

    const handleBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            window.history.back();
        } else {
            router.visit(route('hr.index', { tab: 'payroll' }));
        }
    };

    const handleSubmitForApproval = () => {
        if (!confirm('Submit this payroll run for owner accounting review?')) return;
        setSubmitting(true);
        router.post(route('hr.payroll.submit', payroll.id), {}, {
            preserveScroll: true,
            onFinish: () => setSubmitting(false),
        });
    };

    const statusBadge = () => {
        if (isPaid) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Disbursed
                </span>
            );
        }
        if (isPending) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Pending Approval
                </span>
            );
        }
        if (isDeclined) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    Declined
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                Draft
            </span>
        );
    };

    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2.5">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 transition cursor-pointer bg-stone-100 hover:bg-stone-200/80 px-2.5 py-1 rounded-lg"
                            title="Back to previous page"
                        >
                            <ArrowLeft size={13} />
                            Back
                        </button>
                        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-500">
                            <Link href={route('hr.index')} className="hover:text-stone-900 font-medium">People &amp; Payroll</Link>
                            <ChevronRight size={12} className="text-stone-300" />
                            <Link href={route('hr.index', { tab: 'payroll' })} className="hover:text-stone-900 font-medium">Payroll History</Link>
                            <ChevronRight size={12} className="text-stone-300" />
                            <span className="font-semibold text-stone-900 truncate max-w-[200px]">{payroll?.month || 'Payroll Run'}</span>
                        </nav>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
                            {payroll?.month || 'Payroll Run'}
                        </h1>
                        <span className="font-mono text-xs font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                            {payroll?.run_number || `Payroll #${payroll?.id}`}
                        </span>
                        {statusBadge()}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                        <span>{payroll?.employee_count || 0} Employees</span>
                        <span>&bull;</span>
                        <span className="inline-flex items-center gap-1">
                            <Clock3 size={12} className="text-stone-400" />
                            Created {shortDateTime(payroll?.created_at)}
                        </span>
                        {payroll?.submitted_at && (
                            <>
                                <span>&bull;</span>
                                <span>Submitted {shortDateTime(payroll?.submitted_at)}</span>
                            </>
                        )}
                        {payroll?.requester?.name && (
                            <>
                                <span>&bull;</span>
                                <span>By {payroll?.requester?.name}</span>
                            </>
                        )}
                    </div>
                </div>

                {isDraft && (
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={handleSubmitForApproval}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-clay-700 text-white text-xs font-bold hover:bg-clay-800 disabled:opacity-50 transition shadow-2xs cursor-pointer min-h-[44px]"
                    >
                        <Send size={14} />
                        {submitting ? 'Submitting...' : 'Submit for Approval'}
                    </button>
                )}
            </div>

            {payroll?.notes && (
                <div className="mt-3.5 pt-3.5 border-t border-stone-100 text-xs text-stone-600 leading-relaxed">
                    <span className="font-semibold text-stone-700">Note:</span> {payroll.notes}
                </div>
            )}

            {payroll?.rejection_reason && (
                <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold">Decline Reason:</span> {payroll.rejection_reason}
                    </div>
                </div>
            )}
        </div>
    );
}

import React, { useState } from 'react';
import { AlertCircle, X, ChevronRight, Clock, ShieldCheck, Calendar, ArrowRight } from 'lucide-react';
import Modal from '@/Components/Modal';

const formatPlanName = (plan) => {
    if (plan === 'free') return 'Standard';
    if (plan === 'premium') return 'Premium';
    if (plan === 'super_premium') return 'Elite';
    return plan;
};

export default function DowngradeModal({
    isOpen,
    onClose,
    currentPlan,
    targetPlan,
    activeProductsCount,
    limit,
    linkedStaffCount,
    confirmDowngrade,
    onScheduleRenewal,
    daysRemaining,
    formattedExpirationDate,
    isProcessing,
}) {
    const [showImmediateOptions, setShowImmediateOptions] = useState(false);
    const targetLimit = targetPlan?.limit ?? limit;
    const requiresAutomaticDrafting = activeProductsCount > targetLimit;
    const showsStandardDowngradeWarning = currentPlan === 'super_premium' && targetPlan?.value === 'free';
    const plannedDraftCount = targetPlan ? Math.max(0, activeProductsCount - targetPlan.limit) : 0;
    const hasActivePass = daysRemaining !== null && daysRemaining > 0;

    const handleClose = () => {
        setShowImmediateOptions(false);
        onClose();
    };

    return (
        <Modal show={isOpen} onClose={handleClose} maxWidth="lg">
            <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100/80 text-amber-700 border border-amber-200/60 shadow-2xs">
                            {hasActivePass && !showImmediateOptions ? (
                                <Calendar className="h-5 w-5" />
                            ) : (
                                <AlertCircle className="h-5 w-5" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-stone-900">
                                {hasActivePass && !showImmediateOptions
                                    ? `Switch to ${formatPlanName(targetPlan?.value)} on Next Renewal`
                                    : 'Confirm Plan Downgrade'}
                            </h2>
                            <p className="mt-0.5 text-xs text-stone-500">
                                {hasActivePass && !showImmediateOptions
                                    ? `Keep your active benefits now, switch automatically when your 30-day pass ends.`
                                    : `You are about to downgrade from ${formatPlanName(currentPlan)} to ${formatPlanName(targetPlan?.value)}.`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="rounded-xl p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {hasActivePass && !showImmediateOptions ? (
                    /* Scheduled Renewal View */
                    <div className="mt-4 space-y-3.5">
                        <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4 space-y-3">
                            <div className="flex items-center gap-2.5 text-xs font-bold text-stone-900">
                                <Clock size={15} className="text-amber-600 shrink-0" />
                                <span>Active Pass Retained ({daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining)</span>
                            </div>
                            <p className="text-xs text-stone-600 leading-relaxed">
                                You have <strong>{daysRemaining} days remaining</strong> on your prepaid <strong>{formatPlanName(currentPlan)}</strong> plan. All current limits, features, and staff accounts stay 100% active until <strong>{formattedExpirationDate || 'period end'}</strong>.
                            </p>
                            <div className="flex items-center gap-2 pt-1 border-t border-stone-200/60 text-xs font-semibold text-stone-700">
                                <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                                <span>On {formattedExpirationDate || 'period end'}, your shop will smoothly transition to {formatPlanName(targetPlan?.value)}.</span>
                            </div>
                        </div>

                        {requiresAutomaticDrafting && (
                            <div className="rounded-xl border border-amber-200/70 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-start gap-2">
                                <AlertCircle size={14} className="text-amber-700 shrink-0 mt-0.5" />
                                <span>When your pass expires, listings exceeding the {targetLimit}-product limit will be safely moved to Draft. Top-selling items will remain active.</span>
                            </div>
                        )}

                        <div className="text-[11.5px] text-stone-500 pt-1">
                            Want to apply the downgrade right now instead?{' '}
                            <button
                                type="button"
                                onClick={() => setShowImmediateOptions(true)}
                                className="font-semibold text-stone-800 underline hover:text-orange-600 transition"
                            >
                                Downgrade immediately
                            </button>
                        </div>

                        <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2.5 border-t border-stone-100 pt-4">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-stone-600 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 min-h-[38px]"
                            >
                                Keep Current Plan
                            </button>
                            <button
                                type="button"
                                onClick={() => onScheduleRenewal?.(targetPlan?.value)}
                                disabled={isProcessing}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-all shadow-sm min-h-[38px] disabled:opacity-50"
                            >
                                {isProcessing ? 'Scheduling...' : `Set ${formatPlanName(targetPlan?.value)} as Renewal Plan`}
                                {!isProcessing && <ArrowRight size={13} />}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Immediate Downgrade View */
                    <div className="mt-4 space-y-3">
                        <div className="space-y-2.5 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-xs">
                            <div className="flex items-start gap-2.5 text-stone-700">
                                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                                <p>Your shop will move to the <strong>{formatPlanName(targetPlan?.value)}</strong> plan immediately.</p>
                            </div>

                            {requiresAutomaticDrafting && (
                                <div className="flex items-start gap-2.5 text-stone-700">
                                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                                    <p>Exceeds the <strong>{targetLimit}</strong>-product limit. The system will keep your top-selling active listings.</p>
                                </div>
                            )}

                            {plannedDraftCount > 0 && (
                                <div className="flex items-start gap-2.5 text-stone-700">
                                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                                    <p><strong>{plannedDraftCount}</strong> active product{plannedDraftCount === 1 ? '' : 's'} will be moved to Draft automatically.</p>
                                </div>
                            )}

                            {showsStandardDowngradeWarning && (
                                <div className="flex items-start gap-2.5 text-stone-700">
                                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                                    <p>Elite-only features will be suspended, and <strong>{linkedStaffCount}</strong> linked employee workspace account{linkedStaffCount === 1 ? '' : 's'} will be paused.</p>
                                </div>
                            )}
                        </div>

                        {hasActivePass && (
                            <div className="text-[11.5px] text-stone-500 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowImmediateOptions(false)}
                                    className="font-semibold text-stone-800 underline hover:text-orange-600 transition"
                                >
                                    &larr; Switch back to scheduled renewal
                                </button>
                            </div>
                        )}

                        <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2.5 border-t border-stone-200 pt-4">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-stone-600 bg-white border border-stone-300 rounded-xl hover:bg-stone-50 min-h-[38px]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDowngrade}
                                disabled={isProcessing}
                                className={`w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-white rounded-xl transition-all min-h-[38px] ${
                                    isProcessing ? 'bg-stone-300 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
                                }`}
                            >
                                {isProcessing ? 'Processing...' : 'Yes, downgrade now'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

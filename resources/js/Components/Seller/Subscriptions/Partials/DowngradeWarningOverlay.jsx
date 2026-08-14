import React, { useState } from 'react';
import { AlertCircle, X, ChevronRight, Users, Clock, ShieldCheck, Calendar, ArrowRight } from 'lucide-react';
import { PLANS } from '@/utils/planConfig';
import { motion } from 'framer-motion';

export default function DowngradeWarningOverlay({
    pendingDowngrade,
    setPendingDowngrade,
    confirmDowngrade,
    onScheduleRenewal,
    daysRemaining,
    formattedExpirationDate,
    isDowngrading,
    currentTier,
    draftCount,
    showsEliteStandardWarning,
}) {
    const [showImmediateOptions, setShowImmediateOptions] = useState(false);
    const currentPlanName = PLANS.find((plan) => plan.id === currentTier)?.name ?? currentTier;
    const hasActivePass = daysRemaining !== null && daysRemaining > 0;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-[2px]"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
                className="w-full max-w-md rounded-[1.35rem] border border-stone-200 bg-white p-5 shadow-2xl"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100/80 text-amber-700 border border-amber-200/60 shadow-2xs">
                            {hasActivePass && !showImmediateOptions ? (
                                <Calendar size={17} />
                            ) : (
                                <AlertCircle size={17} />
                            )}
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-stone-900">
                                {hasActivePass && !showImmediateOptions
                                    ? `Switch to ${pendingDowngrade.name} on Renewal`
                                    : 'Confirm Plan Downgrade'}
                            </h3>
                            <p className="mt-0.5 text-xs text-stone-500">
                                {hasActivePass && !showImmediateOptions
                                    ? `Keep benefits active now, switch automatically when pass ends.`
                                    : `Moving from ${currentPlanName} to ${pendingDowngrade.name}.`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setPendingDowngrade(null)}
                        className="rounded-lg bg-stone-100 p-1.5 text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-600"
                    >
                        <X size={15} />
                    </button>
                </div>

                {hasActivePass && !showImmediateOptions ? (
                    <div className="mt-4 space-y-3">
                        <div className="rounded-xl border border-stone-200/80 bg-stone-50/80 p-3.5 space-y-2 text-xs">
                            <div className="flex items-center gap-2 font-bold text-stone-900">
                                <Clock size={14} className="text-amber-600 shrink-0" />
                                <span>Active Pass Retained ({daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining)</span>
                            </div>
                            <p className="text-stone-600 leading-relaxed text-[11.5px]">
                                Your <strong>{currentPlanName}</strong> benefits and listings stay fully active until <strong>{formattedExpirationDate || 'period end'}</strong>.
                            </p>
                            <div className="flex items-center gap-2 pt-1 border-t border-stone-200/60 text-[11.5px] font-semibold text-stone-700">
                                <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                                <span>Switches automatically to {pendingDowngrade.name} on expiry date.</span>
                            </div>
                        </div>

                        <div className="text-[11px] text-stone-500 pt-0.5">
                            Want to apply immediately?{' '}
                            <button
                                type="button"
                                onClick={() => setShowImmediateOptions(true)}
                                className="font-semibold text-stone-800 underline hover:text-orange-600 transition"
                            >
                                Downgrade now
                            </button>
                        </div>

                        <div className="mt-5 flex flex-col-reverse sm:flex-row justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPendingDowngrade(null)}
                                className="w-full sm:w-auto rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50"
                            >
                                Keep Current
                            </button>
                            <button
                                type="button"
                                onClick={() => onScheduleRenewal?.(pendingDowngrade.id)}
                                disabled={isDowngrading}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-stone-800 shadow-sm disabled:opacity-50"
                            >
                                {isDowngrading ? 'Scheduling...' : `Set as Renewal Plan`}
                                {!isDowngrading && <ArrowRight size={12} />}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mt-4 space-y-3">
                        <div className="space-y-2.5 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-xs">
                            <div className="flex items-start gap-2.5 text-stone-700">
                                <ChevronRight size={14} className="mt-0.5 shrink-0 text-orange-600" />
                                <p>Benefits and product limits will apply immediately.</p>
                            </div>

                            {draftCount > 0 && (
                                <div className="flex items-start gap-2.5 text-stone-700">
                                    <ChevronRight size={14} className="mt-0.5 shrink-0 text-orange-600" />
                                    <p><strong>{draftCount}</strong> active product{draftCount === 1 ? '' : 's'} may be moved to Draft.</p>
                                </div>
                            )}

                            {showsEliteStandardWarning && (
                                <div className="flex items-start gap-2.5 text-stone-700">
                                    <Users size={14} className="mt-0.5 shrink-0 text-orange-600" />
                                    <p>Elite-only features and staff workspace accounts will be suspended.</p>
                                </div>
                            )}
                        </div>

                        {hasActivePass && (
                            <div className="text-[11px] text-stone-500 pt-0.5">
                                <button
                                    type="button"
                                    onClick={() => setShowImmediateOptions(false)}
                                    className="font-semibold text-stone-800 underline hover:text-orange-600 transition"
                                >
                                    &larr; Switch back to scheduled renewal
                                </button>
                            </div>
                        )}

                        <div className="mt-5 flex flex-col-reverse sm:flex-row justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPendingDowngrade(null)}
                                className="w-full sm:w-auto rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDowngrade}
                                disabled={isDowngrading}
                                className={`w-full sm:w-auto rounded-xl px-4 py-2 text-xs font-bold text-white transition-colors ${
                                    isDowngrading ? 'cursor-not-allowed bg-stone-300' : 'bg-orange-600 hover:bg-orange-700'
                                }`}
                            >
                                {isDowngrading ? 'Processing...' : 'Yes, downgrade now'}
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

import React from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function RevisionFeedbackBanner({
    revision = null,
    fallbackReason = null,
    title = 'Revision Requested',
    completedTitle = 'All Requested Revisions Updated',
    onGoToField = null,
    activeKeys = null,
    addressedKeys = null,
    variant = 'amber',
    embedded = false,
}) {
    const items = Array.isArray(revision?.items) ? revision.items : [];
    const summaryReason = revision?.summary_note || revision?.summary_reason || fallbackReason || '';

    if (!summaryReason && items.length === 0) {
        return null;
    }

    const addressedCount = addressedKeys
        ? items.filter((item) => item.key && addressedKeys.has(item.key)).length
        : 0;
    const allCompleted = Boolean(
        addressedKeys
        && items.length > 0
        && items.every((item) => item.key && addressedKeys.has(item.key))
    );

    const activeVariant = allCompleted ? 'emerald' : variant;

    const palette = {
        rose: {
            container: embedded
                ? 'border-b border-stone-200 bg-stone-50/90 text-stone-900 px-4 py-3.5 sm:px-8 sm:py-4'
                : 'rounded-xl border border-stone-200/90 bg-stone-50/90 text-stone-900 p-3.5 shadow-2xs',
            iconWrap: 'bg-stone-200/80 text-stone-700',
            badge: 'bg-stone-100 text-stone-700 border-stone-200',
            itemBox: 'bg-white border-stone-200/90 hover:border-stone-300 shadow-2xs',
            staticBox: 'bg-white border-stone-200/90 shadow-2xs',
            activeBox: 'bg-white border-clay-500 ring-1 ring-clay-300/60 shadow-2xs',
            dot: 'bg-clay-600',
            note: 'text-stone-600',
            actionText: 'text-clay-700 group-hover:text-clay-900',
        },
        amber: {
            container: embedded
                ? 'border-b border-amber-200/80 bg-amber-50/60 text-amber-950 px-4 py-3.5 sm:px-8 sm:py-4'
                : 'rounded-xl border border-amber-200 bg-amber-50/60 text-amber-950 p-3.5',
            iconWrap: 'bg-amber-100 text-amber-800',
            badge: 'bg-amber-100/90 text-amber-900 border-amber-200',
            itemBox: 'bg-white border-amber-200/80 hover:border-amber-300',
            staticBox: 'bg-white border-amber-200/80',
            activeBox: 'bg-white border-amber-400 ring-1 ring-amber-300/60',
            dot: 'bg-amber-600',
            note: 'text-amber-900/85',
            actionText: 'text-amber-800 group-hover:text-amber-950',
        },
        emerald: {
            container: embedded
                ? 'border-b border-emerald-200/80 bg-emerald-50/70 text-emerald-950 px-4 py-3.5 sm:px-8 sm:py-4'
                : 'rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-950 p-3.5',
            iconWrap: 'bg-emerald-100 text-emerald-700',
            badge: 'bg-emerald-100/90 text-emerald-800 border-emerald-300',
            itemBox: 'bg-white border-emerald-200/80 hover:border-emerald-300',
            staticBox: 'bg-white border-emerald-200/80',
            activeBox: 'bg-white border-emerald-400 ring-1 ring-emerald-300/60',
            dot: 'bg-emerald-500',
            note: 'text-emerald-800/90',
            actionText: 'text-emerald-700 group-hover:text-emerald-900',
        },
    };

    const styles = {
        ...(palette[activeVariant] || palette.amber),
        addressedBox: 'bg-white border-emerald-300 hover:border-emerald-400',
        addressedActiveBox: 'bg-white border-emerald-500 ring-1 ring-emerald-400/50',
    };

    const gridClass = items.length === 1
        ? 'grid grid-cols-1 gap-1.5'
        : 'grid grid-cols-1 sm:grid-cols-2 gap-1.5';

    return (
        <div className={`space-y-2.5 transition-colors duration-200 ${styles.container}`}>
            <div className="flex items-start gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${styles.iconWrap}`}>
                    {allCompleted ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-bold leading-snug">
                            {allCompleted ? completedTitle : title}
                        </h4>
                        {items.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                {allCompleted ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-300 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                                        <CheckCircle2 size={10} strokeWidth={2.5} />
                                        All {items.length} Updated
                                    </span>
                                ) : (
                                    <>
                                        {addressedCount > 0 && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-300 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                                                <CheckCircle2 size={10} strokeWidth={2.5} />
                                                {addressedCount} Updated
                                            </span>
                                        )}
                                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${styles.badge}`}>
                                            {items.length} {items.length === 1 ? 'Item' : 'Items'} Flagged
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    {summaryReason && (
                        <p className="text-xs leading-relaxed opacity-90 mt-0.5">{summaryReason}</p>
                    )}
                </div>
            </div>

            {items.length > 0 && (
                <div className={gridClass}>
                    {items.map((item, idx) => {
                        const isJumpable = Boolean(onGoToField && item.key && !String(item.key).startsWith('custom_'));
                        const isActiveStep = Boolean(activeKeys && activeKeys.has(item.key));
                        const isAddressed = Boolean(addressedKeys && item.key && addressedKeys.has(item.key));
                        const isTrailingOdd = items.length > 1 && items.length % 2 === 1 && idx === items.length - 1;
                        const spanClass = isTrailingOdd ? 'sm:col-span-2' : '';

                        if (isJumpable) {
                            const buttonBoxClass = isAddressed
                                ? (isActiveStep ? styles.addressedActiveBox : styles.addressedBox)
                                : (isActiveStep ? styles.activeBox : styles.itemBox);

                            return (
                                <button
                                    key={item.key || idx}
                                    type="button"
                                    onClick={() => onGoToField(item.key)}
                                    className={`group text-left rounded-lg border px-2.5 py-2 flex items-center justify-between gap-2 transition cursor-pointer min-h-[38px] ${spanClass} ${buttonBoxClass}`}
                                >
                                    <div className="flex items-start gap-2 min-w-0">
                                        {isAddressed ? (
                                            <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                                        ) : (
                                            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${styles.dot}`} />
                                        )}
                                        <div className="min-w-0">
                                            <p className={`text-xs font-semibold truncate ${isAddressed ? 'text-emerald-950' : 'text-stone-900'}`}>
                                                {item.label || item.key}
                                            </p>
                                            {item.note && (
                                                <p className={`text-[11px] mt-0.5 leading-snug line-clamp-2 ${isAddressed ? 'text-emerald-800/90' : styles.note}`}>
                                                    {item.note}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <span className={`text-[11px] font-bold inline-flex items-center gap-0.5 shrink-0 transition-transform group-hover:translate-x-0.5 ${isAddressed ? 'text-emerald-700 group-hover:text-emerald-900' : styles.actionText}`}>
                                        <span>{isAddressed ? 'Updated' : (isActiveStep ? 'Here' : 'Fix')}</span>
                                        <ArrowRight size={11} />
                                    </span>
                                </button>
                            );
                        }

                        return (
                            <div
                                key={item.key || idx}
                                className={`rounded-lg border px-2.5 py-2 flex items-start gap-2 min-w-0 ${spanClass} ${styles.staticBox}`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${styles.dot}`} />
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-stone-900">
                                        {item.label || item.key}
                                    </p>
                                    {item.note && (
                                        <p className={`text-[11px] mt-0.5 leading-snug line-clamp-2 ${styles.note}`}>
                                            {item.note}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

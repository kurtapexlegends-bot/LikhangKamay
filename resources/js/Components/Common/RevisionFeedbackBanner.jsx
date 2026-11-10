import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export default function RevisionFeedbackBanner({
    revision = null,
    fallbackReason = null,
    title = 'Revision Requested',
    onGoToField = null,
    variant = 'amber',
}) {
    const items = Array.isArray(revision?.items) ? revision.items : [];
    const summaryReason = revision?.summary_note || revision?.summary_reason || fallbackReason || '';

    if (!summaryReason && items.length === 0) {
        return null;
    }

    const styles =
        variant === 'rose'
            ? {
                  container: 'bg-rose-50 border-rose-200 text-rose-950',
                  iconWrap: 'bg-rose-100 text-rose-700',
                  itemBox: 'bg-white/90 border-rose-200/80',
                  dot: 'bg-rose-500',
                  note: 'text-rose-800',
                  actionBtn: 'bg-rose-100 hover:bg-rose-200 text-rose-900',
              }
            : {
                  container: 'bg-amber-50 border-amber-200 text-amber-950',
                  iconWrap: 'bg-amber-100 text-amber-800',
                  itemBox: 'bg-white/90 border-amber-200/80',
                  dot: 'bg-amber-600',
                  note: 'text-amber-900/90',
                  actionBtn: 'bg-amber-100 hover:bg-amber-200 text-amber-900',
              };

    return (
        <div className={`rounded-2xl border p-4 space-y-3 ${styles.container}`}>
            <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${styles.iconWrap}`}>
                    <AlertTriangle size={18} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-bold leading-snug">{title}</h4>
                        {items.length > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles.iconWrap}`}>
                                {items.length} {items.length === 1 ? 'Item' : 'Items'} Flagged
                            </span>
                        )}
                    </div>
                    {summaryReason && (
                        <p className="text-xs leading-relaxed opacity-90">{summaryReason}</p>
                    )}
                </div>
            </div>

            {items.length > 0 && (
                <div className="space-y-1.5 pl-0 sm:pl-12">
                    {items.map((item, idx) => (
                        <div
                            key={item.key || idx}
                            className={`rounded-xl border px-3 py-2 flex items-center justify-between gap-3 ${styles.itemBox}`}
                        >
                            <div className="flex items-start gap-2.5 min-w-0">
                                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${styles.dot}`} />
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-stone-900">
                                        {item.label || item.key}
                                    </p>
                                    {item.note && (
                                        <p className={`text-[11px] mt-0.5 leading-snug ${styles.note}`}>
                                            {item.note}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {onGoToField && item.key && !String(item.key).startsWith('custom_') && (
                                <button
                                    type="button"
                                    onClick={() => onGoToField(item.key)}
                                    className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 shrink-0 transition cursor-pointer ${styles.actionBtn}`}
                                >
                                    <span>Fix</span>
                                    <ArrowRight size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

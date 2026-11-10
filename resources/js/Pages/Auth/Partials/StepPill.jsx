import React from 'react';
import { Check } from 'lucide-react';

export default function StepPill({ number, icon, label, active, current, badgeCount = 0, stepResolved = false, onClick }) {
    const isCompleted = active && !current;
    const isInteractive = Boolean(onClick);

    return (
        <button
            type="button"
            disabled={!isInteractive}
            onClick={onClick}
            aria-current={current ? 'step' : undefined}
            className={`flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 transition-all text-left ${
                isInteractive ? 'cursor-pointer hover:bg-stone-100' : 'cursor-default'
            } ${
                current
                    ? 'bg-clay-600 text-white shadow-sm ring-1 ring-clay-600'
                    : isCompleted
                        ? 'bg-clay-50 text-clay-800'
                        : 'text-stone-400'
            }`}
        >
            <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    current
                        ? 'bg-white text-clay-700'
                        : isCompleted
                            ? 'bg-clay-200 text-clay-800'
                            : 'bg-stone-100 text-stone-400'
                }`}
            >
                {isCompleted && badgeCount === 0 ? <Check size={13} strokeWidth={2.5} /> : (icon || number)}
            </div>
            <span className={`text-xs sm:text-sm font-semibold tracking-tight ${
                current ? 'text-white' : isCompleted ? 'text-stone-800' : 'text-stone-400'
            }`}>
                {label}
            </span>
            {badgeCount > 0 ? (
                <span className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                    current ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-700'
                }`}>
                    {badgeCount}
                </span>
            ) : stepResolved ? (
                <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${
                    current ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}>
                    <Check size={10} strokeWidth={3} />
                </span>
            ) : null}
        </button>
    );
}

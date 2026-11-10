import React, { useId } from 'react';
import { Check, MessageSquare } from 'lucide-react';

export default function InlineRevisionCard({
    active = false,
    selected = false,
    label,
    note = '',
    onToggle,
    onChangeNote,
    secondaryAction = null,
    className = '',
    children,
}) {
    const noteInputId = useId();

    if (!active) {
        return <>{children}</>;
    }

    return (
        <div
            className={`rounded-xl border overflow-hidden transition-all ${
                selected
                    ? 'border-amber-400 ring-2 ring-amber-400/25 bg-amber-50/20 shadow-xs'
                    : 'border-stone-200/90 bg-white hover:border-clay-300'
            } ${className}`}
        >
            <div
                className={`flex items-center justify-between gap-2 px-2.5 py-1 border-b transition-colors ${
                    selected
                        ? 'bg-amber-50 border-amber-200/80'
                        : 'bg-stone-50/90 border-stone-200/70'
                }`}
            >
                <button
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    onClick={onToggle}
                    className="flex-1 min-w-0 min-h-[32px] flex items-center gap-2 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/40 rounded-md px-1"
                >
                    <span
                        aria-hidden="true"
                        className={`w-3.5 h-3.5 rounded-[3px] border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${
                            selected
                                ? 'bg-amber-600 border-amber-600 text-white'
                                : 'bg-white border-stone-400'
                        }`}
                    >
                        {selected && <Check size={10} strokeWidth={3} />}
                    </span>
                    <span className={`text-[11px] truncate ${selected ? 'font-bold text-amber-950' : 'font-semibold text-stone-700'}`}>
                        {selected ? `Revision Flagged: ${label}` : `Flag ${label}`}
                    </span>
                </button>

                {secondaryAction}
            </div>

            <div className={selected ? 'opacity-95' : ''}>
                {children}
            </div>

            {selected && (
                <div className="border-t border-amber-200/80 bg-amber-50/60 px-2.5 py-1.5">
                    <label htmlFor={noteInputId} className="sr-only">
                        Revision note for {label}
                    </label>
                    <div className="flex items-center gap-1.5 rounded-md bg-white border border-amber-200 px-2 py-1 focus-within:border-amber-400 transition-colors">
                        <MessageSquare size={12} className="text-amber-600 shrink-0" aria-hidden="true" />
                        <input
                            id={noteInputId}
                            type="text"
                            value={note}
                            onChange={(e) => onChangeNote?.(e.target.value)}
                            placeholder={`Specific note for ${label}...`}
                            maxLength={300}
                            className="w-full text-base sm:text-xs text-stone-800 placeholder-stone-400 bg-transparent border-0 p-0 focus:ring-0"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

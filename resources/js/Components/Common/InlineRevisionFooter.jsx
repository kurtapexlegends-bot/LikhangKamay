import React, { useId, useState } from 'react';
import { Check, LoaderCircle, Plus, RotateCcw, X } from 'lucide-react';

export default function InlineRevisionFooter({
    items = [],
    onRemoveItem,
    onAddCustomItem,
    extraOptions = [],
    onToggleExtraOption,
    reason = '',
    onChangeReason,
    reasonPlaceholder = 'Optional summary guidance (required if no cards flagged)...',
    error = '',
    processing = false,
    canSubmit = false,
    submitLabel = 'Send Revision Request',
    submitTone = 'amber', // 'amber' | 'rose' | 'stone'
    onCancel,
    onSubmit,
}) {
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [customText, setCustomText] = useState('');
    const reasonId = useId();
    const customId = useId();

    const handleAddCustom = () => {
        if (!customText.trim()) return;
        onAddCustomItem?.(customText);
        setCustomText('');
        setShowCustomInput(false);
    };

    const submitToneClass = {
        amber: 'bg-amber-600 hover:bg-amber-700 text-white',
        rose: 'bg-rose-600 hover:bg-rose-700 text-white',
        stone: 'bg-stone-900 hover:bg-stone-800 text-white',
    }[submitTone] || 'bg-amber-600 hover:bg-amber-700 text-white';

    return (
        <div className="w-full space-y-2.5">
            {/* Compact Status + Extra Options + Selected Summary Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span className="text-[11px] font-bold text-stone-700 shrink-0">
                        {items.length > 0 ? `${items.length} flagged:` : 'Check cards above to flag'}
                    </span>

                    {items.map((item) => (
                        <span
                            key={item.key}
                            className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300/80 px-2 py-0.5 text-[11px] font-semibold text-amber-950 max-w-[180px]"
                        >
                            <span className="truncate">{item.label}</span>
                            <button
                                type="button"
                                onClick={() => onRemoveItem?.(item.key)}
                                aria-label={`Remove ${item.label}`}
                                className="text-amber-700 hover:text-rose-700 cursor-pointer shrink-0"
                            >
                                <X size={11} />
                            </button>
                        </span>
                    ))}

                    {extraOptions.map((opt) => {
                        const checked = items.some((item) => item.key === opt.key);
                        if (checked) return null;
                        return (
                            <button
                                key={opt.key}
                                type="button"
                                onClick={() => onToggleExtraOption?.(opt.key, opt.label)}
                                className="inline-flex items-center gap-1 rounded-full border border-dashed border-stone-300 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-600 hover:border-amber-400 hover:text-amber-900 transition cursor-pointer"
                            >
                                <Check size={10} className="opacity-40" />
                                <span>+ {opt.label}</span>
                            </button>
                        );
                    })}
                </div>

                {!showCustomInput && onAddCustomItem && (
                    <button
                        type="button"
                        onClick={() => setShowCustomInput(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-clay-700 hover:text-clay-900 shrink-0 cursor-pointer"
                    >
                        <Plus size={12} />
                        <span>Other issue</span>
                    </button>
                )}
            </div>

            {showCustomInput && (
                <div className="flex items-center gap-1.5">
                    <label htmlFor={customId} className="sr-only">Custom revision issue</label>
                    <input
                        id={customId}
                        type="text"
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.nativeEvent?.isComposing) {
                                e.preventDefault();
                                handleAddCustom();
                            }
                        }}
                        placeholder="Specify other item to revise..."
                        maxLength={120}
                        className="flex-1 min-h-[38px] text-base sm:text-xs bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-stone-800 placeholder-stone-400 focus:border-clay-400 focus:ring-2 focus:ring-clay-500/20"
                    />
                    <button
                        type="button"
                        onClick={handleAddCustom}
                        disabled={!customText.trim()}
                        className="min-h-[38px] px-3 rounded-xl bg-stone-900 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
                    >
                        Add
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setShowCustomInput(false);
                            setCustomText('');
                        }}
                        className="min-h-[38px] px-2 rounded-xl border border-stone-200 bg-white text-stone-500 hover:text-stone-800 cursor-pointer"
                        aria-label="Cancel custom item"
                    >
                        <X size={13} />
                    </button>
                </div>
            )}

            {/* Notes + Actions Bar */}
            {error && <p className="text-[11px] font-semibold text-rose-600">{error}</p>}

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label htmlFor={reasonId} className="sr-only">Revision summary note</label>
                <input
                    id={reasonId}
                    type="text"
                    value={reason}
                    onChange={(e) => onChangeReason?.(e.target.value)}
                    placeholder={reasonPlaceholder}
                    maxLength={1000}
                    className="flex-1 min-h-[44px] text-base sm:text-xs bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-stone-800 placeholder-stone-400 focus:border-clay-400 focus:ring-2 focus:ring-clay-500/20"
                />

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={processing}
                        className="flex-1 sm:flex-initial min-h-[44px] px-4 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={processing || !canSubmit}
                        className={`flex-[2] sm:flex-initial min-h-[44px] px-4 rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer ${submitToneClass}`}
                    >
                        {processing ? <LoaderCircle size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                        <span>{processing ? 'Sending...' : submitLabel}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

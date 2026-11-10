import React, { useId, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { Check, Plus, X } from 'lucide-react';

export default function RevisionChecklistSelector({
    schemaKey,
    schema: customSchema = null,
    selectedItems = [],
    onChangeItems,
    reason = '',
    onChangeReason,
    reasonLabel = 'Notes',
    reasonPlaceholder = 'Add clear guidance on what needs to be updated...',
    error = null,
    maxReasonLength = 1000,
    compact = false,
}) {
    const { revisionSchemas = {} } = usePage().props;
    const fields = useMemo(() => {
        const schema = customSchema || revisionSchemas?.[schemaKey] || { fields: [] };
        return schema?.fields || [];
    }, [customSchema, revisionSchemas, schemaKey]);

    const [customLabel, setCustomLabel] = useState('');
    const customInputId = useId();
    const notesTextareaId = useId();

    const findSelected = (key) => selectedItems.find((item) => item.key === key);

    const toggleField = (field) => {
        if (!onChangeItems) return;
        const exists = findSelected(field.key);
        if (exists) {
            onChangeItems(selectedItems.filter((item) => item.key !== field.key));
        } else {
            onChangeItems([...selectedItems, { key: field.key, label: field.label, note: '' }]);
        }
    };

    const updateItemNote = (key, note) => {
        if (!onChangeItems) return;
        onChangeItems(
            selectedItems.map((item) => (item.key === key ? { ...item, note } : item))
        );
    };

    const handleAddCustomItem = () => {
        const trimmed = customLabel.trim();
        if (!trimmed || !onChangeItems) return;

        const slug = trimmed
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 32);

        const uniqueKey = `custom_${slug || 'item'}_${Date.now().toString(36).slice(-4)}`;
        onChangeItems([...selectedItems, { key: uniqueKey, label: trimmed, note: '' }]);
        setCustomLabel('');
    };

    const removeItem = (key) => {
        if (!onChangeItems) return;
        onChangeItems(selectedItems.filter((item) => item.key !== key));
    };

    return (
        <div className="space-y-3.5">
            {/* Compact Toggle Pills */}
            {fields.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-stone-800">
                            Items to Revise
                            {selectedItems.length > 0 && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-clay-100 px-2 py-0.5 text-[11px] font-bold text-clay-800">
                                    {selectedItems.length}
                                </span>
                            )}
                        </span>
                        {selectedItems.length > 0 && (
                            <button
                                type="button"
                                onClick={() => onChangeItems?.([])}
                                className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 underline underline-offset-2 cursor-pointer"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {fields.map((field) => {
                            const isSelected = Boolean(findSelected(field.key));
                            return (
                                <button
                                    key={field.key}
                                    type="button"
                                    role="checkbox"
                                    aria-checked={isSelected}
                                    onClick={() => toggleField(field)}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 min-h-[44px] sm:min-h-[34px] text-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/40 ${
                                        isSelected
                                            ? 'bg-clay-700 border-clay-700 text-white font-semibold shadow-xs'
                                            : 'bg-white border-stone-200 text-stone-700 font-medium hover:border-stone-300 hover:bg-stone-50'
                                    }`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors ${
                                            isSelected
                                                ? 'bg-white/20 border-white/60 text-white'
                                                : 'bg-white border-stone-400'
                                        }`}
                                    >
                                        {isSelected && <Check size={10} strokeWidth={3} />}
                                    </span>
                                    <span>{field.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Inline Note Rows for Selected Pills */}
            {selectedItems.length > 0 && (
                <div className="space-y-1.5 rounded-xl border border-stone-200/90 bg-white/80 p-2.5">
                    {selectedItems.map((item) => (
                        <div
                            key={item.key}
                            className="flex items-center gap-2 rounded-lg bg-stone-50/90 border border-stone-200/70 px-2.5 py-1.5 focus-within:border-clay-400 focus-within:bg-white transition-colors"
                        >
                            <span className="text-[11px] font-bold text-clay-800 bg-clay-100/80 px-2 py-0.5 rounded-md shrink-0 max-w-[44%] truncate">
                                {item.label}
                            </span>
                            <input
                                type="text"
                                value={item.note || ''}
                                onChange={(e) => updateItemNote(item.key, e.target.value)}
                                placeholder="Optional note..."
                                aria-label={`Note for ${item.label}`}
                                maxLength={300}
                                className="flex-1 min-w-0 text-base sm:text-xs text-stone-800 placeholder-stone-400 bg-transparent border-0 p-0 focus:ring-0"
                            />
                            <button
                                type="button"
                                onClick={() => removeItem(item.key)}
                                className="p-1 text-stone-400 hover:text-rose-600 rounded-md transition cursor-pointer shrink-0"
                                aria-label={`Remove ${item.label}`}
                            >
                                <X size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Slim Custom Item Add Row */}
            <div className="flex items-center gap-1.5">
                <label htmlFor={customInputId} className="sr-only">
                    Add custom item to revise
                </label>
                <input
                    id={customInputId}
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent?.isComposing) {
                            e.preventDefault();
                            handleAddCustomItem();
                        }
                    }}
                    placeholder="Add other item..."
                    maxLength={120}
                    className="flex-1 min-h-[44px] sm:min-h-[36px] text-base sm:text-xs bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-clay-500/20 focus:border-clay-400"
                />
                <button
                    type="button"
                    onClick={handleAddCustomItem}
                    disabled={!customLabel.trim()}
                    className="min-h-[44px] sm:min-h-[36px] px-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 text-xs font-bold text-stone-700 inline-flex items-center gap-1 transition cursor-pointer shrink-0"
                >
                    <Plus size={13} aria-hidden="true" />
                    <span>Add</span>
                </button>
            </div>

            {/* Concise Overall Notes */}
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <label htmlFor={notesTextareaId} className="text-xs font-bold text-stone-800">
                        {reasonLabel}
                    </label>
                    {maxReasonLength && (
                        <span className="text-[11px] font-medium text-stone-400 tabular-nums">
                            {(reason || '').length}/{maxReasonLength}
                        </span>
                    )}
                </div>
                <textarea
                    id={notesTextareaId}
                    rows={compact ? 2 : 3}
                    value={reason}
                    onChange={(e) => onChangeReason?.(e.target.value)}
                    maxLength={maxReasonLength}
                    placeholder={reasonPlaceholder}
                    className="w-full text-base sm:text-xs bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-clay-500/20 focus:border-clay-400 resize-none"
                />
                {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
            </div>
        </div>
    );
}

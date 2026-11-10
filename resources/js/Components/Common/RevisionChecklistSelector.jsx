import React, { useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { Check, Plus, X, MessageSquare } from 'lucide-react';

export default function RevisionChecklistSelector({
    schemaKey,
    schema: customSchema = null,
    selectedItems = [],
    onChangeItems,
    reason = '',
    onChangeReason,
    reasonLabel = 'Overall Revision Notes',
    reasonPlaceholder = 'Provide clear instructions so the requester knows what to fix...',
    error = null,
    maxReasonLength = 1000,
    compact = false,
}) {
    const { revisionSchemas = {} } = usePage().props;
    const schema = customSchema || revisionSchemas?.[schemaKey] || { fields: [] };
    const fields = schema?.fields || [];

    const [customLabel, setCustomLabel] = useState('');

    const groupedFields = useMemo(() => {
        const groups = new Map();
        fields.forEach((field) => {
            const groupName = field.group || 'Checklist';
            if (!groups.has(groupName)) {
                groups.set(groupName, []);
            }
            groups.get(groupName).push(field);
        });
        return Array.from(groups.entries());
    }, [fields]);

    const schemaKeysSet = useMemo(() => new Set(fields.map((f) => f.key)), [fields]);

    const customItems = useMemo(
        () => selectedItems.filter((item) => !schemaKeysSet.has(item.key)),
        [selectedItems, schemaKeysSet]
    );

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

    const removeCustomItem = (key) => {
        if (!onChangeItems) return;
        onChangeItems(selectedItems.filter((item) => item.key !== key));
    };

    return (
        <div className="space-y-4">
            {/* Checklist Header */}
            <div className="flex items-center justify-between gap-2">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-700">
                        Select Items to Revise
                    </p>
                    <p className="text-[11px] text-stone-500">
                        Check specific sections that need updates ({selectedItems.length} selected)
                    </p>
                </div>
                {selectedItems.length > 0 && (
                    <button
                        type="button"
                        onClick={() => onChangeItems?.([])}
                        className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 underline underline-offset-2 cursor-pointer"
                    >
                        Clear all
                    </button>
                )}
            </div>

            {/* Schema Grouped Checkboxes */}
            <div className={`space-y-3 ${compact ? 'max-h-56 overflow-y-auto pr-1' : 'max-h-64 overflow-y-auto pr-1'}`}>
                {groupedFields.map(([groupName, groupItems]) => (
                    <div key={groupName} className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-1">
                            {groupName}
                        </p>
                        <div className="space-y-1.5">
                            {groupItems.map((field) => {
                                const selected = findSelected(field.key);
                                return (
                                    <div
                                        key={field.key}
                                        className={`rounded-xl border transition-colors ${
                                            selected
                                                ? 'bg-amber-50/70 border-amber-300'
                                                : 'bg-white border-stone-200 hover:border-stone-300'
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleField(field)}
                                            className="w-full min-h-[44px] px-3 py-2 flex items-center gap-2.5 text-left cursor-pointer"
                                        >
                                            <span
                                                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                                    selected
                                                        ? 'bg-amber-600 border-amber-600 text-white'
                                                        : 'bg-white border-stone-300'
                                                }`}
                                            >
                                                {selected && <Check size={12} strokeWidth={3} />}
                                            </span>
                                            <span className={`text-xs font-semibold flex-1 ${selected ? 'text-stone-900' : 'text-stone-700'}`}>
                                                {field.label}
                                            </span>
                                        </button>

                                        {selected && (
                                            <div className="px-3 pb-2.5 pt-0.5">
                                                <div className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-lg px-2.5 py-1.5">
                                                    <MessageSquare size={12} className="text-amber-600 shrink-0" />
                                                    <input
                                                        type="text"
                                                        value={selected.note || ''}
                                                        onChange={(e) => updateItemNote(field.key, e.target.value)}
                                                        placeholder={`Optional note for ${field.label}...`}
                                                        maxLength={300}
                                                        className="w-full text-[11px] text-stone-800 placeholder-stone-400 bg-transparent border-0 p-0 focus:ring-0"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Custom Ad-Hoc Items */}
                {customItems.length > 0 && (
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-1">
                            Custom Revision Items
                        </p>
                        {customItems.map((item) => (
                            <div
                                key={item.key}
                                className="rounded-xl border bg-amber-50/70 border-amber-300 p-2.5 space-y-2"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-stone-900">{item.label}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeCustomItem(item.key)}
                                        className="p-1 text-stone-400 hover:text-rose-600 rounded-md cursor-pointer"
                                        aria-label={`Remove ${item.label}`}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-lg px-2.5 py-1.5">
                                    <MessageSquare size={12} className="text-amber-600 shrink-0" />
                                    <input
                                        type="text"
                                        value={item.note || ''}
                                        onChange={(e) => updateItemNote(item.key, e.target.value)}
                                        placeholder="Optional specific note..."
                                        maxLength={300}
                                        className="w-full text-[11px] text-stone-800 placeholder-stone-400 bg-transparent border-0 p-0 focus:ring-0"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Custom Item Row */}
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomItem();
                        }
                    }}
                    placeholder="Add custom item to revise..."
                    maxLength={120}
                    className="flex-1 min-h-[44px] text-xs bg-white border border-stone-200 rounded-xl px-3 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <button
                    type="button"
                    onClick={handleAddCustomItem}
                    disabled={!customLabel.trim()}
                    className="min-h-[44px] px-3.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 disabled:opacity-40 text-xs font-bold text-stone-700 inline-flex items-center gap-1 transition cursor-pointer shrink-0"
                >
                    <Plus size={14} />
                    Add
                </button>
            </div>

            {/* Summary Feedback Textarea */}
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
                        {reasonLabel}
                    </label>
                    {maxReasonLength && (
                        <span className="text-[10px] font-semibold text-stone-400">
                            {(reason || '').length}/{maxReasonLength}
                        </span>
                    )}
                </div>
                <textarea
                    rows={compact ? 2 : 3}
                    value={reason}
                    onChange={(e) => onChangeReason?.(e.target.value)}
                    maxLength={maxReasonLength}
                    placeholder={reasonPlaceholder}
                    className="w-full text-xs bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 resize-none"
                />
                {error && <p className="text-[11px] font-medium text-rose-600">{error}</p>}
            </div>
        </div>
    );
}

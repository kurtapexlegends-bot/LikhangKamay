import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export function CriteriaToggleSwitch({ checked, onChange, label }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="inline-flex items-center gap-2 cursor-pointer select-none min-h-[34px] shrink-0"
        >
            <span
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                    checked ? 'bg-clay-600' : 'bg-stone-300'
                }`}
            >
                <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ${
                        checked ? 'translate-x-4' : 'translate-x-0'
                    }`}
                />
            </span>
            <span className={`text-xs font-semibold w-14 text-left ${checked ? 'text-stone-800' : 'text-stone-400'}`}>
                {label}
            </span>
        </button>
    );
}

export default function CriteriaListCard({
    icon: Icon,
    title,
    badgeLabel,
    addLabel,
    onAdd,
    addDisabled = false,
    emptyMessage,
    items = [],
    renderRow,
}) {
    return (
        <section className="bg-white border border-stone-200/90 rounded-2xl shadow-2xs overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-stone-100 bg-stone-50/40">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Icon size={15} className="text-clay-600 shrink-0" />
                    <h3 className="text-sm font-bold text-stone-900 truncate">{title}</h3>
                    {badgeLabel && (
                        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-600 shrink-0">
                            {badgeLabel}
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onAdd}
                    disabled={addDisabled}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-clay-700 hover:bg-clay-50 transition disabled:opacity-40 cursor-pointer shrink-0"
                >
                    <Plus size={14} />
                    <span>{addLabel}</span>
                </button>
            </div>

            {items.length === 0 ? (
                <div className="px-5 py-6 text-center text-xs text-stone-500">
                    {emptyMessage}
                </div>
            ) : (
                <div className="divide-y divide-stone-100">
                    {items.map((item, idx) => renderRow(item, idx))}
                </div>
            )}
        </section>
    );
}

export function CriteriaRemoveButton({ onClick, title }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center justify-center rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer shrink-0"
            title={title}
        >
            <Trash2 size={14} />
        </button>
    );
}

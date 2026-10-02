import React from 'react';
import { Sparkles } from 'lucide-react';

export const PRESET_OPTIONS = [
    {
        id: 'standard',
        label: '9AM – 5PM',
        description: 'Full day continuous window',
        slots: [
            { id: 'preset_std_1', start_time: '09:00', end_time: '17:00', max_capacity: 10, label: '09:00 AM - 05:00 PM' },
        ],
    },
    {
        id: 'split',
        label: 'Split (9–12 & 1–5)',
        description: 'Morning and afternoon sessions',
        slots: [
            { id: 'preset_spl_1', start_time: '09:00', end_time: '12:00', max_capacity: 5, label: '09:00 AM - 12:00 PM' },
            { id: 'preset_spl_2', start_time: '13:00', end_time: '17:00', max_capacity: 5, label: '01:00 PM - 05:00 PM' },
        ],
    },
    {
        id: 'morning',
        label: 'Morning (9–12)',
        description: 'Morning pickup only',
        slots: [
            { id: 'preset_mor_1', start_time: '09:00', end_time: '12:00', max_capacity: 5, label: '09:00 AM - 12:00 PM' },
        ],
    },
    {
        id: 'afternoon',
        label: 'Afternoon (1–5)',
        description: 'Afternoon pickup only',
        slots: [
            { id: 'preset_aft_1', start_time: '13:00', end_time: '17:00', max_capacity: 5, label: '01:00 PM - 05:00 PM' },
        ],
    },
];

export default function PickupPresets({ onApplyPreset, canEdit = true, disabled = false }) {
    if (!canEdit || disabled) return null;

    return (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1">
                <Sparkles size={12} className="text-clay-600" />
                Quick Presets:
            </span>
            {PRESET_OPTIONS.map((preset) => (
                <button
                    key={preset.id}
                    type="button"
                    onClick={() => onApplyPreset(preset.slots)}
                    className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-clay-50 hover:text-clay-800 hover:border-clay-300 text-stone-600 font-semibold text-[11px] transition-all border border-stone-200/60 active:scale-95"
                    title={preset.description}
                >
                    {preset.label}
                </button>
            ))}
        </div>
    );
}

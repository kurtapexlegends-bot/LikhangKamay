import React from 'react';
import { Settings as SettingsIcon, Banknote, UserPlus, EyeOff } from 'lucide-react';

export default function HRHeaderActions({
    canEditHrRecords,
    onSettingsClick,
    onPayrollClick,
    onAddClick,
}) {
    if (!canEditHrRecords) {
        return (
            <span className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] font-bold text-stone-500 min-h-[44px]">
                <EyeOff size={14} />
                View Only
            </span>
        );
    }

    return (
        <div className="hidden sm:flex items-center gap-2">
            <button
                onClick={onSettingsClick}
                className="inline-flex items-center justify-center rounded-xl bg-stone-100 px-4 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-200 min-h-[44px] min-w-[44px]"
                title="Payroll Settings"
                type="button"
            >
                <SettingsIcon size={16} />
            </button>
            <button
                onClick={onPayrollClick}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-stone-700 shadow-sm ring-1 ring-inset ring-stone-200 transition hover:bg-stone-50 min-h-[44px]"
                type="button"
            >
                <Banknote size={16} /> Generate Payroll
            </button>
            <button
                onClick={onAddClick}
                className="inline-flex items-center gap-2 rounded-xl bg-clay-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-clay-200 transition hover:bg-clay-700 min-h-[44px]"
                type="button"
            >
                <UserPlus size={16} /> Add Employee
            </button>
        </div>
    );
}

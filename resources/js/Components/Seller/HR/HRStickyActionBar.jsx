import React from 'react';
import { UserPlus, Banknote, Settings as SettingsIcon } from 'lucide-react';
import StickyActionBar from '@/Components/StickyActionBar';

export default function HRStickyActionBar({
    canEditHrRecords,
    activeTab,
    onAddClick,
    onPayrollClick,
    onSettingsClick,
}) {
    if (!canEditHrRecords) return null;

    return (
        <StickyActionBar>
            {activeTab === 'directory' && (
                <>
                    <button
                        onClick={onPayrollClick}
                        className="flex-1 flex h-11 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 shadow-sm active:scale-95 transition"
                        type="button"
                    >
                        <Banknote size={16} />
                        <span>Payroll</span>
                    </button>
                    <button
                        onClick={onAddClick}
                        className="flex-[1.5] flex h-11 items-center justify-center gap-1.5 rounded-xl bg-clay-700 px-4 text-xs font-bold text-white shadow-lg shadow-clay-200/50 active:scale-95 transition hover:bg-clay-800"
                        type="button"
                    >
                        <UserPlus size={16} />
                        <span>Add Employee</span>
                    </button>
                </>
            )}
            {activeTab === 'payroll' && (
                <>
                    <button
                        onClick={onSettingsClick}
                        className="flex-1 flex h-11 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 shadow-sm active:scale-95 transition"
                        type="button"
                    >
                        <SettingsIcon size={16} />
                        <span>Settings</span>
                    </button>
                    <button
                        onClick={onPayrollClick}
                        className="flex-[1.5] flex h-11 items-center justify-center gap-1.5 rounded-xl bg-clay-700 px-4 text-xs font-bold text-white shadow-lg shadow-clay-200/50 active:scale-95 transition hover:bg-clay-800"
                        type="button"
                    >
                        <Banknote size={16} />
                        <span>Generate Payroll</span>
                    </button>
                </>
            )}
            {activeTab === 'access' && (
                <button
                    onClick={onAddClick}
                    className="w-full flex h-11 items-center justify-center gap-1.5 rounded-xl bg-clay-700 px-4 text-xs font-bold text-white shadow-lg shadow-clay-200/50 active:scale-95 transition hover:bg-clay-800"
                    type="button"
                >
                    <UserPlus size={16} />
                    <span>Add Employee</span>
                </button>
            )}
        </StickyActionBar>
    );
}

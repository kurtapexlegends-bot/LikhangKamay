import React from 'react';
import { Settings as SettingsIcon, Banknote, UserPlus, EyeOff } from 'lucide-react';

export default function HRHeaderActions({
    canEditHrRecords,
    activeTab = 'directory',
    onSettingsClick,
    onPayrollClick,
    onAddClick,
    className = '',
}) {
    if (!canEditHrRecords) {
        return (
            <span className={`inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] font-bold text-stone-500 min-h-[44px] ${className}`}>
                <EyeOff size={14} />
                View Only
            </span>
        );
    }

    const showSettings = true;
    const showPayroll = activeTab === 'directory' || activeTab === 'payroll';
    const showAdd = activeTab === 'directory' || activeTab === 'access';

    return (
        <div className={`flex items-center gap-2 w-full sm:w-auto ${className}`}>
            {showSettings && (
                <button
                    onClick={onSettingsClick}
                    className="inline-flex items-center justify-center rounded-xl bg-stone-100 px-3 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-200 min-h-[44px] min-w-[44px]"
                    title="Payroll Settings"
                    type="button"
                >
                    <SettingsIcon size={16} />
                </button>
            )}

            {showPayroll && (
                <button
                    onClick={onPayrollClick}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-stone-700 shadow-sm ring-1 ring-inset ring-stone-200 transition hover:bg-stone-50 min-h-[44px] flex-1 w-full sm:flex-initial sm:w-auto justify-center"
                    type="button"
                >
                    <Banknote size={16} />
                    {activeTab === 'payroll' ? (
                        <>
                            <span className="hidden sm:inline">PAYROLL</span>
                            <span className="sm:hidden">PAYROLL</span>
                        </>
                    ) : (
                        <span>PAYROLL</span>
                    )}
                </button>
            )}

            {showAdd && (
                <button
                    onClick={onAddClick}
                    className="inline-flex items-center gap-2 rounded-xl bg-clay-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-clay-200 transition hover:bg-clay-700 min-h-[44px] flex-1 w-full sm:flex-initial sm:w-auto justify-center"
                    type="button"
                >
                    <UserPlus size={16} />
                    <span>
                        <span className="hidden sm:inline">ADD EMPLOYEE</span>
                        <span className="sm:hidden">ADD EMPLOYEE</span>
                    </span>
                </button>
            )}
        </div>
    );
}

import React from 'react';
import { Users, Banknote, Shield } from 'lucide-react';

export default function HRTabs({
    activeTab,
    setActiveTab,
    staffCount = null,
    pendingPayrollCount = 0
}) {
    const tabs = [
        { key: 'directory', label: 'Directory', icon: Users, count: staffCount },
        { key: 'payroll', label: 'Payroll History', icon: Banknote, count: pendingPayrollCount > 0 ? pendingPayrollCount : null },
        { key: 'access', label: 'Access History', icon: Shield },
    ];

    return (
        <div className="p-1 bg-stone-100/80 rounded-2xl flex items-center gap-1 overflow-x-auto scrollbar-none w-fit border border-stone-200/60">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 min-h-[38px] sm:min-h-0 ${
                            isActive
                                ? 'bg-white text-clay-800 shadow-2xs font-black'
                                : 'text-stone-500 hover:text-stone-800 font-semibold'
                        }`}
                    >
                        <Icon size={14} />
                        <span>{tab.label}</span>
                        {tab.count !== null && tab.count !== undefined && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold transition ${
                                isActive
                                    ? 'bg-[#FCF7F2] text-clay-700 border border-[#E7D8C9]'
                                    : 'bg-stone-200/80 text-stone-600'
                            }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

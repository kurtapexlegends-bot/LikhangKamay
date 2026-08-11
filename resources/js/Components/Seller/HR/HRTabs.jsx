import React from 'react';
import { Users, Banknote, Shield } from 'lucide-react';

export default function HRTabs({ activeTab, setActiveTab }) {
    const tabs = [
        { key: 'directory', label: 'Directory', icon: Users },
        { key: 'payroll', label: 'Payroll History', icon: Banknote },
        { key: 'access', label: 'Access History', icon: Shield },
    ];

    return (
        <div className="p-1 bg-stone-100/70 rounded-2xl flex items-center gap-1 overflow-x-auto scrollbar-none w-fit">
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
                                ? 'bg-white text-clay-800 shadow-xs font-black'
                                : 'text-stone-500 hover:text-stone-800 font-semibold'
                        }`}
                    >
                        <Icon size={14} /> {tab.label}
                    </button>
                );
            })}
        </div>
    );
}

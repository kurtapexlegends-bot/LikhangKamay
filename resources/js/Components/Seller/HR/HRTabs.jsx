import React from 'react';
import { Users, Banknote, Shield } from 'lucide-react';

export default function HRTabs({ activeTab, setActiveTab }) {
    const tabs = [
        { key: 'directory', label: 'Directory', icon: Users },
        { key: 'payroll', label: 'Payroll History', icon: Banknote },
        { key: 'access', label: 'Access Audit', icon: Shield },
    ];

    return (
        <div className="flex items-center gap-2 border-b border-stone-200 overflow-x-auto whitespace-nowrap pb-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors min-h-[44px] ${
                            isActive
                                ? 'border-clay-600 text-clay-700'
                                : 'border-transparent text-stone-500 hover:text-stone-700'
                        }`}
                    >
                        <Icon size={16} /> {tab.label}
                    </button>
                );
            })}
        </div>
    );
}

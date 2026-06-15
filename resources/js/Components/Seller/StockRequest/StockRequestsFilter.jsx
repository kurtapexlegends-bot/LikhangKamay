import React from 'react';
import { Search } from 'lucide-react';
import { STATUS_TABS } from '@/utils/stockRequestHelpers';

export default function StockRequestsFilter({
    requests,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    filteredCount
}) {
    const getCount = (status) => {
        if (status === 'all') return requests.length;
        if (status === 'pending') return requests.filter(r => r.status === 'pending').length;
        return requests.filter(r => r.status === status).length;
    };

    return (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto border-b border-stone-100 no-scrollbar">
                <div className="flex min-w-max gap-1 p-1.5">
                    {STATUS_TABS.map(tab => {
                        const count = getCount(tab.id);
                        const isActive = activeTab === tab.id;
                        const TabIcon = tab.icon;
                        return (
                            <button 
                                key={tab.id} 
                                onClick={() => setActiveTab(tab.id)} 
                                className={`inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-lg transition-all duration-200 min-h-[44px] sm:min-h-0 ${
                                    isActive 
                                        ? 'bg-clay-600 text-white shadow-sm shadow-clay-100' 
                                        : 'text-stone-500 hover:bg-[#FCF7F2] hover:text-clay-700'
                                }`}
                            >
                                <TabIcon size={12} />
                                {tab.label}
                                {count > 0 && (
                                    <span className={`ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                                        isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
                                    }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
            
            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between border-t border-stone-50">
                <label className="relative block w-full sm:max-w-sm">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search item, supplier, requester, or request ID"
                        className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-10 text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-clay-400 focus:ring-clay-400 min-h-[44px] sm:min-h-0"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 transition hover:text-stone-700 min-h-[32px] flex items-center"
                        >
                            Clear
                        </button>
                    )}
                </label>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                    <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-stone-600">
                        {filteredCount} visible
                    </span>
                    {searchTerm && (
                        <span className="inline-flex items-center rounded-full border border-clay-200 bg-[#FCF7F2] px-3 py-1 text-clay-700">
                            Filtered queue
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

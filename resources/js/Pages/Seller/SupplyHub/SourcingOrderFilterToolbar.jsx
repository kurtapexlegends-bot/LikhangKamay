import React from 'react';
import { Search, X } from 'lucide-react';

export default function SourcingOrderFilterToolbar({
    activeTab = 'all',
    activeOrdersCount = 0,
    deliveredOrdersCount = 0,
    completedOrdersCount = 0,
    cancelledOrdersCount = 0,
    onFilterStatus,
    searchTerm = '',
    setSearchTerm,
    onSearch,
    onClearSearch,
}) {
    const filterTabs = [
        { id: 'all', label: 'All Orders' },
        { id: 'active', label: 'Active Shipments', count: activeOrdersCount },
        { id: 'delivered', label: 'Delivered (Action Needed)', count: deliveredOrdersCount, alert: deliveredOrdersCount > 0 },
        { id: 'completed', label: 'Completed', count: completedOrdersCount },
        { id: 'cancelled', label: 'Cancelled', count: cancelledOrdersCount },
    ];

    return (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-3 sm:p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Status Pills */}
                <div 
                    className="flex items-center gap-1 overflow-x-auto scrollbar-none p-1 bg-stone-100/70 rounded-2xl text-xs font-bold touch-pan-x overscroll-x-contain"
                    onWheel={(e) => {
                        if (e.currentTarget.scrollWidth > e.currentTarget.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                            e.currentTarget.scrollLeft += e.deltaY;
                        }
                    }}
                >
                    {filterTabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => onFilterStatus(tab.id)}
                                className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                    isActive
                                        ? 'bg-white text-stone-900 shadow-xs font-extrabold'
                                        : 'text-stone-600 hover:text-stone-900 font-semibold'
                                }`}
                            >
                                <span>{tab.label}</span>
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                                        isActive 
                                            ? 'bg-clay-100 text-clay-800' 
                                            : tab.alert 
                                                ? 'bg-amber-100 text-amber-900 font-black animate-pulse' 
                                                : 'bg-stone-200 text-stone-700'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Search Input */}
                <form onSubmit={onSearch} className="relative w-full md:w-64">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search ordered supplies..."
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-1.5 pl-9 pr-8 text-xs font-medium text-stone-800 placeholder-stone-400 focus:bg-white focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={onClearSearch}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                            title="Clear search"
                        >
                            <X size={13} />
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}

import React, { useMemo } from 'react';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
import { STATUS_TABS } from '@/utils/stockRequestHelpers';

export default function StockRequestsFilter({
    requests = [],
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    filteredCount
}) {
    const tabs = useMemo(() => {
        return STATUS_TABS.map(tab => {
            let count = requests.length;
            if (tab.id === 'pending') {
                count = requests.filter(r => r.status === 'pending').length;
            } else if (tab.id !== 'all') {
                count = requests.filter(r => r.status === tab.id).length;
            }
            return {
                key: tab.id,
                label: tab.label,
                count,
            };
        });
    }, [requests]);

    return (
        <FilterToolbarHeader
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            searchQuery={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search item, supplier, requester, or request ID..."
            onResetFilters={() => setSearchTerm('')}
            containerClassName="mb-4"
            extraActions={
                <span className="inline-flex items-center rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600 shadow-2xs shrink-0 min-h-[38px] sm:min-h-0">
                    {filteredCount} visible
                </span>
            }
        />
    );
}

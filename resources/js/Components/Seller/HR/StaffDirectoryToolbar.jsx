import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, List, LayoutGrid, SlidersHorizontal, ChevronDown, Filter, RotateCcw } from 'lucide-react';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';

export default function StaffDirectoryToolbar({
    tabs = [],
    activeTab = 'directory',
    onTabChange,
    searchTerm,
    setSearchTerm,
    filterState,
    setFilterState,
    viewMode,
    setViewMode,
    totalCount = 0,
    canEditHrRecords,
    onAddClick,
    entitlementFilter = 'all',
    setEntitlementFilter,
    accountFilter = 'all',
    setAccountFilter,
}) {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setIsFilterOpen(false);
            }
        };
        if (isFilterOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFilterOpen]);

    const quickFilters = [
        { key: 'all', label: 'All' },
        { key: 'clocked_in', label: 'Clocked In' },
        { key: 'paused', label: 'On Break' },
        { key: 'off_duty', label: 'Off Duty' },
    ];

    const activeFilterCount = (entitlementFilter !== 'all' ? 1 : 0) + (accountFilter !== 'all' ? 1 : 0);

    const handleResetFilters = () => {
        if (setEntitlementFilter) setEntitlementFilter('all');
        if (setAccountFilter) setAccountFilter('all');
    };

    return (
        <div className="rounded-3xl border border-stone-200/80 bg-white shadow-sm space-y-0 relative z-20">
            <FilterToolbarHeader
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={onTabChange}
                searchQuery={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Search name, role, station..."
                containerClassName="rounded-t-3xl border-0 p-3 sm:p-4 shadow-none bg-stone-50/40"
                extraActions={
                    <div className="flex items-center gap-2">
                        {/* Segmented View Switcher: List vs Cards */}
                        <div className="p-0.5 bg-stone-100/90 rounded-xl border border-stone-200/70 flex items-center h-[38px] shrink-0">
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`px-2.5 h-[30px] rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer ${
                                    viewMode === 'list'
                                        ? 'bg-white text-stone-900 shadow-2xs font-black'
                                        : 'text-stone-500 hover:text-stone-800 font-semibold'
                                }`}
                                title="List View"
                                aria-label="List View"
                            >
                                <List size={14} />
                                <span className="hidden sm:inline">List</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('cards')}
                                className={`px-2.5 h-[30px] rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer ${
                                    viewMode === 'cards'
                                        ? 'bg-white text-stone-900 shadow-2xs font-black'
                                        : 'text-stone-500 hover:text-stone-800 font-semibold'
                                }`}
                                title="Workstation Cards View"
                                aria-label="Workstation Cards View"
                            >
                                <LayoutGrid size={14} />
                                <span className="hidden sm:inline">Cards</span>
                            </button>
                        </div>

                        {/* Add Artisan Button */}
                        {canEditHrRecords && onAddClick && (
                            <button
                                type="button"
                                onClick={onAddClick}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-clay-600 px-3.5 h-[38px] min-h-[38px] text-xs font-bold text-white shadow-2xs transition hover:bg-clay-700 active:scale-95 shrink-0 cursor-pointer"
                            >
                                <UserPlus size={14} />
                                <span className="hidden sm:inline">Add Artisan</span>
                                <span className="sm:hidden">Add</span>
                            </button>
                        )}
                    </div>
                }
            />

            {/* Quick Status Sub-Bar */}
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white border-t border-stone-200/70 rounded-b-3xl relative">
                {/* Left: Quick Status Filters (in LikhangKamay Brown) */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {quickFilters.map((btn) => (
                        <button
                            key={btn.key}
                            type="button"
                            onClick={() => setFilterState(btn.key)}
                            className={`px-3 py-1.5 rounded-xl text-xs transition shrink-0 cursor-pointer ${
                                filterState === btn.key
                                    ? 'bg-clay-700 text-white shadow-2xs font-bold'
                                    : 'bg-stone-100/80 text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 font-semibold'
                            }`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* Right: Native LikhangKamay Filter Button with Popover */}
                <div className="relative shrink-0" ref={filterRef}>
                    <button
                        type="button"
                        onClick={() => setIsFilterOpen((prev) => !prev)}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 sm:px-3.5 h-[34px] min-h-[34px] text-xs font-bold transition-all shadow-2xs active:scale-[0.98] cursor-pointer ${
                            activeFilterCount > 0 || isFilterOpen
                                ? "bg-clay-700 text-white border-clay-700 shadow-clay-200"
                                : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                        }`}
                        aria-label="Filter directory records"
                    >
                        <SlidersHorizontal size={14} strokeWidth={2.2} />
                        <span>Filter</span>
                        {activeFilterCount > 0 && (
                            <span className="inline-flex items-center justify-center rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-black text-white">
                                {activeFilterCount}
                            </span>
                        )}
                        <ChevronDown
                            size={14}
                            strokeWidth={2.5}
                            className={`transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`}
                        />
                    </button>

                    {/* Desktop & Mobile Dropdown Popover */}
                    {isFilterOpen && (
                        <div className="absolute right-0 top-full mt-2 w-[300px] sm:w-[320px] rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl ring-1 ring-black/5 z-50 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <Filter size={15} className="text-clay-700" />
                                    <h3 className="text-xs font-bold text-stone-900">Filter Artisans</h3>
                                </div>
                                {activeFilterCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleResetFilters}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-500 hover:text-clay-700 transition cursor-pointer"
                                    >
                                        <RotateCcw size={12} />
                                        <span>Reset</span>
                                    </button>
                                )}
                            </div>

                            {/* Filter 1: System Capability / Entitlement */}
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                                    Granted Permission
                                </label>
                                <select
                                    value={entitlementFilter}
                                    onChange={(e) => setEntitlementFilter && setEntitlementFilter(e.target.value)}
                                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white cursor-pointer"
                                >
                                    <option value="all">All Granted Permissions</option>
                                    <option value="orders">Orders & Fulfillment Access</option>
                                    <option value="accounting">Finance & Accounting Access</option>
                                    <option value="procurement">Procurement & Inventory Access</option>
                                    <option value="hr">People & Payroll Access</option>
                                    <option value="catalog">Catalog & Products Access</option>
                                </select>
                            </div>

                            {/* Filter 2: Account & Attendance Method */}
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                                    Portal Account Status
                                </label>
                                <select
                                    value={accountFilter}
                                    onChange={(e) => setAccountFilter && setAccountFilter(e.target.value)}
                                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white cursor-pointer"
                                >
                                    <option value="all">All Account Statuses</option>
                                    <option value="portal">Active Portal Accounts (Clock-In)</option>
                                    <option value="manual">No Portal Login (Manual Attendance)</option>
                                    <option value="suspended">Suspended Workspace Access</option>
                                </select>
                            </div>

                            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                                <span className="text-xs text-stone-500 font-medium">
                                    Matching: <strong className="text-stone-800 font-bold">{totalCount}</strong>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsFilterOpen(false)}
                                    className="rounded-xl bg-clay-700 hover:bg-clay-800 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-clay-200 transition active:scale-95 cursor-pointer"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

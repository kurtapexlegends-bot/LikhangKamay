import React, { useState } from 'react';
import { Search, ChevronDown, Filter, X } from 'lucide-react';
import StickyActionBar from '@/Components/StickyActionBar';
import SlideOverDrawer from '@/Components/SlideOverDrawer';

export default function AuditLogFilters({
    searchTerm,
    setSearchTerm,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedCategory,
    setSelectedCategory,
    selectedModule,
    setSelectedModule,
    selectedStatus,
    setSelectedStatus,
    selectedSeverity,
    setSelectedSeverity,
    selectedActor,
    setSelectedActor,
    resetFilters,
    categoryOptions,
    moduleOptions,
    statusOptions,
    severityOptions,
    actorOptions,
    moduleLabel,
    actorTypeLabel,
    formatStatusLabel,
    filteredCount,
}) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Calculate count of active filters (excluding defaults)
    const activeFiltersCount = [
        selectedCategory !== 'all',
        selectedModule !== 'all',
        selectedStatus !== 'all',
        selectedSeverity !== 'all',
        selectedActor !== 'all',
        !!startDate,
        !!endDate,
    ].filter(Boolean).length;

    const filtersContent = (
        <div className="space-y-4">
            {/* Date range inputs */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 flex items-center bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-clay-100 focus-within:border-clay-500 transition-all h-[44px] sm:h-[38px]">
                    <DateInput label="From" value={startDate} onChange={setStartDate} />
                    <div className="h-full w-px bg-stone-200 shrink-0"></div>
                    <DateInput label="To" value={endDate} onChange={setEndDate} />
                </div>
            </div>

            {/* Select options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 lg:grid-cols-5">
                <FilterSelect
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    options={categoryOptions.map((option) => [option.key, option.label])}
                />
                <FilterSelect
                    value={selectedModule}
                    onChange={setSelectedModule}
                    options={moduleOptions.map((option) => [
                        option,
                        option === 'all' ? 'All modules' : (moduleLabel[option] || formatStatusLabel(option))
                    ])}
                />
                <FilterSelect
                    value={selectedStatus}
                    onChange={setSelectedStatus}
                    options={statusOptions.map((option) => [
                        option,
                        option === 'all' ? 'All statuses' : formatStatusLabel(option)
                    ])}
                />
                <FilterSelect
                    value={selectedSeverity}
                    onChange={setSelectedSeverity}
                    options={severityOptions.map((option) => [
                        option,
                        option === 'all' ? 'All severities' : formatStatusLabel(option)
                    ])}
                />
                <FilterSelect
                    value={selectedActor}
                    onChange={setSelectedActor}
                    options={actorOptions.map((option) => [
                        option,
                        option === 'all' ? 'All actors' : (actorTypeLabel[option] || formatStatusLabel(option))
                    ])}
                />
            </div>
        </div>
    );

    return (
        <>
            {/* 1. Desktop Inline Filters Layout (Visible on lg viewports and above) */}
            <div className="hidden lg:block px-5 py-4 sm:px-8 border-b border-stone-100 bg-[#FCF7F2]/30">
                {/* Search Bar Row */}
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <label className="relative flex-1 block w-full">
                        <Search size={16} strokeWidth={2.5} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search details, actor, subject, reference..."
                            className="w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 py-2.5 text-sm font-bold text-stone-900 shadow-sm outline-none transition-all focus:border-clay-500 focus:ring-2 focus:ring-clay-100 placeholder:font-medium placeholder:text-stone-400 hover:border-stone-300"
                        />
                    </label>

                    <div className="flex items-center gap-4 shrink-0 justify-end">
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="text-xs font-bold text-stone-500 hover:text-clay-700 transition min-h-[44px]"
                        >
                            Reset filters
                        </button>
                        <span className="inline-flex items-center rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-bold uppercase tracking-widest text-stone-600 shadow-sm">
                            {filteredCount} Visible
                        </span>
                    </div>
                </div>

                {/* Inline filter dropdowns */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                    <div className="sm:col-span-2 xl:col-span-3 flex items-center bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-clay-100 focus-within:border-clay-500 transition-all h-[38px]">
                        <DateInput label="From" value={startDate} onChange={setStartDate} />
                        <div className="h-full w-px bg-stone-200 shrink-0"></div>
                        <DateInput label="To" value={endDate} onChange={setEndDate} />
                    </div>
                    
                    <FilterSelect value={selectedCategory} onChange={setSelectedCategory} options={categoryOptions.map((option) => [option.key, option.label])} />
                    <FilterSelect value={selectedModule} onChange={setSelectedModule} options={moduleOptions.map((option) => [option, option === 'all' ? 'All modules' : (moduleLabel[option] || formatStatusLabel(option))])} />
                    <FilterSelect value={selectedStatus} onChange={setSelectedStatus} options={statusOptions.map((option) => [option, option === 'all' ? 'All statuses' : formatStatusLabel(option)])} />
                    <FilterSelect value={selectedSeverity} onChange={setSelectedSeverity} options={severityOptions.map((option) => [option, option === 'all' ? 'All severities' : formatStatusLabel(option)])} />
                    <FilterSelect value={selectedActor} onChange={setSelectedActor} options={actorOptions.map((option) => [option, option === 'all' ? 'All actors' : (actorTypeLabel[option] || formatStatusLabel(option))])} />
                </div>
            </div>

            {/* 2. Mobile Toolbar (inline search for quick utility above table) */}
            <div className="block lg:hidden px-5 py-4 border-b border-stone-100 bg-[#FCF7F2]/30">
                <label className="relative block w-full">
                    <Search size={16} strokeWidth={2.5} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search workspace logs..."
                        className="w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 py-2.5 text-sm font-bold text-stone-900 shadow-sm outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-100 min-h-[44px]"
                    />
                </label>
            </div>

            {/* 3. Mobile Sticky Bottom Action Bar (Triggers bottom-sheet filter drawer) */}
            <StickyActionBar className="lg:hidden">
                <button
                    type="button"
                    onClick={() => setIsDrawerOpen(true)}
                    className="flex-1 flex h-11 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 shadow-sm active:scale-95 transition"
                >
                    <Filter size={16} />
                    <span>Filter Logs</span>
                    {activeFiltersCount > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center rounded-full bg-clay-700 px-1.5 py-0.5 text-[10px] font-black text-white">
                            {activeFiltersCount}
                        </span>
                    )}
                </button>

                {activeFiltersCount > 0 && (
                    <button
                        type="button"
                        onClick={resetFilters}
                        className="flex-1 flex h-11 items-center justify-center gap-1.5 rounded-xl bg-stone-100 px-4 text-xs font-bold text-stone-700 active:scale-95 transition hover:bg-stone-200"
                    >
                        <X size={16} />
                        <span>Clear Filters</span>
                    </button>
                )}
            </StickyActionBar>

            {/* 4. Mobile Bottom-Sheet Filter Drawer */}
            <SlideOverDrawer
                show={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                title="Filter Ledger Events"
                position="bottom"
                widthClass="max-w-xl"
                footer={
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                resetFilters();
                                setIsDrawerOpen(false);
                            }}
                            className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-bold text-stone-700 min-h-[44px]"
                        >
                            Reset All
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsDrawerOpen(false)}
                            className="flex-1 rounded-xl bg-clay-700 py-2.5 text-xs font-bold text-white shadow-lg shadow-clay-200 min-h-[44px]"
                        >
                            Apply Filters ({filteredCount} matches)
                        </button>
                    </div>
                }
            >
                <div className="py-2">
                    {filtersContent}
                </div>
            </SlideOverDrawer>
        </>
    );
}

function FilterSelect({ value, onChange, options }) {
    return (
        <label className="relative block h-[44px] sm:h-[38px] w-full">
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full h-full appearance-none rounded-xl border border-stone-200 bg-white pl-3 pr-8 text-xs font-bold text-stone-700 shadow-sm outline-none transition-all focus:border-clay-500 focus:ring-2 focus:ring-clay-100 hover:border-stone-300 hover:bg-stone-50 cursor-pointer min-h-[44px] sm:min-h-[38px]"
            >
                {options.map(([optionValue, optionLabel]) => (
                    <option key={optionValue} value={optionValue}>
                        {optionLabel}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400">
                <ChevronDown size={14} strokeWidth={2.5} />
            </div>
        </label>
    );
}

function DateInput({ label, value, onChange }) {
    return (
        <label className="flex flex-1 h-full items-center gap-2 px-3 hover:bg-stone-50 transition cursor-pointer min-h-[44px] sm:min-h-[38px]">
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 shrink-0">{label}</span>
            <input
                type="date"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="flex-1 w-full bg-transparent text-xs font-bold text-stone-700 border-none outline-none focus:ring-0 p-0"
            />
        </label>
    );
}

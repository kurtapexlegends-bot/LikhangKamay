import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Filter, X, Calendar, RotateCcw, SlidersHorizontal } from 'lucide-react';
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
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const popoverRef = useRef(null);

    // Draft local filter states (staged until 'Apply & Close' is clicked)
    const [draftStartDate, setDraftStartDate] = useState(startDate);
    const [draftEndDate, setDraftEndDate] = useState(endDate);
    const [draftCategory, setDraftCategory] = useState(selectedCategory);
    const [draftModule, setDraftModule] = useState(selectedModule);
    const [draftStatus, setDraftStatus] = useState(selectedStatus);
    const [draftSeverity, setDraftSeverity] = useState(selectedSeverity);
    const [draftActor, setDraftActor] = useState(selectedActor);

    // Sync draft states whenever active parent filters change or panel opens
    const syncDraftsFromProps = () => {
        setDraftStartDate(startDate);
        setDraftEndDate(endDate);
        setDraftCategory(selectedCategory);
        setDraftModule(selectedModule);
        setDraftStatus(selectedStatus);
        setDraftSeverity(selectedSeverity);
        setDraftActor(selectedActor);
    };

    // Apply staged draft filters to active parent state
    const applyDrafts = () => {
        setStartDate(draftStartDate);
        setEndDate(draftEndDate);
        setSelectedCategory(draftCategory);
        setSelectedModule(draftModule);
        setSelectedStatus(draftStatus);
        setSelectedSeverity(draftSeverity);
        setSelectedActor(draftActor);
        setIsPopoverOpen(false);
        setIsDrawerOpen(false);
    };

    // Reset staged draft filters
    const resetDrafts = () => {
        setDraftStartDate('');
        setDraftEndDate('');
        setDraftCategory('all');
        setDraftModule('all');
        setDraftStatus('all');
        setDraftSeverity('all');
        setDraftActor('all');
    };

    // Open popover or drawer with synchronized drafts
    const handleOpenFilters = () => {
        syncDraftsFromProps();
        if (window.innerWidth < 1024) {
            setIsDrawerOpen(true);
        } else {
            setIsPopoverOpen((prev) => !prev);
        }
    };

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

    // Calculate draft active filters count
    const draftActiveCount = [
        draftCategory !== 'all',
        draftModule !== 'all',
        draftStatus !== 'all',
        draftSeverity !== 'all',
        draftActor !== 'all',
        !!draftStartDate,
        !!draftEndDate,
    ].filter(Boolean).length;

    // Handle outside clicks to close desktop popover without applying unsubmitted changes
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsPopoverOpen(false);
            }
        };
        if (isPopoverOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isPopoverOpen]);

    // Active Filter Tag Pills Definition
    const activeTags = [];
    if (selectedCategory !== 'all') {
        const cat = categoryOptions.find(c => c.key === selectedCategory);
        activeTags.push({
            id: 'category',
            label: `Category: ${cat ? cat.label : selectedCategory}`,
            onRemove: () => setSelectedCategory('all'),
        });
    }
    if (selectedModule !== 'all') {
        activeTags.push({
            id: 'module',
            label: `Module: ${moduleLabel[selectedModule] || formatStatusLabel(selectedModule)}`,
            onRemove: () => setSelectedModule('all'),
        });
    }
    if (selectedStatus !== 'all') {
        activeTags.push({
            id: 'status',
            label: `Status: ${formatStatusLabel(selectedStatus)}`,
            onRemove: () => setSelectedStatus('all'),
        });
    }
    if (selectedSeverity !== 'all') {
        activeTags.push({
            id: 'severity',
            label: `Severity: ${formatStatusLabel(selectedSeverity)}`,
            onRemove: () => setSelectedSeverity('all'),
        });
    }
    if (selectedActor !== 'all') {
        activeTags.push({
            id: 'actor',
            label: `Actor: ${actorTypeLabel[selectedActor] || formatStatusLabel(selectedActor)}`,
            onRemove: () => setSelectedActor('all'),
        });
    }
    if (startDate) {
        activeTags.push({
            id: 'startDate',
            label: `From: ${startDate}`,
            onRemove: () => setStartDate(''),
        });
    }
    if (endDate) {
        activeTags.push({
            id: 'endDate',
            label: `To: ${endDate}`,
            onRemove: () => setEndDate(''),
        });
    }

    const filterFieldsGrid = (
        <div className="space-y-4">
            {/* 1. Date Range Section */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Date Range
                </label>
                <div className="flex items-center bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-clay-100 focus-within:border-clay-500 transition-all h-[42px]">
                    <DateInput label="From" value={draftStartDate} onChange={setDraftStartDate} />
                    <div className="h-full w-px bg-stone-200 shrink-0"></div>
                    <DateInput label="To" value={draftEndDate} onChange={setDraftEndDate} />
                </div>
            </div>

            {/* 2. Categorization Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                        Category
                    </label>
                    <FilterSelect
                        value={draftCategory}
                        onChange={setDraftCategory}
                        options={categoryOptions.map((option) => [option.key, option.label])}
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                        Module
                    </label>
                    <FilterSelect
                        value={draftModule}
                        onChange={setDraftModule}
                        options={moduleOptions.map((option) => [
                            option,
                            option === 'all' ? 'All modules' : (moduleLabel[option] || formatStatusLabel(option))
                        ])}
                    />
                </div>
            </div>

            {/* 3. Event Specs Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                        Status
                    </label>
                    <FilterSelect
                        value={draftStatus}
                        onChange={setDraftStatus}
                        options={statusOptions.map((option) => [
                            option,
                            option === 'all' ? 'All statuses' : formatStatusLabel(option)
                        ])}
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                        Severity
                    </label>
                    <FilterSelect
                        value={draftSeverity}
                        onChange={setDraftSeverity}
                        options={severityOptions.map((option) => [
                            option,
                            option === 'all' ? 'All severities' : formatStatusLabel(option)
                        ])}
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                        Actor Type
                    </label>
                    <FilterSelect
                        value={draftActor}
                        onChange={setDraftActor}
                        options={actorOptions.map((option) => [
                            option,
                            option === 'all' ? 'All actors' : (actorTypeLabel[option] || formatStatusLabel(option))
                        ])}
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className="border-b border-stone-100 bg-[#FCF7F2]/30 px-5 py-4 sm:px-8">
            {/* Top Toolbar Row */}
            <div className="flex flex-col md:flex-row items-center gap-3">
                {/* Search Input */}
                <label className="relative flex-1 block w-full">
                    <Search size={16} strokeWidth={2.5} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search details, actor, subject, reference..."
                        className="w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 py-2.5 text-sm font-bold text-stone-900 shadow-sm outline-none transition-all focus:border-clay-500 focus:ring-2 focus:ring-clay-100 placeholder:font-medium placeholder:text-stone-400 hover:border-stone-300 h-[44px]"
                    />
                </label>

                {/* Filter Controls Row */}
                <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-between md:justify-end">
                    {/* Unified Popover Trigger Button (Desktop & Tablet) */}
                    <div className="relative inline-block text-left" ref={popoverRef}>
                        <button
                            type="button"
                            onClick={handleOpenFilters}
                            className={`inline-flex h-[44px] items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition-all shadow-sm active:scale-95 ${
                                activeFiltersCount > 0
                                    ? 'bg-clay-700 text-white border-clay-800 shadow-clay-200 hover:bg-clay-800'
                                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                            }`}
                        >
                            <SlidersHorizontal size={15} strokeWidth={2.2} />
                            <span>Filters</span>
                            {activeFiltersCount > 0 && (
                                <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-black text-white">
                                    {activeFiltersCount}
                                </span>
                            )}
                            <ChevronDown size={14} strokeWidth={2.5} className={`transition-transform duration-200 ${isPopoverOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Desktop Popover Card */}
                        {isPopoverOpen && (
                            <div className="hidden lg:block absolute right-0 z-30 mt-2 w-[520px] rounded-2xl border border-stone-200 bg-white p-5 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                                <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Filter size={15} className="text-clay-700" />
                                        <h3 className="text-sm font-bold text-stone-900">Filter Activity Logs</h3>
                                    </div>
                                    {draftActiveCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={resetDrafts}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-500 hover:text-clay-700 transition"
                                        >
                                            <RotateCcw size={12} />
                                            <span>Reset Selection</span>
                                        </button>
                                    )}
                                </div>

                                {filterFieldsGrid}

                                <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setIsPopoverOpen(false)}
                                        className="rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={applyDrafts}
                                        className="rounded-xl bg-clay-700 px-5 py-2 text-xs font-bold text-white shadow-md shadow-clay-200 hover:bg-clay-800 transition active:scale-95"
                                    >
                                        Apply & Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reset Button (visible when active filters applied) */}
                    {activeFiltersCount > 0 && (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-clay-700 transition px-2 py-2"
                        >
                            <RotateCcw size={13} />
                            <span>Reset</span>
                        </button>
                    )}

                    {/* Visible Count Badge */}
                    <span className="inline-flex items-center rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-stone-600 shadow-sm h-[44px]">
                        {filteredCount} Visible
                    </span>
                </div>
            </div>

            {/* Active Filter Tag Pills */}
            {activeTags.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-stone-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mr-1">
                        Active Filters:
                    </span>
                    {activeTags.map((tag) => (
                        <span
                            key={tag.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm transition hover:border-stone-300"
                        >
                            <span>{tag.label}</span>
                            <button
                                type="button"
                                onClick={tag.onRemove}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                                title="Remove filter"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    ))}
                    <button
                        type="button"
                        onClick={resetFilters}
                        className="text-[11px] font-bold text-clay-700 hover:underline ml-1"
                    >
                        Clear All
                    </button>
                </div>
            )}

            {/* Mobile Sticky Action Bar */}
            <StickyActionBar className="lg:hidden">
                <button
                    type="button"
                    onClick={handleOpenFilters}
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

            {/* Mobile Bottom-Sheet Filter Drawer */}
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
                                resetDrafts();
                                resetFilters();
                                setIsDrawerOpen(false);
                            }}
                            className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-bold text-stone-700 min-h-[44px]"
                        >
                            Reset All
                        </button>
                        <button
                            type="button"
                            onClick={applyDrafts}
                            className="flex-1 rounded-xl bg-clay-700 py-2.5 text-xs font-bold text-white shadow-lg shadow-clay-200 min-h-[44px]"
                        >
                            Apply Filters
                        </button>
                    </div>
                }
            >
                <div className="py-2">
                    {filterFieldsGrid}
                </div>
            </SlideOverDrawer>
        </div>
    );
}

function FilterSelect({ value, onChange, options }) {
    return (
        <label className="relative block h-[42px] w-full">
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full h-full appearance-none rounded-xl border border-stone-200 bg-white pl-3 pr-8 text-xs font-bold text-stone-700 shadow-sm outline-none transition-all focus:border-clay-500 focus:ring-2 focus:ring-clay-100 hover:border-stone-300 hover:bg-stone-50 cursor-pointer min-h-[42px]"
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
        <label className="flex flex-1 h-full items-center gap-2 px-3 hover:bg-stone-50 transition cursor-pointer min-h-[42px]">
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

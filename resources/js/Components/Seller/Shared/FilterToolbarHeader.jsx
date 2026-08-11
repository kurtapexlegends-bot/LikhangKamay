import React, { useState, useRef, useEffect } from "react";
import { Search, X, SlidersHorizontal, ChevronDown, Filter, RotateCcw } from "lucide-react";
import SlideOverDrawer from "@/Components/SlideOverDrawer";

/**
 * FilterToolbarHeader
 * Standardized single-row filter toolbar across all LikhangKamay seller modules.
 */
export default function FilterToolbarHeader({
    tabs = [],
    activeTab,
    onTabChange,
    searchQuery = "",
    onSearchChange,
    searchPlaceholder = "Search records...",
    isSearching = false,
    activeFiltersCount = 0,
    filterPopoverTitle = "Filter Records",
    filterPopoverFields = null,
    onApplyFilters = null,
    onResetFilters = null,
    activeFilterTags = [],
    extraActions = null,
    containerClassName = "",
}) {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const popoverRef = useRef(null);

    // Close desktop popover on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setIsPopoverOpen(false);
            }
        };
        if (isPopoverOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isPopoverOpen]);

    const handleOpenFilters = () => {
        if (window.innerWidth < 640) {
            setIsDrawerOpen(true);
        } else {
            setIsPopoverOpen((prev) => !prev);
        }
    };

    const hasActiveFiltersOrSearch = activeFiltersCount > 0 || (searchQuery && searchQuery.trim() !== "");

    return (
        <div className={`bg-white rounded-2xl sm:rounded-3xl border border-stone-200/80 p-3 sm:p-4 shadow-xs space-y-3 ${containerClassName}`}>
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 min-w-0">
                {/* Segmented Tab Pill Track */}
                {tabs && tabs.length > 0 && (
                    <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none py-0.5">
                        <div className="p-1 bg-stone-100/70 rounded-2xl inline-flex items-center gap-1">
                            {tabs.map((tab) => {
                                const tabKey = typeof tab === "object" ? tab.key || tab.id || tab.label : tab;
                                const tabLabel = typeof tab === "object" ? tab.label : tab;
                                const tabCount = typeof tab === "object" ? tab.count : null;
                                const isActive = activeTab === tabKey || activeTab === tabLabel;

                                return (
                                    <button
                                        key={tabKey}
                                        type="button"
                                        onClick={() => onTabChange && onTabChange(tabKey)}
                                        className={`px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 min-h-[38px] sm:min-h-0 ${
                                            isActive
                                                ? "bg-white text-clay-800 shadow-xs font-black"
                                                : "text-stone-500 hover:text-stone-800 font-semibold"
                                        }`}
                                    >
                                        <span className="whitespace-nowrap">{tabLabel}</span>
                                        {tabCount !== null && tabCount !== undefined && tabCount > 0 && (
                                            <span
                                                className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                                                    isActive ? "bg-clay-100 text-clay-800" : "bg-stone-200 text-stone-600"
                                                }`}
                                            >
                                                {tabCount}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Search Input, Actions, and Filter Button */}
                <div className="flex items-center gap-2 shrink-0 justify-end">
                    {/* Search Input */}
                    {onSearchChange && (
                        <div className="relative w-36 sm:w-48 md:w-56 lg:w-64 shrink-0">
                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl border border-stone-200/80 outline-none focus:border-clay-500 focus:ring-1 focus:ring-clay-500 bg-white min-h-[44px] md:min-h-0"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => onSearchChange("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                                    title="Clear search"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Extra Right Actions (e.g. Select Page, Export, Reset) */}
                    {extraActions}

                    {/* Desktop & Mobile Filter Button (if filter fields provided) */}
                    {filterPopoverFields && (
                        <div className="relative shrink-0" ref={popoverRef}>
                            <button
                                type="button"
                                onClick={handleOpenFilters}
                                className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shadow-2xs min-h-[44px] sm:min-h-[38px] active:scale-[0.98] ${
                                    activeFiltersCount > 0 || isPopoverOpen
                                        ? "bg-clay-700 text-white border-clay-700 shadow-clay-200"
                                        : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                                }`}
                            >
                                <SlidersHorizontal size={14} strokeWidth={2.2} />
                                <span>Filter</span>
                                {activeFiltersCount > 0 && (
                                    <span className="inline-flex items-center justify-center rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-black text-white">
                                        {activeFiltersCount}
                                    </span>
                                )}
                                <ChevronDown
                                    size={14}
                                    strokeWidth={2.5}
                                    className={`transition-transform duration-200 ${isPopoverOpen ? "rotate-180" : ""}`}
                                />
                            </button>

                            {/* Desktop Dropdown Popover */}
                            {isPopoverOpen && (
                                <div className="hidden sm:flex flex-col absolute right-0 z-50 mt-2 w-[340px] sm:w-[380px] rounded-2xl border border-stone-200 bg-white p-4 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
                                        <div className="flex items-center gap-2">
                                            <Filter size={15} className="text-clay-700" />
                                            <h3 className="text-xs font-bold text-stone-900">{filterPopoverTitle}</h3>
                                        </div>
                                        {onResetFilters && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onResetFilters();
                                                    setIsPopoverOpen(false);
                                                }}
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-500 hover:text-clay-700 transition"
                                            >
                                                <RotateCcw size={12} />
                                                <span>Reset</span>
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">{filterPopoverFields}</div>

                                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => setIsPopoverOpen(false)}
                                            className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-50 transition"
                                        >
                                            Cancel
                                        </button>
                                        {onApplyFilters && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onApplyFilters();
                                                    setIsPopoverOpen(false);
                                                }}
                                                className="rounded-xl bg-clay-700 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-clay-200 hover:bg-clay-800 transition active:scale-95"
                                            >
                                                Apply Filters
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reset Button (when active filters exist and no popover) */}
                    {!filterPopoverFields && hasActiveFiltersOrSearch && onResetFilters && (
                        <button
                            type="button"
                            onClick={onResetFilters}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition shadow-2xs min-h-[44px] sm:min-h-[38px] shrink-0 active:scale-[0.98]"
                            title="Reset filters"
                        >
                            <RotateCcw size={13} />
                            <span className="hidden sm:inline">Reset</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Active Filter Tags Bar */}
            {activeFilterTags && activeFilterTags.length > 0 && (
                <div className="px-1 pt-2 border-t border-stone-100 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Active Filters:</span>
                    {activeFilterTags.map((tag, idx) => (
                        <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-xs"
                        >
                            <span>{tag.label}</span>
                            {tag.onRemove && (
                                <button
                                    type="button"
                                    onClick={tag.onRemove}
                                    className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </span>
                    ))}
                    {onResetFilters && (
                        <button type="button" onClick={onResetFilters} className="text-[11px] font-bold text-clay-700 hover:underline ml-1">
                            Clear All
                        </button>
                    )}
                </div>
            )}

            {/* Mobile Bottom-Sheet Filter Drawer */}
            {filterPopoverFields && (
                <SlideOverDrawer
                    show={isDrawerOpen}
                    onClose={() => setIsDrawerOpen(false)}
                    title={filterPopoverTitle}
                    position="bottom"
                    widthClass="max-w-md"
                    footer={
                        <div className="flex items-center gap-3">
                            {onResetFilters && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onResetFilters();
                                        setIsDrawerOpen(false);
                                    }}
                                    className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-bold text-stone-700 min-h-[44px]"
                                >
                                    Reset All
                                </button>
                            )}
                            {onApplyFilters && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onApplyFilters();
                                        setIsDrawerOpen(false);
                                    }}
                                    className="flex-1 rounded-xl bg-clay-700 py-2.5 text-xs font-bold text-white shadow-lg shadow-clay-200 min-h-[44px]"
                                >
                                    Apply Filters
                                </button>
                            )}
                        </div>
                    }
                >
                    <div className="py-2 space-y-4">{filterPopoverFields}</div>
                </SlideOverDrawer>
            )}
        </div>
    );
}

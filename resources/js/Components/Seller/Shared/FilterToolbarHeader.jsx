import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, SlidersHorizontal, ChevronDown, Filter, RotateCcw, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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

    // Horizontal scroll and hitbox support for segmented tabs
    const tabsContainerRef = useRef(null);
    const isDraggingRef = useRef(false);
    const startXRef = useRef(0);
    const scrollLeftRef = useRef(0);
    const hasDraggedRef = useRef(false);

    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScrollBounds = useCallback(() => {
        const el = tabsContainerRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }, []);

    useEffect(() => {
        const el = tabsContainerRef.current;
        if (!el) return;

        checkScrollBounds();
        el.addEventListener("scroll", checkScrollBounds, { passive: true });

        // Wheel to horizontal scroll
        const handleWheel = (e) => {
            if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            }
        };
        el.addEventListener("wheel", handleWheel, { passive: false });

        const handleResize = () => checkScrollBounds();
        window.addEventListener("resize", handleResize);

        return () => {
            el.removeEventListener("scroll", checkScrollBounds);
            el.removeEventListener("wheel", handleWheel);
            window.removeEventListener("resize", handleResize);
        };
    }, [checkScrollBounds, tabs]);

    // Auto-scroll active tab into view smoothly
    useEffect(() => {
        if (!tabsContainerRef.current) return;
        const activeBtn = tabsContainerRef.current.querySelector('[data-active="true"]');
        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
    }, [activeTab]);

    const handleScrollStep = (direction) => {
        if (!tabsContainerRef.current) return;
        const offset = direction === "left" ? -180 : 180;
        tabsContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    };

    const handleMouseDown = (e) => {
        const el = tabsContainerRef.current;
        if (!el || el.scrollWidth <= el.clientWidth) return;
        if (e.button !== 0) return;
        isDraggingRef.current = true;
        hasDraggedRef.current = false;
        startXRef.current = e.pageX - el.offsetLeft;
        scrollLeftRef.current = el.scrollLeft;
    };

    const handleMouseMove = (e) => {
        if (!isDraggingRef.current || !tabsContainerRef.current) return;
        const el = tabsContainerRef.current;
        const x = e.pageX - el.offsetLeft;
        const walk = x - startXRef.current;
        if (Math.abs(walk) > 4) {
            hasDraggedRef.current = true;
        }
        el.scrollLeft = scrollLeftRef.current - walk;
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
    };

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
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 min-w-0">
                {/* Segmented Tab Pill Track */}
                {tabs && tabs.length > 0 && (
                    <div className="relative flex-1 min-w-0 flex items-center group/tabtrack">
                        {/* Scroll Left Button */}
                        {canScrollLeft && (
                            <button
                                type="button"
                                onClick={() => handleScrollStep("left")}
                                className="absolute left-0 z-20 hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-white/95 border border-stone-200/90 shadow-sm text-stone-600 hover:text-stone-900 cursor-pointer transition-all active:scale-90 hover:bg-stone-50"
                                aria-label="Scroll tabs left"
                            >
                                <ChevronLeft size={13} strokeWidth={2.5} />
                            </button>
                        )}

                        {/* Scroll Container */}
                        <div
                            ref={tabsContainerRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            className="flex-1 min-w-0 overflow-x-auto no-scrollbar scrollbar-hide py-1 -my-1 overscroll-x-contain touch-pan-x select-none"
                        >
                            <div className="h-[38px] p-1 bg-stone-100/80 rounded-xl inline-flex items-center gap-1 shrink-0 snap-x border border-stone-200/60 box-border">
                                {tabs.map((tab) => {
                                    const tabKey = typeof tab === "object" ? tab.key || tab.id || tab.label : tab;
                                    const tabLabel = typeof tab === "object" ? tab.label : tab;
                                    const tabCount = typeof tab === "object" ? tab.count : null;
                                    const isActive = activeTab === tabKey || activeTab === tabLabel;

                                    return (
                                        <button
                                            key={tabKey}
                                            type="button"
                                            data-active={isActive ? "true" : "false"}
                                            onClick={() => {
                                                if (!hasDraggedRef.current && onTabChange) {
                                                    onTabChange(tabKey);
                                                }
                                            }}
                                            className={`px-3.5 h-[30px] rounded-lg text-xs transition-all inline-flex items-center justify-center gap-1.5 shrink-0 snap-start select-none cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 focus-visible:ring-offset-1 ${
                                                isActive
                                                    ? "bg-white text-clay-800 shadow-2xs font-black"
                                                    : "text-stone-500 hover:text-stone-800 hover:bg-stone-200/50 font-semibold"
                                            }`}
                                        >
                                            <span className="whitespace-nowrap pointer-events-none">{tabLabel}</span>
                                            {tabCount !== null && tabCount !== undefined && tabCount > 0 && (
                                                <span
                                                    className={`px-1.5 py-0.5 text-[10px] rounded-full font-black pointer-events-none ${
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

                        {/* Scroll Right Button */}
                        {canScrollRight && (
                            <button
                                type="button"
                                onClick={() => handleScrollStep("right")}
                                className="absolute right-0 z-20 hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-white/95 border border-stone-200/90 shadow-sm text-stone-600 hover:text-stone-900 cursor-pointer transition-all active:scale-90 hover:bg-stone-50"
                                aria-label="Scroll tabs right"
                            >
                                <ChevronRight size={13} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>
                )}

                {/* Search Input, Actions, and Filter Button */}
                <div className="flex items-center gap-2 flex-1 md:flex-initial shrink-0 justify-end min-w-0 h-[38px]">
                    {/* Search Input */}
                    {onSearchChange && (
                        <div className="relative flex-1 md:flex-initial md:w-56 lg:w-64 min-w-0">
                            {isSearching ? (
                                <Loader2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-clay-500 animate-spin" />
                            ) : (
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                            )}
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full pl-9 pr-9 py-2 text-xs font-medium rounded-xl border border-stone-200/80 outline-none focus:border-clay-500 focus:ring-1 focus:ring-clay-500 bg-white h-[38px] min-h-[38px]"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => onSearchChange("")}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors rounded-lg cursor-pointer"
                                    title="Clear search"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Desktop & Mobile Filter Button (if filter fields provided) */}
                    {filterPopoverFields && (
                        <div className="relative shrink-0" ref={popoverRef}>
                            <button
                                type="button"
                                onClick={handleOpenFilters}
                                className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 sm:px-3.5 h-[38px] min-h-[38px] text-xs font-bold transition-all shadow-2xs active:scale-[0.98] ${
                                    activeFiltersCount > 0 || isPopoverOpen
                                        ? "bg-clay-700 text-white border-clay-700 shadow-clay-200"
                                        : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                                }`}
                            >
                                <SlidersHorizontal size={14} strokeWidth={2.2} />
                                <span className="hidden xs:inline sm:inline">Filter</span>
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
                                <div className="hidden sm:flex flex-col absolute right-0 z-50 mt-2 w-[310px] sm:w-[330px] rounded-2xl border border-stone-200 bg-white p-3.5 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 mb-2.5">
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

                    {/* Extra Right Actions (e.g. Navigation Links, Primary CTA) */}
                    {extraActions && (
                        <div className="shrink-0 flex items-center">
                            {extraActions}
                        </div>
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

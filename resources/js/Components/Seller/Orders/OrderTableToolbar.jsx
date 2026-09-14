import React from "react";
import { Link } from "@inertiajs/react";
import {
    Search,
    X,
    Check,
    SlidersHorizontal,
    ChevronDown,
    LoaderCircle,
    Printer,
    Info,
} from "lucide-react";
import ExportButton from "@/Components/ExportButton";

export default function OrderTableToolbar({
    searchInputRef,
    searchQuery,
    handleSearch,
    isSearching = false,
    toggleSelectAll,
    selectedOrderIds = [],
    paginatedOrders = [],
    handleOpenFilters,
    activeFiltersCount = 0,
    isPopoverOpen = false,
    popoverRef,
    children,
}) {
    const isAllSelected = selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0;

    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-stone-100 bg-[#FCFAF7]/40 p-3.5">
            {/* Left: Minimal Wholesale Info Icon + Search Input */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="relative group shrink-0">
                    <Link
                        href={route("seller.supply-hub.sales")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                        title="Orders for your workshop supplies are managed in the Supply Hub"
                    >
                        <Info size={16} />
                    </Link>
                    <div className="pointer-events-none absolute left-0 top-full mt-1.5 hidden w-56 rounded-xl border border-stone-800 bg-stone-900 px-3 py-2 text-[11px] font-medium text-stone-200 shadow-xl group-hover:block z-30">
                        <span className="font-bold text-white block mb-0.5">Supplies Sold (Supply Hub)</span>
                        Orders placed by peer artisans for your workshop supplies are managed in the Supply Hub &rarr;
                    </div>
                </div>

                {/* Search Input */}
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search order ID, buyer, address, or item (Press '/' to focus)..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-white border border-stone-200 rounded-xl text-xs hover:border-stone-300 focus:ring-4 focus:ring-clay-500/10 focus:border-clay-500 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-h-[38px]"
                    />
                    {isSearching ? (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-clay-600">
                            <LoaderCircle size={13} className="animate-spin" />
                        </div>
                    ) : searchQuery ? (
                        <button
                            onClick={() => handleSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition active:scale-90"
                            title="Clear search"
                            type="button"
                        >
                            <X size={12} />
                        </button>
                    ) : (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:flex items-center gap-0.5 text-[9px] font-extrabold text-stone-300 bg-stone-100/80 border border-stone-200/60 px-1.5 py-0.5 rounded-md">
                            /
                        </div>
                    )}
                </div>
            </div>

            {/* Right Controls: Select All Page + Export + Filters Popover */}
            <div className="flex items-center gap-2.5">
                {/* Select All Page Checkbox */}
                <label className="inline-flex h-[38px] items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 hover:border-stone-300 hover:bg-stone-50 transition cursor-pointer select-none shadow-sm shrink-0">
                    <button
                        type="button"
                        onClick={toggleSelectAll}
                        className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                            isAllSelected
                                ? "border-clay-600 bg-clay-600 text-white"
                                : "border-stone-300 bg-white"
                        }`}
                        aria-label={isAllSelected ? "Deselect all page" : "Select all page"}
                    >
                        {isAllSelected && (
                            <Check size={12} strokeWidth={3.5} />
                        )}
                    </button>
                    <span>{isAllSelected ? "Deselect Page" : "Select Page"}</span>
                </label>

                {/* Export Button */}
                <ExportButton
                    href={route("orders.export")}
                    icon={Printer}
                    variant="secondary"
                    className="h-[38px] min-h-[38px] px-3.5 rounded-xl shadow-2xs font-bold text-xs"
                >
                    <span className="hidden sm:inline">Export</span>
                </ExportButton>

                {/* Standardized Filter Button on the Right */}
                <div className="relative inline-block text-left" ref={popoverRef}>
                    <button
                        type="button"
                        onClick={handleOpenFilters}
                        className={`inline-flex h-[38px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition-all shadow-sm active:scale-95 ${
                            activeFiltersCount > 0
                                ? 'bg-clay-700 text-white border-clay-800 shadow-clay-200 hover:bg-clay-800'
                                : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                        }`}
                    >
                        <SlidersHorizontal size={14} strokeWidth={2.2} />
                        <span>Filters</span>
                        {activeFiltersCount > 0 && (
                            <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-black text-white">
                                {activeFiltersCount}
                            </span>
                        )}
                        <ChevronDown size={14} strokeWidth={2.5} className={`transition-transform duration-200 ${isPopoverOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {children}
                </div>
            </div>
        </div>
    );
}

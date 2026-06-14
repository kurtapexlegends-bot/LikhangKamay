import React from "react";
import { Search, X, RefreshCw, Check, CheckCircle, RotateCcw, Archive } from "lucide-react";
import Checkbox from "@/Components/Checkbox";

export default function CatalogFilters({
    activeTab,
    handleTabChange,
    searchQuery,
    handleSearch,
    resetSavedView,
    quickFilter,
    applyQuickFilter,
    incompleteDraftCount,
    selectVisibleProducts,
    visibleProductIds,
    selectedProductIds,
    setSelectedProductIds,
    allVisibleSelected,
    toggleVisibleSelection,
    canEditProducts,
    runBulkStatusUpdate,
}) {
    return (
        <div className="flex flex-col">
            {/* Top Tabs, Search, and Reset View */}
            <div className="flex flex-col gap-4 border-b border-gray-100 p-4 sm:flex-row sm:justify-between items-center bg-white">
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg w-full overflow-x-auto sm:w-fit no-scrollbar">
                    {[
                        "All",
                        "Active",
                        "Pending Review",
                        "Rejected",
                        "Flagged",
                        "Draft",
                        "Archived",
                        "Low Stock",
                    ].map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => handleTabChange(tab)}
                            className={`px-4 py-2.5 sm:px-3 sm:py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap min-h-[44px] sm:min-h-0 ${
                                activeTab === tab
                                    ? "bg-white text-clay-700 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="flex w-full sm:w-auto items-center gap-2">
                    <div className="relative flex-1 sm:w-64">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            type="text"
                            placeholder="Search product, category, or SKU"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full pl-9 pr-8 py-2.5 sm:py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-clay-500 focus:border-clay-500 transition-shadow min-h-[44px] sm:min-h-0"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => handleSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-1"
                                title="Clear search"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={resetSavedView}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 sm:px-3 sm:py-2 text-[11px] font-bold text-stone-600 transition-colors hover:bg-stone-50 min-h-[44px] sm:min-h-0 shrink-0"
                    >
                        <RefreshCw size={13} />
                        <span className="hidden sm:inline">Reset</span>
                    </button>
                </div>
            </div>

            {/* Desktop Bulk Action Bar / Quick Filter Row */}
            <div className="hidden md:block">
                {selectedProductIds.length > 0 ? (
                    <div className="flex items-center justify-between border-b border-clay-200 bg-clay-50/50 px-4 py-3 animate-fadeIn">
                        <div className="flex items-center gap-3">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-clay-600 text-[11px] font-bold text-white shadow-sm">
                                {selectedProductIds.length}
                            </div>
                            <span className="text-[13px] font-bold text-clay-900">
                                Products Selected
                            </span>
                            <div className="h-4 w-px bg-clay-200 mx-1"></div>
                            <button
                                type="button"
                                onClick={() => setSelectedProductIds([])}
                                className="text-[11px] font-bold text-clay-500 transition-colors hover:text-clay-700 focus-visible:outline-none"
                            >
                                Clear Selection
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button
                                disabled={!canEditProducts}
                                onClick={() => runBulkStatusUpdate("Active")}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <CheckCircle size={13} className="text-emerald-500" />
                                Activate
                            </button>
                            <button
                                disabled={!canEditProducts}
                                onClick={() => runBulkStatusUpdate("Draft")}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-[11px] font-bold text-amber-700 shadow-sm transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <RotateCcw size={13} className="text-amber-500" />
                                Save as Draft
                            </button>
                            <button
                                disabled={!canEditProducts}
                                onClick={() => runBulkStatusUpdate("Archived")}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-bold text-stone-700 shadow-sm transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Archive size={13} className="text-stone-400" />
                                Archive
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 animate-fadeIn">
                        <div className="flex items-center gap-2">
                            <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                                Quick Filters:
                            </span>
                            <button
                                type="button"
                                onClick={() => applyQuickFilter("all", activeTab)}
                                className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                                    quickFilter === "all"
                                        ? "border-clay-200 bg-clay-50 text-clay-700 shadow-sm"
                                        : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                                }`}
                            >
                                All visible
                            </button>
                            {incompleteDraftCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => applyQuickFilter("needs_readiness", "Draft")}
                                    className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                                        quickFilter === "needs_readiness"
                                            ? "border-amber-200 bg-amber-50 text-amber-700 shadow-sm"
                                            : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                                    }`}
                                >
                                    Needs media
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => applyQuickFilter("ready_drafts", "Draft")}
                                className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                                    quickFilter === "ready_drafts"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm"
                                        : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                                }`}
                            >
                                Ready drafts
                            </button>
                        </div>
                        {visibleProductIds.length > 0 && (
                            <button
                                type="button"
                                onClick={selectVisibleProducts}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-bold text-stone-600 shadow-sm transition-colors hover:border-clay-300 hover:text-clay-700"
                            >
                                <Check size={13} /> Select Page
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Mobile Selection Header (Quick filter list & Select visible page) */}
            <div className="flex md:hidden items-center justify-between border-b border-gray-100 px-4 py-3 select-none">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 shrink">
                    <button
                        type="button"
                        onClick={() => applyQuickFilter("all", activeTab)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors shrink-0 min-h-[44px] ${
                            quickFilter === "all"
                                ? "border-clay-200 bg-clay-50 text-clay-700"
                                : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50"
                        }`}
                    >
                        All
                    </button>
                    {incompleteDraftCount > 0 && (
                        <button
                            type="button"
                            onClick={() => applyQuickFilter("needs_readiness", "Draft")}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors shrink-0 min-h-[44px] ${
                                quickFilter === "needs_readiness"
                                    ? "border-amber-200 bg-amber-55 text-amber-700"
                                    : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50"
                            }`}
                        >
                            Needs media
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => applyQuickFilter("ready_drafts", "Draft")}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors shrink-0 min-h-[44px] ${
                            quickFilter === "ready_drafts"
                                ? "border-emerald-250 bg-emerald-55 text-emerald-700"
                                : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50"
                        }`}
                    >
                        Ready
                    </button>
                </div>
                {visibleProductIds.length > 0 && (
                    <button
                        type="button"
                        onClick={toggleVisibleSelection}
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-600 transition shadow-sm min-h-[44px] shrink-0 ml-2"
                    >
                        <Checkbox checked={allVisibleSelected} onChange={toggleVisibleSelection} className="mr-1.5" />
                        <span>{allVisibleSelected ? "Deselect" : "Select All"}</span>
                    </button>
                )}
            </div>

            {/* Mobile Fixed Sticky Bulk Action Bar */}
            {selectedProductIds.length > 0 && (
                <div className="fixed bottom-6 inset-x-0 z-50 flex justify-center pointer-events-none px-4 md:hidden">
                    <div className="pointer-events-auto flex flex-col items-center gap-2.5 rounded-2xl border border-stone-200 bg-white/95 px-3.5 py-3 shadow-2xl backdrop-blur-xl w-full max-w-[540px]">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-clay-50 border border-clay-100 text-clay-700 shadow-sm">
                                    <Check size={14} className="text-clay-600" />
                                </div>
                                <span className="text-xs font-extrabold tracking-tight text-stone-900">{selectedProductIds.length} Selected</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedProductIds([])}
                                className="rounded-lg px-2 py-1 text-xs font-bold text-stone-500 hover:text-stone-850 hover:bg-stone-50 transition active:scale-95"
                            >
                                Cancel
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 w-full pt-1.5 border-t border-stone-100">
                            <button
                                type="button"
                                disabled={!canEditProducts}
                                onClick={() => {
                                    runBulkStatusUpdate("Active");
                                }}
                                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2.5 text-[11px] font-bold text-emerald-700 shadow-sm transition active:scale-95 disabled:opacity-50 min-h-[44px]"
                            >
                                <CheckCircle size={12} /> Activate
                            </button>
                            <button
                                type="button"
                                disabled={!canEditProducts}
                                onClick={() => {
                                    runBulkStatusUpdate("Draft");
                                }}
                                className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-250 bg-amber-50 px-2 py-2.5 text-[11px] font-bold text-amber-700 shadow-sm transition active:scale-95 disabled:opacity-50 min-h-[44px]"
                            >
                                <RotateCcw size={12} /> Draft
                            </button>
                            <button
                                type="button"
                                disabled={!canEditProducts}
                                onClick={() => {
                                    runBulkStatusUpdate("Archived");
                                }}
                                className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-2 py-2.5 text-[11px] font-bold text-stone-700 shadow-sm transition active:scale-95 disabled:opacity-50 min-h-[44px]"
                            >
                                <Archive size={12} className="text-stone-400" /> Archive
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

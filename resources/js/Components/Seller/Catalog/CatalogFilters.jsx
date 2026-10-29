import React from "react";
import { Check, CheckCircle, RotateCcw, Archive, Plus } from "lucide-react";
import FilterToolbarHeader from "@/Components/Seller/Shared/FilterToolbarHeader";

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
    openAddModal,
}) {
    return (
        <div className="flex flex-col">
            {/* Standardized Single-Row Filter Toolbar */}
            <FilterToolbarHeader
                tabs={[
                    "All",
                    "Active",
                    "Pending Review",
                    "Needs Revision",
                    "Flagged",
                    "Draft",
                    "Archived",
                    "Low Stock",
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                searchQuery={searchQuery}
                onSearchChange={handleSearch}
                searchPlaceholder="Search product, category, or SKU..."
                onResetFilters={resetSavedView}
                containerClassName="rounded-none border-x-0 border-t-0 border-b border-stone-200/80 shadow-none bg-stone-50/40"
                extraActions={
                    <div className="flex items-center gap-2">
                        {visibleProductIds.length > 0 && selectedProductIds.length === 0 && (
                            <button
                                type="button"
                                onClick={selectVisibleProducts}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 h-[38px] min-h-[38px] text-xs font-bold text-stone-700 transition-colors hover:bg-stone-50 shrink-0 active:scale-[0.98] shadow-2xs"
                            >
                                <Check size={13} />
                                <span className="hidden sm:inline">Select Page</span>
                                <span className="sm:hidden">Select</span>
                            </button>
                        )}
                        {openAddModal && (
                            <button
                                type="button"
                                onClick={openAddModal}
                                disabled={!canEditProducts}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-clay-600 px-3.5 h-[38px] min-h-[38px] text-xs font-bold text-white shadow-2xs transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 shrink-0"
                            >
                                <Plus size={14} />
                                <span className="hidden sm:inline">Add Product</span>
                                <span className="sm:hidden">Add</span>
                            </button>
                        )}
                    </div>
                }
            />

            {/* Desktop Bulk Action Bar (Only reveals when products are selected) */}
            {selectedProductIds.length > 0 && (
                <div className="hidden md:block">
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
                </div>
            )}
        </div>
    );
}

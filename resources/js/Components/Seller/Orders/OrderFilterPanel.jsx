import React from "react";
import {
    Search,
    X,
    Calendar,
    RefreshCw,
    Check,
    AlertCircle,
    CreditCard,
    Truck,
    RotateCcw
} from "lucide-react";

const Tab = ({ label, count, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-xs font-bold transition-all duration-200 ease-in-out ${
            active
                ? "border-clay-600 text-clay-800 bg-clay-50/50 shadow-sm"
                : "border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-50/80"
        }`}
    >
        {label}
        {count > 0 && (
            <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold tabular-nums transition-colors ${
                    active
                        ? "bg-clay-600 text-white shadow-sm"
                        : "bg-stone-200 text-stone-600"
                }`}
            >
                {count}
            </span>
        )}
    </button>
);

export default function OrderFilterPanel({
    activeTab,
    handleTabChange,
    getCount,
    searchQuery,
    handleSearch,
    dateRange,
    setDateRange,
    resetSavedView,
    applyQuickFilter,
    quickFilter,
    pendingQueueCount,
    paymentHoldCount,
    returnQueueCount,
    toggleSelectAll,
    selectedOrderIds,
    paginatedOrders,
    urgentCount,
    hasActiveCourierTracking
}) {
    return (
        <>
                {/* Tabs */}
                <div className="relative">
                    <div className="flex overflow-x-auto border-b border-stone-150 px-3 sm:px-4 no-scrollbar">
                        <Tab
                            label="All"
                            active={activeTab === "All"}
                            onClick={() => handleTabChange("All")}
                        />
                        <Tab
                            label="Pending"
                            count={getCount("Pending")}
                            active={activeTab === "Pending"}
                            onClick={() => handleTabChange("Pending")}
                        />
                        <Tab
                            label="Accepted"
                            count={getCount("Accepted")}
                            active={activeTab === "Accepted"}
                            onClick={() => handleTabChange("Accepted")}
                        />
                        <Tab
                            label="Processing"
                            count={getCount("Processing")}
                            active={activeTab === "Processing"}
                            onClick={() => handleTabChange("Processing")}
                        />
                        <Tab
                            label="Shipped"
                            count={getCount("Shipped")}
                            active={activeTab === "Shipped"}
                            onClick={() => handleTabChange("Shipped")}
                        />
                        <Tab
                            label="To Pickup"
                            count={getCount("To Pickup")}
                            active={activeTab === "To Pickup"}
                            onClick={() => handleTabChange("To Pickup")}
                        />
                        <Tab
                            label="Delivered"
                            count={getCount("Delivered")}
                            active={activeTab === "Delivered"}
                            onClick={() => handleTabChange("Delivered")}
                        />
                        <Tab
                            label="Returns"
                            count={getCount("Returns")}
                            active={activeTab === "Returns"}
                            onClick={() => handleTabChange("Returns")}
                        />
                        <Tab
                            label="Completed"
                            count={getCount("Completed")}
                            active={activeTab === "Completed"}
                            onClick={() => handleTabChange("Completed")}
                        />
                        <Tab
                            label="Cancelled"
                            count={getCount("Cancelled")}
                            active={activeTab === "Cancelled"}
                            onClick={() => handleTabChange("Cancelled")}
                        />
                    </div>
                    {/* Horizontal scroll fade indicators */}
                    <div className="pointer-events-none absolute bottom-[1px] right-0 top-0 w-8 bg-gradient-to-l from-white to-transparent" />
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col items-stretch gap-3 border-b border-stone-100 bg-[#FCFAF7]/40 p-3.5 md:flex-row md:items-center">
                    <div className="relative w-full md:w-80">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                            size={14}
                        />
                        <input
                            type="text"
                            placeholder="Search order, buyer, or item..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full pl-9 pr-8 py-2.5 bg-white border border-stone-200 rounded-xl text-xs hover:border-stone-300 focus:ring-4 focus:ring-clay-500/10 focus:border-clay-500 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => handleSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition active:scale-90"
                                title="Clear search"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                    <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 transition-all hover:border-stone-300 focus-within:border-clay-500 focus-within:ring-4 focus-within:ring-clay-500/10 shadow-[0_1px_2px_rgba(0,0,0,0.02)] md:w-auto">
                        <Calendar className="text-stone-400" size={14} />
                        <div className="flex flex-nowrap items-center gap-2">
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) =>
                                    setDateRange({
                                        ...dateRange,
                                        start: e.target.value
                                    })
                                }
                                className="border-none bg-transparent p-0 text-xs font-bold focus:ring-0 text-stone-700 placeholder-stone-400 cursor-pointer w-24 sm:w-auto"
                            />
                            <span className="text-stone-300 font-bold text-xs">to</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) =>
                                    setDateRange({
                                        ...dateRange,
                                        end: e.target.value
                                    })
                                }
                                className="border-none bg-transparent p-0 text-xs font-bold focus:ring-0 text-stone-700 placeholder-stone-400 cursor-pointer w-24 sm:w-auto"
                            />
                        </div>
                        {(dateRange.start || dateRange.end) && (
                            <button
                                onClick={() => setDateRange({ start: "", end: "" })}
                                aria-label="Clear date filters"
                                className="text-stone-400 hover:text-red-500 transition-colors ml-1 p-0.5 rounded-md hover:bg-red-50"
                                title="Clear dates"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={resetSavedView}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[11px] font-bold text-stone-600 transition-all hover:bg-stone-50 hover:text-stone-800 hover:border-stone-350 active:scale-95 shadow-sm md:ml-auto"
                    >
                        <RefreshCw size={13} className="transition-transform active:rotate-180" />
                        Reset
                    </button>
                </div>

                {/* Sub-Filters / Bulk page select */}
                <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-3 py-3 sm:px-4 bg-white">
                    <button
                        type="button"
                        onClick={() => applyQuickFilter("all", activeTab)}
                        className={`rounded-full border px-3.5 py-1 text-[11px] font-bold transition-all duration-200 active:scale-95 shadow-sm ${
                            quickFilter === "all"
                                ? "border-clay-300 bg-clay-50/50 text-clay-700"
                                : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:border-stone-300"
                        }`}
                    >
                        All visible
                    </button>
                    {pendingQueueCount > 0 && (
                        <button
                            type="button"
                            onClick={() => applyQuickFilter("urgent", "Pending")}
                            className={`rounded-full border px-3.5 py-1 text-[11px] font-bold transition-all duration-200 active:scale-95 shadow-sm ${
                                quickFilter === "urgent" && activeTab === "Pending"
                                    ? "border-amber-300/80 bg-[#FAF3E0] text-[#A66E2E]"
                                    : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:border-stone-300"
                            }`}
                        >
                            Pending queue
                        </button>
                    )}
                    {paymentHoldCount > 0 && (
                        <button
                            type="button"
                            onClick={() => applyQuickFilter("payment_hold", "Accepted")}
                            className={`rounded-full border px-3.5 py-1 text-[11px] font-bold transition-all duration-200 active:scale-95 shadow-sm ${
                                quickFilter === "payment_hold"
                                    ? "border-orange-300 bg-[#FDF2F0] text-[#B83E28]"
                                    : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:border-stone-300"
                            }`}
                        >
                            Payment hold
                        </button>
                    )}
                    {returnQueueCount > 0 && (
                        <button
                            type="button"
                            onClick={() => applyQuickFilter("returns", "Returns")}
                            className={`rounded-full border px-3.5 py-1 text-[11px] font-bold transition-all duration-200 active:scale-95 shadow-sm ${
                                quickFilter === "returns"
                                    ? "border-emerald-300 bg-[#EEF5F1] text-[#2D6A4F]"
                                    : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:border-stone-300"
                            }`}
                        >
                            Return queue
                        </button>
                    )}
 
                    <div className="ml-auto flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <button
                                type="button"
                                onClick={toggleSelectAll}
                                className={`flex h-5 w-5 items-center justify-center rounded-lg border transition-all duration-200 active:scale-90 ${
                                    selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0
                                        ? "border-clay-600 bg-clay-600 text-white shadow-sm"
                                        : "border-stone-300 bg-white hover:border-stone-400 hover:bg-stone-50/30"
                                }`}
                                aria-label={selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0 ? "Deselect all page" : "Select all page"}
                                role="checkbox"
                                aria-checked={selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0}
                            >
                                {selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0 && (
                                    <Check size={14} strokeWidth={4} />
                                )}
                            </button>
                            <span className="text-[11px] font-bold text-stone-600 uppercase tracking-tight">
                                {selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0 ? "Deselect All" : "Select All Page"}
                            </span>
                        </label>
                    </div>
                </div>
        </>
    );
}

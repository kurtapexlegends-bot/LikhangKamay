/* global route */
import React, { useState, useRef, useEffect } from "react";
import {
    X,
    Check,
    RotateCcw,
    ChevronDown,
    Filter,
} from "lucide-react";
import SlideOverDrawer from "@/Components/SlideOverDrawer";
import OrderDateRangeFilter from "./OrderDateRangeFilter";
import OrderPaymentFilter from "./OrderPaymentFilter";
import OrderDeliveryFilter from "./OrderDeliveryFilter";
import OrderBatchActionBar from "./OrderBatchActionBar";
import OrderTableToolbar from "./OrderTableToolbar";

export default function OrderFilterPanel({
    activeTab,
    handleTabChange,
    getCount,
    searchQuery,
    handleSearch,
    isSearching = false,
    dateRange,
    setDateRange,
    paymentMethod = "all",
    setPaymentMethod,
    fulfillmentType = "all",
    setFulfillmentType,
    flaggedOnly = "all",
    setFlaggedOnly,
    updateFilters,
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
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const popoverRef = useRef(null);
    const searchInputRef = useRef(null);

    // Global keyboard shortcut '/' to focus search input
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (
                e.key === "/" &&
                document.activeElement?.tagName !== "INPUT" &&
                document.activeElement?.tagName !== "TEXTAREA"
            ) {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
                handleSearch("");
                searchInputRef.current?.blur();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleSearch]);

    // Staged draft state
    const [draftPaymentMethod, setDraftPaymentMethod] = useState(paymentMethod);
    const [draftFulfillmentType, setDraftFulfillmentType] = useState(fulfillmentType);
    const [draftStartDate, setDraftStartDate] = useState(dateRange?.start || "");
    const [draftEndDate, setDraftEndDate] = useState(dateRange?.end || "");
    const [draftFlaggedOnly, setDraftFlaggedOnly] = useState(flaggedOnly);

    // Handle outside clicks to close desktop popover
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

    const handleOpenFilters = () => {
        setDraftPaymentMethod(paymentMethod);
        setDraftFulfillmentType(fulfillmentType);
        setDraftStartDate(dateRange?.start || "");
        setDraftEndDate(dateRange?.end || "");
        setDraftFlaggedOnly(flaggedOnly);

        if (typeof window !== "undefined" && window.innerWidth < 1024) {
            setIsDrawerOpen(true);
        } else {
            setIsPopoverOpen((prev) => !prev);
        }
    };

    const applyDraftFilters = () => {
        setIsPopoverOpen(false);
        setIsDrawerOpen(false);

        if (setDateRange) setDateRange({ start: draftStartDate, end: draftEndDate });
        if (setPaymentMethod) setPaymentMethod(draftPaymentMethod);
        if (setFulfillmentType) setFulfillmentType(draftFulfillmentType);
        if (setFlaggedOnly) setFlaggedOnly(draftFlaggedOnly);

        if (updateFilters) {
            updateFilters({
                start_date: draftStartDate,
                end_date: draftEndDate,
                payment_method: draftPaymentMethod,
                fulfillment_type: draftFulfillmentType,
                flagged: draftFlaggedOnly,
            });
        }
    };

    const resetFilters = () => {
        setDraftPaymentMethod("all");
        setDraftFulfillmentType("all");
        setDraftStartDate("");
        setDraftEndDate("");
        setDraftFlaggedOnly("all");
        setIsPopoverOpen(false);
        setIsDrawerOpen(false);

        if (setDateRange) setDateRange({ start: "", end: "" });
        if (setPaymentMethod) setPaymentMethod("all");
        if (setFulfillmentType) setFulfillmentType("all");
        if (setFlaggedOnly) setFlaggedOnly("all");

        if (updateFilters) {
            updateFilters({
                start_date: "",
                end_date: "",
                payment_method: "all",
                fulfillment_type: "all",
                flagged: "all",
            });
        }
    };

    const activeFiltersCount = [
        paymentMethod && paymentMethod !== "all",
        fulfillmentType && fulfillmentType !== "all",
        !!dateRange?.start,
        !!dateRange?.end,
        flaggedOnly && flaggedOnly !== "all",
    ].filter(Boolean).length;

    const draftActiveCount = [
        draftPaymentMethod && draftPaymentMethod !== "all",
        draftFulfillmentType && draftFulfillmentType !== "all",
        !!draftStartDate,
        !!draftEndDate,
        draftFlaggedOnly && draftFlaggedOnly !== "all",
    ].filter(Boolean).length;

    const filterFieldsGrid = (
        <div className="space-y-4">
            {/* 1. Date Range Filter */}
            <OrderDateRangeFilter
                startDate={draftStartDate}
                setStartDate={setDraftStartDate}
                endDate={draftEndDate}
                setEndDate={setDraftEndDate}
            />

            {/* 2. Payment Method Filter */}
            <OrderPaymentFilter
                paymentMethod={draftPaymentMethod}
                setPaymentMethod={setDraftPaymentMethod}
            />

            {/* 3. Delivery / Fulfillment Filter */}
            <OrderDeliveryFilter
                fulfillmentType={draftFulfillmentType}
                setFulfillmentType={setDraftFulfillmentType}
            />

            {/* 4. Flagged & Disputed Orders */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Order Attention / Dispute Status
                </label>
                <div className="relative">
                    <select
                        value={draftFlaggedOnly}
                        onChange={(e) => setDraftFlaggedOnly(e.target.value)}
                        className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                    >
                        <option value="all">All Orders (Normal &amp; Flagged)</option>
                        <option value="flagged">Disputed / Refund Requested Only</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
            </div>

            {/* 5. Quick Action Presets */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Quick Action Queue
                </label>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => applyQuickFilter("all", activeTab)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                            quickFilter === "all"
                                ? "border-clay-300 bg-clay-50 text-clay-700"
                                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        }`}
                    >
                        All Visible
                    </button>
                    {pendingQueueCount > 0 && (
                        <button
                            type="button"
                            onClick={() => applyQuickFilter("urgent", "Pending")}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                                quickFilter === "urgent" && activeTab === "Pending"
                                    ? "border-amber-300 bg-amber-50 text-amber-800"
                                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                            }`}
                        >
                            Pending Queue ({pendingQueueCount})
                        </button>
                    )}
                    {paymentHoldCount > 0 && (
                        <button
                            type="button"
                            onClick={() => applyQuickFilter("payment_hold", "Accepted")}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                                quickFilter === "payment_hold"
                                    ? "border-orange-300 bg-orange-50 text-orange-800"
                                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                            }`}
                        >
                            Payment Hold ({paymentHoldCount})
                        </button>
                    )}
                    {returnQueueCount > 0 && (
                        <button
                            type="button"
                            onClick={() => applyQuickFilter("returns", "Returns")}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                                quickFilter === "returns"
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                            }`}
                        >
                            Return Queue ({returnQueueCount})
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Standardized Segmented Status Pill Track */}
            <OrderBatchActionBar
                activeTab={activeTab}
                handleTabChange={handleTabChange}
                getCount={getCount}
            />

            {/* Standardized Search & Right-Aligned Controls Toolbar */}
            <OrderTableToolbar
                searchInputRef={searchInputRef}
                searchQuery={searchQuery}
                handleSearch={handleSearch}
                isSearching={isSearching}
                toggleSelectAll={toggleSelectAll}
                selectedOrderIds={selectedOrderIds}
                paginatedOrders={paginatedOrders}
                handleOpenFilters={handleOpenFilters}
                activeFiltersCount={activeFiltersCount}
                isPopoverOpen={isPopoverOpen}
                popoverRef={popoverRef}
            >
                {/* Desktop Popover Card */}
                {isPopoverOpen && (
                    <div className="hidden lg:flex flex-col absolute right-0 z-[100] mt-2 w-[400px] max-h-[calc(100vh-180px)] rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3 shrink-0">
                            <div className="flex items-center gap-2">
                                <Filter size={15} className="text-clay-700" />
                                <h3 className="text-sm font-bold text-stone-900">Filter Orders</h3>
                            </div>
                            {draftActiveCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDraftPaymentMethod("all");
                                        setDraftFulfillmentType("all");
                                        setDraftStartDate("");
                                        setDraftEndDate("");
                                        setDraftFlaggedOnly("all");
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-500 hover:text-clay-700 transition"
                                >
                                    <RotateCcw size={12} />
                                    <span>Reset Selection</span>
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[50vh] no-scrollbar">
                            {filterFieldsGrid}
                        </div>

                        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between shrink-0 bg-white">
                            <button
                                type="button"
                                onClick={() => setIsPopoverOpen(false)}
                                className="rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={applyDraftFilters}
                                className="rounded-xl bg-clay-700 px-5 py-2 text-xs font-bold text-white shadow-md shadow-clay-200 hover:bg-clay-800 transition active:scale-95"
                            >
                                Apply &amp; Close
                            </button>
                        </div>
                    </div>
                )}
            </OrderTableToolbar>

            {/* Active Filter Tag Pills */}
            {activeFiltersCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-3.5 py-2.5 bg-stone-50/60 border-b border-stone-100">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mr-1">
                        Active Filters:
                    </span>
                    {paymentMethod && paymentMethod !== "all" && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>Payment: {paymentMethod === 'paymongo' ? 'PayMongo' : paymentMethod === 'card' ? 'Credit Card' : 'Manual'}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    if (setPaymentMethod) setPaymentMethod("all");
                                    if (updateFilters) updateFilters({ payment_method: "all" });
                                }}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    {fulfillmentType && fulfillmentType !== "all" && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>Delivery: {fulfillmentType === 'lalamove' ? 'Lalamove' : fulfillmentType === 'express' ? 'Express' : 'Pickup'}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    if (setFulfillmentType) setFulfillmentType("all");
                                    if (updateFilters) updateFilters({ fulfillment_type: "all" });
                                }}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    {dateRange?.start && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>From: {dateRange.start}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    if (setDateRange) setDateRange({ ...dateRange, start: "" });
                                    if (updateFilters) updateFilters({ start_date: "" });
                                }}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    {dateRange?.end && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>To: {dateRange.end}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    if (setDateRange) setDateRange({ ...dateRange, end: "" });
                                    if (updateFilters) updateFilters({ end_date: "" });
                                }}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    {flaggedOnly && flaggedOnly !== "all" && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>Flagged: Disputed Only</span>
                            <button
                                type="button"
                                onClick={() => {
                                    if (setFlaggedOnly) setFlaggedOnly("all");
                                    if (updateFilters) updateFilters({ flagged: "all" });
                                }}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={resetFilters}
                        className="text-[11px] font-bold text-clay-700 hover:underline ml-1"
                    >
                        Clear All
                    </button>
                </div>
            )}

            {/* Mobile Bottom-Sheet Filter Drawer */}
            <SlideOverDrawer
                show={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                title="Filter Orders"
                position="bottom"
                widthClass="max-w-md"
                footer={
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-bold text-stone-700 min-h-[44px]"
                        >
                            Reset All
                        </button>
                        <button
                            type="button"
                            onClick={applyDraftFilters}
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
        </>
    );
}

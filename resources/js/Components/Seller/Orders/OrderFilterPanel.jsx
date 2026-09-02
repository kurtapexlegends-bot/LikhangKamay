/* global route */
import React, { useState, useRef, useEffect } from "react";
import { Link } from "@inertiajs/react";
import {
    Search,
    X,
    Calendar,
    RefreshCw,
    Check,
    AlertCircle,
    CreditCard,
    Truck,
    RotateCcw,
    SlidersHorizontal,
    ChevronDown,
    Filter,
    LoaderCircle,
    Printer,
    Info,
} from "lucide-react";
import SlideOverDrawer from "@/Components/SlideOverDrawer";
import ExportButton from "@/Components/ExportButton";

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

        if (window.innerWidth < 1024) {
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
            {/* 1. Order Placement Date Range */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Order Placement Date Range
                </label>
                <div className="flex items-center bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-clay-100 focus-within:border-clay-500 transition-all h-[42px]">
                    <label className="flex flex-1 h-full items-center gap-2 px-3 hover:bg-stone-50 transition cursor-pointer min-h-[42px] min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 shrink-0">From</span>
                        <input
                            type="date"
                            value={draftStartDate}
                            onChange={(e) => setDraftStartDate(e.target.value)}
                            className="min-w-0 flex-1 bg-transparent text-xs font-bold text-stone-700 border-none outline-none focus:ring-0 p-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                        />
                    </label>
                    <div className="h-full w-px bg-stone-200 shrink-0"></div>
                    <label className="flex flex-1 h-full items-center gap-2 px-3 hover:bg-stone-50 transition cursor-pointer min-h-[42px] min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 shrink-0">To</span>
                        <input
                            type="date"
                            value={draftEndDate}
                            onChange={(e) => setDraftEndDate(e.target.value)}
                            className="min-w-0 flex-1 bg-transparent text-xs font-bold text-stone-700 border-none outline-none focus:ring-0 p-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                        />
                    </label>
                </div>
            </div>

            {/* 2. Payment Method Filter */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Payment Method
                </label>
                <div className="relative">
                    <select
                        value={draftPaymentMethod}
                        onChange={(e) => setDraftPaymentMethod(e.target.value)}
                        className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                    >
                        <option value="all">All Payment Methods</option>
                        <option value="paymongo">PayMongo Online (GCash, Maya, Card)</option>
                        <option value="card">Credit / Debit Card</option>
                        <option value="manual">Cash on Delivery / Direct</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
            </div>

            {/* 3. Fulfillment / Delivery */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Fulfillment / Delivery Mode
                </label>
                <div className="relative">
                    <select
                        value={draftFulfillmentType}
                        onChange={(e) => setDraftFulfillmentType(e.target.value)}
                        className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                    >
                        <option value="all">All Fulfillment Modes</option>
                        <option value="lalamove">Lalamove Automated Courier</option>
                        <option value="express">Standard Express Shipping</option>
                        <option value="pickup">Self Pickup / Store Collection</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
            </div>

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
                        <option value="all">All Orders (Normal & Flagged)</option>
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
            <div className="p-2.5 sm:p-3 bg-stone-50/40 border-b border-stone-150">
                <div className="p-1 bg-stone-100/70 rounded-2xl flex items-center gap-1 overflow-x-auto scrollbar-none">
                    {[
                        { key: "All", label: "All" },
                        { key: "Pending", label: "Pending", count: getCount("Pending") },
                        { key: "Accepted", label: "Accepted", count: getCount("Accepted") },
                        { key: "Processing", label: "Processing", count: getCount("Processing") },
                        { key: "Shipped", label: "Shipped", count: getCount("Shipped") },
                        { key: "To Pickup", label: "To Pickup", count: getCount("To Pickup") },
                        { key: "Delivered", label: "Delivered", count: getCount("Delivered") },
                        { key: "Returns", label: "Returns", count: getCount("Returns") },
                        { key: "Completed", label: "Completed", count: getCount("Completed") },
                        { key: "Cancelled", label: "Cancelled", count: getCount("Cancelled") },
                    ].map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => handleTabChange(tab.key)}
                                className={`px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 min-h-[38px] sm:min-h-0 ${
                                    isActive
                                        ? "bg-white text-clay-800 shadow-xs font-black"
                                        : "text-stone-500 hover:text-stone-800 font-semibold"
                                }`}
                            >
                                <span>{tab.label}</span>
                                {tab.count > 0 && (
                                    <span
                                        className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                                            isActive ? "bg-clay-100 text-clay-800" : "bg-stone-200 text-stone-600"
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Standardized Search & Right-Aligned Controls Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-stone-100 bg-[#FCFAF7]/40 p-3.5">
                {/* Left: Minimal Wholesale Info Icon + Search Input */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="relative group shrink-0">
                        <Link
                            href={route("seller.supply-hub.sales")}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                            title="Wholesale material orders are in the Supply Hub"
                        >
                            <Info size={16} />
                        </Link>
                        <div className="pointer-events-none absolute left-0 top-full mt-1.5 hidden w-56 rounded-xl border border-stone-800 bg-stone-900 px-3 py-2 text-[11px] font-medium text-stone-200 shadow-xl group-hover:block z-30">
                            <span className="font-bold text-white block mb-0.5">Wholesale Orders</span>
                            Orders placed by peer artisans for raw supplies are managed in the Supply Hub &rarr;
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

                {/* Right Controls: Select All Page + Filters Popover */}
                <div className="flex items-center gap-2.5">
                    {/* Select All Page Checkbox */}
                    <label className="inline-flex h-[38px] items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 hover:border-stone-300 hover:bg-stone-50 transition cursor-pointer select-none shadow-sm shrink-0">
                        <button
                            type="button"
                            onClick={toggleSelectAll}
                            className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                                selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0
                                    ? "border-clay-600 bg-clay-600 text-white"
                                    : "border-stone-300 bg-white"
                            }`}
                            aria-label={selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0 ? "Deselect all page" : "Select all page"}
                        >
                            {selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0 && (
                                <Check size={12} strokeWidth={3.5} />
                            )}
                        </button>
                        <span>{selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0 ? "Deselect Page" : "Select Page"}</span>
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
                                        Apply & Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

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

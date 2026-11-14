import React, { useRef, useEffect } from "react";
import useIsolatedHorizontalScroll from "@/hooks/useIsolatedHorizontalScroll";

const STATUS_TABS = [
    { key: "All", label: "All" },
    { key: "Walk-In", label: "Walk-In" },
    { key: "Pending", label: "Pending" },
    { key: "Accepted", label: "Accepted" },
    { key: "Processing", label: "Processing" },
    { key: "Shipped", label: "Shipped" },
    { key: "To Pickup", label: "To Pickup" },
    { key: "Delivered", label: "Delivered" },
    { key: "Returns", label: "Returns" },
    { key: "Completed", label: "Completed" },
    { key: "Cancelled", label: "Cancelled" },
];

export default function OrderBatchActionBar({
    activeTab,
    handleTabChange,
    getCount,
    extraActions = null,
}) {
    const scrollContainerRef = useRef(null);
    useIsolatedHorizontalScroll(scrollContainerRef);

    // Auto-scroll active tab into view smoothly
    useEffect(() => {
        if (!scrollContainerRef.current) return;
        const activeBtn = scrollContainerRef.current.querySelector('[data-active="true"]');
        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
    }, [activeTab]);

    return (
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-2.5 sm:p-3 bg-stone-50/40 border-b border-stone-150">
            {/* Scrollable Tabs Track */}
            <div
                ref={scrollContainerRef}
                className="flex-1 min-w-0 overflow-x-auto scrollbar-none py-0.5 overscroll-contain select-none"
            >
                <div className="p-1 pr-2.5 bg-stone-100/70 rounded-2xl inline-flex items-center gap-1 shrink-0 w-max min-w-max border border-stone-200/40">
                    {STATUS_TABS.map((tab) => {
                        const count = getCount ? getCount(tab.key) : 0;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                data-active={isActive ? "true" : "false"}
                                onClick={() => handleTabChange(tab.key)}
                                className={`px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0 select-none cursor-pointer ${
                                    isActive
                                        ? "bg-white text-clay-800 shadow-xs font-black"
                                        : "text-stone-500 hover:text-stone-800 hover:bg-stone-200/50 font-semibold"
                                }`}
                            >
                                <span className="whitespace-nowrap pointer-events-none">{tab.label}</span>
                                {count > 0 && (
                                    <span
                                        className={`px-1.5 py-0.5 text-[10px] rounded-full font-black pointer-events-none whitespace-nowrap ${
                                            isActive ? "bg-clay-100 text-clay-800" : "bg-stone-200 text-stone-600"
                                        }`}
                                    >
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Right-aligned Extra Actions (Export & Filters) */}
            {extraActions && (
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-end md:self-auto">
                    {extraActions}
                </div>
            )}
        </div>
    );
}

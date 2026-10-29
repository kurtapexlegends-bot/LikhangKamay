import React from "react";

const STATUS_TABS = [
    { key: "All", label: "All" },
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
    return (
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-2.5 sm:p-3 bg-stone-50/40 border-b border-stone-150">
            {/* Scrollable Tabs Track */}
            <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none py-0.5">
                <div className="p-1 bg-stone-100/70 rounded-2xl inline-flex items-center gap-1 shrink-0">
                    {STATUS_TABS.map((tab) => {
                        const count = getCount ? getCount(tab.key) : 0;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => handleTabChange(tab.key)}
                                className={`px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shrink-0 min-h-[44px] sm:min-h-0 ${
                                    isActive
                                        ? "bg-white text-clay-800 shadow-xs font-black"
                                        : "text-stone-500 hover:text-stone-800 font-semibold"
                                }`}
                            >
                                <span>{tab.label}</span>
                                {count > 0 && (
                                    <span
                                        className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
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

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
}) {
    return (
        <div className="p-2.5 sm:p-3 bg-stone-50/40 border-b border-stone-150">
            <div className="p-1 bg-stone-100/70 rounded-2xl flex items-center gap-1 overflow-x-auto scrollbar-none">
                {STATUS_TABS.map((tab) => {
                    const count = getCount ? getCount(tab.key) : 0;
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
    );
}

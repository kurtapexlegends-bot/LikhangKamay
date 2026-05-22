import React from "react";

export const Tab = ({ label, count, active, onClick, color = "clay" }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
            active
                ? "border-clay-600 text-clay-700 bg-clay-50/30"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        }`}
    >
        {label}
        {count > 0 && (
            <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    active
                        ? "bg-clay-600 text-white"
                        : "bg-gray-200 text-gray-600"
                }`}
            >
                {count}
            </span>
        )}
    </button>
);

export default function OrderTabs({ activeTab, handleTabChange, getCount }) {
    const tabs = [
        { label: "All", status: "All", hasCount: false },
        { label: "Pending", status: "Pending", hasCount: true },
        { label: "Accepted", status: "Accepted", hasCount: true },
        { label: "Processing", status: "Processing", hasCount: true },
        { label: "Shipped", status: "Shipped", hasCount: true },
        { label: "To Pickup", status: "To Pickup", hasCount: true },
        { label: "Delivered", status: "Delivered", hasCount: true },
        { label: "Returns", status: "Returns", hasCount: true },
        { label: "Completed", status: "Completed", hasCount: true },
        { label: "Cancelled", status: "Cancelled", hasCount: true },
    ];

    return (
        <div className="flex overflow-x-auto border-b border-gray-100 px-3 sm:px-4">
            {tabs.map((tab) => (
                <Tab
                    key={tab.status}
                    label={tab.label}
                    count={tab.hasCount ? getCount(tab.status) : 0}
                    active={activeTab === tab.status}
                    onClick={() => handleTabChange(tab.status)}
                />
            ))}
        </div>
    );
}

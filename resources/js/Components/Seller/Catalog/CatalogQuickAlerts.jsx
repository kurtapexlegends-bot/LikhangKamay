import React from "react";
import { AlertCircle, Archive, CheckCircle, AlertTriangle, X } from "lucide-react";

export default function CatalogQuickAlerts({
    incompleteDraftCount = 0,
    remainingActivationSlots = 0,
    lowStockCount = 0,
    quickFilter,
    activeTab,
    applyQuickFilter,
}) {
    if (incompleteDraftCount === 0 && remainingActivationSlots > 0 && lowStockCount === 0) {
        return null;
    }

    return (
        <div className="rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3">
            {/* Grid-to-scroll horizontal container for mobile viewports */}
            <div className="flex flex-nowrap overflow-x-auto md:flex-wrap items-center gap-2 no-scrollbar pb-1 md:pb-0 select-none">
                {incompleteDraftCount > 0 && (
                    <button
                        type="button"
                        onClick={() => applyQuickFilter("needs_readiness", "Draft")}
                        className={`inline-flex items-center gap-2 rounded-full border bg-white px-4.5 py-2.5 md:px-3 md:py-1 text-xs md:text-[11px] font-bold transition-colors shrink-0 min-h-[44px] md:min-h-[28px] ${
                            quickFilter === "needs_readiness"
                                ? "border-amber-300 bg-amber-50 text-amber-800"
                                : "border-amber-200 text-amber-700 hover:bg-amber-50"
                        }`}
                    >
                        <AlertCircle size={14} className="md:w-3 md:h-3" />
                        <span>
                            {incompleteDraftCount}{" "}
                            {incompleteDraftCount === 1 ? "draft needs media" : "drafts need media"}
                        </span>
                    </button>
                )}
                {remainingActivationSlots === 0 ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2.5 md:px-3 md:py-1 text-xs md:text-[11px] font-bold text-rose-700 shrink-0 min-h-[44px] md:min-h-[28px]">
                        <Archive size={14} className="md:w-3 md:h-3" />
                        <span>Active limit reached</span>
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2.5 md:px-3 md:py-1 text-xs md:text-[11px] font-bold text-emerald-700 shrink-0 min-h-[44px] md:min-h-[28px]">
                        <CheckCircle size={14} className="md:w-3 md:h-3" />
                        <span>
                            {remainingActivationSlots} activation{" "}
                            {remainingActivationSlots === 1 ? "slot" : "slots"} left
                        </span>
                    </span>
                )}
                {lowStockCount > 0 && (
                    <button
                        type="button"
                        onClick={() => applyQuickFilter("all", "Low Stock")}
                        className={`inline-flex items-center gap-2 rounded-full border bg-white px-4.5 py-2.5 md:px-3 md:py-1 text-xs md:text-[11px] font-bold transition-colors shrink-0 min-h-[44px] md:min-h-[28px] ${
                            activeTab === "Low Stock" && quickFilter === "all"
                                ? "border-stone-300 bg-stone-100 text-stone-700"
                                : "border-stone-200 text-stone-600 hover:bg-stone-100"
                        }`}
                    >
                        <AlertTriangle size={14} className="md:w-3 md:h-3" />
                        <span>
                            {lowStockCount} low-stock {lowStockCount === 1 ? "item" : "items"}
                        </span>
                    </button>
                )}
                {quickFilter !== "all" && (
                    <button
                        type="button"
                        onClick={() => applyQuickFilter("all", "All")}
                        className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 md:px-3 md:py-1 text-xs md:text-[11px] font-bold text-stone-600 transition-colors hover:bg-stone-100 shrink-0 min-h-[44px] md:min-h-[28px]"
                    >
                        <X size={14} className="md:w-3 md:h-3" />
                        <span>Clear quick view</span>
                    </button>
                )}
            </div>
        </div>
    );
}

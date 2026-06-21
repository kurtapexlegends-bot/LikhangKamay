import React from "react";
import KPICard from "@/Components/KPICard";
import { AlertCircle, Package, Truck, CheckCircle2, CreditCard, RotateCcw, X } from "lucide-react";

export default function OrderKPICards({
    urgentCount,
    shouldAnimateKPI,
    getCount,
    paymentHoldCount,
    hasActiveCourierTracking,
    returnQueueCount,
    quickFilter,
    applyQuickFilter,
}) {
    return (
        <>
            {/* KPI CARDS */}
            <div className="flex overflow-x-auto pb-2.5 gap-3 flex-nowrap snap-x snap-mandatory lg:grid lg:grid-cols-4 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
                <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                    <KPICard title="Needs Action" value={urgentCount} icon={AlertCircle} color="text-amber-600" bg="bg-amber-50" animate={shouldAnimateKPI} />
                </div>
                <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                    <KPICard title="Processing" value={getCount("Accepted") + getCount("Processing")} icon={Package} color="text-blue-600" bg="bg-blue-50" animate={shouldAnimateKPI} />
                </div>
                <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                    <KPICard title="In Transit / Ready" value={getCount("Shipped") + getCount("Delivered") + getCount("Ready for Pickup")} icon={Truck} color="text-sky-600" bg="bg-sky-50" animate={shouldAnimateKPI} />
                </div>
                <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                    <KPICard title="Completed" value={getCount("Completed")} icon={CheckCircle2} color="text-green-600" bg="bg-green-50" animate={shouldAnimateKPI} />
                </div>
            </div>

            {/* Quick Views / Attention Alerts */}
            {(urgentCount > 0 ||
                paymentHoldCount > 0 ||
                hasActiveCourierTracking ||
                returnQueueCount > 0) && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3">
                    {urgentCount > 0 && (
                        <button
                            type="button"
                            onClick={() => applyQuickFilter("urgent", "All")}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold transition-all duration-200 active:scale-95 shadow-sm ${
                                quickFilter === "urgent"
                                    ? "border-amber-300/80 bg-[#FAF3E0] text-[#A66E2E]"
                                    : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:border-stone-300"
                            }`}
                        >
                            <AlertCircle size={13} />
                            {urgentCount} need attention
                        </button>
                    )}
                    {paymentHoldCount > 0 && (
                        <button
                            type="button"
                            onClick={() => applyQuickFilter("payment_hold", "Accepted")}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold transition-all duration-200 active:scale-95 shadow-sm ${
                                quickFilter === "payment_hold"
                                    ? "border-orange-300 bg-[#FDF2F0] text-[#B83E28]"
                                    : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:border-stone-300"
                            }`}
                        >
                            <CreditCard size={13} />
                            {paymentHoldCount} payment hold
                        </button>
                    )}
                    {hasActiveCourierTracking && (
                        <button
                            type="button"
                            onClick={() => applyQuickFilter("live_courier", "All")}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold transition-all duration-200 active:scale-95 shadow-sm ${
                                quickFilter === "live_courier"
                                    ? "border-sky-300 bg-[#F0F7FD] text-[#2B6CB0]"
                                    : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:border-stone-300"
                            }`}
                        >
                            <Truck size={13} />
                            Live courier
                        </button>
                    )}
                    {returnQueueCount > 0 && (
                        <button
                            type="button"
                            onClick={() => applyQuickFilter("returns", "Returns")}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold transition-all duration-200 active:scale-95 shadow-sm ${
                                quickFilter === "returns"
                                    ? "border-emerald-300 bg-[#EEF5F1] text-[#2D6A4F]"
                                    : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:border-stone-300"
                            }`}
                        >
                            <RotateCcw size={13} />
                            {returnQueueCount} return {returnQueueCount === 1 ? "case" : "cases"}
                        </button>
                    )}
                    {quickFilter !== "all" && (
                        <button
                            type="button"
                            onClick={() => applyQuickFilter("all", "All")}
                            className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-bold text-stone-600 transition-all duration-200 hover:bg-stone-50 hover:text-stone-850 hover:border-stone-300 active:scale-95 shadow-sm"
                        >
                            <X size={12} />
                            Clear quick view
                        </button>
                    )}
                </div>
            )}
        </>
    );
}

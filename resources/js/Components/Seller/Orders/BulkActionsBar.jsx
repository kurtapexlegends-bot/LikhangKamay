import React from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Printer, FileDown, LoaderCircle, Truck } from "lucide-react";

export default function BulkActionsBar({
    mounted,
    selectedOrderIds,
    setSelectedOrderIds,
    handleBulkPrintLabels,
    handleBulkPrintPackingSlips,
    isPrintingSlips,
    handleBulkFulfill,
    canEditOrders,
}) {
    if (!mounted || selectedOrderIds.length === 0) return null;

    return createPortal(
        <div className="fixed bottom-6 inset-x-0 z-[999] flex justify-center pointer-events-none px-4">
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="pointer-events-auto flex flex-col items-center gap-2.5 rounded-2xl border border-stone-200 bg-white/95 px-3 py-2 shadow-2xl backdrop-blur-xl w-full max-w-[540px] sm:flex-row sm:justify-between sm:gap-4 sm:px-4 sm:py-2.5"
            >
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-clay-50 border border-clay-100 text-clay-700 shadow-sm">
                        <CheckCircle2 size={14} className="text-clay-600" />
                    </div>
                    <span className="text-xs font-extrabold tracking-tight text-stone-900 whitespace-nowrap">
                        {selectedOrderIds.length} Selected
                    </span>
                </div>
                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-start sm:justify-end overflow-x-auto no-scrollbar py-0.5">
                    <button
                        type="button"
                        onClick={() => setSelectedOrderIds([])}
                        className="rounded-lg px-2 py-1 text-[11px] font-bold text-stone-500 hover:text-stone-800 transition hover:bg-stone-50 active:scale-95 whitespace-nowrap flex-shrink-0 min-h-[44px]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleBulkPrintLabels}
                        className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-bold text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95 whitespace-nowrap flex-shrink-0 min-h-[44px]"
                    >
                        <Printer size={12} /> Print Labels
                    </button>
                    <button
                        type="button"
                        onClick={handleBulkPrintPackingSlips}
                        disabled={isPrintingSlips}
                        className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-bold text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:opacity-50 active:scale-95 whitespace-nowrap flex-shrink-0 min-h-[44px]"
                    >
                        {isPrintingSlips ? <LoaderCircle className="animate-spin" size={12} /> : <FileDown size={12} />} Packing Slips
                    </button>
                    <button
                        type="button"
                        onClick={handleBulkFulfill}
                        disabled={!canEditOrders}
                        className="flex items-center gap-1 rounded-lg bg-clay-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition hover:bg-clay-700 disabled:opacity-50 active:scale-95 whitespace-nowrap flex-shrink-0 min-h-[44px]"
                    >
                        <Truck size={12} /> Fulfill
                    </button>
                </div>
            </motion.div>
        </div>,
        document.body
    );
}

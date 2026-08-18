import React from "react";
import { Check, Percent, Sliders } from "lucide-react";

export default function DiscountStrategySelector({
    mode,
    setMode,
    globalType,
    setGlobalType,
    globalValue,
    setGlobalValue,
    maxPurchaseLimit,
    setMaxPurchaseLimit,
}) {
    return (
        <div className="space-y-3 pt-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-400 border-b border-stone-200/60 pb-1.5 flex items-center gap-1.5">
                <Sliders size={13} className="text-stone-500" /> Discount Type &amp; Rules
            </h3>

            <div className="space-y-2">
                {/* Global Uniform Mode Card */}
                <button
                    type="button"
                    onClick={() => setMode("global")}
                    className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                        mode === "global"
                            ? "bg-white border-clay-600 text-stone-900 shadow-sm font-bold ring-1 ring-clay-600/30"
                            : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        mode === "global" ? "bg-clay-600 border-clay-600 text-white" : "border-stone-300"
                    }`}>
                        {mode === "global" && <Check size={10} strokeWidth={3} />}
                    </div>
                    <div>
                        <span className="text-xs font-bold block">Same Discount for All Products</span>
                        <span className="text-[10px] text-stone-400 font-normal">Apply the same discount rate to selected items</span>
                    </div>
                </button>

                {/* Custom Per Product Mode Card */}
                <button
                    type="button"
                    onClick={() => setMode("individual")}
                    className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                        mode === "individual"
                            ? "bg-white border-clay-600 text-stone-900 shadow-sm font-bold ring-1 ring-clay-600/30"
                            : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        mode === "individual" ? "bg-clay-600 border-clay-600 text-white" : "border-stone-300"
                    }`}>
                        {mode === "individual" && <Check size={10} strokeWidth={3} />}
                    </div>
                    <div>
                        <span className="text-xs font-bold block">Custom Discount per Product</span>
                        <span className="text-[10px] text-stone-400 font-normal">Set individual discount rates for each item</span>
                    </div>
                </button>
            </div>

            {/* Global Value Input Panel */}
            {mode === "global" && (
                <div className="p-3 rounded-2xl bg-white border border-stone-200/80 shadow-sm space-y-2.5 animate-in fade-in duration-200">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setGlobalType("percentage")}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                                globalType === "percentage"
                                    ? "bg-clay-50 border-clay-500 text-clay-700 shadow-sm"
                                    : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                            }`}
                        >
                            <Percent size={12} /> Percentage Off (%)
                        </button>

                        <button
                            type="button"
                            onClick={() => setGlobalType("fixed")}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                                globalType === "fixed"
                                    ? "bg-clay-50 border-clay-500 text-clay-700 shadow-sm"
                                    : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                            }`}
                        >
                            <span className="font-extrabold text-xs">₱</span> Fixed Amount Off (₱)
                        </button>
                    </div>

                    <div>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-xs font-bold text-stone-400">
                                {globalType === "percentage" ? "%" : "₱"}
                            </span>
                            <input
                                type="number"
                                step={globalType === "percentage" ? "1" : "0.01"}
                                min="0.01"
                                max={globalType === "percentage" ? "99" : undefined}
                                value={globalValue}
                                onChange={(e) => setGlobalValue(e.target.value)}
                                placeholder={globalType === "percentage" ? "10" : "500.00"}
                                className={`w-full text-xs rounded-xl border-stone-200 pl-8 py-2 focus:border-clay-500 focus:ring-clay-500 font-bold ${
                                    globalValue !== "" && (
                                        (globalType === "percentage" && (parseFloat(globalValue) <= 0 || parseFloat(globalValue) >= 100)) ||
                                        (globalType === "fixed" && parseFloat(globalValue) <= 0)
                                    ) ? "border-rose-400 text-rose-700 bg-rose-50" : ""
                                }`}
                                required={mode === "global"}
                            />
                        </div>
                        {globalValue !== "" && globalType === "percentage" && (parseFloat(globalValue) <= 0 || parseFloat(globalValue) >= 100) && (
                            <p className="text-[10px] text-rose-600 font-bold mt-1">Rate must be between 1% and 99%.</p>
                        )}
                        {globalValue !== "" && globalType === "fixed" && parseFloat(globalValue) <= 0 && (
                            <p className="text-[10px] text-rose-600 font-bold mt-1">Price must be greater than ₱0.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Per Buyer Order Limit */}
            <div className="p-3 rounded-2xl bg-white border border-stone-200/80 shadow-sm space-y-1">
                <label className="block text-[11px] font-bold text-stone-700">
                    Purchase Limit per Order <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                    type="number"
                    min="1"
                    value={maxPurchaseLimit || ""}
                    onChange={(e) => setMaxPurchaseLimit(e.target.value)}
                    placeholder="2"
                    className="w-full text-xs rounded-xl border-stone-200 py-1.5 focus:border-clay-500 focus:ring-clay-500 font-medium"
                />
            </div>
        </div>
    );
}

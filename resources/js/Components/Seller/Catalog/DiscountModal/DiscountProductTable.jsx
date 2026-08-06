import React, { useState } from "react";
import { Search, X } from "lucide-react";

export default function DiscountProductTable({
    filteredProducts = [],
    targetProductIds = [],
    handleToggleProduct,
    handleToggleSelectAll,
    searchQuery,
    setSearchQuery,
    mode,
    globalValue,
    globalType,
    individualMap,
    updateIndividualSetting,
    getCalculatedPrice,
}) {
    const [batchType, setBatchType] = useState("percentage");
    const [batchValue, setBatchValue] = useState("");

    return (
        <div className="col-span-12 lg:col-span-8 p-6 flex flex-col overflow-hidden space-y-4">
            {/* Search & Bulk Select Toolbar */}
            <div className="flex items-center justify-between gap-3 shrink-0">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3.5 top-3 text-stone-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search product by title or SKU..."
                        className="w-full text-xs rounded-xl border-stone-200 pl-9 pr-8 py-2.5 focus:border-clay-500 focus:ring-clay-500 bg-stone-50/50 font-medium"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="px-3.5 py-2.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition border border-stone-200 shrink-0"
                >
                    {targetProductIds.length === filteredProducts.length && filteredProducts.length > 0
                        ? "Deselect All"
                        : "Select All"}
                </button>
            </div>
            {targetProductIds.length > 0 && mode === "individual" && (
                <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-xs text-amber-900 font-bold">
                        <span className="w-5 h-5 rounded-full bg-amber-200/80 text-amber-800 text-[11px] flex items-center justify-center font-extrabold">
                            {targetProductIds.length}
                        </span>
                        <span>Items Selected</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="inline-flex rounded-lg border border-stone-200/80 bg-white p-0.5 shadow-sm">
                            <button
                                type="button"
                                onClick={() => setBatchType("percentage")}
                                className={`px-2 py-1 text-[10px] font-extrabold rounded-md transition ${
                                    batchType === "percentage" ? "bg-clay-600 text-white" : "text-stone-600"
                                }`}
                            >
                                % OFF
                            </button>
                            <button
                                type="button"
                                onClick={() => setBatchType("fixed")}
                                className={`px-2 py-1 text-[10px] font-extrabold rounded-md transition ${
                                    batchType === "fixed" ? "bg-clay-600 text-white" : "text-stone-600"
                                }`}
                            >
                                ₱ Target
                            </button>
                        </div>

                        <input
                            type="number"
                            step={batchType === "percentage" ? "1" : "0.01"}
                            placeholder={batchType === "percentage" ? "Rate %" : "Price ₱"}
                            value={batchValue}
                            onChange={(e) => setBatchValue(e.target.value)}
                            className="w-24 text-xs font-bold rounded-lg border-stone-200 py-1.5 px-2.5 focus:ring-clay-500 bg-white text-right"
                        />

                        <button
                            type="button"
                            onClick={() => {
                                if (batchValue) {
                                    targetProductIds.forEach((pid) => {
                                        updateIndividualSetting(pid, "type", batchType);
                                        updateIndividualSetting(pid, "value", batchValue);
                                    });
                                }
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-clay-600 hover:bg-clay-700 rounded-lg shadow-sm transition active:scale-95 shrink-0"
                        >
                            Batch Apply
                        </button>
                    </div>
                </div>
            )}

            {/* Product Pricing Table */}
            <div className="flex-1 overflow-y-auto rounded-2xl border border-stone-200/80 bg-white">
                <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-stone-50 border-b border-stone-200/70 text-[10px] uppercase tracking-wider font-extrabold text-stone-400 z-10">
                        <tr>
                            <th className="py-2.5 px-3">Product</th>
                            <th className="py-2.5 px-3 text-right">Original</th>
                            <th className="py-2.5 px-3 text-center">Discount Rate</th>
                            <th className="py-2.5 px-3 text-right">Promo Price</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {filteredProducts.length > 0 ? (
                            filteredProducts.map((product) => {
                                const isChecked = targetProductIds.includes(product.id);
                                const calc = getCalculatedPrice(product);
                                const setting = individualMap[product.id] || { type: "percentage", value: "" };
                                const valNum = parseFloat(setting.value);
                                const origNum = Number(product.price);
                                const isInvalidFixed = isChecked && mode !== "global" && setting.type === "fixed" && valNum >= origNum;

                                return (
                                    <tr
                                        key={product.id}
                                        className={`transition-colors ${
                                            isInvalidFixed 
                                                ? "bg-rose-50/60" 
                                                : isChecked 
                                                ? "bg-amber-50/40" 
                                                : "hover:bg-stone-50/60"
                                        }`}
                                    >
                                        {/* Product Info + Checkbox */}
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleToggleProduct(product.id)}
                                                    className="rounded border-stone-300 text-clay-600 focus:ring-clay-500 cursor-pointer"
                                                />
                                                <img
                                                    src={product.img || "/images/no-image.png"}
                                                    alt={product.name}
                                                    className="w-10 h-10 rounded-lg object-cover bg-stone-100 border border-stone-200 shrink-0"
                                                />
                                                <div className="min-w-0">
                                                    <p className="font-bold text-stone-900 truncate max-w-[180px]">{product.name}</p>
                                                    <p className="text-[10px] text-stone-400 font-mono">SKU: {product.sku || "N/A"}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Original Price */}
                                        <td className="py-3 px-3 text-right font-medium text-stone-500 whitespace-nowrap">
                                            ₱{Number(product.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>

                                        {/* Discount Rate Input / Indicator */}
                                        <td className="py-3 px-3 text-center">
                                            {isChecked ? (
                                                mode === "global" ? (
                                                    <span className="inline-flex items-center gap-1 bg-amber-100/80 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">
                                                        {globalValue ? (globalType === "percentage" ? `-${globalValue}%` : `₱${globalValue}`) : "Set Value"}
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex items-center justify-center gap-1.5 max-w-[170px] mx-auto">
                                                            <div className="inline-flex rounded-lg border border-stone-200/80 bg-stone-100 p-0.5 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateIndividualSetting(product.id, "type", "percentage")}
                                                                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md transition-all ${
                                                                        setting.type === "percentage"
                                                                            ? "bg-white text-clay-700 shadow-sm"
                                                                            : "text-stone-500 hover:text-stone-800"
                                                                    }`}
                                                                    title="Percentage OFF"
                                                                >
                                                                    %
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateIndividualSetting(product.id, "type", "fixed")}
                                                                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md transition-all ${
                                                                        setting.type === "fixed"
                                                                            ? "bg-white text-clay-700 shadow-sm"
                                                                            : "text-stone-500 hover:text-stone-800"
                                                                    }`}
                                                                    title="Fixed Promo Price"
                                                                >
                                                                    ₱
                                                                </button>
                                                            </div>
                                                            <input
                                                                type="number"
                                                                step={setting.type === "percentage" ? "1" : "0.01"}
                                                                min="0.01"
                                                                max={setting.type === "percentage" ? "99" : undefined}
                                                                value={setting.value}
                                                                onChange={(e) => updateIndividualSetting(product.id, "value", e.target.value)}
                                                                placeholder={setting.type === "percentage" ? "Rate" : "Price"}
                                                                className={`w-20 text-[11px] font-bold rounded-lg border-stone-200 py-1 px-2 focus:ring-clay-500 text-right bg-white shadow-sm ${
                                                                    isInvalidFixed || (isChecked && mode !== "global" && setting.type === "percentage" && valNum >= 100) ? "border-rose-400 text-rose-700 bg-rose-50" : ""
                                                                }`}
                                                            />
                                                        </div>
                                                        {isInvalidFixed && (
                                                            <span className="block text-[9px] font-bold text-rose-600 mt-0.5">Must be &lt; ₱{origNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                        )}
                                                        {isChecked && mode !== "global" && setting.type === "percentage" && valNum >= 100 && (
                                                            <span className="block text-[9px] font-bold text-rose-600 mt-0.5">Must be &lt; 100%</span>
                                                        )}
                                                    </div>
                                                )
                                            ) : (
                                                <span className="text-[10px] text-stone-300 font-medium">—</span>
                                            )}
                                        </td>

                                        {/* Final Promo Price */}
                                        <td className="py-3 px-3 text-right whitespace-nowrap">
                                            {isChecked && calc.saved > 0 ? (
                                                <div>
                                                    <span className="font-extrabold text-clay-700 block">
                                                        ₱{calc.final.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1 py-0.2 rounded">
                                                        Save ₱{calc.saved.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="font-bold text-stone-700">
                                                    ₱{Number(product.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="4" className="py-8 text-center text-xs text-stone-400">
                                    No products match your search filter.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

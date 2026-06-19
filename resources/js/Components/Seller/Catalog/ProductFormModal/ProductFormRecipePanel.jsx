import React from "react";
import Checkbox from "@/Components/Checkbox";
import WorkspaceEmptyState from "@/Components/WorkspaceEmptyState";
import { Settings, Plus, Trash2, Store } from "lucide-react";

export default function ProductFormRecipePanel({
    data,
    setData,
    supplies,
    addRecipeItem,
    removeRecipeItem,
    updateRecipeItem,
}) {
    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Settings size={18} className="text-stone-400" />
                            Production Method
                        </h3>
                        <p className="mt-1 text-xs text-stone-500">
                            Define how this product is sourced and managed.
                        </p>
                    </div>
                    <div className="flex bg-stone-100 p-1 rounded-xl shrink-0 w-fit select-none">
                        <button
                            type="button"
                            onClick={() => setData("production_method", "resell")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${data.production_method === "resell" ? "bg-white text-clay-700 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
                        >
                            Resell
                        </button>
                        <button
                            type="button"
                            onClick={() => setData("production_method", "manufactured")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${data.production_method === "manufactured" ? "bg-white text-clay-700 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
                        >
                            Manufactured
                        </button>
                    </div>
                </div>

                {data.production_method === "manufactured" ? (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                                Bill of Materials (Recipe)
                            </h4>
                            <button
                                type="button"
                                onClick={addRecipeItem}
                                className="flex items-center gap-1.5 text-xs font-bold text-clay-600 hover:text-clay-700 transition p-1"
                            >
                                <Plus size={14} /> Add Ingredient
                            </button>
                        </div>

                        {data.recipes.length > 0 ? (
                            <div className="space-y-3">
                                {data.recipes.map((item, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 border border-stone-100 p-3.5 rounded-2xl sm:border-0 sm:p-0 sm:rounded-none animate-fadeIn">
                                        <div className="flex-1">
                                            <select
                                                className="w-full rounded-xl border-gray-300 bg-white text-sm text-gray-900 focus:border-clay-500 focus:ring-clay-500 py-3 pl-4 pr-10 min-h-[44px]"
                                                value={item.supply_id}
                                                onChange={(e) => updateRecipeItem(idx, "supply_id", e.target.value)}
                                            >
                                                <option value="" disabled>
                                                    Select Material
                                                </option>
                                                {supplies.map((s) => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.name} ({s.unit || "pcs"})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-3 justify-between sm:justify-start w-full sm:w-auto">
                                            <div className="w-24 sm:w-24 flex-1 sm:flex-none">
                                                <input
                                                    type="number"
                                                    className="w-full rounded-xl border-gray-300 text-sm focus:border-clay-500 focus:ring-clay-500 py-3 px-4 min-h-[44px]"
                                                    placeholder="Qty"
                                                    value={item.quantity_required}
                                                    onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                                    onChange={(e) => updateRecipeItem(idx, "quantity_required", e.target.value.replace(/-/g, ""))}
                                                    min="0.01"
                                                    step="any"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeRecipeItem(idx)}
                                                className="text-stone-400 hover:text-rose-600 p-2 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <WorkspaceEmptyState
                                icon={Settings}
                                title="No ingredients added"
                                description="Add ingredients from your supplies to define the bill of materials."
                                compact={true}
                            />
                        )}

                        <div className="border-t border-stone-150 pt-4 flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <Checkbox
                                        name="track_as_supply"
                                        checked={data.track_as_supply}
                                        onChange={(e) => setData("track_as_supply", e.target.checked)}
                                    />
                                    <div>
                                        <span className="text-sm font-bold text-gray-700 transition group-hover:text-clay-600">
                                            Auto-Deduct Supplies
                                        </span>
                                        <p className="text-xs text-gray-500">
                                            Deduct materials automatically upon successful production runs.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl bg-stone-50 p-6 text-center border border-stone-100">
                        <Store className="mx-auto text-stone-400 mb-3" size={32} />
                        <h4 className="text-sm font-bold text-gray-900">
                            Resell Mode Active
                        </h4>
                        <p className="mt-2 text-xs text-stone-500 max-w-xs mx-auto">
                            In resell mode, you simply manage stock and prices without a bill of materials. Perfect for finished goods sourced from other artisans.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

import React from 'react';
import { ChevronDown, Filter, RotateCcw } from 'lucide-react';

export default function SuppliesFilterPopover({
    isOpen,
    onClose,
    draftCategory,
    setDraftCategory,
    draftStockStatus,
    setDraftStockStatus,
    draftUnitType,
    setDraftUnitType,
    categoriesList = [],
    availableUnits = [],
    draftActiveCount = 0,
    onApply,
    onReset,
}) {
    if (!isOpen) return null;

    return (
        <div className="hidden lg:flex flex-col absolute right-0 z-[100] mt-2 w-[380px] max-h-[calc(100vh-180px)] rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                    <Filter size={15} className="text-clay-700" />
                    <h3 className="text-sm font-bold text-stone-900">Filter Supplies</h3>
                </div>
                {draftActiveCount > 0 && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-500 hover:text-clay-700 transition cursor-pointer"
                    >
                        <RotateCcw size={12} />
                        <span>Reset Selection</span>
                    </button>
                )}
            </div>

            {/* Fields Grid */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[50vh] no-scrollbar">
                {/* 1. Category Filter */}
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                        Category
                    </label>
                    <div className="relative">
                        <select
                            value={draftCategory}
                            onChange={(e) => setDraftCategory(e.target.value)}
                            className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                        >
                            <option value="all">All Categories ({categoriesList.length})</option>
                            {categoriesList.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                    </div>
                </div>

                {/* 2. Stock Alert Status */}
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                        Stock Alert Status
                    </label>
                    <div className="relative">
                        <select
                            value={draftStockStatus}
                            onChange={(e) => setDraftStockStatus(e.target.value)}
                            className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                        >
                            <option value="all">All Stock Levels</option>
                            <option value="low_stock">Low Stock (At or Below Min)</option>
                            <option value="in_stock">In Stock (Sufficient)</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                    </div>
                </div>

                {/* 3. Measurement Unit */}
                {availableUnits.length > 0 && (
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                            Unit of Measure
                        </label>
                        <div className="relative">
                            <select
                                value={draftUnitType}
                                onChange={(e) => setDraftUnitType(e.target.value)}
                                className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                            >
                                <option value="all">All Units ({availableUnits.length})</option>
                                {availableUnits.map((u) => (
                                    <option key={u} value={u}>
                                        {u}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between shrink-0 bg-white">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 transition cursor-pointer"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onApply}
                    className="rounded-xl bg-clay-700 px-5 py-2 text-xs font-bold text-white shadow-md shadow-clay-200 hover:bg-clay-800 transition active:scale-95 cursor-pointer"
                >
                    Apply & Close
                </button>
            </div>
        </div>
    );
}

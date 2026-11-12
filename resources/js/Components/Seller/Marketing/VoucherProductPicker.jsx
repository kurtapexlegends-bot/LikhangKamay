import React, { useState, useMemo } from "react";
import { Search, Check, X, Package } from "lucide-react";

export default function VoucherProductPicker({
    products = [],
    selectedProductIds = [],
    onChangeSelectedIds,
}) {
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [brokenImgIds, setBrokenImgIds] = useState({});

    // Extract unique categories from shop products
    const categories = useMemo(() => {
        const set = new Set();
        products.forEach((p) => {
            if (p.category) set.add(p.category);
        });
        return ["all", ...Array.from(set)];
    }, [products]);

    // Filter products by search and category
    const filteredProducts = useMemo(() => {
        const query = search.trim().toLowerCase();
        return products.filter((p) => {
            const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
            const matchesSearch =
                !query ||
                p.name?.toLowerCase().includes(query) ||
                p.sku?.toLowerCase().includes(query);
            return matchesCategory && matchesSearch;
        });
    }, [products, search, selectedCategory]);

    const isAllFilteredSelected =
        filteredProducts.length > 0 &&
        filteredProducts.every((p) => selectedProductIds.includes(p.id));

    const handleToggleAllFiltered = () => {
        if (isAllFilteredSelected) {
            const filteredIds = new Set(filteredProducts.map((p) => p.id));
            onChangeSelectedIds(selectedProductIds.filter((id) => !filteredIds.has(id)));
        } else {
            const nextSet = new Set([...selectedProductIds, ...filteredProducts.map((p) => p.id)]);
            onChangeSelectedIds(Array.from(nextSet));
        }
    };

    const handleToggleProduct = (id) => {
        if (selectedProductIds.includes(id)) {
            onChangeSelectedIds(selectedProductIds.filter((item) => item !== id));
        } else {
            onChangeSelectedIds([...selectedProductIds, id]);
        }
    };

    return (
        <div className="space-y-2.5 rounded-2xl border border-stone-200/90 bg-stone-50/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700">
                        Choose Applicable Products
                    </span>
                    <span className="rounded-full bg-clay-100 px-2 py-0.5 text-[10px] font-bold text-clay-800">
                        {selectedProductIds.length} Selected
                    </span>
                </div>
                {filteredProducts.length > 0 && (
                    <button
                        type="button"
                        onClick={handleToggleAllFiltered}
                        className="text-[11px] font-semibold text-clay-700 hover:text-clay-900 underline cursor-pointer"
                    >
                        {isAllFilteredSelected ? "Deselect Filtered" : "Select All Filtered"}
                    </button>
                )}
            </div>

            {/* Filter Toolbar */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search product name or SKU..."
                        className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-stone-200 bg-white outline-none focus:border-clay-500"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                            aria-label="Clear product search"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                {categories.length > 2 && (
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="text-xs rounded-xl border border-stone-200 bg-white pl-3 pr-8 py-1.5 text-stone-700 outline-none focus:border-clay-500 shrink-0"
                    >
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat === "all" ? "All Categories" : cat}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Products List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                {filteredProducts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-stone-400">
                        <Package size={20} className="mx-auto mb-1.5 text-stone-300" />
                        No products match your search.
                    </div>
                ) : (
                    filteredProducts.map((p) => {
                        const isSelected = selectedProductIds.includes(p.id);
                        const hasBrokenImg = Boolean(brokenImgIds[p.id]) || !p.img;

                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => handleToggleProduct(p.id)}
                                className={`w-full text-left flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer min-h-[44px] ${
                                    isSelected
                                        ? "bg-clay-50/70 border-clay-300 shadow-2xs"
                                        : "bg-white border-stone-200/80 hover:border-stone-300"
                                }`}
                            >
                                <div
                                    className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                                        isSelected
                                            ? "bg-clay-600 border-clay-600 text-white"
                                            : "border-stone-300 bg-white"
                                    }`}
                                >
                                    {isSelected && <Check size={11} strokeWidth={3} />}
                                </div>

                                {hasBrokenImg ? (
                                    <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200/60 flex items-center justify-center text-stone-400 shrink-0">
                                        <Package size={14} />
                                    </div>
                                ) : (
                                    <img
                                        src={p.img}
                                        alt={p.name}
                                        onError={() => setBrokenImgIds((prev) => ({ ...prev, [p.id]: true }))}
                                        className="w-8 h-8 rounded-lg object-cover bg-stone-100 shrink-0 border border-stone-200/60"
                                    />
                                )}

                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-stone-800 truncate leading-snug">
                                        {p.name}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-stone-500">
                                        <span className="font-mono text-clay-700 font-bold">
                                            PHP {Number(p.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                        {p.category && (
                                            <>
                                                <span>·</span>
                                                <span className="truncate">{p.category}</span>
                                            </>
                                        )}
                                        {p.sku && (
                                            <>
                                                <span>·</span>
                                                <span className="font-mono">{p.sku}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}

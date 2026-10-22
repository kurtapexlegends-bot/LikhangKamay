import React, { useState, useMemo } from 'react';
import { Search, Star, Package, Store, X } from 'lucide-react';

export default function ProductDirectorySidebar({
    products = [],
    selectedProductId = 'all',
    onSelectProduct,
    overallStats = {},
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all'); // 'all' | 'has_reviews' | 'needs_reply'

    const filterCounts = useMemo(() => {
        let hasReviews = 0;
        let needsReply = 0;
        products.forEach((p) => {
            if (p.reviews_count > 0) hasReviews++;
            if (p.unreplied_reviews_count > 0) needsReply++;
        });
        return {
            all: products.length,
            has_reviews: hasReviews,
            needs_reply: needsReply,
        };
    }, [products]);

    const filteredProducts = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return products.filter((p) => {
            if (filterCategory === 'has_reviews' && p.reviews_count === 0) return false;
            if (filterCategory === 'needs_reply' && p.unreplied_reviews_count === 0) return false;

            if (!q) return true;
            return (
                p.name?.toLowerCase().includes(q) ||
                p.category?.toLowerCase().includes(q)
            );
        });
    }, [products, searchTerm, filterCategory]);

    const isAllSelected = selectedProductId === 'all' || !selectedProductId;

    return (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs flex flex-col h-[740px] overflow-hidden">
            {/* Sidebar Search & Filter Pills */}
            <div className="p-3.5 border-b border-stone-200/80 bg-[#FAF9F6] space-y-2.5 shrink-0">
                {/* Search Bar */}
                <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search product or category..."
                        className="w-full rounded-xl border border-stone-200 bg-white py-1.5 pl-8 pr-8 text-xs font-medium text-stone-900 placeholder-stone-400 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 shadow-2xs h-[34px]"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* Filter Pills with Badge Numbers (Content Safety Style) */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
                    {[
                        { key: 'all', label: 'All', count: filterCounts.all },
                        { key: 'has_reviews', label: 'Reviewed', count: filterCounts.has_reviews },
                        { key: 'needs_reply', label: 'Needs Reply', count: filterCounts.needs_reply },
                    ].map((tab) => {
                        const isActive = filterCategory === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setFilterCategory(tab.key)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                                    isActive
                                        ? 'bg-clay-700 text-white shadow-2xs'
                                        : 'bg-white border border-stone-200/80 text-stone-600 hover:bg-stone-50'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span
                                    className={`inline-flex items-center justify-center px-1.5 py-0.2 rounded-md text-[9px] font-black ${
                                        isActive
                                            ? 'bg-white/20 text-white'
                                            : tab.count > 0 ? 'bg-stone-100 text-stone-700' : 'bg-stone-100/60 text-stone-400'
                                    }`}
                                >
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Scrollable Product List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* 1. All Store Items Entry */}
                {!searchTerm.trim() && filterCategory === 'all' && (
                    <button
                        type="button"
                        onClick={() => onSelectProduct('all')}
                        className={`relative w-full text-left p-3 border-b border-stone-100 transition-all flex items-center gap-3 cursor-pointer ${
                            isAllSelected
                                ? 'bg-clay-50/70'
                                : 'bg-white hover:bg-stone-50/80'
                        }`}
                    >
                        {isAllSelected && (
                            <span className="absolute left-0 top-0 bottom-0 w-1 bg-clay-700 pointer-events-none" />
                        )}
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                            isAllSelected
                                ? 'bg-clay-50 text-clay-700 border-clay-200/90'
                                : 'bg-stone-100 text-stone-600 border-stone-200'
                        }`}>
                            <Store size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                                <span className={`text-xs truncate ${isAllSelected ? 'text-stone-900 font-bold' : 'text-stone-700 font-medium'}`}>
                                    All Store Reviews
                                </span>
                                <span className="text-[10px] font-black text-stone-500 shrink-0">
                                    {overallStats.total || 0}
                                </span>
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-1 text-[10px]">
                                <div className="flex items-center gap-1">
                                    <Star size={10} className="fill-amber-400 text-amber-400" />
                                    <span className="font-bold text-stone-800">
                                        {overallStats.average ? overallStats.average.toFixed(1) : '0.0'}
                                    </span>
                                </div>
                                {overallStats.unreplied_total > 0 && (
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200/80">
                                        {overallStats.unreplied_total} waiting
                                    </span>
                                )}
                            </div>
                        </div>
                    </button>
                )}

                {/* 2. Individual Product Rows */}
                {filteredProducts.length === 0 ? (
                    <div className="p-8 text-center text-xs text-stone-400 font-medium">
                        No products match your search or filter.
                    </div>
                ) : (
                    filteredProducts.map((product) => {
                        const isSelected = String(selectedProductId) === String(product.id);

                        return (
                            <button
                                key={product.id}
                                type="button"
                                onClick={() => onSelectProduct(product.id)}
                                className={`relative w-full text-left p-3 border-b border-stone-100 last:border-b-0 transition-all flex items-center gap-3 cursor-pointer ${
                                    isSelected
                                        ? 'bg-clay-50/70'
                                        : 'bg-white hover:bg-stone-50/70'
                                }`}
                            >
                                {isSelected && (
                                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-clay-700 pointer-events-none" />
                                )}
                                <div className={`h-9 w-9 rounded-xl bg-stone-100 overflow-hidden shrink-0 flex items-center justify-center border transition-all ${
                                    isSelected ? 'border-clay-300 ring-1 ring-clay-300/40' : 'border-stone-200'
                                }`}>
                                    {product.cover_photo_path ? (
                                        <img
                                            src={product.cover_photo_path}
                                            alt={product.name}
                                            className="h-full w-full object-cover"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <Package size={15} className="text-stone-400" />
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                        <p className={`text-xs truncate ${isSelected ? 'text-stone-900 font-bold' : 'text-stone-700 font-medium'}`}>
                                            {product.name}
                                        </p>
                                        <span className="text-[10px] font-black text-stone-500 shrink-0">
                                            {product.reviews_count}
                                        </span>
                                    </div>

                                    <div className="mt-0.5 flex items-center justify-between gap-1 text-[10px]">
                                        <div className="flex items-center gap-1">
                                            {product.reviews_count > 0 ? (
                                                <>
                                                    <Star size={10} className="fill-amber-400 text-amber-400" />
                                                    <span className="font-bold text-stone-800">
                                                        {product.avg_rating.toFixed(1)}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-stone-400 text-[10px]">No ratings</span>
                                            )}
                                        </div>

                                        {product.unreplied_reviews_count > 0 ? (
                                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200/80">
                                                {product.unreplied_reviews_count} waiting
                                            </span>
                                        ) : product.reviews_count > 0 ? (
                                            <span className="text-[9px] font-bold text-emerald-600">
                                                All replied
                                            </span>
                                        ) : null}
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

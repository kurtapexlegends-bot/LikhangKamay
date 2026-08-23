import React from 'react';
import { Search, Layers, Link as LinkIcon, Plus } from 'lucide-react';
import { Link } from '@inertiajs/react';

export default function SupplyFilterBar({
    searchQuery,
    setSearchQuery,
    onSearch,
    categories = [],
    activeCategory,
    onCategoryChange,
    myPublishedCount = 0,
}) {
    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                {/* Search Bar */}
                <form onSubmit={onSearch} className="flex gap-2 flex-1 max-w-xl">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search raw materials, clay types, glazes, timber, or supplier studios..."
                            className="w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 shadow-2xs"
                        />
                    </div>
                    <button
                        type="submit"
                        className="rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition-colors shadow-2xs"
                    >
                        Search
                    </button>
                </form>

                {/* Studio Quick Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    <Link
                        href={route('seller.supply-hub.my-listings')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-2xs"
                    >
                        <Layers size={13} className="text-clay-600" />
                        <span>My Wholesale Listings</span>
                        {myPublishedCount > 0 && (
                            <span className="rounded-full bg-clay-100 text-clay-700 px-1.5 py-0.2 text-[10px] font-extrabold">
                                {myPublishedCount}
                            </span>
                        )}
                    </Link>
                </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        type="button"
                        onClick={() => onCategoryChange(cat)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                            activeCategory === cat
                                ? 'bg-stone-900 text-white shadow-2xs'
                                : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        </div>
    );
}

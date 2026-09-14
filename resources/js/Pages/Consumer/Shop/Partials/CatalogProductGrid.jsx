import React from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2 } from 'lucide-react';
import ProductCard from './ProductCard';
import CatalogSkeleton from '@/Components/Consumer/CatalogSkeleton';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';

export default function CatalogProductGrid({
    isLoading = false,
    products = [],
    sponsoredGridPlacement = 'catalog_sponsored_grid',
    nextPageUrl = null,
    isLoadingMore = false,
    observerRef,
    searchFilter = '',
    onClearAllFilters,
    onQuickSearch,
    quickRecoverySearches = ['Planter', 'Mug', 'Tableware'],
}) {
    if (isLoading) {
        return <CatalogSkeleton />;
    }

    if (products.length > 0) {
        return (
            <div>
                <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {products.map((product) => (
                        <motion.div layout key={product.id}>
                            <ProductCard
                                product={product}
                                sponsoredPlacement={sponsoredGridPlacement}
                            />
                        </motion.div>
                    ))}
                </motion.div>

                {/* Infinite scroll sentinel & subtle loading indicator */}
                {nextPageUrl && (
                    <div ref={observerRef} className="h-16 w-full flex items-center justify-center py-4">
                        {isLoadingMore && (
                            <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 bg-white/90 backdrop-blur px-4 py-2 rounded-full border border-stone-200 shadow-xs animate-in fade-in">
                                <Loader2 size={14} className="animate-spin text-clay-600" />
                                <span>Loading more items...</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        /* Empty State */
        <div className="font-normal space-y-4 rounded-xl border border-gray-100 bg-white py-10">
            <WorkspaceEmptyState
                icon={Search}
                title="No products found"
                description={searchFilter
                    ? `No matches for "${searchFilter}". Try a simpler keyword or reset your filters.`
                    : 'No products match your current filters. Try widening your search.'}
                actionLabel="Clear all filters"
                onAction={onClearAllFilters}
            />
            {searchFilter && (
                <div className="flex flex-wrap items-center justify-center gap-2 px-4">
                    {quickRecoverySearches.map((term) => (
                        <button
                            key={term}
                            type="button"
                            onClick={() => onQuickSearch && onQuickSearch(term)}
                            className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-[11px] font-bold text-stone-600 transition hover:border-clay-300 hover:text-clay-700 active:scale-95"
                        >
                            Try &ldquo;{term}&rdquo;
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

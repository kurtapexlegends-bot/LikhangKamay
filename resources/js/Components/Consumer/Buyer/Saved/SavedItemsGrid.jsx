import React from 'react';
import { Heart, History } from 'lucide-react';
import SavedProductCard from './SavedProductCard';
import SavedProductListRow from './SavedProductListRow';
import CompactPagination from '@/Components/CompactPagination';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';

export default function SavedItemsGrid({
    items = [],
    activeTab = 'wishlist',
    viewMode = 'grid',
    isBulkEdit = false,
    selectedIds = [],
    onToggleSelect,
    onRemoveWishlist,
    onQuickView,
    onAddToCart,
    currentPage = 1,
    totalPages = 1,
    totalItems = 0,
    itemsPerPage = 15,
    onPageChange,
}) {
    const isWishlist = activeTab === 'wishlist';

    if (!items || items.length === 0) {
        return (
            <WorkspaceEmptyState
                icon={isWishlist ? Heart : History}
                title={isWishlist ? "Your wishlist is empty" : "No recently viewed products"}
                description={
                    isWishlist
                        ? "Save handmade pieces as you browse, and they will appear here."
                        : "Pieces you open in the marketplace will appear here for quick access."
                }
                actionLabel="Explore Crafts"
                actionHref={route('shop.index')}
                className="py-16"
            />
        );
    }

    return (
        <div className="space-y-5">
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5 animate-in fade-in duration-200">
                    {items.map((product) => (
                        <SavedProductCard
                            key={product.id}
                            product={product}
                            isBulkEdit={isBulkEdit}
                            isSelected={selectedIds.includes(product.id)}
                            onToggleSelect={onToggleSelect}
                            onRemoveWishlist={onRemoveWishlist}
                            onQuickView={onQuickView}
                            onAddToCart={onAddToCart}
                        />
                    ))}
                </div>
            ) : (
                <div className="space-y-2 animate-in fade-in duration-200">
                    {items.map((product) => (
                        <SavedProductListRow
                            key={product.id}
                            product={product}
                            isBulkEdit={isBulkEdit}
                            isSelected={selectedIds.includes(product.id)}
                            onToggleSelect={onToggleSelect}
                            onRemoveWishlist={onRemoveWishlist}
                            onQuickView={onQuickView}
                            onAddToCart={onAddToCart}
                        />
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && onPageChange && (
                <div className="flex justify-center border-t border-stone-200/80 pt-4">
                    <CompactPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        itemLabel="items"
                        onPageChange={onPageChange}
                    />
                </div>
            )}
        </div>
    );
}

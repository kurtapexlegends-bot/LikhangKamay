import React from 'react';
import { Heart, History } from 'lucide-react';
import ProductCard from '@/Components/Consumer/Buyer/Saved/ProductCard';
import CompactPagination from '@/Components/CompactPagination';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';

export default function SavedItemsGrid({
    items,
    activeTab,
    isBulkEdit,
    selectedIds,
    onToggleSelect,
    onRemoveWishlist,
    onQuickView,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
}) {
    const isWishlist = activeTab === 'wishlist';

    if (!items || items.length === 0) {
        return (
            <WorkspaceEmptyState
                icon={isWishlist ? Heart : History}
                title={isWishlist ? "No wishlisted products" : "No recently viewed products"}
                description={
                    isWishlist 
                        ? "Save products from any product page and they will appear here." 
                        : "Products you open will appear here for faster return visits."
                }
                actionLabel="Browse Shop"
                actionHref={route('shop.index')}
                className="py-16"
            />
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6 animate-in fade-in duration-500">
                {items.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        showHeart={isWishlist && !isBulkEdit}
                        isBulkEdit={isBulkEdit}
                        isSelected={selectedIds.includes(product.id)}
                        onToggleSelect={onToggleSelect}
                        onRemoveWishlist={onRemoveWishlist}
                        onQuickView={onQuickView}
                    />
                ))}
            </div>
            {isWishlist && totalPages > 1 && (
                <div className="flex justify-center border-t border-stone-100 pt-6">
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

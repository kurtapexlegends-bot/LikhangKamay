import React, { useEffect, useState, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import ShopLayout from '@/Layouts/ShopLayout';
import { useToast } from '@/Components/ToastContext';
import { 
    getFollowedShops, 
    getRecentlyViewedProducts, 
    getWishlistedProducts, 
    toggleWishlistedProduct, 
    toggleFollowedShop,
    clearWishlistedProducts,
    clearFollowedShops,
    clearRecentlyViewedProducts,
    pruneInactiveProducts,
    syncSignalsWithServer
} from '@/utils/buyerSignals';

// Subcomponents
import SavedHeroHeader from '@/Components/Consumer/Buyer/Saved/SavedHeroHeader';
import SavedItemsGrid from '@/Components/Consumer/Buyer/Saved/SavedItemsGrid';
import FollowedShopsList from '@/Components/Consumer/Buyer/Saved/FollowedShopsList';
import QuickViewModal from '@/Components/Consumer/Buyer/Saved/QuickViewModal';
import SavedBulkActions from '@/Components/Consumer/Buyer/Saved/SavedBulkActions';
import ClearConfirmation from '@/Components/Consumer/Buyer/Saved/ClearConfirmation';

const ITEMS_PER_PAGE = 15;

export default function Saved() {
    const { addToast } = useToast();
    const { auth } = usePage().props;
    const userId = auth?.user?.id;

    const [activeTab, setActiveTab] = useState('wishlist');
    const [wishlistedProducts, setWishlistedProducts] = useState([]);
    const [followedShops, setFollowedShops] = useState([]);
    const [recentlyViewed, setRecentlyViewed] = useState([]);
    
    // Controls State
    const [sortOrder, setSortOrder] = useState('recent');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [isBulkEdit, setIsBulkEdit] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [wishlistPage, setWishlistPage] = useState(1);
    
    // Modal State
    const [quickViewProduct, setQuickViewProduct] = useState(null);
    const [isProcessingBulk, setIsProcessingBulk] = useState(false);
    const [clearAction, setClearAction] = useState(null);

    useEffect(() => {
        if (userId) {
            syncSignalsWithServer(userId);
        }

        const syncSignals = () => {
            setWishlistedProducts(getWishlistedProducts(userId));
            setFollowedShops(getFollowedShops(userId));
            setRecentlyViewed(getRecentlyViewedProducts());
        };

        syncSignals();

        // Verify active products with server
        const wishlistIds = getWishlistedProducts(userId).map((p) => Number(p?.id));
        const recentlyViewedIds = getRecentlyViewedProducts().map((p) => Number(p?.id));
        const idsToVerify = Array.from(new Set([...wishlistIds, ...recentlyViewedIds])).filter(Boolean);

        if (idsToVerify.length > 0) {
            axios.post(route('products.validate-active'), { ids: idsToVerify })
                .then((res) => {
                    if (Array.isArray(res.data)) {
                        pruneInactiveProducts(res.data, userId);
                    }
                })
                .catch(() => {});
        }

        window.addEventListener('storage', syncSignals);
        window.addEventListener('focus', syncSignals);

        return () => {
            window.removeEventListener('storage', syncSignals);
            window.removeEventListener('focus', syncSignals);
        };
    }, [userId]);

    // Extract dynamic categories from wishlist
    const categories = useMemo(() => {
        const counts = {};
        wishlistedProducts.forEach((p) => {
            if (p.category) {
                counts[p.category] = (counts[p.category] || 0) + 1;
            }
        });
        return Object.entries(counts).map(([name, count]) => ({ name, count }));
    }, [wishlistedProducts]);

    // Filtering & Sorting
    const filteredAndSortedWishlist = useMemo(() => {
        let result = [...wishlistedProducts];

        if (selectedCategory !== 'all') {
            result = result.filter((p) => p.category === selectedCategory);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (p) =>
                    p.name.toLowerCase().includes(query) ||
                    (p.sellerName && p.sellerName.toLowerCase().includes(query)) ||
                    (p.category && p.category.toLowerCase().includes(query))
            );
        }

        if (sortOrder === 'price_asc') {
            result.sort((a, b) => a.price - b.price);
        } else if (sortOrder === 'price_desc') {
            result.sort((a, b) => b.price - a.price);
        } else if (sortOrder === 'name_asc') {
            result.sort((a, b) => a.name.localeCompare(b.name));
        }

        return result;
    }, [wishlistedProducts, selectedCategory, searchQuery, sortOrder]);

    const totalWishlistPages = Math.max(1, Math.ceil(filteredAndSortedWishlist.length / ITEMS_PER_PAGE));

    const paginatedWishlist = useMemo(() => {
        const start = (wishlistPage - 1) * ITEMS_PER_PAGE;
        return filteredAndSortedWishlist.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredAndSortedWishlist, wishlistPage]);

    // Reset pagination when filters change
    useEffect(() => {
        setWishlistPage(1);
    }, [searchQuery, selectedCategory, sortOrder]);

    // Total price of selected items in bulk edit
    const totalSelectedPrice = useMemo(() => {
        return wishlistedProducts
            .filter((p) => selectedIds.includes(p.id))
            .reduce((sum, p) => sum + (Number(p.price) || 0), 0);
    }, [wishlistedProducts, selectedIds]);

    // Selection Handlers
    const toggleSelect = (e, id) => {
        if (e && e.preventDefault) e.preventDefault();
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        setSelectedIds(filteredAndSortedWishlist.map((p) => p.id));
    };

    const handleDeselectAll = () => {
        setSelectedIds([]);
    };

    // Wishlist Removal
    const handleRemoveWishlist = (e, product) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        toggleWishlistedProduct(product, userId);
        setWishlistedProducts(getWishlistedProducts(userId));
        setSelectedIds((prev) => prev.filter((id) => id !== product.id));
        addToast(`${product.name} removed from wishlist.`, 'success');
    };

    // Unfollow Shop
    const handleUnfollowShop = (e, shop) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        toggleFollowedShop(shop, userId);
        setFollowedShops(getFollowedShops(userId));
        addToast(`Unfollowed ${shop.name}.`, 'success');
    };

    // Single Add to Cart Action
    const handleAddToCart = async (product, quantity = 1) => {
        try {
            await axios.post(route('cart.store'), {
                product_id: product.id,
                quantity: quantity || 1,
                variant: 'Standard',
            });
            addToast(`Added "${product.name}" to cart.`, 'success');
            router.reload({ only: ['cart'] });
        } catch {
            addToast('Failed to add item to cart. It may be currently out of stock.', 'error');
        }
    };

    // Bulk Add to Cart
    const handleBulkAddToCart = async () => {
        if (!selectedIds.length) return;
        setIsProcessingBulk(true);
        try {
            const requests = selectedIds.map((id) =>
                axios.post(route('cart.store'), {
                    product_id: id,
                    quantity: 1,
                    variant: 'Standard',
                })
            );
            await Promise.all(requests);
            addToast(`Added ${selectedIds.length} items to your cart.`, 'success');
            setSelectedIds([]);
            setIsBulkEdit(false);
            router.reload({ only: ['cart'] });
        } catch {
            addToast('Some items could not be added to cart.', 'error');
        } finally {
            setIsProcessingBulk(false);
        }
    };

    // Bulk Remove
    const handleBulkRemove = () => {
        if (!selectedIds.length) return;
        selectedIds.forEach((id) => toggleWishlistedProduct({ id }, userId));
        setWishlistedProducts(getWishlistedProducts(userId));
        setSelectedIds([]);
        setIsBulkEdit(false);
        addToast(`Removed ${selectedIds.length} items from wishlist.`, 'success');
    };

    // Clear All Flow
    const handleClearAll = () => {
        if (activeTab === 'wishlist') {
            setClearAction({
                type: 'wishlist',
                title: 'Clear Wishlist',
                message: 'Are you sure you want to remove all saved items from your wishlist? This action cannot be undone.',
            });
        } else if (activeTab === 'following') {
            setClearAction({
                type: 'following',
                title: 'Unfollow All Studios',
                message: 'Are you sure you want to unfollow all artisan studios in your collection?',
            });
        } else if (activeTab === 'recent') {
            setClearAction({
                type: 'recent',
                title: 'Clear Browsing History',
                message: 'Are you sure you want to clear your recently viewed craft history?',
            });
        }
    };

    const confirmClearAll = () => {
        const type = clearAction?.type;
        setClearAction(null);
        if (type === 'wishlist') {
            clearWishlistedProducts(userId);
            setWishlistedProducts([]);
            setSelectedIds([]);
            setIsBulkEdit(false);
            addToast('Wishlist cleared.', 'success');
        } else if (type === 'following') {
            clearFollowedShops(userId);
            setFollowedShops([]);
            addToast('All studios unfollowed.', 'success');
        } else if (type === 'recent') {
            clearRecentlyViewedProducts();
            setRecentlyViewed([]);
            addToast('Browsing history cleared.', 'success');
        }
    };

    return (
        <ShopLayout hideMobileDock={isBulkEdit}>
            <Head title="Saved | LikhangKamay" />

            <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-28 sm:py-6 sm:px-6 space-y-4 animate-in fade-in duration-200 min-w-0">
                {/* Hero Header & Filter Controls */}
                <SavedHeroHeader
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    wishlistedCount={wishlistedProducts.length}
                    followedCount={followedShops.length}
                    recentlyViewedCount={recentlyViewed.length}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    sortOrder={sortOrder}
                    setSortOrder={setSortOrder}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    isBulkEdit={isBulkEdit}
                    setIsBulkEdit={setIsBulkEdit}
                    categories={categories}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    onClearAll={handleClearAll}
                />

                {/* Tab Content Canvas */}
                <div className="min-h-[460px]">
                    {activeTab === 'wishlist' && (
                        <SavedItemsGrid
                            items={paginatedWishlist}
                            activeTab={activeTab}
                            viewMode={viewMode}
                            isBulkEdit={isBulkEdit}
                            selectedIds={selectedIds}
                            onToggleSelect={toggleSelect}
                            onRemoveWishlist={handleRemoveWishlist}
                            onQuickView={setQuickViewProduct}
                            onAddToCart={handleAddToCart}
                            currentPage={wishlistPage}
                            totalPages={totalWishlistPages}
                            totalItems={filteredAndSortedWishlist.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={setWishlistPage}
                        />
                    )}

                    {activeTab === 'following' && (
                        <FollowedShopsList
                            shops={followedShops}
                            onUnfollowShop={handleUnfollowShop}
                        />
                    )}

                    {activeTab === 'recent' && (
                        <SavedItemsGrid
                            items={recentlyViewed}
                            activeTab={activeTab}
                            viewMode={viewMode}
                            isBulkEdit={false}
                            selectedIds={[]}
                            onToggleSelect={() => {}}
                            onRemoveWishlist={() => {}}
                            onQuickView={setQuickViewProduct}
                            onAddToCart={handleAddToCart}
                            currentPage={1}
                            totalPages={1}
                            totalItems={recentlyViewed.length}
                            itemsPerPage={recentlyViewed.length || 1}
                            onPageChange={() => {}}
                        />
                    )}
                </div>
            </div>

            {/* Quick View Modal / Drawer */}
            <QuickViewModal
                product={quickViewProduct}
                onClose={() => setQuickViewProduct(null)}
                onRemoveWishlist={handleRemoveWishlist}
                onAddToCart={handleAddToCart}
            />

            {/* Floating Bulk Action Dock */}
            <SavedBulkActions
                isBulkEdit={isBulkEdit}
                selectedCount={selectedIds.length}
                totalCount={filteredAndSortedWishlist.length}
                totalSelectedPrice={totalSelectedPrice}
                isProcessing={isProcessingBulk}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onBulkAddToCart={handleBulkAddToCart}
                onBulkRemove={handleBulkRemove}
                onCancel={() => {
                    setIsBulkEdit(false);
                    setSelectedIds([]);
                }}
            />

            {/* Confirmation Dialog */}
            <ClearConfirmation
                clearAction={clearAction}
                onClose={() => setClearAction(null)}
                onConfirm={confirmClearAll}
            />
        </ShopLayout>
    );
}

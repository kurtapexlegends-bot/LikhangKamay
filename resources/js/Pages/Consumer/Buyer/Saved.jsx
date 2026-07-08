import React, { useEffect, useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
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
    pruneInactiveProducts
} from '@/utils/buyerSignals';

// Subcomponents
import NavigationHeader from '@/Components/Consumer/Buyer/Saved/NavigationHeader';
import SavedItemsGrid from '@/Components/Consumer/Buyer/Saved/SavedItemsGrid';
import FollowedShopsList from '@/Components/Consumer/Buyer/Saved/FollowedShopsList';
import ActivitySidebar from '@/Components/Consumer/Buyer/Saved/ActivitySidebar';
import QuickViewModal from '@/Components/Consumer/Buyer/Saved/QuickViewModal';
import SavedBulkActions from '@/Components/Consumer/Buyer/Saved/SavedBulkActions';
import ClearConfirmation from '@/Components/Consumer/Buyer/Saved/ClearConfirmation';

const ITEMS_PER_PAGE = 8;

export default function Saved() {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('wishlist');
    const [wishlistedProducts, setWishlistedProducts] = useState([]);
    const [followedShops, setFollowedShops] = useState([]);
    const [recentlyViewed, setRecentlyViewed] = useState([]);
    const [sortOrder, setSortOrder] = useState('recent');
    const [searchQuery, setSearchQuery] = useState('');
    const [isBulkEdit, setIsBulkEdit] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [wishlistPage, setWishlistPage] = useState(1);
    const [quickViewProduct, setQuickViewProduct] = useState(null);
    const [isProcessingBulk, setIsProcessingBulk] = useState(false);
    const [clearAction, setClearAction] = useState(null); // { type, title, message }

    useEffect(() => {
        const syncSignals = () => {
            setWishlistedProducts(getWishlistedProducts());
            setFollowedShops(getFollowedShops());
            setRecentlyViewed(getRecentlyViewedProducts());
        };

        syncSignals();

        // Gather cached product IDs for verification
        const wishlistIds = getWishlistedProducts().map((p) => Number(p?.id));
        const recentlyViewedIds = getRecentlyViewedProducts().map((p) => Number(p?.id));
        const idsToVerify = Array.from(new Set([...wishlistIds, ...recentlyViewedIds])).filter(Boolean);

        if (idsToVerify.length > 0) {
            axios.post(route('products.validate-active'), { ids: idsToVerify })
                .then((res) => {
                    if (Array.isArray(res.data)) {
                        pruneInactiveProducts(res.data);
                    }
                })
                .catch((err) => {
                    console.error('Failed to validate active products:', err);
                });
        }

        window.addEventListener('storage', syncSignals);
        window.addEventListener('focus', syncSignals);

        return () => {
            window.removeEventListener('storage', syncSignals);
            window.removeEventListener('focus', syncSignals);
        };
    }, []);

    const handleRemoveWishlist = (e, product) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        toggleWishlistedProduct(product);
        setWishlistedProducts(getWishlistedProducts());
        
        // Remove from current selection if it was selected
        setSelectedIds(prev => prev.filter(id => id !== product.id));
        
        addToast(`${product.name} removed from wishlist`, 'success');
    };

    const handleUnfollowShop = (e, shop) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        toggleFollowedShop(shop);
        setFollowedShops(getFollowedShops());
        addToast(`Unfollowed ${shop.name}`, 'success');
    };

    const filteredAndSortedWishlist = useMemo(() => {
        let sorted = [...wishlistedProducts];
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            sorted = sorted.filter(p => 
                p.name.toLowerCase().includes(query) || 
                p.sellerName.toLowerCase().includes(query)
            );
        }
        if (sortOrder === 'price_asc') sorted.sort((a, b) => a.price - b.price);
        if (sortOrder === 'price_desc') sorted.sort((a, b) => b.price - a.price);
        return sorted;
    }, [wishlistedProducts, sortOrder, searchQuery]);

    const totalWishlistPages = Math.max(1, Math.ceil(filteredAndSortedWishlist.length / ITEMS_PER_PAGE));
    
    const paginatedWishlist = useMemo(() => {
        const start = (wishlistPage - 1) * ITEMS_PER_PAGE;
        return filteredAndSortedWishlist.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredAndSortedWishlist, wishlistPage]);

    // Reset pagination page to 1 when search query or sort order changes
    useEffect(() => {
        setWishlistPage(1);
    }, [searchQuery, sortOrder]);

    const toggleSelect = (e, id) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkRemove = () => {
        if (!selectedIds.length) return;
        selectedIds.forEach(id => toggleWishlistedProduct({ id }));
        setWishlistedProducts(getWishlistedProducts());
        setSelectedIds([]);
        setIsBulkEdit(false);
        addToast(`Removed ${selectedIds.length} items from wishlist`, 'success');
    };

    const handleBulkAddToCart = async () => {
        if (!selectedIds.length) return;
        setIsProcessingBulk(true);
        
        try {
            const promises = selectedIds.map(id => 
                axios.post(route('cart.store'), {
                    product_id: id,
                    quantity: 1,
                    variant: 'Standard'
                })
            );
            
            await Promise.all(promises);
            
            addToast(`Added ${selectedIds.length} items to your cart`, 'success');
            setSelectedIds([]);
            setIsBulkEdit(false);
            
            router.reload({ only: ['cart'] });
        } catch (error) {
            addToast('Failed to add items to cart. Some might be out of stock.', 'error');
        } finally {
            setIsProcessingBulk(false);
        }
    };

    const handleBulkCheckout = async () => {
        if (!selectedIds.length) return;
        setIsProcessingBulk(true);
        
        try {
            const promises = selectedIds.map(id => 
                axios.post(route('cart.store'), {
                    product_id: id,
                    quantity: 1,
                    variant: 'Standard'
                })
            );
            
            await Promise.all(promises);
            
            router.visit(route('cart.index'));
        } catch (error) {
            addToast('Failed to prepare checkout. Some items might be unavailable.', 'error');
            setIsProcessingBulk(false);
        }
    };

    const handleClearAll = () => {
        if (activeTab === 'wishlist') {
            setClearAction({
                type: 'wishlist',
                title: 'Clear Wishlist',
                message: 'Are you sure you want to clear your entire wishlist? This action cannot be undone.'
            });
        } else if (activeTab === 'following') {
            setClearAction({
                type: 'following',
                title: 'Unfollow All Studios',
                message: 'Are you sure you want to unfollow all studios in your collection?'
            });
        } else if (activeTab === 'recent') {
            setClearAction({
                type: 'recent',
                title: 'Clear History',
                message: 'Are you sure you want to clear your recently viewed history?'
            });
        }
    };

    const confirmClearAll = () => {
        const type = clearAction?.type;
        setClearAction(null);
        
        if (type === 'wishlist') {
            clearWishlistedProducts();
            setWishlistedProducts([]);
            setSelectedIds([]);
            setIsBulkEdit(false);
            addToast('Wishlist cleared', 'success');
        } else if (type === 'following') {
            clearFollowedShops();
            setFollowedShops([]);
            addToast('All studios unfollowed', 'success');
        } else if (type === 'recent') {
            clearRecentlyViewedProducts();
            setRecentlyViewed([]);
            addToast('History cleared', 'success');
        }
    };

    return (
        <ShopLayout>
            <Head title="Saved Collections" />

            <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 bg-stone-50/20 rounded-[32px] mt-2 mb-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8 mt-2">
                    <div className="space-y-6 lg:col-span-2">
                        <NavigationHeader
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            wishlistedCount={wishlistedProducts.length}
                            followedCount={followedShops.length}
                            recentlyViewedCount={recentlyViewed.length}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            sortOrder={sortOrder}
                            setSortOrder={setSortOrder}
                            isBulkEdit={isBulkEdit}
                            setIsBulkEdit={setIsBulkEdit}
                            onClearAll={handleClearAll}
                        />

                        {/* Contents layout cards */}
                        <div className="rounded-[28px] border border-stone-200/85 bg-white p-5 sm:p-6 shadow-sm min-h-[420px] transition-all duration-300">
                            {activeTab === 'wishlist' && (
                                <SavedItemsGrid
                                    items={paginatedWishlist}
                                    activeTab={activeTab}
                                    isBulkEdit={isBulkEdit}
                                    selectedIds={selectedIds}
                                    onToggleSelect={toggleSelect}
                                    onRemoveWishlist={handleRemoveWishlist}
                                    onQuickView={setQuickViewProduct}
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
                                    isBulkEdit={false}
                                    selectedIds={[]}
                                    onToggleSelect={() => {}}
                                    onRemoveWishlist={() => {}}
                                    onQuickView={setQuickViewProduct}
                                    currentPage={1}
                                    totalPages={1}
                                    totalItems={recentlyViewed.length}
                                    itemsPerPage={recentlyViewed.length}
                                    onPageChange={() => {}}
                                />
                            )}
                        </div>
                    </div>

                    <ActivitySidebar
                        wishlistedCount={wishlistedProducts.length}
                        followedCount={followedShops.length}
                        recentlyViewedCount={recentlyViewed.length}
                        activeTab={activeTab}
                        onClearAll={handleClearAll}
                    />
                </div>
            </div>

            <QuickViewModal
                product={quickViewProduct}
                onClose={() => setQuickViewProduct(null)}
                onRemoveWishlist={handleRemoveWishlist}
            />

            <SavedBulkActions
                isBulkEdit={isBulkEdit}
                selectedCount={selectedIds.length}
                isProcessing={isProcessingBulk}
                onBulkAddToCart={handleBulkAddToCart}
                onBulkCheckout={handleBulkCheckout}
                onBulkRemove={handleBulkRemove}
                onCancel={() => {
                    setIsBulkEdit(false);
                    setSelectedIds([]);
                }}
            />

            <ClearConfirmation
                clearAction={clearAction}
                onClose={() => setClearAction(null)}
                onConfirm={confirmClearAll}
            />
        </ShopLayout>
    );
}

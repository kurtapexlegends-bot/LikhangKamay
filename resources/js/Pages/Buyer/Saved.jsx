import React, { useEffect, useState, useMemo } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import axios from 'axios';
import ShopLayout from '@/Layouts/ShopLayout';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import UserAvatar from '@/Components/UserAvatar';
import { getFollowedShops, getRecentlyViewedProducts, getWishlistedProducts, toggleWishlistedProduct, toggleFollowedShop } from '@/utils/buyerSignals';
import { useToast } from '@/Components/ToastContext';
import CompactPagination from '@/Components/CompactPagination';
import Modal from '@/Components/Modal';
import { Heart, History, Store, ArrowRight, UserMinus, ShoppingBag, ShoppingCart, X, Search, Edit2, Trash2, CheckSquare, Package } from 'lucide-react';
import ConfirmationModal from '@/Components/ConfirmationModal';



const formatPrice = (value) => Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

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
        window.addEventListener('storage', syncSignals);
        window.addEventListener('focus', syncSignals);

        return () => {
            window.removeEventListener('storage', syncSignals);
            window.removeEventListener('focus', syncSignals);
        };
    }, []);

    const handleRemoveWishlist = (e, product) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlistedProduct(product);
        setWishlistedProducts(getWishlistedProducts());
        addToast(`${product.name} removed from wishlist`, 'success');
    };

    const handleUnfollowShop = (e, shop) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFollowedShop(shop);
        setFollowedShops(getFollowedShops());
        addToast(`Unfollowed ${shop.name}`, 'success');
    };

    const filteredAndSortedWishlist = useMemo(() => {
        let sorted = [...wishlistedProducts];
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            sorted = sorted.filter(p => p.name.toLowerCase().includes(query) || p.sellerName.toLowerCase().includes(query));
        }
        if (sortOrder === 'price_asc') sorted.sort((a, b) => a.price - b.price);
        if (sortOrder === 'price_desc') sorted.sort((a, b) => b.price - a.price);
        return sorted;
    }, [wishlistedProducts, sortOrder, searchQuery]);

    const ITEMS_PER_PAGE = 8;
    const totalWishlistPages = Math.max(1, Math.ceil(filteredAndSortedWishlist.length / ITEMS_PER_PAGE));
    const paginatedWishlist = useMemo(() => {
        const start = (wishlistPage - 1) * ITEMS_PER_PAGE;
        return filteredAndSortedWishlist.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredAndSortedWishlist, wishlistPage]);

    useEffect(() => setWishlistPage(1), [searchQuery, sortOrder]);

    const toggleSelect = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
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
            // We'll add them to the cart session via axios
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
            
            // Refresh the page state to update cart counts if any
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
            
            // Redirect to cart to begin checkout process
            router.visit(route('cart.index'));
        } catch (error) {
            addToast('Failed to prepare checkout. Some items might be unavailable.', 'error');
            setIsProcessingBulk(false);
        }
    };

    const ProductCard = ({ product, showHeart }) => {
        const isSelected = selectedIds.includes(product.id);
        
        return (
        <Link
            href={route('product.show', product.slug)}
            onClick={(e) => {
                if (isBulkEdit) toggleSelect(e, product.id);
            }}
            className={`group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${isBulkEdit && isSelected ? 'border-clay-500 ring-2 ring-clay-200' : 'border-stone-200 hover:border-clay-300'}`}
        >
            <div className="relative aspect-[4/3] bg-stone-50 overflow-hidden">
                <img
                    src={product.image || '/images/no-image.png'}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(event) => {
                        event.target.src = '/images/no-image.png';
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                
                {isBulkEdit ? (
                    <div className="absolute top-3 right-3 z-10">
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${isSelected ? 'bg-clay-500 border-clay-500 text-white' : 'bg-white/90 border-stone-300'}`}>
                            {isSelected && <X size={14} />}
                        </div>
                    </div>
                ) : showHeart && (
                    <div className="absolute top-3 right-3 z-10">
                        <button 
                            onClick={(e) => handleRemoveWishlist(e, product)}
                            className="group/heart rounded-full bg-white/90 p-1.5 text-rose-500 shadow-sm backdrop-blur-md transition-transform hover:scale-110 hover:bg-rose-50"
                            title="Remove from wishlist"
                        >
                            <Heart size={16} className="fill-rose-500 transition-colors group-hover/heart:fill-transparent group-hover/heart:text-rose-500" />
                        </button>
                    </div>
                )}
            </div>
            <div className="flex flex-col flex-1 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-clay-600 mb-1.5">{product.sellerName}</p>
                <h3 className="line-clamp-2 text-sm font-bold leading-snug text-stone-900 group-hover:text-clay-800 transition-colors mb-3">{product.name}</h3>
                <div className="mt-auto flex items-end justify-between pt-2">
                    <p className="text-base font-bold text-stone-900 tracking-tight">PHP {formatPrice(product.price)}</p>
                    <button 
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setQuickViewProduct(product);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-stone-50 text-stone-400 transition-colors hover:bg-clay-100 hover:text-clay-700 group-hover:bg-clay-100 group-hover:text-clay-700" 
                        title="Quick View"
                    >
                        <ShoppingBag size={14} />
                    </button>
                </div>
            </div>
        </Link>
    );
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
                title: 'Unfollow All Shops',
                message: 'Are you sure you want to unfollow all shops in your collection?'
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
        const type = clearAction.type;
        setClearAction(null);
        
        if (type === 'wishlist') {
            clearWishlistedProducts();
            setWishlistedProducts([]);
            addToast('Wishlist cleared', 'success');
        } else if (type === 'following') {
            clearFollowedShops();
            setFollowedShops([]);
            addToast('All shops unfollowed', 'success');
        } else if (type === 'recent') {
            clearRecentlyViewedProducts();
            setRecentlyViewed([]);
            addToast('History cleared', 'success');
        }
    };

    return (
        <ShopLayout>
            <Head title="Saved Items" />

            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-7 mt-4">
                    <div className="space-y-4 lg:col-span-2">
                        {/* Navigation Header */}
                        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5 animate-in fade-in duration-500">
                            {/* Row 1: Title + Pill Tabs */}
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-2.5 text-stone-900">
                                    <Package size={17} className="text-clay-600 shrink-0" />
                                    <h2 className="text-base font-bold tracking-tight">Collections</h2>
                                </div>
                                <div className="flex items-center gap-1.5 rounded-xl bg-stone-100/80 p-1">
                                    {[
                                        { key: 'wishlist', label: 'Wishlist', icon: Heart, count: wishlistedProducts.length, fill: true },
                                        { key: 'following', label: 'Shops', icon: Store, count: followedShops.length },
                                        { key: 'recent', label: 'Recent', icon: History, count: recentlyViewed.length },
                                    ].map(({ key, label, icon: Icon, count, fill }) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => { setActiveTab(key); setIsBulkEdit(false); setSelectedIds([]); }}
                                            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-bold transition-all ${
                                                activeTab === key
                                                    ? 'bg-white text-clay-700 shadow-sm ring-1 ring-stone-200/80'
                                                    : 'text-stone-500 hover:text-stone-700'
                                            }`}
                                        >
                                            <Icon size={14} className={activeTab === key && fill ? 'fill-clay-700' : ''} />
                                            <span className="hidden sm:inline">{label}</span>
                                            {count > 0 && (
                                                <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                                                    activeTab === key ? 'bg-clay-100 text-clay-700' : 'bg-stone-200/80 text-stone-500'
                                                }`}>
                                                    {count}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Row 2: Search + Sort + Manage (Wishlist only) */}
                            {activeTab === 'wishlist' && wishlistedProducts.length > 0 && (
                                <div className="mt-4 pt-3.5 border-t border-stone-100 flex flex-wrap items-center gap-2.5">
                                    <div className="relative flex-1 min-w-[180px]">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Search wishlist..." 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full rounded-lg border-stone-200 bg-stone-50/80 py-2 pl-9 pr-3 text-sm text-stone-600 transition-colors focus:bg-white focus:border-clay-500 focus:ring-clay-500/20 focus:ring-4"
                                        />
                                    </div>
                                    <select 
                                        value={sortOrder} 
                                        onChange={(e) => setSortOrder(e.target.value)}
                                        className="rounded-lg border-stone-200 bg-stone-50/80 py-2 pl-3 pr-8 text-sm font-medium text-stone-600 transition-colors focus:bg-white focus:border-clay-500 focus:ring-clay-500/20 focus:ring-4 cursor-pointer"
                                    >
                                        <option value="recent">Recently Added</option>
                                        <option value="price_asc">Price: Low → High</option>
                                        <option value="price_desc">Price: High → Low</option>
                                    </select>
                                    
                                    <button 
                                        onClick={() => { 
                                            if (isBulkEdit) { setIsBulkEdit(false); setSelectedIds([]); }
                                            else setIsBulkEdit(true);
                                        }}
                                        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold transition-all ${
                                            isBulkEdit 
                                                ? 'bg-clay-600 text-white hover:bg-clay-700' 
                                                : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                                        }`}
                                    >
                                        <CheckSquare size={14} /> {isBulkEdit ? `Select Items` : 'Manage'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Content Card */}
                        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5 min-h-[400px]">
                            {activeTab === 'wishlist' && (
                                paginatedWishlist.length > 0 ? (
                                    <div className="flex flex-col gap-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                                            {paginatedWishlist.map((product) => (
                                                <ProductCard key={product.id} product={product} showHeart={!isBulkEdit} />
                                            ))}
                                        </div>
                                        {totalWishlistPages > 1 && (
                                            <div className="flex justify-center border-t border-stone-100 pt-6">
                                                <CompactPagination
                                                    currentPage={wishlistPage}
                                                    totalPages={totalWishlistPages}
                                                    totalItems={filteredAndSortedWishlist.length}
                                                    itemsPerPage={ITEMS_PER_PAGE}
                                                    itemLabel="items"
                                                    onPageChange={setWishlistPage}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <WorkspaceEmptyState
                                        icon={Heart}
                                        title="No wishlisted products"
                                        description="Save products from any product page and they will appear here."
                                        actionLabel="Browse Shop"
                                        actionHref={route('shop.index')}
                                        className="py-16"
                                    />
                                )
                            )}

                            {activeTab === 'following' && (
                                followedShops.length > 0 ? (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {followedShops.map((shop) => (
                                            <Link
                                                key={shop.id}
                                                href={route('shop.seller', shop.slug)}
                                                className="group relative rounded-2xl border border-stone-200 bg-stone-50 p-4 shadow-sm transition hover:border-stone-300 hover:shadow-md animate-in fade-in duration-500"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar user={{ ...shop, shop_name: shop.name, name: shop.name }} className="h-14 w-14 border border-stone-200" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold text-stone-900 pr-8">{shop.name}</p>
                                                        <p className="text-xs text-stone-500">{shop.location}</p>
                                                        {shop.joinedAt && (
                                                            <p className="mt-1 text-[11px] text-stone-400">Joined {shop.joinedAt}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={(e) => handleUnfollowShop(e, shop)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-stone-400 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                                                    title="Unfollow Shop"
                                                >
                                                    <UserMinus size={16} />
                                                </button>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <WorkspaceEmptyState
                                        icon={Store}
                                        title="No followed shops"
                                        description="Use Follow Shop on a seller page to keep that shop here."
                                        actionLabel="Browse Shops"
                                        actionHref={route('shop.index')}
                                        className="py-16"
                                    />
                                )
                            )}

                            {activeTab === 'recent' && (
                                recentlyViewed.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                                        {recentlyViewed.map((product) => (
                                            <ProductCard key={product.id} product={product} showHeart={false} />
                                        ))}
                                    </div>
                                ) : (
                                    <WorkspaceEmptyState
                                        icon={History}
                                        title="No recently viewed products"
                                        description="Products you open will appear here for faster return visits."
                                        actionLabel="Browse Shop"
                                        actionHref={route('shop.index')}
                                        className="py-16"
                                    />
                                )
                            )}
                        </div>
                    </div>

                    {/* SIDEBAR */}
                    <div className="lg:col-span-1 self-start lg:sticky lg:top-24 space-y-5">
                        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                            <h3 className="mb-4 text-base font-bold text-gray-900">Your Activity</h3>
                            <div className="space-y-4 text-sm text-gray-600">
                                <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                                    <span className="flex items-center gap-2"><Heart size={16} className="text-rose-500"/> Wishlisted Items</span>
                                    <span className="font-bold text-stone-900">{wishlistedProducts.length}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                                    <span className="flex items-center gap-2"><Store size={16} className="text-clay-600"/> Followed Shops</span>
                                    <span className="font-bold text-stone-900">{followedShops.length}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                                    <span className="flex items-center gap-2"><History size={16} className="text-blue-500"/> Recently Viewed</span>
                                    <span className="font-bold text-stone-900">{recentlyViewed.length}</span>
                                </div>
                            </div>
                            
                            <div className="mt-6 pt-2">
                                <Link 
                                    href={route('shop.index')} 
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-clay-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-clay-700"
                                >
                                    <ShoppingBag size={18} /> Continue Shopping
                                </Link>
                                <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-gray-400">
                                    Find more artisan pieces
                                </p>
                            </div>
                        </div>

                        {/* Contextual Actions */}
                        {((activeTab === 'wishlist' && wishlistedProducts.length > 0) || 
                          (activeTab === 'following' && followedShops.length > 0) || 
                          (activeTab === 'recent' && recentlyViewed.length > 0)) && (
                            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 shadow-sm sm:p-5">
                                <h3 className="mb-3 text-sm font-bold text-stone-900 uppercase tracking-wide">Quick Actions</h3>
                                <button
                                    onClick={handleClearAll}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-600 shadow-sm transition hover:bg-rose-50"
                                >
                                    <Trash2 size={16} /> 
                                    {activeTab === 'wishlist' ? 'Clear Wishlist' : activeTab === 'following' ? 'Unfollow All Shops' : 'Clear History'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick View Modal */}
            <Modal show={!!quickViewProduct} onClose={() => setQuickViewProduct(null)} maxWidth="2xl">
                {quickViewProduct && (
                    <div className="p-6">
                        <div className="flex items-start justify-between mb-6">
                            <h2 className="text-xl font-bold text-stone-900 pr-8">{quickViewProduct.name}</h2>
                            <button onClick={() => setQuickViewProduct(null)} className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition"><X size={20} /></button>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-6">
                            <div className="w-full sm:w-1/2 aspect-square rounded-2xl bg-stone-50 border border-stone-100 overflow-hidden">
                                <img src={quickViewProduct.image} alt={quickViewProduct.name} className="w-full h-full object-contain p-4" />
                            </div>
                            <div className="w-full sm:w-1/2 flex flex-col">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-clay-600 mb-2">{quickViewProduct.sellerName}</p>
                                    <p className="text-3xl font-bold text-stone-900 mb-6 font-serif">PHP {formatPrice(quickViewProduct.price)}</p>
                                </div>
                                <div className="space-y-3 mt-auto">
                                    <Link 
                                        href={route('product.show', quickViewProduct.slug)} 
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-clay-900 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-clay-800 hover:shadow-md"
                                    >
                                        <ShoppingBag size={16} /> View Full Details to Checkout
                                    </Link>
                                    <button 
                                        onClick={() => {
                                            setQuickViewProduct(null);
                                            toggleWishlistedProduct(quickViewProduct);
                                            setWishlistedProducts(getWishlistedProducts());
                                            addToast(`${quickViewProduct.name} removed from wishlist`, 'success');
                                        }}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-600 transition hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                                    >
                                        <Heart size={16} className="fill-current" /> Remove from Wishlist
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Floating Bulk Action Bar */}
            {isBulkEdit && (
                <div className="fixed bottom-0 inset-x-0 z-50 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="mx-auto max-w-2xl px-4 pb-5">
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white/95 px-5 py-3.5 shadow-2xl shadow-stone-900/10 backdrop-blur-lg">
                            <p className="text-sm font-bold text-stone-700 shrink-0">
                                {selectedIds.length > 0 
                                    ? <><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-clay-100 text-clay-700 text-xs font-bold mr-1.5">{selectedIds.length}</span> selected</>
                                    : 'Tap items to select'
                                }
                            </p>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleBulkAddToCart}
                                    disabled={!selectedIds.length || isProcessingBulk}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-clay-600 px-4 py-2.5 text-[13px] font-bold text-white transition-all hover:bg-clay-700 disabled:opacity-40"
                                >
                                    <ShoppingCart size={15} /> <span className="hidden sm:inline">Add to Cart</span>
                                </button>
                                <button 
                                    onClick={handleBulkCheckout}
                                    disabled={!selectedIds.length || isProcessingBulk}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2.5 text-[13px] font-bold text-white transition-all hover:bg-black disabled:opacity-40"
                                >
                                    <ShoppingBag size={15} /> <span className="hidden sm:inline">Checkout</span>
                                </button>
                                <button 
                                    onClick={handleBulkRemove}
                                    disabled={!selectedIds.length || isProcessingBulk}
                                    className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white p-2.5 text-rose-500 transition-all hover:bg-rose-50 disabled:opacity-40"
                                    title="Remove selected"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!clearAction}
                onClose={() => setClearAction(null)}
                onConfirm={confirmClearAll}
                title={clearAction?.title || ''}
                message={clearAction?.message || ''}
                icon={Trash2}
                iconBg="bg-rose-50 text-rose-600"
                confirmText={clearAction?.title || 'Confirm'}
                confirmColor="bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-600/30"
            />
        </ShopLayout>
    );
}

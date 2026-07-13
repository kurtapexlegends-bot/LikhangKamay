import React, { useMemo, useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import BuyerNavbar from '@/Layouts/BuyerNavbar';
import ImpersonationBanner from '@/Layouts/ImpersonationBanner';
import Footer from '@/Layouts/Footer';
import {
    MapPin, Calendar, Star, Package, Trophy, Crown, Flame, Sparkles,
    ShoppingCart, Check, Loader2, ArrowLeft, Filter, Heart, Search, ArrowUpDown, X
} from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import { hasRating, formatRating } from '@/utils/rating';
import { useToast } from '@/Components/ToastContext';
import { isShopFollowed, toggleFollowedShop } from '@/utils/buyerSignals';
import CompactPagination from '@/Components/CompactPagination';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { parsePrice, formatPrice } from '@/utils/money';

export default function SellerProfile({ seller, products, bestSellers = [], stats }) {
    const { addToast } = useToast();
    const { auth } = usePage().props;
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('featured');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [isFollowed, setIsFollowed] = useState(() => isShopFollowed(seller.id));

    const categoryOptions = useMemo(
        () => ['all', ...Array.from(new Set(products.map((product) => product.category).filter(Boolean)))],
        [products]
    );

    const filteredProducts = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        const nextProducts = products.filter((product) => {
            if (categoryFilter !== 'all' && product.category !== categoryFilter) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            return `${product.name} ${product.category}`.toLowerCase().includes(normalizedSearch);
        });

        return [...nextProducts].sort((left, right) => {
            switch (sortBy) {
                case 'price_low':
                    return parsePrice(left.price) - parsePrice(right.price);
                case 'price_high':
                    return parsePrice(right.price) - parsePrice(left.price);
                case 'popular':
                    return Number(right.sold || 0) - Number(left.sold || 0);
                case 'rating':
                    return Number(right.rating || 0) - Number(left.rating || 0);
                default:
                    return Number(right.is_new) - Number(left.is_new);
            }
        });
    }, [categoryFilter, products, searchTerm, sortBy]);

    const toggleFollow = () => {
        const nextFollowed = toggleFollowedShop(seller);
        setIsFollowed(nextFollowed);
        addToast(
            nextFollowed
                ? 'Shop saved to your followed shops. Open Saved to view it.'
                : 'Shop removed from your followed shops.',
            'success',
        );
    };

    const ITEMS_PER_PAGE = 20;
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
    const paginatedProducts = useMemo(() => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredProducts, page]);

    useEffect(() => setPage(1), [searchTerm, categoryFilter, sortBy]);

    const handleChatSeller = () => {
        if (!auth?.user) {
            router.visit(route('login', { redirect: window.location.pathname }));
            return;
        }
        router.visit(route('buyer.chat', { user_id: seller.id }));
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800 animate-in fade-in duration-500">
            <ImpersonationBanner />
            <Head title={`${seller.name} - LikhangKamay Store`} />
            <BuyerNavbar hideMobileDock={true} />

            <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8 pb-24 md:pb-8">
                
                {/* BACK BUTTON */}
                <Link href={route('shop.index')} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-clay-600 mb-6 transition">
                    <ArrowLeft size={16} /> Back to Marketplace
                </Link>

                {/* --- SELLER HEADER --- */}
                <div className="bg-white rounded-[24px] border border-stone-100 overflow-hidden shadow-sm mb-10">
                    
                    {/* Cover Banner (Custom Image or Premium Fallback) */}
                    <div className="h-48 md:h-64 relative overflow-hidden bg-stone-100 group">
                        {seller.banner_image ? (
                            <img 
                                src={seller.banner_image.startsWith('http') || seller.banner_image.startsWith('/storage') ? seller.banner_image : `/storage/${seller.banner_image}`} 
                                alt={`${seller.name} Banner`} 
                                className="w-full h-full object-cover" 
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        ) : (
                            // Premium Fallback Pattern
                            <div className="absolute inset-0 bg-stone-800">
                                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_2px_2px,#fff_1px,transparent_0)] bg-[length:32px_32px]"></div>
                                <div className="absolute top-0 right-0 w-96 h-96 bg-clay-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                                <div className="absolute bottom-0 left-0 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
                            </div>
                        )}
                        {/* Soft overlay gradient to ensure text readability if overlaid later */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    </div>

                    {/* Profile Details Section */}
                    <div className="px-6 md:px-10 pb-8 flex flex-col md:flex-row items-center md:items-start gap-5 relative z-10 -mt-12">

                        <div className="relative z-20 self-start shrink-0">
                            <UserAvatar user={seller} className="w-24 h-24 min-w-[6rem] min-h-[6rem] aspect-square rounded-full border-4 border-white bg-white shadow-lg flex items-center justify-center overflow-hidden flex-none text-3xl" />
                        </div>

                        {/* Info & Stats */}
                        <div className="flex-1 flex flex-col md:flex-row justify-between w-full md:mt-12 gap-6">
                            
                            {/* Profile Info */}
                            <div className="text-center md:text-left flex-1">
                                <div className="mb-2 flex flex-col items-center gap-3 md:flex-row md:items-center">
                                    <h1 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight text-stone-900 md:text-2xl">
                                        {seller.name}
                                        {seller.premium_tier === 'premium' && (
                                            <div title="Premium Artisan" className="flex items-center justify-center bg-amber-100 text-amber-500 rounded-full p-1.5 shadow-sm">
                                                <Crown size={16} strokeWidth={3} />
                                            </div>
                                        )}
                                        {seller.premium_tier === 'super_premium' && (
                                            <div title="Elite Artisan" className="flex items-center justify-center bg-violet-100 text-violet-500 rounded-full p-1.5 shadow-sm">
                                                <Sparkles size={16} strokeWidth={3} />
                                            </div>
                                        )}
                                    </h1>
                                    <span className="text-[10px] uppercase font-bold tracking-widest bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full">
                                        Verified Artisan
                                    </span>
                                    <motion.button
                                        type="button"
                                        onClick={toggleFollow}
                                        whileTap={{ scale: 0.96 }}
                                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                                            isFollowed
                                                ? 'border-rose-200 bg-rose-50 text-rose-600'
                                                : 'border-stone-200 bg-white text-stone-600 hover:border-clay-300 hover:text-clay-700'
                                        }`}
                                    >
                                        <Heart size={12} className={isFollowed ? 'fill-current' : ''} />
                                        {isFollowed ? 'Following Shop' : 'Follow Shop'}
                                    </motion.button>
                                </div>
                                
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-5 text-[13px] text-stone-500 font-medium">
                                    <span className="flex items-center gap-1.5"><MapPin size={15} className="text-stone-400" /> {seller.location}</span>
                                    <span className="flex items-center gap-1.5"><Calendar size={15} className="text-stone-400" /> Joined {seller.joined_at}</span>
                                </div>

                                <p className="mt-4 text-stone-600 max-w-2xl text-[14px] leading-relaxed">
                                    {seller.bio}
                                </p>
                            </div>

                            {/* Connected Stats Block */}
                            <div className="flex bg-stone-50 rounded-2xl border border-stone-100 p-1.5 self-center md:self-start overflow-hidden">
                                <div className="px-5 py-2 text-center border-r border-stone-200">
                                    <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-0.5">Products</p>
                                    <p className="text-xl font-bold text-stone-900">{stats.products}</p>
                                </div>
                                <div className="px-5 py-2 text-center border-r border-stone-200">
                                    <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-0.5">Sales</p>
                                    <p className="text-xl font-bold text-stone-900">{stats.sales}</p>
                                </div>
                                <div className="px-5 py-2 text-center">
                                    <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-0.5">Rating</p>
                                    <div className="flex items-center justify-center gap-1 text-xl font-bold text-stone-900">
                                        {stats.rating} <Star size={14} className="fill-amber-400 text-amber-400 -mt-0.5" />
                                    </div>
                                </div>
                            </div>
                            
                        </div>
                    </div>
                </div>

                {/* --- BEST SELLERS --- */}
                {bestSellers.length > 0 && (
                    <div className="mb-10">
                        <div className="mb-6 flex flex-col gap-1 px-1 select-none">
                            <h2 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2 tracking-tight">
                                <Trophy size={18} className="text-amber-500 shrink-0" />
                                Store Best Sellers
                            </h2>
                            <p className="text-xs text-stone-500 font-medium">Curated high-demand artisan pieces from this workshop</p>
                        </div>
                        <div className="flex overflow-x-auto flex-nowrap lg:grid lg:grid-cols-5 gap-4 pb-4 scrollbar-none snap-x snap-mandatory -mx-4 px-4 lg:mx-0 lg:px-0">
                            {bestSellers.map((product, idx) => {
                                const isTop = idx === 0;
                                return (
                                    <Link 
                                        href={route('product.show', product.slug)}
                                        key={product.id}
                                        className={`group bg-white rounded-[24px] border overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-stone-200/80 active:scale-[0.98] flex flex-col w-[170px] sm:w-[200px] lg:w-auto shrink-0 snap-start ${
                                            isTop ? 'border-amber-300 ring-2 ring-amber-100 shadow-sm shadow-amber-900/5' : 'border-stone-150 shadow-sm hover:border-clay-200'
                                        }`}
                                    >
                                        <div className={`aspect-square relative overflow-hidden flex items-center justify-center p-3 select-none ${isTop ? 'bg-amber-50/15' : 'bg-stone-50/50'}`}>
                                            <img 
                                                loading="lazy"
                                                src={product.image ? (product.image.startsWith('http') || product.image.startsWith('/storage') ? product.image : `/storage/${product.image}`) : '/images/no-image.png'}
                                                alt={product.name}
                                                className="w-full h-full object-contain mix-blend-multiply transition duration-700 ease-out group-hover:scale-105"
                                                onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                            />
                                            {/* Rank Badge */}
                                            <div className={`absolute top-2.5 left-2.5 w-7 h-7 rounded-full flex items-center justify-center shadow-md backdrop-blur-md transition-transform group-hover:scale-105 ${
                                                isTop ? 'bg-amber-500 text-white' : 'bg-stone-900/80 text-white'
                                            }`}>
                                                {isTop ? <Crown size={12} strokeWidth={2.5} /> : <span className="text-[10px] font-black">{idx + 1}</span>}
                                            </div>
                                            {hasRating(product.rating) && (
                                                <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-md shadow-sm text-[10px] font-extrabold px-2 py-1 rounded-lg flex items-center gap-0.5 text-stone-700">
                                                    {formatRating(product.rating)} <Star size={9} className="fill-amber-400 text-amber-400" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4 flex flex-col flex-1">
                                            <h3 className={`text-xs font-bold line-clamp-2 leading-snug mb-3 transition-colors ${
                                                isTop ? 'text-amber-900 group-hover:text-amber-700' : 'text-stone-800 group-hover:text-clay-800'
                                            }`}>
                                                {product.name}
                                            </h3>
                                            <div className="flex items-end justify-between mt-auto pt-2 border-t border-stone-100/50">
                                                <span className="font-black text-sm text-stone-900 tracking-tight">PHP {formatPrice(product.price)}</span>
                                                <span className="text-[10px] text-stone-500 font-bold flex items-center gap-0.5 select-none bg-stone-50 border border-stone-100 rounded-md px-1.5 py-0.5">
                                                    <Flame size={10} className="text-orange-500 fill-orange-500" />
                                                    {product.sold} sold
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* --- PRODUCTS SECTION (COMPACT) --- */}
                <div className="mb-6 flex flex-col gap-4 rounded-[24px] border border-stone-200/80 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2 px-1">
                        <Package size={17} className="text-clay-650 shrink-0" />
                        <h2 className="text-base font-serif font-bold text-stone-900 tracking-tight">Products Collection</h2>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
                        {/* Mobile/Tablet Category Tag pills (horizontal scroll) */}
                        <div className="flex md:hidden items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none pb-1 max-w-full -mx-4 px-4 select-none">
                            {categoryOptions.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => setCategoryFilter(option)}
                                    className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-xs font-bold transition-all min-h-[40px] shrink-0 border ${
                                        categoryFilter === option
                                            ? 'bg-clay-650 border-clay-700 text-white shadow-sm shadow-clay-600/10'
                                            : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                                    }`}
                                >
                                    {option === 'all' ? 'All' : option}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                            <div className="relative flex-1 min-w-[200px] w-full md:w-64">
                                <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Search products..."
                                    className="w-full rounded-xl border-stone-200 bg-stone-50/80 py-2.5 pl-10 pr-10 text-xs font-semibold text-stone-600 transition-colors focus:bg-white focus:border-clay-500 focus:ring-clay-500/10 focus:ring-4 min-h-[44px]"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 min-h-[28px] min-w-[28px] flex items-center justify-center rounded-full hover:bg-stone-200/50 transition-colors"
                                        title="Clear search"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            
                            <select
                                value={categoryFilter}
                                onChange={(event) => setCategoryFilter(event.target.value)}
                                className="hidden md:block rounded-xl border-stone-200 bg-stone-50/80 py-2.5 pl-3 pr-8 text-xs font-bold text-stone-600 transition-colors focus:bg-white focus:border-clay-500/10 focus:ring-4 cursor-pointer min-h-[44px]"
                            >
                                {categoryOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option === 'all' ? 'All Categories' : option}
                                    </option>
                                ))}
                            </select>
                            
                            <select
                                value={sortBy}
                                onChange={(event) => setSortBy(event.target.value)}
                                className="rounded-xl border-stone-200 bg-stone-50/80 py-2.5 pl-3 pr-8 text-xs font-bold text-stone-600 transition-colors focus:bg-white focus:border-clay-500/10 focus:ring-4 cursor-pointer min-h-[44px]"
                            >
                                <option value="featured">Featured</option>
                                <option value="popular">Most Sold</option>
                                <option value="rating">Top Rated</option>
                                <option value="price_low">Price: Low to High</option>
                                <option value="price_high">Price: High to Low</option>
                            </select>
                        </div>
                    </div>
                </div>

                {paginatedProducts.length > 0 ? (
                    <div className="flex flex-col gap-8">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
                            {paginatedProducts.map((product) => (
                                <Link 
                                    href={route('product.show', product.slug)} 
                                    key={product.id} 
                                    className="group relative flex flex-col overflow-hidden rounded-[24px] border border-stone-100/80 bg-stone-50/45 transition-all duration-500 hover:bg-white hover:-translate-y-1.5 active:scale-[0.98] hover:border-clay-200 hover:shadow-xl hover:shadow-stone-200/80"
                                >
                                    {/* Image */}
                                    <div className="aspect-[4/3] relative bg-stone-50 overflow-hidden flex items-center justify-center rounded-t-[23px] select-none">
                                        <img 
                                            loading="lazy"
                                            src={product.image ? (product.image.startsWith('http') || product.image.startsWith('/storage') ? product.image : `/storage/${product.image}`) : '/images/no-image.png'} 
                                            alt={product.name} 
                                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                            onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                        
                                        {product.is_new && (
                                            <span className="absolute top-3 left-3 bg-clay-600 text-white text-[9px] font-extrabold px-2 py-1 rounded-lg shadow-sm tracking-wide">NEW</span>
                                        )}
                                        {hasRating(product.rating) && (
                                            <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-md shadow-sm text-[10px] font-extrabold px-2 py-1 rounded-lg flex items-center gap-0.5 text-stone-700">
                                                {formatRating(product.rating)} <Star size={9} className="fill-amber-400 text-amber-400" />
                                            </div>
                                        )}
                                        
                                        {product.sold > 0 && (
                                            <div className="absolute bottom-3 left-3 flex justify-between pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-10">
                                                <span className="text-[9px] text-white/90 font-bold flex items-center gap-1 bg-stone-900/60 px-2 py-1 rounded-full backdrop-blur-sm shadow-sm">
                                                    <Flame size={10} className="text-orange-400 fill-orange-400" />
                                                    {product.sold} sold
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex flex-col flex-1 p-5">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-clay-600 mb-1.5">{product.category || 'Product'}</p>
                                        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-stone-800 group-hover:text-clay-800 transition-colors mb-4">
                                            {product.name}
                                        </h3>

                                        <div className="mt-auto pt-2 flex items-center justify-between border-t border-stone-100/50">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Price</span>
                                                <p className="text-base font-black text-stone-900 tracking-tight">PHP {formatPrice(product.price)}</p>
                                            </div>
                                            <button 
                                                type="button"
                                                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-stone-50 border border-stone-100 text-stone-400 transition-colors group-hover:bg-clay-100 group-hover:text-clay-700 group-hover:border-clay-200 shadow-sm active:scale-90" 
                                                title="View Product"
                                            >
                                                <ShoppingCart size={15} />
                                            </button>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                        {totalPages > 1 && (
                            <div className="mt-8 border-t border-stone-200 pt-8 flex justify-center">
                                <CompactPagination
                                    currentPage={page}
                                    totalPages={totalPages}
                                    totalItems={filteredProducts.length}
                                    itemsPerPage={ITEMS_PER_PAGE}
                                    onPageChange={setPage}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <WorkspaceEmptyState
                        icon={Package}
                        title="No matching products found"
                        description={products.length > 0 ? "We couldn't find any products matching your search or filters. Try adjusting them." : "This artisan hasn't added any products to their shop yet."}
                        className="py-16"
                    />
                )}

            </main>
            <Footer />

            {/* Mobile Sticky Shop Dock */}
            <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-stone-200/85 px-4 py-3.5 flex items-center justify-between gap-3 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] select-none">
                <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar user={seller} className="w-9 h-9 rounded-full border border-stone-100 shrink-0" />
                    <div className="min-w-0">
                        <h4 className="truncate text-xs font-bold text-stone-900 tracking-tight">{seller.name}</h4>
                        <p className="text-[9px] text-stone-400 font-semibold uppercase tracking-wider">{seller.location}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <motion.button
                        type="button"
                        onClick={toggleFollow}
                        whileTap={{ scale: 0.96 }}
                        className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-[10px] font-bold border transition-all min-h-[36px] ${
                            isFollowed
                                ? 'border-rose-100 bg-rose-50 text-rose-600'
                                : 'border-stone-200 bg-white text-stone-600'
                        }`}
                    >
                        <Heart size={11} className={`mr-1 ${isFollowed ? 'fill-rose-500 text-rose-500' : ''}`} />
                        {isFollowed ? 'Following' : 'Follow'}
                    </motion.button>
                    <button
                        type="button"
                        onClick={handleChatSeller}
                        className="inline-flex items-center justify-center rounded-xl bg-stone-950 text-white px-3 py-2 text-[10px] font-bold transition-all active:scale-95 min-h-[36px]"
                    >
                        Chat
                    </button>
                </div>
            </div>
        </div>
    );
}

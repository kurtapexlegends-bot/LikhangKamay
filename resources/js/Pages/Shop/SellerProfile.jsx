import React, { useMemo, useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import BuyerNavbar from '@/Components/BuyerNavbar';
import Footer from '@/Components/Footer';
import {
    MapPin, Calendar, Star, Package, Trophy, Crown, Flame, Sparkles,
    ShoppingCart, Check, Loader2, ArrowLeft, Filter, Heart, Search, ArrowUpDown 
} from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import { hasRating, formatRating } from '@/utils/rating';
import { useToast } from '@/Components/ToastContext';
import { isShopFollowed, toggleFollowedShop } from '@/utils/buyerSignals';
import CompactPagination from '@/Components/CompactPagination';

export default function SellerProfile({ seller, products, bestSellers = [], stats }) {
    const { addToast } = useToast();
    // Format price helper
    const parsePrice = (price) => Number(String(price ?? 0).replace(/,/g, ''));
    const formatPrice = (price) => parsePrice(price).toLocaleString('en-PH');
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

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800">
            <Head title={`${seller.name} - LikhangKamay Store`} />
            <BuyerNavbar />

            <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
                
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
                                    <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-stone-900 md:text-2xl">
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
                                    <button
                                        type="button"
                                        onClick={toggleFollow}
                                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                                            isFollowed
                                                ? 'border-rose-200 bg-rose-50 text-rose-600'
                                                : 'border-stone-200 bg-white text-stone-600 hover:border-clay-300 hover:text-clay-700'
                                        }`}
                                    >
                                        <Heart size={12} className={isFollowed ? 'fill-current' : ''} />
                                        {isFollowed ? 'Following Shop' : 'Follow Shop'}
                                    </button>
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
                        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2 mb-5">
                            <Trophy size={22} className="text-amber-500" />
                            Store Best Sellers
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {bestSellers.map((product, idx) => {
                                const isTop = idx === 0;
                                return (
                                    <Link 
                                        href={route('product.show', product.slug)}
                                        key={product.id}
                                        className={`group bg-white rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col ${
                                            isTop ? 'border-amber-200 ring-2 ring-amber-100 shadow-md' : 'border-stone-200/60 shadow-sm hover:border-stone-300'
                                        }`}
                                    >
                                        <div className={`aspect-square relative overflow-hidden flex items-center justify-center p-3 ${isTop ? 'bg-amber-50/30' : 'bg-stone-50'}`}>
                                            <img 
                                                src={product.image ? (product.image.startsWith('http') || product.image.startsWith('/storage') ? product.image : `/storage/${product.image}`) : '/images/no-image.png'}
                                                alt={product.name}
                                                className="w-full h-full object-contain mix-blend-multiply transition duration-500 group-hover:scale-110"
                                                onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                            />
                                            {/* Rank Badge */}
                                            <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow ${
                                                isTop ? 'bg-amber-400 text-white' : 'bg-stone-600 text-white'
                                            }`}>
                                                {isTop ? <Crown size={12} /> : `#${idx + 1}`}
                                            </div>
                                            {hasRating(product.rating) && (
                                                <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm shadow-sm text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 text-stone-700">
                                                    {formatRating(product.rating)} <Star size={10} className="fill-amber-400 text-amber-400" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 flex flex-col flex-1">
                                            <h3 className={`text-xs font-semibold line-clamp-2 leading-snug mb-2 transition ${
                                                isTop ? 'text-amber-800 group-hover:text-amber-600' : 'text-stone-800 group-hover:text-orange-600'
                                            }`}>
                                                {product.name}
                                            </h3>
                                            <div className="flex items-end justify-between mt-auto">
                                                <span className="font-bold text-sm text-stone-900">PHP {formatPrice(product.price)}</span>
                                                <span className="text-[10px] text-stone-500 font-medium flex items-center gap-0.5">
                                                    <Flame size={9} className="text-orange-400" />
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
                <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 px-3">
                        <Package size={18} className="text-orange-600" />
                        <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Products Collection</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-1">
                        <div className="relative w-full sm:w-64">
                            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search products..."
                                className="w-full rounded-xl border-none bg-stone-50 py-2 pl-9 pr-3 text-xs font-medium text-stone-700 outline-none transition focus:bg-white focus:ring-2 focus:ring-clay-500/30"
                            />
                        </div>
                        
                        <div className="h-6 w-px bg-stone-200 hidden sm:block mx-1"></div>

                        <div className="relative flex flex-1 items-center sm:flex-none">
                            <div className="pointer-events-none absolute left-3 flex items-center justify-center text-stone-400">
                                <Filter size={14} />
                            </div>
                            <select
                                value={categoryFilter}
                                onChange={(event) => setCategoryFilter(event.target.value)}
                                className="w-full appearance-none rounded-xl border-none bg-stone-50 py-2 pl-9 pr-8 text-xs font-bold text-stone-700 outline-none transition focus:bg-white focus:ring-2 focus:ring-clay-500/30 sm:w-auto cursor-pointer"
                            >
                                {categoryOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option === 'all' ? 'All Categories' : option}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="relative flex flex-1 items-center sm:flex-none">
                            <div className="pointer-events-none absolute left-3 flex items-center justify-center text-stone-400">
                                <ArrowUpDown size={14} />
                            </div>
                            <select
                                value={sortBy}
                                onChange={(event) => setSortBy(event.target.value)}
                                className="w-full appearance-none rounded-xl border-none bg-stone-50 py-2 pl-9 pr-8 text-xs font-bold text-stone-700 outline-none transition focus:bg-white focus:ring-2 focus:ring-clay-500/30 sm:w-auto cursor-pointer"
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
                                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-clay-300 hover:shadow-xl"
                                >
                                    {/* Image */}
                                    <div className="aspect-[4/3] relative bg-stone-50 overflow-hidden flex items-center justify-center">
                                        <img 
                                            src={product.image ? (product.image.startsWith('http') || product.image.startsWith('/storage') ? product.image : `/storage/${product.image}`) : '/images/no-image.png'} 
                                            alt={product.name} 
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                        
                                        {product.is_new && (
                                            <span className="absolute top-3 left-3 bg-clay-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">NEW</span>
                                        )}
                                        {hasRating(product.rating) && (
                                            <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md shadow-sm text-[11px] font-bold px-2 py-1 rounded-md flex items-center gap-1 text-stone-700">
                                                {formatRating(product.rating)} <Star size={10} className="fill-amber-400 text-amber-400 -mt-[1px]" />
                                            </div>
                                        )}
                                        
                                        {product.sold > 0 && (
                                            <div className="absolute bottom-3 left-3 flex justify-between pointer-events-none opacity-0 transition-opacity group-hover:opacity-100 z-10">
                                                <span className="text-[10px] text-white/90 font-medium flex items-center gap-1 bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm shadow-sm">
                                                    <Flame size={10} className="text-orange-400" />
                                                    {product.sold} sold
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex flex-col flex-1 p-5 bg-white">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-clay-600 mb-1.5">{product.category || 'Product'}</p>
                                        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-stone-900 group-hover:text-clay-800 transition-colors mb-3">
                                            {product.name}
                                        </h3>

                                        <div className="mt-auto flex items-end justify-between pt-2">
                                            <div className="font-bold text-base text-stone-900 tracking-tight">
                                                PHP {formatPrice(product.price)}
                                            </div>
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-stone-50 text-stone-400 transition-colors group-hover:bg-clay-100 group-hover:text-clay-700 shadow-sm" title="View Product">
                                                <ShoppingCart size={14} />
                                            </span>
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
                    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-stone-50 py-16 px-4 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-4 ring-stone-50">
                            <Package size={24} className="text-stone-400" />
                        </div>
                        <h3 className="text-lg font-bold text-stone-900">No matching products found</h3>
                        <p className="mt-2 text-sm text-stone-500 max-w-sm">
                            {products.length > 0 ? "We couldn't find any products matching your search or filters. Try adjusting them." : "This artisan hasn't added any products to their shop yet."}
                        </p>
                    </div>
                )}

            </main>
            <Footer />
        </div>
    );
}

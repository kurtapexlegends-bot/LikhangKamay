import React, { useMemo, useState } from 'react';
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
                <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                        <Package size={18} className="text-orange-600" />
                        Products Collection
                    </h2>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative w-full sm:w-auto">
                            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search..."
                                className="w-full sm:w-48 rounded-lg border border-stone-200 bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-stone-700 shadow-sm outline-none transition focus:border-clay-400 focus:ring-1 focus:ring-clay-400"
                            />
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 shadow-sm">
                            <Filter size={14} className="text-stone-400" />
                            <select
                                value={categoryFilter}
                                onChange={(event) => setCategoryFilter(event.target.value)}
                                className="bg-transparent text-xs font-semibold text-stone-700 outline-none w-full sm:w-auto cursor-pointer"
                            >
                                {categoryOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option === 'all' ? 'All Categories' : option}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 shadow-sm">
                            <ArrowUpDown size={14} className="text-stone-400" />
                            <select
                                value={sortBy}
                                onChange={(event) => setSortBy(event.target.value)}
                                className="bg-transparent text-xs font-semibold text-stone-700 outline-none w-full sm:w-auto cursor-pointer"
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

                {filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {filteredProducts.map((product) => (
                            <Link 
                                href={route('product.show', product.slug)} 
                                key={product.id} 
                                className="group bg-white rounded-xl border border-stone-200/70 shadow-sm hover:border-clay-300 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden"
                            >
                                {/* Image */}
                                <div className="aspect-square relative bg-stone-50 border-b border-stone-100 overflow-hidden flex items-center justify-center p-2">
                                    <img 
                                        src={product.image ? (product.image.startsWith('http') || product.image.startsWith('/storage') ? product.image : `/storage/${product.image}`) : '/images/no-image.png'} 
                                        alt={product.name} 
                                        className="w-full h-full object-contain mix-blend-multiply transition duration-500 group-hover:scale-105"
                                        onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                    />
                                    {product.is_new && (
                                        <span className="absolute top-1.5 left-1.5 bg-clay-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">NEW</span>
                                    )}
                                    {hasRating(product.rating) && (
                                        <div className="absolute top-1.5 right-1.5 bg-white/95 backdrop-blur-sm shadow-sm text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 text-stone-700 border border-stone-200/50">
                                            {formatRating(product.rating)} <Star size={9} className="fill-amber-400 text-amber-400 -mt-[1px]" />
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-3 flex flex-col flex-1 bg-white">
                                    <h3 className="text-xs font-semibold text-stone-800 line-clamp-2 group-hover:text-clay-600 transition-colors leading-tight mb-2">
                                        {product.name}
                                    </h3>

                                    <div className="flex items-end justify-between mt-auto pt-1">
                                        <div className="font-bold text-[13px] text-stone-900 tracking-tight">
                                            ₱ {formatPrice(product.price)}
                                        </div>
                                        {product.sold > 0 && (
                                            <span className="text-[10px] text-stone-500 font-medium flex items-center gap-0.5">
                                                <Flame size={10} className="text-orange-500" />
                                                {product.sold}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <Package size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No matching products</h3>
                        <p className="text-gray-500 text-sm mt-1">
                            {products.length > 0 ? 'Try another keyword or category for this shop.' : "This artisan hasn't added any products to their shop yet."}
                        </p>
                    </div>
                )}

            </main>
            <Footer />
        </div>
    );
}

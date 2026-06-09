import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import BuyerNavbar from '@/Layouts/BuyerNavbar';
import ImpersonationBanner from '@/Layouts/ImpersonationBanner';
import AnnouncementBanner from '@/Layouts/AnnouncementBanner';
import Footer from '@/Layouts/Footer';
import {
    Utensils, Coffee, Flower2, Sprout, Home, ChefHat, Gift, Package, Award, Trophy, ArrowRight, Star, MapPin, Facebook, Instagram, Twitter
} from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import { hasRating, formatRating } from '@/utils/rating';
import { trackSponsorshipEvent, useSponsoredImpressionTracking } from '@/utils/sponsorshipTracking';

// Category icons mapping (Lucide Components)
const CATEGORY_ICONS = {
    'Tableware': Utensils,
    'Drinkware': Coffee,
    'Vases & Jars': Flower2, // Abstract representation
    'Planters & Pots': Sprout,
    'Home Decor': Home,
    'Kitchenware': ChefHat,
    'Artisan Sets': Gift,
    'default': Package,
};

export default function Welcome({ featuredProducts = [], sponsoredProducts = [], topSellers = [], categories = [] }) {
    const { globalAnnouncement } = usePage().props;
    const sponsoredPlacement = 'home_sponsored';

    useSponsoredImpressionTracking(sponsoredProducts, sponsoredPlacement);

    // Format sold count
    const formatSold = (sold) => {
        if (sold >= 1000) return `${(sold / 1000).toFixed(1)}k`;
        return sold?.toString() || '0';
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800">
            <Head title="LikhangKamay - Artisan Marketplace" />

            <AnnouncementBanner announcement={globalAnnouncement} />

            {/* Use consistent BuyerNavbar */}
            <ImpersonationBanner />
            <BuyerNavbar />

            {/* --- MAIN CONTENT --- */}
            <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 flex flex-col gap-10">
                
                {/* HERO BANNER - DESKTOP/TABLET (Original Full-bleed backdrop overlay) */}
                <div className="hidden md:block w-full h-[360px] rounded-xl overflow-hidden relative group shadow-lg">
                    <img 
                        src="https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?auto=format&fit=crop&q=80&w=1600" 
                        alt="Handcrafted Pottery" 
                        className="w-full h-full object-cover transform group-hover:scale-105 transition duration-700" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-end p-10">
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-white mb-2">The Art of Clay</h1>
                        <p className="text-white/80 text-sm md:text-base mb-5 max-w-lg">
                            Discover handcrafted masterpieces from Cavite's finest artisans. Support local, buy authentic.
                        </p>
                        <Link 
                            href={route('shop.index')} 
                            className="bg-white text-gray-800 px-6 py-2.5 rounded-sm text-sm font-medium w-fit hover:bg-clay-50 transition shadow flex items-center gap-2"
                        >
                            Shop Collection <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>

                {/* HERO BANNER - MOBILE (Touch-optimized beautiful split layout) */}
                <div className="block md:hidden w-full relative overflow-hidden rounded-2xl shadow-md border border-stone-200/50 bg-[#FAF8F5]">
                    <div className="flex flex-col-reverse items-stretch min-h-[280px]">
                        {/* Text Column */}
                        <div className="flex-1 p-6 flex flex-col justify-center bg-gradient-to-t from-stone-50/90 via-white/80 to-transparent relative z-10">
                            <span className="inline-block text-[9px] font-black uppercase tracking-[0.25em] text-clay-600 mb-2">Curated Cavite Pottery</span>
                            <h1 className="text-2xl font-serif font-black text-stone-900 mb-2.5 leading-tight">The Art of Clay</h1>
                            <p className="text-stone-600 text-xs mb-5 max-w-sm leading-relaxed">
                                Discover handcrafted masterpieces from Cavite's finest artisans. Support local, buy authentic.
                            </p>
                            <Link 
                                href={route('shop.index')} 
                                className="bg-stone-900 text-white hover:bg-stone-850 px-5 py-2.5 rounded-xl text-xs font-black w-fit transition shadow-md active:scale-95 flex items-center gap-2 border border-stone-900 hover:border-stone-850"
                            >
                                Shop Collection <ArrowRight size={14} />
                            </Link>
                        </div>
                        {/* Image Column */}
                        <div className="w-full h-[180px] overflow-hidden relative">
                            <img 
                                src="https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?auto=format&fit=crop&q=80&w=1600" 
                                alt="Handcrafted Pottery" 
                                className="w-full h-full object-cover transform hover:scale-105 transition duration-700" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#FAF8F5] via-transparent to-transparent"></div>
                        </div>
                    </div>
                </div>

                {/* SPONSORED PRODUCTS SECTION */}
                {sponsoredProducts.length > 0 && (
                    <section className="order-1 relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50/60 via-white to-clay-50/30 border border-amber-100/50 p-4 shadow-sm flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700 shadow-sm border border-amber-200/50">
                                <Award size={14} className="drop-shadow-sm" />
                            </span>
                            <div>
                                <h2 className="text-base font-serif font-bold text-gray-900 leading-none">Sponsored Collection</h2>
                                <p className="text-[10px] text-gray-500 font-medium mt-1">Curated selections from our finest artisans</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {sponsoredProducts.map((product) => (
                                <Link
                                    href={route('product.show', product.slug)}
                                    key={product.id}
                                    data-sponsored-placement={sponsoredPlacement}
                                    data-sponsored-product-id={product.id}
                                    onClick={() => trackSponsorshipEvent({
                                        productId: product.id,
                                        eventType: 'click',
                                        placement: sponsoredPlacement,
                                        oncePerSession: true,
                                    })}
                                    className="group flex flex-col overflow-hidden rounded-xl border border-amber-100/40 bg-white transition-all duration-300 hover:border-amber-300/80 hover:shadow-[0_4px_12px_-4px_rgba(217,119,6,0.15)] hover:-translate-y-0.5"
                                >
                                    <div className="relative bg-gray-50 overflow-hidden aspect-square">
                                        <img
                                            src={product.img ? (product.img.startsWith('http') || product.img.startsWith('/storage') || product.img.startsWith('/img') ? product.img : `/storage/${product.img}`) : '/images/no-image.png'}
                                            alt={product.name}
                                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                        />
                                         <div className="absolute left-1.5 top-1.5 rounded-md bg-white/80 backdrop-blur-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-700 shadow-sm border border-white/60">
                                            Sponsored
                                        </div>
                                    </div>

                                    <div className="flex flex-1 flex-col p-3">
                                        <h3 className="font-semibold leading-snug text-gray-800 transition-colors group-hover:text-amber-700 line-clamp-2 text-xs mb-1">
                                            {product.name}
                                        </h3>

                                        <div className="mt-auto pt-2 flex items-end justify-between gap-1 border-t border-gray-50/50">
                                            <div className="flex flex-col gap-0.5 pt-0.5">
                                                <span className="text-xs font-black text-clay-700">
                                                    &#8369;{Number(product.price).toLocaleString()}
                                                </span>
                                                <span className="flex items-center gap-0.5 text-[9px] text-gray-400 font-medium">
                                                    <MapPin size={8} className="shrink-0" />
                                                    <span className="truncate max-w-[80px]">{product.location}</span>
                                                </span>
                                            </div>
                                            {hasRating(product.rating) && (
                                                <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-100/50 bg-amber-50/80 px-1 py-0.5 text-[9px] font-bold text-amber-700">
                                                    {formatRating(product.rating)} <Star size={8} className="fill-amber-400 text-amber-400 drop-shadow-sm" />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* CATEGORIES */}
                {categories.length > 0 && (
                    <section className="order-2">
                        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6 flex items-center gap-3">
                            Browse by Category
                        </h2>
                        <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 shadow-sm overflow-hidden">
                            {/* Desktop/Tablet View: Grid */}
                            <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-7 gap-4">
                                {categories.map((cat, idx) => {
                                    const Icon = CATEGORY_ICONS[cat] || CATEGORY_ICONS['default'];
                                    return (
                                        <Link 
                                            href={`${route('shop.index')}?category=${encodeURIComponent(cat)}`} 
                                            key={idx} 
                                            className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl hover:bg-clay-50/60 hover:border-clay-200 border border-transparent transition-all duration-300 group bg-transparent"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-clay-100 text-clay-600 flex items-center justify-center group-hover:bg-clay-600 group-hover:text-white transition-colors duration-300">
                                                <Icon size={22} strokeWidth={1.5} />
                                            </div>
                                            <span className="text-sm font-bold text-stone-600 group-hover:text-clay-800 text-center leading-tight">
                                                {cat}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Mobile View: Horizontal Scroll */}
                            <div className="flex md:hidden overflow-x-auto gap-3 pb-2 -mx-4 px-4 scrollbar-hide snap-x">
                                {categories.map((cat, idx) => {
                                    const Icon = CATEGORY_ICONS[cat] || CATEGORY_ICONS['default'];
                                    return (
                                        <Link 
                                            href={`${route('shop.index')}?category=${encodeURIComponent(cat)}`} 
                                            key={idx} 
                                            className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-stone-100 transition-all duration-300 group min-w-[100px] snap-center bg-stone-50/40"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-clay-100 text-clay-600 flex items-center justify-center">
                                                <Icon size={20} strokeWidth={1.5} />
                                            </div>
                                            <span className="text-[11px] font-bold text-stone-600 text-center leading-tight">
                                                {cat}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}

                {/* FEATURED PRODUCTS */}
                <section className="order-3">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <span className="w-1 h-5 bg-clay-600 rounded-full"></span>
                            Featured Products
                        </h2>
                        <Link 
                            href={route('shop.index')} 
                            className="text-xs text-clay-600 font-medium hover:underline flex items-center gap-1"
                        >
                            View All <ArrowRight size={12} />
                        </Link>
                    </div>

                    {featuredProducts.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {featuredProducts.map((product) => (
                                <Link 
                                    href={route('product.show', product.slug)} 
                                    key={product.id} 
                                    className="bg-white rounded-2xl hover:shadow-2xl hover:shadow-stone-900/10 hover:-translate-y-1.5 transition-all duration-500 border border-stone-100 overflow-hidden flex flex-col group active:scale-[0.98]"
                                >
                                    <div className="aspect-square relative bg-gray-100 overflow-hidden">
                                        <img 
                                            loading="lazy"
                                            src={product.img ? (product.img.startsWith('http') || product.img.startsWith('/storage') || product.img.startsWith('/img') ? product.img : `/storage/${product.img}`) : '/images/no-image.png'} 
                                            alt={product.name} 
                                            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                                            onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                        />
                                        {hasRating(product.rating) && (
                                            <div className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur text-gray-800 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                {formatRating(product.rating)} <Star size={10} className="fill-amber-400 text-amber-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 flex flex-col flex-1">
                                        <h3 className="text-xs font-medium text-gray-800 line-clamp-2 mb-2 group-hover:text-clay-600 transition leading-tight">
                                            {product.name}
                                        </h3>
                                        <div className="mt-auto">
                                            <p className="text-[10px] text-gray-400 mb-1 flex items-center gap-0.5">
                                                <MapPin size={9} /> {product.location}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-clay-600 text-sm font-bold">
                                                    &#8369;{Number(product.price).toLocaleString()}
                                                </span>
                                                {product.sold > 0 && (
                                                    <span className="text-[10px] text-gray-400">
                                                        {formatSold(product.sold)} sold
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border border-gray-100 p-12 text-center">
                            <p className="text-gray-500 text-sm">No products available yet. Check back soon!</p>
                        </div>
                    )}

                    {featuredProducts.length > 0 && (
                        <div className="py-8 flex justify-center">
                            <Link 
                                href={route('shop.index')}
                                className="border border-clay-600 text-clay-600 px-8 py-2.5 rounded-sm hover:bg-clay-600 hover:text-white transition text-sm font-medium"
                            >
                                View All Products
                            </Link>
                        </div>
                    )}
                </section>

            {/* TOP STORES - DSS Dashboard */}
                {topSellers.length > 0 && (
                    <section className="order-4">
                        <h2 className="text-lg font-serif font-black text-stone-900 mb-5 flex items-center gap-2">
                            <Trophy size={18} className="text-[#D4A373]" />
                            Top Selling Stores
                        </h2>
                        
                        {/* Mobile view: Horizontal swiping boutique carousel */}
                        <div className="flex md:hidden gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x scrollbar-hide">
                            {topSellers.map((store, originalIdx) => {
                                const isFirst = originalIdx === 0;
                                return (
                                    <div 
                                        key={store.store_slug || originalIdx}
                                        className={`snap-center flex-shrink-0 w-[240px] bg-white rounded-2xl border p-4 shadow-sm flex flex-col justify-between active:scale-[0.98] transition-transform duration-300 ${
                                            isFirst ? 'border-clay-200 ring-1 ring-clay-100/50' : 'border-stone-100'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <div className="relative flex-shrink-0">
                                                    <UserAvatar 
                                                        user={{ 
                                                            avatar: store.store_avatar, 
                                                            name: store.store_name, 
                                                            premium_tier: store.premium_tier 
                                                        }} 
                                                        className="w-11 h-11 text-base border border-stone-200 shadow-sm"
                                                    />
                                                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow border border-white ${
                                                        isFirst ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-stone-500'
                                                    }`}>
                                                        {originalIdx + 1}
                                                    </div>
                                                </div>
                                                <div className="min-w-0">
                                                    <Link href={route('shop.seller', store.store_slug)} className="font-bold text-stone-900 truncate block text-sm">
                                                        {store.store_name}
                                                    </Link>
                                                    <p className="text-[10px] text-stone-500 font-semibold mt-0.5">{formatSold(store.total_sold)} sold</p>
                                                </div>
                                            </div>

                                            {/* Products Preview strip */}
                                            {store.products && store.products.length > 0 && (
                                                <div className="flex gap-2.5 mt-4">
                                                    {store.products.slice(0, 3).map((p) => (
                                                        <Link 
                                                            key={p.id}
                                                            href={route('product.show', p.slug)}
                                                            className="w-14 h-14 rounded-xl overflow-hidden border border-stone-100 flex-shrink-0 relative group shadow-sm"
                                                        >
                                                            <img 
                                                                src={p.img ? (p.img.startsWith('http') || p.img.startsWith('/storage') || p.img.startsWith('/img') ? p.img : `/storage/${p.img}`) : '/images/no-image.png'}
                                                                alt=""
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                                onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                                            />
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <Link 
                                            href={route('shop.seller', store.store_slug)}
                                            className={`mt-4 block text-center text-[10px] font-black uppercase tracking-wider py-2 rounded-xl transition ${
                                                isFirst ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
                                            }`}
                                        >
                                            Visit Boutique →
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop view: Classic Podium grid */}
                        <div className="hidden md:grid grid-cols-3 gap-4 items-stretch">
                            {/* Use original array order and CSS order to layout: #2, #1, #3 on desktop, and #1, #2, #3 on mobile */}
                            {topSellers.map((store, originalIdx) => {
                                const isFirst = originalIdx === 0;
                                const isSecond = originalIdx === 1;
                                
                                // On mobile, 1st shows on top. On desktop, 1st shows in the middle (order-2), 2nd shows left (order-1), 3rd shows right (order-3)
                                const orderClass = isFirst ? 'order-1 md:order-2' : isSecond ? 'order-2 md:order-1' : 'order-3 md:order-3';
                                
                                return (
                                    <div key={store.store_slug || originalIdx} className={`group bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-stone-900/10 hover:-translate-y-1.5 active:scale-[0.98] flex flex-col ${orderClass} ${
                                        isFirst ? 'border-amber-200 ring-2 ring-amber-100 relative z-10' : 'border-stone-100'
                                    }`}>
                                        {/* Store Header - CENTERED */}
                                        <div className={`p-3 flex flex-col items-center text-center gap-2 border-b ${isFirst ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100' : 'bg-stone-50 border-stone-100'}`}>
                                            <Link href={route('shop.seller', store.store_slug)} className="relative mx-auto w-12 h-12 block">
                                                <UserAvatar 
                                                    user={{ 
                                                        avatar: store.store_avatar, 
                                                        name: store.store_name, 
                                                        premium_tier: store.premium_tier 
                                                    }} 
                                                    className={`w-12 h-12 text-xl transition-transform duration-500 group-hover:scale-110 group-hover:shadow-lg ${isFirst ? 'border-2 border-amber-300 shadow-md ring-0' : 'ring-0 border border-stone-200'}`}
                                                />
                                                {isFirst && (
                                                    <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-gradient-to-r from-amber-400 to-orange-400 border-2 border-white rounded-full flex items-center justify-center shadow z-20" title="#1 Top Seller">
                                                        <Trophy size={11} className="text-white" strokeWidth={3} />
                                                    </div>
                                                )}
                                            </Link>
                                            <div className="flex-1 w-full flex flex-col items-center">
                                                <Link href={route('shop.seller', store.store_slug)} className="font-bold text-stone-900 group-hover:text-clay-600 transition-colors text-base line-clamp-1 block">
                                                    {store.store_name}
                                                </Link>
                                                <div className="flex items-center gap-2 text-xs text-stone-500 justify-center mt-1.5 border border-stone-200 bg-white px-3 py-1 rounded-full shadow-sm group-hover:border-clay-200 transition-colors">
                                                    <span className={`font-bold flex items-center gap-1.5 ${isFirst ? 'text-amber-600' : 'text-stone-700'}`}>
                                                        {isFirst ? <Trophy size={14} className="text-amber-500" /> : <span className="text-stone-400">#</span>}
                                                        {originalIdx + 1}
                                                    </span>
                                                    <span className="w-px h-3 bg-stone-300"></span>
                                                    <span className="font-medium text-stone-600">{formatSold(store.total_sold)} sold</span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Store Products - Podium Layout */}
                                        <div className={`flex-1 p-3 flex flex-col items-center justify-center relative bg-gradient-to-b ${isFirst ? 'from-amber-50/20 to-transparent' : 'from-gray-50/30 to-transparent'}`}>
                                            {/* Product 1 (Top Center) */}
                                            {store.products && store.products[0] && (
                                                <Link 
                                                    href={route('product.show', store.products[0].slug)}
                                                    className="group flex flex-col items-center text-center w-full max-w-[120px] z-10"
                                                >
                                                    <div className={`w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden border-2 relative shadow-md transition-all duration-500 active:scale-[0.96] group-hover:shadow-2xl group-hover:shadow-stone-900/10 group-hover:-translate-y-1.5 ${isFirst ? 'border-amber-300 shadow-amber-100/50 group-hover:border-amber-400' : 'border-clay-200 group-hover:border-clay-400'}`}>
                                                        <img 
                                                            src={store.products[0].img ? (store.products[0].img.startsWith('http') || store.products[0].img.startsWith('/storage') || store.products[0].img.startsWith('/img') ? store.products[0].img : `/storage/${store.products[0].img}`) : '/images/no-image.png'}
                                                            alt={store.products[0].name}
                                                            className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
                                                            onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                                        />
                                                        <div className="absolute top-0 right-0 py-1 px-2 mb-1 bg-gray-900/80 backdrop-blur rounded-bl-xl text-white shadow-sm">
                                                            <span className="text-[10px] font-bold flex items-center gap-1"><Star size={10} className="fill-amber-400 text-amber-400"/> {hasRating(store.products[0].rating) ? formatRating(store.products[0].rating) : 'New'}</span>
                                                        </div>
                                                        <div className="absolute bottom-2 inset-x-0 flex justify-center">
                                                           <span className={`text-[10px] uppercase tracking-wide font-black px-3 py-1 rounded-full border text-white shadow-md ${isFirst ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400' : 'bg-clay-600 border-clay-500'}`}>#1 Product</span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 flex flex-col items-center">
                                                        <p className="text-sm font-bold text-gray-800 line-clamp-1 group-hover:text-clay-600 transition leading-snug">{store.products[0].name}</p>
                                                        <span className="text-[10px] text-gray-500 mt-1 font-medium bg-gray-100 px-2 py-0.5 rounded-md">{formatSold(store.products[0].sold)} sold</span>
                                                    </div>
                                                </Link>
                                            )}

                                            {/* Products 2 & 3 (Bottom Left & Right) */}
                                            <div className="flex w-full justify-around items-end px-2 md:px-0 mt-3 relative z-0">
                                                {/* Connecting line background visual */}
                                                <div className="absolute top-8 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent -z-10"></div>

                                                {/* Product 2 */}
                                                {store.products && store.products[1] ? (
                                                    <Link 
                                                        href={route('product.show', store.products[1].slug)}
                                                        className="group flex flex-col items-center text-center max-w-[80px]"
                                                    >
                                                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border border-stone-200 relative shadow-sm group-hover:border-clay-300 transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-1.5 active:scale-[0.96] bg-white">
                                                            <img 
                                                                src={store.products[1].img ? (store.products[1].img.startsWith('http') || store.products[1].img.startsWith('/storage') || store.products[1].img.startsWith('/img') ? store.products[1].img : `/storage/${store.products[1].img}`) : '/images/no-image.png'}
                                                                alt={store.products[1].name}
                                                                className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
                                                                onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                                            />
                                                            <div className="absolute top-0 left-0 bg-white/95 backdrop-blur text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-br-xl shadow-sm border-b border-r border-gray-100">
                                                               #2
                                                            </div>
                                                        </div>
                                                        <div className="mt-2.5 flex flex-col items-center">
                                                            <p className="text-xs font-semibold text-gray-700 line-clamp-2 group-hover:text-clay-600 transition leading-snug mb-1">{store.products[1].name}</p>
                                                        </div>
                                                    </Link>
                                                ) : <div className="w-16 md:w-20"></div>}

                                                {/* Product 3 */}
                                                {store.products && store.products[2] ? (
                                                    <Link 
                                                        href={route('product.show', store.products[2].slug)}
                                                        className="group flex flex-col items-center text-center max-w-[80px]"
                                                    >
                                                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border border-stone-200 relative shadow-sm group-hover:border-clay-300 transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-1.5 active:scale-[0.96] bg-white">
                                                            <img 
                                                                src={store.products[2].img ? (store.products[2].img.startsWith('http') || store.products[2].img.startsWith('/storage') || store.products[2].img.startsWith('/img') ? store.products[2].img : `/storage/${store.products[2].img}`) : '/images/no-image.png'}
                                                                alt={store.products[2].name}
                                                                className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
                                                                onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                                            />
                                                            <div className="absolute top-0 right-0 bg-white/95 backdrop-blur text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-bl-xl shadow-sm border-b border-l border-gray-100">
                                                               #3
                                                            </div>
                                                        </div>
                                                        <div className="mt-2.5 flex flex-col items-center">
                                                            <p className="text-xs font-semibold text-gray-700 line-clamp-2 group-hover:text-clay-600 transition leading-snug mb-1">{store.products[2].name}</p>
                                                        </div>
                                                    </Link>
                                                ) : <div className="w-16 md:w-20"></div>}
                                            </div>
                                        </div>
                                        {/* View Store */}
                                        <div className="px-3 pb-3">
                                            <Link 
                                                href={route('shop.seller', store.store_slug)}
                                                className={`block text-center text-xs font-bold py-2 rounded-lg transition ${
                                                    isFirst ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                View Store →
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

    
            </main>

            {/* --- FOOTER --- */}
            <Footer />
        </div>
    );
}



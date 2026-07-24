import React from 'react';
import { Link } from '@inertiajs/react';
import { Trophy, Star, Crown, Sparkles } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import { hasRating, formatRating } from '@/utils/rating';

export default function TopArtisansGrid({ topSellers = [], formatSold }) {
    if (!topSellers || topSellers.length === 0) return null;

    const safeFormatSold = formatSold || ((val) => `${val || 0}`);

    const renderPlanBadge = (store) => {
        const plan = store.premium_tier || store.subscription_tier || store.plan || 'free';
        if (plan === 'super_premium' || plan === 'elite') {
            return (
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-violet-100/80 text-violet-900 border border-violet-200/70 shadow-2xs">
                    <Sparkles size={10} className="fill-violet-500 text-violet-500" /> Elite
                </span>
            );
        }
        if (plan === 'premium' || plan === 'pro') {
            return (
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-900 border border-amber-200/70 shadow-2xs">
                    <Crown size={10} className="fill-amber-500 text-amber-500" /> Pro
                </span>
            );
        }
        return null;
    };

    const getRankTheme = (index) => {
        if (index === 0) {
            return {
                card: 'border-amber-200/90 ring-1 ring-amber-100/60 bg-gradient-to-b from-amber-50/30 via-white to-white',
                avatarBorder: 'border-amber-300 ring-2 ring-amber-100',
                badgeBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
                soldTag: 'bg-amber-100/80 text-amber-900 border-amber-200/60',
                button: 'bg-amber-50 hover:bg-amber-500 text-amber-900 hover:text-white border-amber-200/80 hover:border-amber-500 shadow-xs',
                productRank: 'bg-amber-600/90 text-white',
            };
        }
        if (index === 1) {
            return {
                card: 'border-slate-200/90 ring-1 ring-slate-100/60 bg-gradient-to-b from-slate-50/40 via-white to-white shadow-xs hover:border-slate-300',
                avatarBorder: 'border-slate-300 ring-2 ring-slate-100',
                badgeBg: 'bg-gradient-to-r from-slate-600 to-stone-700',
                soldTag: 'bg-slate-100 text-slate-800 border-slate-200/70',
                button: 'bg-slate-50 hover:bg-slate-800 text-slate-800 hover:text-white border-slate-200/80 hover:border-slate-800 shadow-xs',
                productRank: 'bg-slate-700/90 text-white',
            };
        }
        return {
            card: 'border-clay-200/90 ring-1 ring-clay-100/60 bg-gradient-to-b from-clay-50/30 via-white to-white shadow-xs hover:border-clay-300',
            avatarBorder: 'border-clay-300 ring-2 ring-clay-100',
            badgeBg: 'bg-gradient-to-r from-clay-600 to-stone-700',
            soldTag: 'bg-clay-50 text-clay-800 border-clay-200/70',
            button: 'bg-clay-50 hover:bg-clay-700 text-clay-800 hover:text-white border-clay-200/80 hover:border-clay-700 shadow-xs',
            productRank: 'bg-clay-700/90 text-white',
        };
    };

    return (
        <section className="order-4">
            <h2 className="text-lg font-serif font-black text-stone-900 mb-5 flex items-center gap-2">
                <Trophy size={18} className="text-[#D4A373]" />
                Top Selling Stores
            </h2>
            
            {/* Mobile view: Horizontal swiping boutique carousel */}
            <div className="flex md:hidden gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x scrollbar-hide">
                {topSellers.map((store, originalIdx) => {
                    const theme = getRankTheme(originalIdx);

                    return (
                        <div 
                            key={store.store_slug || originalIdx}
                            className={`snap-center flex-shrink-0 w-[290px] rounded-2xl border p-4 shadow-sm flex flex-col justify-between active:scale-[0.98] transition-all duration-300 ${theme.card}`}
                        >
                            <div>
                                <Link href={route('shop.seller', store.store_slug)} className="flex items-center gap-3 group/header">
                                    <div className="relative shrink-0">
                                        <UserAvatar 
                                            user={{ 
                                                avatar: store.store_avatar, 
                                                avatar_url: store.store_avatar,
                                                name: store.store_name, 
                                                premium_tier: store.premium_tier || store.subscription_tier,
                                                role: 'artisan'
                                            }} 
                                            className={`w-11 h-11 text-sm border shadow-xs ${theme.avatarBorder}`}
                                        />
                                        <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-xs border border-white ${theme.badgeBg}`}>
                                            #{originalIdx + 1}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <h3 className="font-bold text-stone-900 text-sm truncate group-hover/header:text-clay-600 transition-colors">
                                                {store.store_name}
                                            </h3>
                                            {renderPlanBadge(store)}
                                        </div>
                                        <p className="text-[10px] text-stone-500 font-medium mt-0.5">
                                            {safeFormatSold(store.total_sold)} items sold
                                        </p>
                                    </div>
                                </Link>

                                {/* Products 3-column strip */}
                                {store.products && store.products.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2.5 mt-4">
                                        {store.products.slice(0, 3).map((p, pIdx) => {
                                            const ratingVal = p.rating ?? p.reviews_avg_rating ?? p.rating_avg;
                                            const soldCount = p.sold ?? p.sold_count ?? p.total_sold ?? 0;

                                            return (
                                                <Link 
                                                    key={p.id || pIdx}
                                                    href={route('product.show', p.slug)}
                                                    className="group/prod flex flex-col items-center min-w-0"
                                                >
                                                    <div className="w-full aspect-square rounded-xl overflow-hidden border border-stone-100 relative bg-stone-50 shadow-xs group-hover/prod:border-clay-300 transition-all">
                                                        <img 
                                                            src={p.img ? (p.img.startsWith('http') || p.img.startsWith('/storage') || p.img.startsWith('/img') ? p.img : `/storage/${p.img}`) : '/images/no-image.png'}
                                                            alt={p.name || ''}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover/prod:scale-108"
                                                            onError={(e) => { e.target.onerror = null; e.target.src = '/images/no-image.png'; }}
                                                        />
                                                        
                                                        {/* Top-Left: Rank Badge */}
                                                        <span className={`absolute top-1 left-1 backdrop-blur-xs text-[8px] font-bold px-1.5 py-0.5 rounded-md ${theme.productRank}`}>
                                                            #{pIdx + 1}
                                                        </span>

                                                        {/* Top-Right: Rating Badge */}
                                                        <span className="absolute top-1 right-1 bg-stone-900/80 backdrop-blur-xs text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
                                                            <Star size={8} className="fill-amber-400 text-amber-400 shrink-0" />
                                                            {hasRating(ratingVal) ? formatRating(ratingVal) : 'New'}
                                                        </span>

                                                        {/* Bottom: Price + Sold Count */}
                                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-900/85 via-stone-900/40 to-transparent p-1 pt-3 text-center">
                                                            <span className="text-[9px] font-extrabold text-white block leading-tight">
                                                                ₱{Number(p.price || 0).toLocaleString()}
                                                            </span>
                                                            <span className="text-[7.5px] font-medium text-stone-300 block">
                                                                {safeFormatSold(soldCount)} sold
                                                            </span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <Link 
                                href={route('shop.seller', store.store_slug)}
                                className={`mt-4 block text-center text-[10px] font-extrabold uppercase tracking-wider py-2.5 rounded-xl transition-all border ${theme.button}`}
                            >
                                Visit Boutique →
                            </Link>
                        </div>
                    );
                })}
            </div>

            {/* Desktop view: Enhanced #1, #2, #3 store cards matching screenshot */}
            <div className="hidden md:grid grid-cols-3 gap-5 items-stretch">
                {topSellers.map((store, originalIdx) => {
                    const theme = getRankTheme(originalIdx);

                    return (
                        <div 
                            key={store.store_slug || originalIdx} 
                            className={`group/card rounded-2xl border p-5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-stone-900/5 hover:-translate-y-1.5 flex flex-col justify-between ${theme.card}`}
                        >
                            <div>
                                {/* Store Header: Left-aligned avatar + Store Title + Subscription Plan + Sold stats */}
                                <Link 
                                    href={route('shop.seller', store.store_slug)} 
                                    className="flex items-center gap-3.5 group/header"
                                >
                                    <div className="relative shrink-0">
                                        <UserAvatar 
                                            user={{ 
                                                avatar: store.store_avatar, 
                                                avatar_url: store.store_avatar,
                                                name: store.store_name, 
                                                premium_tier: store.premium_tier || store.subscription_tier,
                                                role: 'artisan'
                                            }} 
                                            className={`w-12 h-12 text-sm border shadow-xs transition-transform duration-300 group-hover/header:scale-105 ${theme.avatarBorder}`}
                                        />
                                        <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-xs border border-white ${theme.badgeBg}`}>
                                            #{originalIdx + 1}
                                        </span>
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-stone-900 text-sm lg:text-base truncate group-hover/header:text-clay-600 transition-colors leading-tight">
                                                {store.store_name}
                                            </h3>
                                            {renderPlanBadge(store)}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${theme.soldTag}`}>
                                                {safeFormatSold(store.total_sold)} sold
                                            </span>
                                            {store.products && (
                                                <span className="text-[10px] font-medium text-stone-400">
                                                    • {store.products.length} crafts
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>

                                {/* Products Strip: #1, #2, #3 Product thumbnails with subtle rank badges, rating stars, price & sold count */}
                                {store.products && store.products.length > 0 && (
                                    <div className="grid grid-cols-3 gap-3 mt-4">
                                        {store.products.slice(0, 3).map((p, pIdx) => {
                                            const ratingVal = p.rating ?? p.reviews_avg_rating ?? p.rating_avg;
                                            const soldCount = p.sold ?? p.sold_count ?? p.total_sold ?? 0;

                                            return (
                                                <Link 
                                                    key={p.id || pIdx}
                                                    href={route('product.show', p.slug)}
                                                    className="group/prod flex flex-col items-center min-w-0"
                                                >
                                                    <div className="w-full aspect-square rounded-xl overflow-hidden border border-stone-100 relative bg-stone-50 shadow-xs group-hover/prod:border-clay-300 group-hover/prod:shadow-md transition-all duration-300">
                                                        <img 
                                                            src={p.img ? (p.img.startsWith('http') || p.img.startsWith('/storage') || p.img.startsWith('/img') ? p.img : `/storage/${p.img}`) : '/images/no-image.png'}
                                                            alt={p.name || ''}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover/prod:scale-110"
                                                            onError={(e) => { e.target.onerror = null; e.target.src = '/images/no-image.png'; }}
                                                        />
                                                        
                                                        {/* Top-Left: Rank Badge */}
                                                        <span className={`absolute top-1.5 left-1.5 backdrop-blur-xs text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs ${theme.productRank}`}>
                                                            #{pIdx + 1}
                                                        </span>

                                                        {/* Top-Right: Rating Badge */}
                                                        <span className="absolute top-1.5 right-1.5 bg-stone-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
                                                            <Star size={9} className="fill-amber-400 text-amber-400 shrink-0" />
                                                            {hasRating(ratingVal) ? formatRating(ratingVal) : 'New'}
                                                        </span>

                                                        {/* Bottom Overlay: Price + Sold Count */}
                                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-900/85 via-stone-900/40 to-transparent p-1.5 pt-4 text-center">
                                                            <span className="text-[10px] font-extrabold text-white block leading-tight">
                                                                ₱{Number(p.price || 0).toLocaleString()}
                                                            </span>
                                                            <span className="text-[8.5px] font-medium text-stone-300 block mt-0.5">
                                                                {safeFormatSold(soldCount)} sold
                                                            </span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Enhanced Visit Boutique Button */}
                            <div className="mt-4 pt-3.5 border-t border-stone-100">
                                <Link 
                                    href={route('shop.seller', store.store_slug)}
                                    className={`group/btn w-full text-center text-xs font-bold py-2.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 border active:scale-[0.98] ${theme.button}`}
                                >
                                    <span>Visit Boutique</span>
                                    <span className="group-hover/btn:translate-x-1 transition-transform duration-200">→</span>
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

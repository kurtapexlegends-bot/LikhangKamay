import React from 'react';
import { Link } from '@inertiajs/react';
import { Trophy, Star } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import { hasRating, formatRating } from '@/utils/rating';

export default function TopArtisansGrid({ topSellers = [], formatSold }) {
    if (topSellers.length === 0) return null;

    return (
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
                                <Link href={route('shop.seller', store.store_slug)} className="flex items-center gap-3 min-h-[44px] w-full group/header">
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
                                    <div className="min-w-0 flex-1">
                                        <span className="font-bold text-stone-900 truncate block text-sm group-hover/header:text-clay-650">
                                            {store.store_name}
                                        </span>
                                        <p className="text-[10px] text-stone-500 font-semibold mt-0.5">{formatSold(store.total_sold)} sold</p>
                                    </div>
                                </Link>

                                {/* Products Preview strip */}
                                {store.products && store.products.length > 0 && (
                                    <div className="flex gap-2.5 mt-4">
                                        {store.products.slice(0, 3).map((p) => (
                                            <Link 
                                                key={p.id}
                                                href={route('product.show', p.slug)}
                                                className="w-14 h-14 rounded-xl overflow-hidden border border-stone-100 flex-shrink-0 relative group shadow-sm min-w-[44px] min-h-[44px]"
                                            >
                                                <img 
                                                    src={p.img ? (p.img.startsWith('http') || p.img.startsWith('/storage') || p.img.startsWith('/img') ? p.img : `/storage/${p.img}`) : '/images/no-image.png'}
                                                    alt=""
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    onError={(e) => { e.target.onerror = null; e.target.src = '/images/no-image.png'; }}
                                                />
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Link 
                                href={route('shop.seller', store.store_slug)}
                                className={`mt-4 block text-center text-[10px] font-black uppercase tracking-wider py-3 rounded-xl transition min-h-[44px] flex items-center justify-center ${
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
                {topSellers.map((store, originalIdx) => {
                    const isFirst = originalIdx === 0;
                    const isSecond = originalIdx === 1;
                    
                    const orderClass = isFirst ? 'order-1 md:order-2' : isSecond ? 'order-2 md:order-1' : 'order-3 md:order-3';
                    
                    return (
                        <div key={store.store_slug || originalIdx} className={`group bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-stone-900/10 hover:-translate-y-1.5 active:scale-[0.98] flex flex-col ${orderClass} ${
                            isFirst ? 'border-amber-200 ring-2 ring-amber-100 relative z-10' : 'border-stone-100'
                        }`}>
                            {/* Store Header - CENTERED */}
                            <Link 
                                href={route('shop.seller', store.store_slug)} 
                                className={`p-3 flex flex-col items-center text-center gap-2 border-b w-full group/header min-h-[44px] ${isFirst ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100' : 'bg-stone-50 border-stone-100'}`}
                            >
                                <div className="relative mx-auto w-12 h-12 block">
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
                                </div>
                                <div className="flex-1 w-full flex flex-col items-center">
                                    <span className="font-bold text-stone-900 group-hover/header:text-clay-600 transition-colors text-base line-clamp-1 block">
                                        {store.store_name}
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-stone-500 justify-center mt-1.5 border border-stone-200 bg-white px-3 py-1 rounded-full shadow-sm group-hover/header:border-clay-200 transition-colors">
                                        <span className={`font-bold flex items-center gap-1.5 ${isFirst ? 'text-amber-600' : 'text-stone-700'}`}>
                                            {isFirst ? <Trophy size={14} className="text-amber-500" /> : <span className="text-stone-400">#</span>}
                                            {originalIdx + 1}
                                        </span>
                                        <span className="w-px h-3 bg-stone-300"></span>
                                        <span className="font-medium text-stone-600">{formatSold(store.total_sold)} sold</span>
                                    </div>
                                </div>
                            </Link>
                            {/* Store Products - Podium Layout */}
                            <div className={`flex-1 p-3 flex flex-col items-center justify-center relative bg-gradient-to-b ${isFirst ? 'from-amber-50/20 to-transparent' : 'from-gray-50/30 to-transparent'}`}>
                                {/* Product 1 (Top Center) */}
                                {store.products && store.products[0] && (
                                    <Link 
                                        href={route('product.show', store.products[0].slug)}
                                        className="group flex flex-col items-center text-center w-full max-w-[120px] z-10 min-h-[44px]"
                                    >
                                        <div className={`w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden border-2 relative shadow-md transition-all duration-500 active:scale-[0.96] group-hover:shadow-2xl group-hover:shadow-stone-900/10 group-hover:-translate-y-1.5 ${isFirst ? 'border-amber-300 shadow-amber-100/50 group-hover:border-amber-400' : 'border-clay-200 group-hover:border-clay-400'}`}>
                                            <img 
                                                src={store.products[0].img ? (store.products[0].img.startsWith('http') || store.products[0].img.startsWith('/storage') || store.products[0].img.startsWith('/img') ? store.products[0].img : `/storage/${store.products[0].img}`) : '/images/no-image.png'}
                                                alt={store.products[0].name}
                                                className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
                                                onError={(e) => { e.target.onerror = null; e.target.src = '/images/no-image.png'; }}
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
                                {((store.products && store.products[1]) || (store.products && store.products[2])) && (
                                    <div className="flex w-full justify-around items-end px-2 md:px-0 mt-3 relative z-0">
                                        <div className="absolute top-8 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent -z-10"></div>

                                        {/* Product 2 */}
                                        {store.products && store.products[1] ? (
                                            <Link 
                                                href={route('product.show', store.products[1].slug)}
                                                className="group flex flex-col items-center text-center max-w-[80px] min-h-[44px]"
                                            >
                                                <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border border-stone-200 relative shadow-sm group-hover:border-clay-300 transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-1.5 active:scale-[0.96] bg-white">
                                                    <img 
                                                        src={store.products[1].img ? (store.products[1].img.startsWith('http') || store.products[1].img.startsWith('/storage') || store.products[1].img.startsWith('/img') ? store.products[1].img : `/storage/${store.products[1].img}`) : '/images/no-image.png'}
                                                        alt={store.products[1].name}
                                                        className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
                                                        onError={(e) => { e.target.onerror = null; e.target.src = '/images/no-image.png'; }}
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
                                                className="group flex flex-col items-center text-center max-w-[80px] z-10 min-h-[44px]"
                                            >
                                                <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border border-stone-200 relative shadow-sm group-hover:border-clay-300 transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-1.5 active:scale-[0.96] bg-white">
                                                    <img 
                                                        src={store.products[2].img ? (store.products[2].img.startsWith('http') || store.products[2].img.startsWith('/storage') || store.products[2].img.startsWith('/img') ? store.products[2].img : `/storage/${store.products[2].img}`) : '/images/no-image.png'}
                                                        alt={store.products[2].name}
                                                        className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
                                                        onError={(e) => { e.target.onerror = null; e.target.src = '/images/no-image.png'; }}
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
                                )}
                            </div>
                            {/* View Store */}
                            <div className="px-3 pb-3">
                                <Link 
                                    href={route('shop.seller', store.store_slug)}
                                    className={`block text-center text-xs font-bold py-3 rounded-lg transition min-h-[44px] flex items-center justify-center ${
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
    );
}

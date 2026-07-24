import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { MessageCircle, Store, MapPin, Crown, Sparkles } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';

export default function SellerAboutPanel({ product, handleChatSeller, chatRequirementMessage }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
            {/* Seller Card (Left Col) */}
            <div className="flex h-full flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <UserAvatar user={product.seller} className="w-12 h-12 text-xl" />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-base truncate flex items-center gap-1.5">
                                {product.seller?.shop_name || product.seller?.name || 'Artisan'}
                                {product.seller?.premium_tier === 'premium' && (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-900 border border-amber-200/70 shadow-2xs">
                                        <Crown size={10} className="fill-amber-500 text-amber-500" /> Pro
                                    </span>
                                )}
                                {product.seller?.premium_tier === 'super_premium' && (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-violet-100/80 text-violet-900 border border-violet-200/70 shadow-2xs">
                                        <Sparkles size={10} className="fill-violet-500 text-violet-500" /> Elite
                                    </span>
                                )}
                            </h3>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                <MapPin size={12} className="text-gray-400" />
                                <span className="truncate">{product.seller?.location || 'Philippines'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full mt-3">
                    <button
                        type="button"
                        onClick={handleChatSeller}
                        aria-label={product?.viewer_can_chat_seller ? 'Open seller chat' : 'View seller chat policy'}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 ${
                            product?.viewer_can_chat_seller
                                ? 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                                : 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                    >
                        <MessageCircle size={14} />
                        {product?.viewer_can_chat_seller ? 'Chat' : 'Chat Policy'}
                    </button>
                    <Link 
                        href={route('shop.seller', product.seller?.slug || '#')} 
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-clay-600 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30"
                    >
                        <Store size={14} />
                        View Shop
                    </Link>
                </div>
                {!product?.viewer_can_chat_seller && chatRequirementMessage && (
                    <div className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-stone-100 bg-stone-50 py-2 text-[11px] font-medium text-stone-500">
                        <MessageCircle size={12} className="text-stone-400" />
                        <span>{chatRequirementMessage}</span>
                    </div>
                )}
            </div>

            {/* Description (Right Col - 2/3 width) */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:col-span-2">
                <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                    About This Piece
                </h2>
                <div className="prose prose-xs text-xs max-w-none text-gray-600 leading-relaxed">
                    <p className={`whitespace-pre-line ${isExpanded ? '' : 'line-clamp-4 lg:line-clamp-none'}`}>
                        {product.description || "A beautifully handcrafted piece made with care and traditional techniques by a skilled Filipino artisan. Each piece is unique and may have slight variations that add to its character."}
                    </p>
                    {!isExpanded && (
                        <button
                            type="button"
                            onClick={() => setIsExpanded(true)}
                            className="lg:hidden mt-2 text-xs font-bold text-clay-600 hover:text-clay-700 transition"
                        >
                            Read More
                        </button>
                    )}
                    {isExpanded && (
                        <button
                            type="button"
                            onClick={() => setIsExpanded(false)}
                            className="lg:hidden mt-2 text-xs font-bold text-clay-600 hover:text-clay-700 transition"
                        >
                            Show Less
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

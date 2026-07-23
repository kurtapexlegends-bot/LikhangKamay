import React from 'react';
import { Star, Check, Package, Clock, Award, X } from 'lucide-react';

export default function ProductDetailsCard({ product, productRating }) {
    return (
        <div className="p-3.5 sm:p-5 lg:col-span-7">
            {/* Title */}
            <h1 className="text-xl font-bold text-gray-900 leading-tight mb-1.5">
                {product.name}
            </h1>

            {/* Rating & Sold */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs mb-3">
                <div className="flex items-center gap-1">
                    <span className="text-clay-600 font-bold underline">{productRating}</span>
                    <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={10} className={s <= Math.round(productRating) ? 'fill-clay-600 text-clay-600' : 'text-gray-300'} />
                        ))}
                    </div>
                </div>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500 font-medium">{product.reviews_count || 0} Reviews</span>
                {product.sold > 0 && (
                    <>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-500 font-medium">{product.sold} Sold</span>
                    </>
                )}
            </div>

            {/* Price Box */}
            <div className="bg-clay-50/50 px-4 py-3 rounded-xl mb-4 border border-clay-100">
                <span className="text-xl sm:text-2xl font-bold text-clay-700">
                    PHP {Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
            </div>

            {/* Specifications - Premium Clay Card Tray */}
            <div className="bg-[#FAF8F5]/85 border border-stone-200/40 rounded-2xl p-4 sm:p-5 mb-5 space-y-3 shadow-sm">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 border-b border-stone-200/50 pb-2 mb-2">Specifications</h4>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[11px] sm:flex sm:flex-col sm:space-y-2 sm:text-xs">
                    {product.clay_type && (
                        <div className="flex flex-col sm:flex-row sm:items-baseline">
                            <span className="text-stone-400 font-bold uppercase tracking-wider mb-0.5 sm:w-24 sm:mb-0 text-[9px]">Material</span>
                            <span className="text-stone-700 font-bold truncate">{product.clay_type}</span>
                        </div>
                    )}
                    {product.glaze_type && (
                        <div className="flex flex-col sm:flex-row sm:items-baseline">
                            <span className="text-stone-400 font-bold uppercase tracking-wider mb-0.5 sm:w-24 sm:mb-0 text-[9px]">Finish</span>
                            <span className="text-stone-700 font-bold truncate">{product.glaze_type}</span>
                        </div>
                    )}
                    {(product.height > 0 || product.width > 0) && (
                        <div className="flex flex-col sm:flex-row sm:items-baseline">
                            <span className="text-stone-400 font-bold uppercase tracking-wider mb-0.5 sm:w-24 sm:mb-0 text-[9px]">Dimensions</span>
                            <span className="text-stone-700 font-bold truncate">{product.height || 0}"H x {product.width || 0}"W</span>
                        </div>
                    )}
                    {product.firing_method && (
                        <div className="flex flex-col sm:flex-row sm:items-baseline">
                            <span className="text-stone-400 font-bold uppercase tracking-wider mb-0.5 sm:w-24 sm:mb-0 text-[9px]">Firing</span>
                            <span className="text-stone-700 font-bold truncate">{product.firing_method}</span>
                        </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className="text-stone-400 font-bold uppercase tracking-wider mb-0.5 sm:w-24 sm:mb-0 text-[9px]">Food Safe</span>
                        {product.food_safe ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] w-fit">
                                <Check size={10} /> Yes
                            </span>
                        ) : (
                            <span className="text-rose-600 font-bold flex items-center gap-1 bg-rose-50 border border-rose-100/50 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] w-fit">
                                <X size={10} /> No (Decorative only)
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Product Info */}
            <div className="border-t border-gray-100 pt-5 space-y-2.5 text-xs">
                <div className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-lg">
                    <Package size={16} className="text-clay-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <span className="block text-gray-900 font-semibold text-[11px] uppercase mb-0.5">Handled With Care</span>
                        <span className="text-gray-600 text-[11px]">Packed carefully for safer delivery.</span>
                    </div>
                </div>
                <div className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-lg">
                    <Clock size={16} className="text-clay-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <span className="block text-gray-900 font-semibold text-[11px] uppercase mb-0.5">Lead Time</span>
                        <span className="text-gray-600 text-[11px]">{product.lead_time || 3}-{(product.lead_time || 3) + 2} business days</span>
                    </div>
                </div>
                <div className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-lg">
                    <Award size={16} className="text-clay-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <span className="block text-gray-900 font-semibold text-[11px] uppercase mb-0.5">Handmade Piece</span>
                        <span className="text-gray-600 text-[11px]">Made by a verified artisan shop.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* global route */
import React from 'react';
import { Link } from '@inertiajs/react';
import { 
    Star, 
    Package, 
    Edit2, 
    Trash2, 
    Store, 
    Calendar, 
    CornerDownRight, 
    ShieldAlert, 
    ShieldCheck, 
    Pin, 
    CheckCircle2 
} from 'lucide-react';

const RATING_LABELS = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Great',
    5: 'Exceptional',
};

export default function BuyerReviewCard({
    review,
    onOpenEdit,
    onOpenDelete,
    onPreviewImage,
    isHighlighted = false,
}) {
    const isHidden = Boolean(review.moderation?.is_hidden);
    const isUnderReview = Boolean(
        !isHidden && 
        review.moderation?.has_dispute && 
        ['pending', 'under_review'].includes(review.moderation?.dispute_status)
    );

    return (
        <article
            id={`review-${review.id}`}
            className={`bg-white rounded-xl border transition-all duration-200 p-3.5 sm:p-4 ${
                isHighlighted
                    ? 'ring-2 ring-clay-500 border-clay-400 bg-clay-50/20 shadow-sm'
                    : isHidden
                        ? 'border-rose-200/90 bg-rose-50/15'
                        : isUnderReview
                            ? 'border-amber-200/90 bg-amber-50/15'
                            : review.is_pinned
                                ? 'border-amber-300/80 bg-amber-50/15'
                                : 'border-stone-200/85 hover:border-stone-300 shadow-2xs'
            }`}
        >
            {/* Top Row: Product Card Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-stone-100">
                <div className="flex items-start gap-3 min-w-0">
                    {/* Product Thumbnail */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200 shadow-2xs">
                        {review.product?.image ? (
                            <img
                                src={review.product.image}
                                alt={review.product?.name || 'Product'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/images/placeholder.svg';
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-300">
                                <Package size={20} />
                            </div>
                        )}
                    </div>

                    {/* Product & Workshop Details */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {review.product?.slug || review.product?.id ? (
                                <Link
                                    href={route('product.show', review.product.slug || review.product.id)}
                                    className="text-xs sm:text-sm font-bold text-stone-900 hover:text-clay-700 transition-colors truncate block"
                                >
                                    {review.product?.name || 'Handcrafted Item'}
                                </Link>
                            ) : (
                                <span className="text-xs sm:text-sm font-bold text-stone-900 truncate block">
                                    {review.product?.name || 'Handcrafted Item'}
                                </span>
                            )}

                            {/* Pinned Badge if artisan pinned review */}
                            {review.is_pinned && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-100/80 border border-amber-200/80 px-1.5 py-0.2 rounded-md shrink-0">
                                    <Pin size={9} className="text-amber-500 fill-amber-500" />
                                    Featured by Artisan
                                </span>
                            )}
                        </div>

                        {/* Workshop Tag */}
                        {review.product?.workshop_name && (
                            <div className="flex items-center gap-1 mt-0.5 text-stone-500">
                                <Store size={11} className="text-clay-600 shrink-0" />
                                {review.product.workshop_slug ? (
                                    <Link
                                        href={route('shop.seller', review.product.workshop_slug)}
                                        className="text-[11px] font-medium text-stone-600 hover:text-clay-700 hover:underline truncate"
                                    >
                                        {review.product.workshop_name}
                                    </Link>
                                ) : (
                                    <span className="text-[11px] font-medium text-stone-600 truncate">
                                        {review.product.workshop_name}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Rating Stars & Safety Badge Row */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Star
                                        key={i}
                                        size={12}
                                        className={
                                            i <= review.rating
                                                ? 'fill-amber-400 text-amber-400'
                                                : 'text-stone-200'
                                        }
                                    />
                                ))}
                            </div>
                            <span className="text-[11px] font-semibold text-stone-700">
                                {RATING_LABELS[review.rating] || `${review.rating} Stars`}
                            </span>

                            {/* Content Safety Status Badge */}
                            {isHidden ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full shrink-0">
                                    <ShieldAlert size={10} className="shrink-0" />
                                    Hidden from Storefront
                                </span>
                            ) : isUnderReview ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                                    <ShieldAlert size={10} className="shrink-0" />
                                    Under Moderation Review
                                </span>
                            ) : review.moderation?.status_label === 'Passed Safety Review' ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full shrink-0">
                                    <ShieldCheck size={10} className="shrink-0" />
                                    Passed Safety Review
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full shrink-0">
                                    <ShieldCheck size={10} className="shrink-0" />
                                    Public Review
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Date Timestamp Header */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-0.5 shrink-0 pt-1 sm:pt-0">
                    <div className="flex items-center gap-1 text-[11px] font-medium text-stone-400">
                        <Calendar size={11} />
                        <span>{review.date}</span>
                    </div>
                    {review.date_human && (
                        <span className="text-[10px] text-stone-400 hidden sm:block">
                            {review.date_human}
                        </span>
                    )}
                </div>
            </div>

            {/* Content Safety Detailed Notice Banner (if review is moderated or disputed) */}
            {review.moderation?.notice && (
                <div className={`mt-2.5 flex items-start gap-2 p-2.5 rounded-xl text-xs ${
                    isHidden
                        ? 'bg-rose-50/80 border border-rose-200/80 text-rose-800'
                        : isUnderReview
                            ? 'bg-amber-50/80 border border-amber-200/80 text-amber-800'
                            : 'bg-emerald-50/80 border border-emerald-200/80 text-emerald-800'
                }`}>
                    {isHidden || isUnderReview ? (
                        <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                    ) : (
                        <ShieldCheck size={14} className="shrink-0 mt-0.5 text-emerald-600" />
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="leading-snug font-medium">{review.moderation.notice}</p>
                        {review.moderation.dispute_reason && (
                            <p className="text-[11px] opacity-90 mt-0.5 font-semibold">
                                Flagged reason: {review.moderation.dispute_reason}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Review Feedback Block */}
            <div className="mt-2.5">
                <div className="bg-stone-50/70 rounded-xl p-2.5 sm:p-3 border border-stone-100">
                    <p className="text-xs sm:text-sm text-stone-800 leading-relaxed font-normal whitespace-pre-wrap">
                        {review.comment ? (
                            review.comment
                        ) : (
                            <span className="italic text-stone-400">No written feedback provided.</span>
                        )}
                    </p>

                    {/* Optional Review Photos */}
                    {Array.isArray(review.photos) && review.photos.length > 0 && (
                        <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-0.5">
                            {review.photos.map((photoUrl, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => onPreviewImage(photoUrl)}
                                    className="w-12 h-12 rounded-lg overflow-hidden border border-stone-200 hover:opacity-90 transition-opacity shrink-0 shadow-2xs"
                                    title="Click to expand photo"
                                >
                                    <img
                                        src={photoUrl}
                                        alt={`Review upload ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Artisan's Reply Block (Compact) */}
            {review.seller_reply && (
                <div className="mt-2.5 pl-3 border-l-2 border-clay-500">
                    <div className="bg-clay-50/60 rounded-xl p-2.5 sm:p-3 border border-clay-100">
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <CornerDownRight size={13} className="text-clay-600 shrink-0" />
                                <span className="text-[9px] font-bold uppercase tracking-wider text-clay-700 bg-clay-100/80 px-2 py-0.5 rounded-full shrink-0">
                                    Artisan Reply
                                </span>
                                {review.product?.workshop_name && (
                                    <span className="text-xs font-bold text-stone-800 truncate">
                                        {review.product.workshop_name}
                                    </span>
                                )}
                            </div>
                            {review.seller_reply_date && (
                                <span className="text-[10px] text-stone-400 shrink-0 font-medium">
                                    {review.seller_reply_date}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-stone-700 leading-relaxed italic pl-4">
                            "{review.seller_reply}"
                        </p>
                    </div>
                </div>
            )}

            {/* Action Buttons Footer */}
            <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium">
                    <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                    <span>Verified Purchase</span>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => onOpenEdit(review)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-50 transition-colors min-h-[32px]"
                    >
                        <Edit2 size={12} className="text-stone-400" />
                        <span>Edit</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onOpenDelete(review)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-transparent text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors min-h-[32px]"
                    >
                        <Trash2 size={12} />
                        <span>Delete</span>
                    </button>
                </div>
            </div>
        </article>
    );
}

import React from 'react';
import { Link } from '@inertiajs/react';
import { Star, Pin, Trash2, Pencil } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';

export default function ProductReviewsSection({
    product,
    productRating,
    auth,
    currentUserReview,
    canWriteReview,
    isPendingArtisan,
    submitReview,
    handleDeleteReview,
    processing,
    deletingReview,
    errors,
    data,
    setData,
    reviewPhotoPreviewUrls,
    currentReviewPhotos,
}) {
    return (
        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>Product Ratings ({product.reviews?.length || 0})</span>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg">
                    <span className="text-xl font-bold text-clay-600">{productRating}</span>
                    <span className="text-xs text-gray-400 font-bold">/ 5</span>
                </div>
            </h2>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
                {/* Reviews List */}
                <div className="lg:col-span-2 space-y-4">
                    {product.reviews && product.reviews.length > 0 ? (
                        [...product.reviews]
                            .sort((a, b) => {
                                if (a.is_pinned && !b.is_pinned) return -1;
                                if (!a.is_pinned && b.is_pinned) return 1;
                                return 0;
                            })
                            .slice(0, 5).map((review) => (
                            <div key={review.id} className={`border-b border-gray-50 pb-3 last:border-0 ${review.is_pinned ? 'bg-amber-50/30 -mx-2 px-2 rounded-lg border-l-2 border-l-amber-400' : ''}`}>
                                {/* Pinned Badge */}
                                {review.is_pinned && (
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Pin size={10} className="text-amber-500 fill-amber-500" />
                                        <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Pinned by Seller</span>
                                    </div>
                                )}
                                <div className="flex items-start gap-2.5">
                                    <UserAvatar 
                                        user={review.user} 
                                        className="w-7 h-7 border border-gray-100" 
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-900">{review.user?.name || 'Anonymous'}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <div className="flex">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star key={s} size={10} className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
                                                ))}
                                            </div>
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(review.created_at).toLocaleDateString('en-PH')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-700 mt-1.5">{review.comment}</p>
                                        
                                        {/* Photos Grid - Horizontal Scroll on Mobile */}
                                        {review.photos && review.photos.length > 0 && (
                                            <div className="flex gap-2 mt-2 overflow-x-auto pb-1 -mx-2 px-2">
                                                {review.photos.map((photo, i) => (
                                                    <div key={i} className="w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-gray-100 cursor-pointer hover:opacity-90 transition shadow-sm">
                                                        <img 
                                                            src={`/storage/${photo}`} 
                                                            alt="Review Attachment" 
                                                            className="w-full h-full object-cover"
                                                            onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/no-image.png'; }}
                                                            onClick={() => window.open(`/storage/${photo}`, '_blank')}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Seller Reply */}
                                        {review.seller_reply && (
                                            <div className="mt-3 p-3.5 bg-orange-50/30 border border-orange-100/50 rounded-xl">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <UserAvatar user={product.seller} className="w-7 h-7 shadow-sm text-[10px]" />
                                                    <span className="text-[13px] font-bold text-stone-900">
                                                        {product.seller?.shop_name || product.seller?.name || 'Seller'}
                                                    </span>
                                                    <span className="text-[9px] font-bold tracking-wider uppercase text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 shadow-sm mt-0.5">
                                                        SELLER REPLY
                                                    </span>
                                                </div>
                                                <div className="text-[13px] text-stone-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: review.seller_reply }} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-6">
                            <WorkspaceEmptyState
                                compact
                                icon={Star}
                                title="No reviews yet"
                                description="Customer feedback will appear here after completed purchases."
                            />
                        </div>
                    )}
                </div>

                {/* Write Review */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h3 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wide">
                            {currentUserReview ? 'Your Review' : 'Write a Review'}
                        </h3>
                        
                        {auth?.user ? (
                            isPendingArtisan ? (
                                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-[13px] leading-relaxed text-amber-700">
                                    Reviews are disabled for pending artisan accounts.
                                </div>
                            ) : canWriteReview ? (
                                <form onSubmit={submitReview} className="space-y-3">
                                    {Object.keys(errors).length > 0 && (
                                        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[11px] text-red-600">
                                            {Object.values(errors).map((error, index) => (
                                                <p key={index}>{error}</p>
                                            ))}
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Rating</label>
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setData('rating', star)}
                                                    aria-label={`Set rating to ${star} star${star > 1 ? 's' : ''}`}
                                                    className="focus:outline-none p-3 lg:p-1.5"
                                                >
                                                    <Star
                                                        size={20}
                                                        className={star <= data.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-200'}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Comment</label>
                                        <textarea
                                            rows="3"
                                            value={data.comment}
                                            onChange={(e) => setData('comment', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-clay-200 focus:border-clay-400"
                                            placeholder="Share your thoughts..."
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">
                                            {currentUserReview ? 'Replace Photos (Optional, Max 3)' : 'Add Photos (Max 3)'}
                                        </label>
                                        <input 
                                            type="file" 
                                            multiple 
                                            accept="image/*"
                                            onChange={(e) => setData('photos', Array.from(e.target.files))}
                                            className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-clay-50 file:text-clay-700 hover:file:bg-clay-100 transition"
                                        />
                                        {data.photos && data.photos.length > 0 && (
                                            <div className="flex gap-2 mt-2">
                                                {reviewPhotoPreviewUrls.map((previewUrl, i) => (
                                                    <div key={i} className="w-10 h-10 rounded overflow-hidden border border-gray-200">
                                                        <img 
                                                            src={previewUrl}
                                                            alt="Preview" 
                                                            className="w-full h-full object-cover" 
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {!data.photos?.length && currentReviewPhotos.length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-[11px] text-gray-400 mb-2">Current photos</p>
                                                <div className="flex gap-2">
                                                    {currentReviewPhotos.map((photo, i) => (
                                                        <div key={`${photo}-${i}`} className="w-10 h-10 rounded overflow-hidden border border-gray-200">
                                                            <img
                                                                src={photo}
                                                                alt="Current review"
                                                                className="w-full h-full object-cover"
                                                                onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/no-image.png'; }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {currentUserReview && (
                                            <p className="text-[11px] text-gray-400 mt-1">Upload new photos only if you want to replace the current ones.</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {currentUserReview && (
                                            <button
                                                type="button"
                                                onClick={handleDeleteReview}
                                                aria-label="Delete your review"
                                                disabled={deletingReview || processing}
                                                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded border border-red-200 bg-red-50 h-11 lg:h-9 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                                            >
                                                <Trash2 size={14} />
                                                {deletingReview ? 'Deleting...' : 'Delete'}
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={processing || deletingReview}
                                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded bg-clay-600 h-11 lg:h-9 text-xs font-bold text-white transition hover:bg-clay-700 disabled:opacity-50"
                                        >
                                            {currentUserReview ? <Pencil size={14} /> : null}
                                            {processing ? (currentUserReview ? 'Updating...' : 'Submitting...') : (currentUserReview ? 'Update Review' : 'Submit')}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-xs leading-6 text-amber-700">
                                    You can review this product after a completed purchase.
                                </div>
                            )
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-xs text-gray-500 mb-2">Sign in to write a review</p>
                                <Link
                                    href={route('login')}
                                    className="text-sm text-clay-600 font-medium hover:underline"
                                >
                                    Log In
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

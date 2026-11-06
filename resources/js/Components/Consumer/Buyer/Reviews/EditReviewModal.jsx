import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import { Star, X, Package } from 'lucide-react';

const RATING_LABELS = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Great',
    5: 'Exceptional',
};

export default function EditReviewModal({
    isOpen,
    review,
    onClose,
    onSubmit,
    processing = false,
}) {
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');

    useEffect(() => {
        if (review) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setRating(Number(review.rating) || 5);
            setHoverRating(0);
            setComment(review.comment || '');
        }
    }, [review]);

    if (!isOpen || !review) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(review.id, rating, comment);
    };

    return (
        <Modal
            show={isOpen}
            onClose={() => !processing && onClose()}
            maxWidth="md"
        >
            <form onSubmit={handleSubmit} className="p-5 sm:p-6">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3.5">
                    <h2 className="text-base font-bold text-stone-900">
                        Edit Product Review
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Product mini header */}
                <div className="flex items-center gap-3 p-2.5 bg-stone-50 rounded-xl mb-3.5 border border-stone-100">
                    {review.product?.image ? (
                        <img
                            src={review.product.image}
                            alt={review.product?.name || 'Product'}
                            className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-stone-200 flex items-center justify-center text-stone-400 shrink-0">
                            <Package size={18} />
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-bold text-stone-900 truncate">
                            {review.product?.name || 'Handcrafted Item'}
                        </h3>
                        <p className="text-[10px] text-stone-500 font-medium truncate">
                            {review.product?.workshop_name || 'Artisan Workshop'}
                        </p>
                    </div>
                </div>

                {/* Star Rating Picker */}
                <div className="mb-3.5">
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                        Your Rating
                    </label>
                    <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="p-1 rounded-lg hover:bg-amber-50 transition-colors focus:outline-none"
                                aria-label={`Select ${star} star${star > 1 ? 's' : ''}`}
                            >
                                <Star
                                    size={24}
                                    className={`transition-all ${
                                        star <= (hoverRating || rating)
                                            ? 'fill-amber-400 text-amber-400 scale-105'
                                            : 'text-stone-300'
                                    }`}
                                />
                            </button>
                        ))}
                        <span className="ml-2 text-xs font-bold text-stone-700">
                            {RATING_LABELS[hoverRating || rating]}
                        </span>
                    </div>
                </div>

                {/* Comment Textarea */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                            Written Feedback
                        </label>
                        <span className="text-[10px] text-stone-400 font-medium">
                            {comment.length} / 1000
                        </span>
                    </div>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value.slice(0, 1000))}
                        rows={3}
                        placeholder="Share details about craftsmanship, materials, or delivery experience..."
                        className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs sm:text-sm font-normal text-stone-800 placeholder:text-stone-400 shadow-2xs focus:border-clay-500 focus:ring-0 leading-relaxed"
                    />
                </div>

                {/* Modal Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="px-3.5 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors min-h-[36px]"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={processing}
                        className="px-4 py-1.5 rounded-xl bg-clay-600 text-white text-xs font-bold hover:bg-clay-700 transition-colors shadow-2xs disabled:opacity-50 min-h-[36px]"
                    >
                        {processing ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

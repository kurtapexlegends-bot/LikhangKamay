import React, { useEffect, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { Star, Image as ImageIcon, X, Send, Loader2, Trash2, Pencil } from 'lucide-react';

const StarRating = ({ rating, setRating, readOnly = false, size = 24 }) => {
    const [hover, setHover] = useState(0);

    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={readOnly}
                    onClick={() => !readOnly && setRating(star)}
                    onMouseEnter={() => !readOnly && setHover(star)}
                    onMouseLeave={() => !readOnly && setHover(0)}
                    className={`transition-transform duration-200 ${
                        readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
                    }`}
                >
                    <Star
                        size={size}
                        className={`${
                            star <= (hover || rating)
                                ? 'fill-yellow-400 text-yellow-400 shadow-yellow-200'
                                : 'text-gray-300'
                        } transition-colors duration-200`}
                        strokeWidth={star <= (hover || rating) ? 0 : 2}
                    />
                </button>
            ))}
        </div>
    );
};

const ReviewForm = ({ item, onSuccess }) => {
    const existingReview = item.review;
    const isEditing = Boolean(existingReview);
    const [previewUrls, setPreviewUrls] = useState(existingReview?.photos || []);
    const [isDragging, setIsDragging] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const { data, setData, post, processing, errors, reset, transform } = useForm({
        product_id: item.product_id,
        rating: existingReview?.rating || 5,
        comment: existingReview?.comment || '',
        photos: [],
    });

    const revokeBlobPreviews = (urls) => {
        urls.forEach((url) => {
            if (url?.startsWith?.('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
    };

    useEffect(() => () => {
        revokeBlobPreviews(previewUrls);
    }, [previewUrls]);

    const handlePhotoChange = (e) => {
        const files = Array.from(e.target.files || e.dataTransfer.files || []);
        if (!files.length) return;

        const remainingSlots = Math.max(0, 5 - previewUrls.length);
        const acceptedFiles = files.slice(0, remainingSlots);

        if (!acceptedFiles.length) return;

        const nextPreviews = acceptedFiles.map((file) => URL.createObjectURL(file));

        if (isEditing) {
            revokeBlobPreviews(previewUrls);
            setData('photos', acceptedFiles);
            setPreviewUrls(nextPreviews);
            return;
        }

        setData('photos', [...data.photos, ...acceptedFiles].slice(0, 5));
        setPreviewUrls((current) => [...current, ...nextPreviews].slice(0, 5));
    };

    const removePhoto = (index) => {
        const nextPhotos = [...data.photos];
        const nextPreviews = [...previewUrls];
        const preview = nextPreviews[index];

        if (!preview?.startsWith?.('blob:')) return;

        URL.revokeObjectURL(preview);

        nextPhotos.splice(index, 1);
        nextPreviews.splice(index, 1);

        setData('photos', nextPhotos);
        setPreviewUrls(nextPreviews);
    };

    const submit = (e) => {
        e.preventDefault();

        const options = {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                revokeBlobPreviews(previewUrls);
                reset('photos');
                onSuccess();
            },
        };

        if (isEditing) {
            transform((payload) => ({
                ...payload,
                _method: 'patch',
            }));
            post(route('reviews.update', existingReview.id), options);
            return;
        }

        transform((payload) => payload);
        post(route('reviews.store'), options);
    };

    const handleDelete = () => {
        if (!existingReview) return;

        router.delete(route('reviews.destroy', existingReview.id), {
            preserveScroll: true,
            onStart: () => setDeleting(true),
            onFinish: () => setDeleting(false),
            onSuccess: () => onSuccess(),
        });
    };

    return (
        <form onSubmit={submit} className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-5 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-900">
                    {isEditing ? 'Updating' : 'Reviewing'} <span className="text-clay-700">"{item.name}"</span>
                </h4>
                {processing && <Loader2 size={16} className="animate-spin text-clay-600" />}
            </div>

            {Object.keys(errors).length > 0 && (
                <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-600 animate-pulse">
                    <p className="mb-1 font-bold">Please fix the following errors:</p>
                    <ul className="list-inside list-disc">
                        {Object.values(errors).map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </div>
            )}

            <div className="mb-5 flex flex-col items-center gap-2">
                <StarRating rating={data.rating} setRating={(rating) => setData('rating', rating)} size={32} />
                <span className={`text-sm font-bold transition-colors duration-300 ${
                    data.rating >= 4 ? 'text-green-600' : data.rating === 3 ? 'text-yellow-600' : 'text-red-500'
                }`}>
                    {data.rating === 5 ? 'Excellent!' :
                        data.rating === 4 ? 'Very Good' :
                        data.rating === 3 ? 'Good' :
                        data.rating === 2 ? 'Fair' : 'Poor'}
                </span>
            </div>

            <div className="relative mb-4">
                <textarea
                    value={data.comment}
                    onChange={(e) => setData('comment', e.target.value)}
                    placeholder="Share your experience with this product..."
                    className="min-h-[100px] w-full resize-y rounded-xl border-gray-200 p-3 text-sm shadow-sm focus:border-clay-500 focus:ring-clay-500"
                />
                <div className="absolute bottom-2 right-2 text-[10px] font-medium text-gray-400">
                    {data.comment.length}/1000
                </div>
            </div>

            <div className="mb-4">
                <p className="mb-2 text-xs font-bold text-gray-500">Add Photos (Max 5)</p>
                <div className="flex flex-wrap gap-2">
                    {previewUrls.map((url, idx) => (
                        <div key={`${url}-${idx}`} className="group relative h-20 w-20 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                            <img src={url} alt="Preview" className="h-full w-full object-cover" />
                            {url.startsWith('blob:') && (
                                <button
                                    type="button"
                                    onClick={() => removePhoto(idx)}
                                    className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    ))}

                    {previewUrls.length < 5 && (
                        <label
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handlePhotoChange(e); }}
                            className={`
                                flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200
                                ${isDragging
                                    ? 'scale-105 border-clay-500 bg-clay-50 text-clay-600'
                                    : 'border-gray-300 text-gray-400 hover:border-clay-400 hover:bg-gray-50 hover:text-clay-500'}
                            `}
                        >
                            <ImageIcon size={20} />
                            <span className="mt-1 text-[10px] font-bold">Add</span>
                            <input type="file" multiple accept="image/*" onChange={handlePhotoChange} className="hidden" />
                        </label>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200/50 pt-3">
                {isEditing && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting || processing}
                        className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                        <Trash2 size={16} />
                        {deleting ? 'Deleting...' : 'Delete Review'}
                    </button>
                )}
                <button
                    type="submit"
                    disabled={processing || deleting}
                    className="flex items-center gap-2 rounded-xl bg-clay-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-clay-200 transition-all hover:-translate-y-0.5 hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {processing ? (
                        <>Processing...</>
                    ) : (
                        <>
                            {isEditing ? <Pencil size={16} /> : <Send size={16} />}
                            {isEditing ? 'Update Review' : 'Submit Review'}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default function RatingModal({ isOpen, onClose, order }) {
    const [activeItemId, setActiveItemId] = useState(null);

    if (!order) return null;

    const sortedItems = [...order.items].sort((a, b) => {
        const aPriority = a.is_rated ? 1 : 0;
        const bPriority = b.is_rated ? 1 : 0;

        return aPriority - bPriority;
    });

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="lg">
            <div className="flex max-h-[85vh] flex-col">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white p-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Rate Your Order</h2>
                        <p className="text-xs text-gray-500">Order #{order.order_number || order.id}</p>
                    </div>
                    <button onClick={onClose} className="rounded-full bg-gray-50 p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="custom-scrollbar overflow-y-auto p-6">
                    <p className="mb-6 text-sm text-gray-600">
                        Rate unrated items here, or update and delete your existing reviews anytime.
                    </p>

                    <div className="space-y-6">
                        {sortedItems.map((item) => {
                            const canManageReview = Boolean(item.review?.can_manage_review);
                            const isEditingItem = activeItemId === item.id;

                            return (
                                <div key={item.id} className="group">
                                    <div className={`flex items-start gap-4 rounded-2xl p-4 transition-colors duration-200 ${
                                        isEditingItem ? 'bg-white' : 'border border-transparent bg-white hover:border-gray-100 hover:bg-gray-50'
                                    }`}>
                                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                                            <img
                                                src={item.img}
                                                alt={item.name}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="truncate text-sm font-bold text-gray-900">{item.name}</h3>
                                                    <p className="text-xs text-gray-500">{item.variant}</p>
                                                </div>
                                                <p className="text-xs font-bold text-clay-700">PHP {Number(item.price).toLocaleString()}</p>
                                            </div>

                                            {!item.is_rated && !isEditingItem && (
                                                <button
                                                    onClick={() => setActiveItemId(item.id)}
                                                    className="mt-3 rounded-lg bg-clay-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-clay-700"
                                                >
                                                    Write a Review
                                                </button>
                                            )}

                                            {canManageReview && !isEditingItem && (
                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                    <span className="rounded-lg border border-clay-100 bg-clay-50 px-3 py-1 text-[11px] font-bold text-clay-700">
                                                        Review saved
                                                    </span>
                                                    <button
                                                        onClick={() => setActiveItemId(item.id)}
                                                        className="rounded-lg border border-clay-200 bg-white px-4 py-2 text-xs font-bold text-clay-700 shadow-sm transition hover:bg-clay-50"
                                                    >
                                                        {item.is_rated ? 'Edit Review' : 'Write Review'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {isEditingItem && (
                                        <div className="mb-6 ml-8 -mt-2 border-l-2 border-clay-200 pl-4">
                                            <ReviewForm
                                                item={item}
                                                onSuccess={() => setActiveItemId(null)}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-center rounded-b-lg border-t border-gray-100 bg-gray-50 p-4">
                    <button
                        onClick={onClose}
                        className="text-sm font-bold text-gray-500 transition-colors hover:text-gray-800"
                    >
                        Done
                    </button>
                </div>
            </div>
        </Modal>
    );
}

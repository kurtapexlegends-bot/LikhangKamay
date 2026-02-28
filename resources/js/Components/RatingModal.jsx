import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { Star,  Image as ImageIcon, X, Send, Loader2, Trash2 } from 'lucide-react';

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
    const { data, setData, post, processing, errors, reset } = useForm({
        product_id: item.product_id,
        rating: 5,
        comment: '',
        photos: []
    });

    const [previewUrls, setPreviewUrls] = useState([]);
    const [isDragging, setIsDragging] = useState(false);

    const handlePhotoChange = (e) => {
        const files = Array.from(e.target.files || e.dataTransfer.files);
        if (files.length > 0) {
            const newPhotos = [...data.photos, ...files].slice(0, 5); // Limit to 5 photos
            setData('photos', newPhotos);
            
            // Generate previews for new photos
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...newPreviews].slice(0, 5));
        }
    };

    const removePhoto = (index) => {
        const newPhotos = [...data.photos];
        newPhotos.splice(index, 1);
        setData('photos', newPhotos);

        const newPreviews = [...previewUrls];
        URL.revokeObjectURL(newPreviews[index]); // Cleanup
        newPreviews.splice(index, 1);
        setPreviewUrls(newPreviews);
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('reviews.store'), {
            forceFormData: true,
            onSuccess: () => {
                reset();
                onSuccess();
            },
            preserveScroll: true
        });
    };

    return (
        <form onSubmit={submit} className="mt-4 p-5 bg-gray-50/80 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gray-900 text-sm">Reviewing <span className="text-clay-700">"{item.name}"</span></h4>
                {processing && <Loader2 size={16} className="animate-spin text-clay-600" />}
            </div>
            
            {/* Global Errors */}
            {Object.keys(errors).length > 0 && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 animate-pulse">
                    <p className="font-bold mb-1">Please fix the following errors:</p>
                    <ul className="list-disc list-inside">
                        {Object.values(errors).map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </div>
            )}

            {/* Star Rating */}
            <div className="flex flex-col items-center gap-2 mb-5">
                <StarRating rating={data.rating} setRating={(r) => setData('rating', r)} size={32} />
                <span className={`text-sm font-bold transition-colors duration-300 ${
                    data.rating >= 4 ? 'text-green-600' : data.rating === 3 ? 'text-yellow-600' : 'text-red-500'
                }`}>
                    {data.rating === 5 ? 'Excellent!' : 
                     data.rating === 4 ? 'Very Good' : 
                     data.rating === 3 ? 'Good' : 
                     data.rating === 2 ? 'Fair' : 'Poor'}
                </span>
            </div>

            {/* Comment */}
            <div className="mb-4 relative">
                <textarea
                    value={data.comment}
                    onChange={e => setData('comment', e.target.value)}
                    placeholder="Share your experience with this product..."
                    className="w-full rounded-xl border-gray-200 focus:border-clay-500 focus:ring-clay-500 text-sm p-3 min-h-[100px] shadow-sm resize-y"
                />
                <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 font-medium">
                    {data.comment.length}/1000
                </div>
            </div>

            {/* Photos Drag & Drop */}
            <div className="mb-4">
                <p className="text-xs font-bold text-gray-500 mb-2">Add Photos (Max 5)</p>
                <div className="flex flex-wrap gap-2">
                    {previewUrls.map((url, idx) => (
                        <div key={idx} className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 relative group shadow-sm">
                            <img src={url} alt="Preview" className="w-full h-full object-cover" />
                            <button 
                                type="button"
                                onClick={() => removePhoto(idx)}
                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                    
                    {previewUrls.length < 5 && (
                        <label 
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handlePhotoChange(e); }}
                            className={`
                                w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200
                                ${isDragging 
                                    ? 'border-clay-500 bg-clay-50 text-clay-600 scale-105' 
                                    : 'border-gray-300 text-gray-400 hover:border-clay-400 hover:text-clay-500 hover:bg-gray-50'}
                            `}
                        >
                            <ImageIcon size={20} />
                            <span className="text-[10px] mt-1 font-bold">Add</span>
                            <input type="file" multiple accept="image/*" onChange={handlePhotoChange} className="hidden" />
                        </label>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200/50">
                <button
                    type="submit"
                    disabled={processing}
                    className="px-6 py-2.5 bg-clay-600 text-white rounded-xl text-sm font-bold hover:bg-clay-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-clay-200 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                    {processing ? (
                        <>Processing...</>
                    ) : (
                        <>
                            <Send size={16} /> Submit Review
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default function RatingModal({ isOpen, onClose, order }) {
    const [activeItemId, setActiveItemId] = useState(null);

    // Filter items? No, showing all is better context.
    
    if (!order) return null;

    // Sort items: Unrated first
    const sortedItems = [...order.items].sort((a, b) => (a.is_rated === b.is_rated) ? 0 : a.is_rated ? 1 : -1);

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="lg">
            <div className="flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Rate Your Order</h2>
                        <p className="text-xs text-gray-500">Order #{order.order_number || order.id}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <p className="text-sm text-gray-600 mb-6">
                        Tell us about your purchase! Your feedback helps us and other buyers.
                    </p>

                    <div className="space-y-6">
                        {sortedItems.map((item) => (
                            <div key={item.id} className="group">
                                <div className={`flex items-start gap-4 p-4 rounded-2xl transition-colors duration-200 ${
                                    activeItemId === item.id ? 'bg-white' : 'bg-white hover:bg-gray-50 border border-transparent hover:border-gray-100'
                                }`}>
                                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 shrink-0 shadow-sm">
                                        <img 
                                            src={item.img} 
                                            alt={item.name} 
                                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" 
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-sm truncate">{item.name}</h3>
                                                <p className="text-xs text-gray-500">{item.variant}</p>
                                            </div>
                                            <p className="text-xs font-bold text-clay-700">₱{Number(item.price).toLocaleString()}</p>
                                        </div>
                                        
                                        {item.is_rated ? (
                                            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-100">
                                                <Star size={12} className="fill-green-700" strokeWidth={0} /> 
                                                <span>You rated this item</span>
                                            </div>
                                        ) : (
                                            activeItemId !== item.id && (
                                                <button 
                                                    onClick={() => setActiveItemId(item.id)}
                                                    className="mt-3 text-xs font-bold text-white bg-clay-600 hover:bg-clay-700 px-4 py-2 rounded-lg shadow-sm transition-all hover:-translate-y-0.5"
                                                >
                                                    Write a Review
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Review Form Expansion */}
                                {activeItemId === item.id && !item.is_rated && (
                                    <div className="border-l-2 border-clay-200 pl-4 ml-8 -mt-2 mb-6">
                                        <ReviewForm 
                                            item={item} 
                                            onSuccess={() => setActiveItemId(null)}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-lg flex justify-center">
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 text-sm font-bold transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </Modal>
    );
}

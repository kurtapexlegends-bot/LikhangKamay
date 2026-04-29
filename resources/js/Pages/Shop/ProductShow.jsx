import React, { lazy, useEffect, useMemo, useState, Suspense } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import ShopLayout from '@/Layouts/ShopLayout';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import {
    Star, MapPin, Truck, ShieldCheck, Minus, Plus, Box, Image as ImageIcon,
    Heart, ChevronRight, Check, Pin,
    Clock, ShoppingCart, MessageCircle, Store, Award, Package, Crown, Pencil, Trash2, Loader2, History
} from 'lucide-react';
import { normalizeRating, hasRating, formatRating } from '@/utils/rating';
import { getRecentlyViewedProducts, isProductWishlisted, rememberViewedProduct, toggleWishlistedProduct } from '@/utils/buyerSignals';

import { useToast } from '@/Components/ToastContext';

const ProductViewer3D = lazy(() => import('@/Components/ProductViewer3D'));



export default function ProductShow({ product, relatedProducts = [], auth }) {
    const { addToast } = useToast();
    const productRating = normalizeRating(product?.rating);
    const currentUserReview = auth?.user
        ? product?.reviews?.find((review) => Number(review.user_id) === Number(auth.user.id)) || null
        : null;
    const canWriteReview = Boolean(currentUserReview || product.viewer_can_review);
    const currentReviewPhotos = (currentUserReview?.photos || []).map((photo) =>
        photo?.startsWith?.('http') || photo?.startsWith?.('/storage') ? photo : `/storage/${photo}`
    );
    
    const [viewMode, setViewMode] = useState('image');
    const [quantity, setQuantity] = useState(1);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [addedToCart, setAddedToCart] = useState(false);
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [recentlyViewed, setRecentlyViewed] = useState([]);
    const [deletingReview, setDeletingReview] = useState(false);
    const [reviewPhotoPreviewUrls, setReviewPhotoPreviewUrls] = useState([]);
    
    const isPendingArtisan = auth?.user?.role === 'artisan' && auth?.user?.artisan_status === 'pending';
    
    const chatRequirementMessage = !auth?.user
        ? 'Log in as a buyer first.'
        : auth.user.role && auth.user.role !== 'buyer'
            ? 'Buyer accounts only.'
            : product?.viewer_can_chat_seller
                ? ''
                : 'Chat opens after your first order.';

    // Build gallery
    const gallery = [
        product.image || product.img,
        ...(product.gallery_paths || []).map(path => `/storage/${path}`)
    ].filter(Boolean);

    // Review Form
    const { data, setData, post, processing, errors, reset, transform } = useForm({
        product_id: product.id,
        rating: currentUserReview?.rating || 5,
        comment: currentUserReview?.comment || '',
        photos: [],
    });

    useEffect(() => {
        if (!data.photos?.length) {
            setReviewPhotoPreviewUrls([]);
            return;
        }

        const nextUrls = data.photos.map((file) => URL.createObjectURL(file));
        setReviewPhotoPreviewUrls(nextUrls);

        return () => {
            nextUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [data.photos]);

    useEffect(() => {
        setIsWishlisted(isProductWishlisted(product.id));
        rememberViewedProduct(product);
        setRecentlyViewed(
            getRecentlyViewedProducts().filter((entry) => Number(entry.id) !== Number(product.id)).slice(0, 4)
        );
    }, [product]);

    const wishlistLabel = useMemo(() => (isWishlisted ? 'Saved' : 'Save'), [isWishlisted]);

    const submitReview = (e) => {
        e.preventDefault();
        const options = {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                if (currentUserReview) {
                    reset('photos');
                    return;
                }

                reset('comment', 'photos');
            },
        };

        if (currentUserReview) {
            transform((payload) => ({
                ...payload,
                _method: 'patch',
            }));
            post(route('reviews.update', currentUserReview.id), options);
            return;
        }

        transform((payload) => payload);
        post(route('reviews.store'), options);
    };

    const handleDeleteReview = () => {
        if (!currentUserReview) return;

        router.delete(route('reviews.destroy', currentUserReview.id), {
            preserveScroll: true,
            onStart: () => setDeletingReview(true),
            onFinish: () => setDeletingReview(false),
        });
    };

    const addToCart = () => {
        setIsAddingToCart(true);
        router.post(route('cart.store'), { 
            product_id: product.id,
            quantity: quantity 
        }, {
            preserveScroll: true,
            preserveState: true,
            only: ['cartCount', 'flash', 'errors'],
            onSuccess: () => {
                setAddedToCart(true);
                addToast('Added to cart.', 'success');
                setTimeout(() => setAddedToCart(false), 2000);
            },
            onError: () => {
                addToast("Failed to add to cart.", 'error');
            },
            onFinish: () => setIsAddingToCart(false),
        });
    };

    const handleBuyNow = () => {
        router.visit(route('checkout.create'), {
            data: { 
                product_id: product.id,
                quantity: quantity
            }
        });
    };

    const handleChatSeller = () => {
        const sellerId = product?.seller?.id;

        if (!sellerId) {
            addToast('Seller chat is unavailable right now.', 'error');
            return;
        }

        if (!auth?.user) {
            router.visit(route('login'));
            return;
        }

        if (product?.viewer_can_chat_seller) {
            router.visit(route('buyer.chat', { user_id: sellerId }));
            return;
        }

        if (isPendingArtisan) {
            addToast('Chat is disabled while your shop is pending approval.', 'info');
            return;
        }

        if (auth.user.role && auth.user.role !== 'buyer') {
            addToast('This chat is only available from a buyer account.', 'info');
            return;
        }

        addToast('You can chat this seller after your first order with them.', 'info');
    };

    const handleWishlistToggle = () => {
        const nextWishlisted = toggleWishlistedProduct(product);
        setIsWishlisted(nextWishlisted);
        addToast(
            nextWishlisted ? 'Saved to your wishlist. Open Saved to view it.' : 'Removed from your wishlist.',
            'success',
        );
    };

    return (
        <ShopLayout>
            <Head title={product.name} />

            <div className="max-w-6xl mx-auto px-3 py-3 pb-28 sm:px-4 sm:py-4 sm:pb-4">
                
                {/* Breadcrumb - Compact */}
                <nav className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400 mb-4">
                    <Link href="/" className="hover:text-clay-600">Home</Link>
                    <ChevronRight size={12} />
                    <Link href={route('shop.index')} className="hover:text-clay-600">Shop</Link>
                    <ChevronRight size={12} />
                    <Link href={route('shop.index', { category: product.category })} className="hover:text-clay-600">
                        {product.category}
                    </Link>
                    <ChevronRight size={12} />
                    <span className="text-gray-600 truncate max-w-[150px]">{product.name}</span>
                </nav>

                {/* Main Content Card */}
                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm sm:rounded-2xl">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                        
                        {/* ========== LEFT: IMAGE GALLERY ========== */}
                        <div className="p-3.5 sm:p-4 lg:col-span-5 lg:border-r lg:border-gray-100">
                            
                            {/* Main Image */}
                            <div className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden mb-3">
                                {viewMode === 'image' ? (
                                    <img
                                        src={gallery[activeImageIndex] || '/images/no-image.png'}
                                        alt={product.name}
                                        onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Suspense fallback={<div className="flex h-full items-center justify-center bg-gradient-to-b from-gray-50 to-white text-sm font-medium text-gray-500">Loading 3D view...</div>}>
                                        <ProductViewer3D
                                            modelUrl={product.model_url}
                                            productName={product.name}
                                            compact
                                            className="h-full rounded-none border-0 bg-gradient-to-b from-gray-50 to-white"
                                        />
                                    </Suspense>
                                )}

                                {/* View Toggle */}
                                {product.has3D && (
                                    <div className="absolute top-3 right-3 flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <button
                                            onClick={() => setViewMode('image')}
                                            aria-label="Show product images"
                                            title="Show product images"
                                            className={`px-3 py-2 text-xs font-bold transition ${
                                                viewMode === 'image' ? 'bg-clay-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                                            }`}
                                        >
                                            <ImageIcon size={14} />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('3d')}
                                            aria-label="Show 3D product view"
                                            title="Show 3D product view"
                                            className={`px-3 py-2 text-xs font-bold transition ${
                                                viewMode === '3d' ? 'bg-clay-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                                            }`}
                                        >
                                            <Box size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Thumbnails */}
                            <div className="flex gap-2 overflow-x-auto px-0.5 pb-1.5">
                                {gallery.map((img, index) => (
                                    <button
                                        key={index}
                                        onClick={() => { setActiveImageIndex(index); setViewMode('image'); }}
                                        aria-label={`Show product image ${index + 1}`}
                                        title={`Show product image ${index + 1}`}
                                        className={`flex-shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm ${
                                            activeImageIndex === index && viewMode === 'image'
                                                ? 'border-clay-600'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <img
                                            src={img}
                                            alt=""
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                        />
                                    </button>
                                ))}
                                {product.has3D && (
                                    <button
                                        onClick={() => setViewMode('3d')}
                                        aria-label="Show 3D product view"
                                        title="Show 3D product view"
                                        className={`flex-shrink-0 w-16 h-16 rounded-xl border-2 flex items-center justify-center transition ${
                                            viewMode === '3d' ? 'border-clay-600 bg-clay-50' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <Box size={20} className="text-gray-400" />
                                    </button>
                                )}
                            </div>

                            {/* Wishlist */}
                            <div className="flex items-center justify-end mt-4 pt-4 border-t border-gray-100">
                                <button
                                    onClick={handleWishlistToggle}
                                    aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                                        isWishlisted ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:text-red-500'
                                    }`}
                                >
                                    <Heart size={14} className={isWishlisted ? 'fill-current' : ''} />
                                    {wishlistLabel}
                                </button>
                            </div>
                        </div>

                        {/* ========== RIGHT: PRODUCT INFO ========== */}
                        <div className="p-3.5 sm:p-5 lg:col-span-7">
                            
                            {/* Title */}
                            <h1 className="text-xl font-bold text-gray-900 leading-tight mb-1.5">
                                {product.name}
                            </h1>

                            {/* Rating & Sold */}
                            <div className="flex flex-wrap items-center gap-2.5 text-xs mb-3">
                                <div className="flex items-center gap-1">
                                    <span className="text-clay-600 font-bold underline">{productRating}</span>
                                    <div className="flex flex-col gap-1 sm:flex-row sm:gap-0">
                                        {[1,2,3,4,5].map(s => (
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

                            {/* Specifications - Compact Grid */}
                            <div className="space-y-2 mb-4 text-xs">
                                {product.clay_type && (
                                    <div className="flex">
                                        <span className="w-full sm:w-24 text-gray-400 font-semibold flex-shrink-0 uppercase tracking-wide pt-0.5">Material</span>
                                        <span className="text-gray-700 font-medium">{product.clay_type}</span>
                                    </div>
                                )}
                                {product.glaze_type && (
                                    <div className="flex flex-col gap-1 sm:flex-row sm:gap-0">
                                        <span className="w-full sm:w-24 text-gray-400 font-semibold flex-shrink-0 uppercase tracking-wide pt-0.5">Finish</span>
                                        <span className="text-gray-700 font-medium">{product.glaze_type}</span>
                                    </div>
                                )}
                                {(product.height > 0 || product.width > 0) && (
                                    <div className="flex flex-col gap-1 sm:flex-row sm:gap-0">
                                        <span className="w-full sm:w-24 text-gray-400 font-semibold flex-shrink-0 uppercase tracking-wide pt-0.5">Dimensions</span>
                                        <span className="text-gray-700 font-medium">{product.height || 0}"H x {product.width || 0}"W</span>
                                    </div>
                                )}
                                {product.firing_method && (
                                    <div className="flex flex-col gap-1 sm:flex-row sm:gap-0">
                                        <span className="w-full sm:w-24 text-gray-400 font-semibold flex-shrink-0 uppercase tracking-wide pt-0.5">Firing</span>
                                        <span className="text-gray-700 font-medium">{product.firing_method}</span>
                                    </div>
                                )}
                                {product.food_safe && (
                                    <div className="flex flex-col gap-1 sm:flex-row sm:gap-0">
                                        <span className="w-full sm:w-24 text-gray-400 font-semibold flex-shrink-0 uppercase tracking-wide pt-0.5">Food Safe</span>
                                        <span className="text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded-full text-[10px]">
                                            <Check size={10} /> Yes
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Quantity */}
                            <div className="mb-5 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide w-full sm:w-24 flex-shrink-0">Quantity</span>
                                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                                    <div className="flex items-center">
                                        <button
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            aria-label="Decrease quantity"
                                            className="flex h-9 w-9 items-center justify-center rounded-l-lg border border-gray-200 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/20 sm:h-8 sm:w-8"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="flex h-9 w-12 items-center justify-center border-y border-gray-200 text-sm font-bold text-gray-900 sm:h-8 sm:w-10 sm:text-xs">
                                            {quantity}
                                        </span>
                                        <button
                                            onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                                            aria-label="Increase quantity"
                                            className="flex h-9 w-9 items-center justify-center rounded-r-lg border border-gray-200 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/20 sm:h-8 sm:w-8"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <span className="text-[11px] font-medium text-gray-500 sm:ml-3">{product.stock || 0} in stock</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="mb-6 hidden gap-3 sm:flex sm:flex-row">
                                {isPendingArtisan ? (
                                    <div className="flex w-full items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-[13px] font-bold text-amber-700 shadow-sm">
                                        Purchasing is disabled while your shop application is under review.
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={addToCart}
                                            disabled={product.stock === 0 || isAddingToCart}
                                            className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border-2 border-clay-600 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 ${
                                                addedToCart
                                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                                    : 'bg-white text-clay-600 hover:bg-clay-50'
                                            } disabled:cursor-not-allowed disabled:opacity-50`}
                                        >
                                            {isAddingToCart ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : addedToCart ? (
                                                <><Check size={16} /> Added!</>
                                            ) : (
                                                <><ShoppingCart size={16} /> Add To Cart</>
                                            )}
                                        </button>
                                        <button
                                            onClick={handleBuyNow}
                                            disabled={product.stock === 0}
                                            className="h-10 flex-1 rounded-lg bg-clay-600 text-sm font-bold text-white shadow-sm shadow-clay-200 transition-colors hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Buy Now
                                        </button>
                                    </>
                                )}
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
                    </div>
                </div>

                {/* ========== SELLER CARD & DESCRIPTION IN ONE ROW ========== */}
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
                    
                    {/* Seller Card (Left Col) */}
                    <div className="flex h-full flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <UserAvatar user={product.seller} className="w-12 h-12 text-xl" />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 text-base truncate flex items-center gap-1.5">
                                        {product.seller?.shop_name || product.seller?.name || 'Artisan'}
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
                                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 ${
                                    product?.viewer_can_chat_seller
                                        ? 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                                        : 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                }`}
                            >
                                <MessageCircle size={14} />
                                {product?.viewer_can_chat_seller ? 'Chat' : 'Chat Policy'}
                            </button>
                            <Link href={route('shop.seller', product.seller?.slug || '#')} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-clay-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30">
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
                            <p className="whitespace-pre-line">
                                {product.description || "A beautifully handcrafted piece made with care and traditional techniques by a skilled Filipino artisan. Each piece is unique and may have slight variations that add to its character."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ========== REVIEWS ========== */}
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
                                                        {[1,2,3,4,5].map(s => (
                                                            <Star key={s} size={10} className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
                                                        ))}
                                                    </div>
                                                    <span className="text-[10px] text-gray-400">
                                                        {new Date(review.created_at).toLocaleDateString('en-PH')}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-700 mt-1.5">{review.comment}</p>
                                                
                                                {/* Photos Grid */}
                                                {review.photos && review.photos.length > 0 && (
                                                    <div className="flex gap-2 mt-2">
                                                        {review.photos.map((photo, i) => (
                                                            <div key={i} className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 cursor-pointer hover:opacity-90 transition">
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
                                                    {[1,2,3,4,5].map((star) => (
                                                        <button
                                                            key={star}
                                                            type="button"
                                                            onClick={() => setData('rating', star)}
                                                            aria-label={`Set rating to ${star} star${star > 1 ? 's' : ''}`}
                                                            className="focus:outline-none"
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
                                                <p className="text-[11px] text-gray-400">Upload new photos only if you want to replace the current ones.</p>
                                            )}
                                            </div>
                                            <div className="flex gap-2">
                                                {currentUserReview && (
                                                    <button
                                                        type="button"
                                                        onClick={handleDeleteReview}
                                                        aria-label="Delete your review"
                                                        disabled={deletingReview || processing}
                                                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded border border-red-200 bg-red-50 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                                                    >
                                                        <Trash2 size={14} />
                                                        {deletingReview ? 'Deleting...' : 'Delete'}
                                                    </button>
                                                )}
                                                <button
                                                    type="submit"
                                                    disabled={processing || deletingReview}
                                                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded bg-clay-600 py-2 text-xs font-bold text-white transition hover:bg-clay-700 disabled:opacity-50"
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

            </div>

            {recentlyViewed.length > 0 && (
                <div className="max-w-6xl mx-auto px-4 pt-2">
                    <div className="mb-4 flex items-center gap-2">
                        <History size={16} className="text-clay-600" />
                        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-stone-500">Recently Viewed</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {recentlyViewed.map((entry) => (
                            <Link
                                key={entry.id}
                                href={route('product.show', entry.slug)}
                                className="group flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition hover:border-clay-300 hover:shadow-md"
                            >
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone-50">
                                    <img
                                        src={entry.image}
                                        alt={entry.name}
                                        className="h-full w-full object-cover"
                                        onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/no-image.png'; }}
                                    />
                                </div>
                                <div className="min-w-0">
                                    <p className="line-clamp-2 text-xs font-semibold text-stone-900 transition group-hover:text-clay-700">{entry.name}</p>
                                    <p className="mt-1 text-[11px] text-stone-500">{entry.sellerName}</p>
                                    <p className="mt-1 text-xs font-bold text-clay-700">PHP {Number(entry.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* ========== RELATED PRODUCTS ========== */}
            {relatedProducts.length > 0 && (
                <div className="max-w-6xl mx-auto px-4 py-6 mb-8">
                    <h2 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl mb-4 flex flex-col items-center gap-2 text-center">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-clay-500">Related Pieces</span>
                        You Might Also Like
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-8">
                        {relatedProducts.map((related) => (
                            <Link 
                                href={route('product.show', related.slug)} 
                                key={related.id} 
                                className="group flex flex-col overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-clay-300 hover:shadow-md"
                            >
                                <div className="aspect-square relative overflow-hidden bg-[#FDFBF9]">
                                    <img 
                                        src={related.image ? (related.image.startsWith('http') || related.image.startsWith('/storage') ? related.image : `/storage/${related.image}`) : '/images/no-image.png'} 
                                        alt={related.name}
                                        className="absolute inset-0 block h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                                        onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                    />
                                    {hasRating(related.rating) && (
                                        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur shadow-sm text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 border border-stone-100">
                                            {formatRating(related.rating)} <Star size={10} className="fill-amber-400 text-amber-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between border-t border-stone-100/50">
                                    <h3 className="text-[13px] font-medium text-stone-800 line-clamp-2 leading-snug group-hover:text-clay-700 transition">
                                        {related.name}
                                    </h3>
                                    <div className="flex flex-wrap items-center justify-between gap-1 mt-3 pt-3 border-t border-stone-100/60">
                                        <span className="text-clay-800 font-bold text-sm sm:text-[15px]">
                                            PHP {Number(related.price).toLocaleString()}
                                        </span>
                                        {related.sold > 0 && (
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded">{related.sold} sold</span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
                <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-3 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
                    <div className="mx-auto flex max-w-6xl items-center gap-2.5">
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">Price</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-sm font-bold text-clay-700">
                                    PHP {Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-[11px] font-medium text-stone-500">Qty {quantity}</span>
                            </div>
                        </div>
                        {isPendingArtisan ? (
                            <div className="flex h-11 flex-1 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-[13px] font-bold text-amber-700">
                                Disabled for pending shops
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={addToCart}
                                    disabled={product.stock === 0 || isAddingToCart}
                                    className={`flex h-11 items-center justify-center gap-2 rounded-xl border-2 px-4 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 ${
                                        addedToCart
                                            ? 'border-emerald-500 bg-emerald-500 text-white'
                                            : 'border-clay-600 bg-white text-clay-600'
                                    } disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                    {isAddingToCart ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={15} />}
                                </button>
                                <button
                                    onClick={handleBuyNow}
                                    disabled={product.stock === 0}
                                    className="flex h-11 flex-[1.4] items-center justify-center rounded-xl bg-clay-600 px-4 text-sm font-bold text-white shadow-sm shadow-clay-200 transition-colors hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Buy Now
                                </button>
                            </>
                        )}
                    </div>
                </div>
        </ShopLayout>
    );
}

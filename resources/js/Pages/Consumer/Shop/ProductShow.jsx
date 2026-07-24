import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import ShopLayout from '@/Layouts/ShopLayout';
import Modal from '@/Components/Modal';
import StickyActionBar from '@/Components/StickyActionBar';
import { ChevronRight, ChevronLeft, ShoppingCart, Loader2, MessageCircle } from 'lucide-react';

import { normalizeRating } from '@/utils/rating';
import { getRecentlyViewedProducts, isProductWishlisted, rememberViewedProduct, toggleWishlistedProduct } from '@/utils/buyerSignals';
import { useToast } from '@/Components/ToastContext';

// Extracted Subcomponents
import ProductImageGallery from '@/Components/Consumer/Shop/ProductShow/ProductImageGallery';
import ProductDetailsCard from '@/Components/Consumer/Shop/ProductShow/ProductDetailsCard';
import ProductActionsPanel from '@/Components/Consumer/Shop/ProductShow/ProductActionsPanel';
import ProductReviewsSection from '@/Components/Consumer/Shop/ProductShow/ProductReviewsSection';
import RecentlyViewedGrid from '@/Components/Consumer/Shop/ProductShow/RecentlyViewedGrid';
import RelatedProductsGrid from '@/Components/Consumer/Shop/ProductShow/RelatedProductsGrid';
import SellerAboutPanel from '@/Components/Consumer/Shop/ProductShow/SellerAboutPanel';

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
    
    // Reporting Logic
    const [isReporting, setIsReporting] = useState(false);
    const { data: reportData, setData: setReportData, post: postReport, processing: reportProcessing, reset: resetReport } = useForm({
        reportable_type: 'App\\Models\\Product',
        reportable_id: product.id,
        reason: '',
    });

    const submitReport = (e) => {
        e.preventDefault();
        postReport(route('report.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setIsReporting(false);
                resetReport();
            }
        });
    };

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
        ...(product.gallery_urls || [])
    ].filter(Boolean);

    // Review Form
    const { data: reviewData, setData: setReviewData, post: postReview, processing: reviewProcessing, errors: reviewErrors, reset: resetReview, transform: transformReview } = useForm({
        product_id: product.id,
        rating: currentUserReview?.rating || 5,
        comment: currentUserReview?.comment || '',
        photos: [],
    });

    useEffect(() => {
        if (!reviewData.photos?.length) {
            setReviewPhotoPreviewUrls([]);
            return;
        }

        const nextUrls = reviewData.photos.map((file) => URL.createObjectURL(file));
        setReviewPhotoPreviewUrls(nextUrls);

        return () => {
            nextUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [reviewData.photos]);

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
                    resetReview('photos');
                    return;
                }
                resetReview('comment', 'photos');
            },
        };

        if (currentUserReview) {
            transformReview((payload) => ({
                ...payload,
                _method: 'patch',
            }));
            postReview(route('reviews.update', currentUserReview.id), options);
            return;
        }

        transformReview((payload) => payload);
        postReview(route('reviews.store'), options);
    };

    const handleDeleteReview = () => {
        if (!currentUserReview) return;

        router.delete(route('reviews.destroy', currentUserReview.id), {
            preserveScroll: true,
            onStart: () => setDeletingReview(true),
            onFinish: () => setDeletingReview(false),
        });
    };

    const addToCart = (e) => {
        if (!auth?.user) {
            router.visit(route('login'));
            return;
        }

        setIsAddingToCart(true);

        const mainImage = document.getElementById('main-product-image');
        const cartIcon = document.getElementById('navbar-cart-icon');

        if (mainImage && cartIcon && window.innerWidth >= 768) {
            const imgRect = mainImage.getBoundingClientRect();
            const cartRect = cartIcon.getBoundingClientRect();

            const clone = mainImage.cloneNode();
            clone.className = 'flying-product-thumbnail';
            
            clone.style.width = `${imgRect.width}px`;
            clone.style.height = `${imgRect.height}px`;
            clone.style.top = `${imgRect.top}px`;
            clone.style.left = `${imgRect.left}px`;
            clone.style.objectFit = 'cover';
            clone.style.borderRadius = '12px';

            document.body.appendChild(clone);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    clone.style.top = `${cartRect.top}px`;
                    clone.style.left = `${cartRect.left}px`;
                    clone.style.width = '24px';
                    clone.style.height = '24px';
                    clone.style.opacity = '0.5';
                    clone.style.transform = 'scale(0.2)';
                });
            });

            setTimeout(() => {
                if (document.body.contains(clone)) {
                    document.body.removeChild(clone);
                }
                window.dispatchEvent(new CustomEvent('cart-add-animate', { detail: { quantity } }));
            }, 800);
        } else if (cartIcon && window.innerWidth < 768) {
            window.dispatchEvent(new CustomEvent('cart-add-animate', { detail: { quantity } }));
        }

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
        if (!auth?.user) {
            router.visit(route('login'));
            return;
        }

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

    const isAdmin = auth?.user?.role === 'super_admin' || auth?.user?.role === 'admin';

    return (
        <ShopLayout>
            <Head title={product.name} />

            <div className="max-w-6xl mx-auto px-3 py-3 pb-28 sm:px-4 sm:py-4 sm:pb-4">
                
                {/* Admin Compliance Back Banner */}
                {isAdmin && (
                    <div className="mb-4 bg-stone-900 border border-stone-850 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                            <div>
                                <p className="text-xs font-black text-white uppercase tracking-wider">Admin Live View</p>
                                <p className="text-[10px] text-stone-400 font-medium mt-0.5">You are previewing this product as an administrator. Compliance status: {product.status || 'Active'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Link 
                                href={route('admin.compliance')} 
                                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-stone-800 text-stone-200 hover:text-white hover:bg-stone-750 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border border-stone-700"
                            >
                                <ChevronLeft size={14} /> Back to Content Safety
                            </Link>
                            <Link 
                                href={route('admin.dashboard')} 
                                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-stone-800 text-stone-200 hover:text-white hover:bg-stone-750 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border border-stone-700"
                            >
                                Admin Panel
                            </Link>
                        </div>
                    </div>
                )}

                {/* Breadcrumb - Compact - Hidden on Mobile */}
                <nav className="hidden sm:flex flex-wrap items-center gap-1.5 text-xs text-gray-400 mb-4">
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
                        <ProductImageGallery 
                            product={product}
                            gallery={gallery}
                            viewMode={viewMode}
                            setViewMode={setViewMode}
                            activeImageIndex={activeImageIndex}
                            setActiveImageIndex={setActiveImageIndex}
                            isWishlisted={isWishlisted}
                            wishlistLabel={wishlistLabel}
                            handleWishlistToggle={handleWishlistToggle}
                            auth={auth}
                            setIsReporting={setIsReporting}
                        />

                        <div className="lg:col-span-7 flex flex-col justify-between">
                            <ProductDetailsCard 
                                product={product}
                                productRating={productRating}
                            />

                            <ProductActionsPanel 
                                product={product}
                                quantity={quantity}
                                setQuantity={setQuantity}
                                isPendingArtisan={isPendingArtisan}
                                auth={auth}
                                addToCart={addToCart}
                                isAddingToCart={isAddingToCart}
                                addedToCart={addedToCart}
                                handleBuyNow={handleBuyNow}
                            />
                        </div>
                    </div>
                </div>

                {/* ========== SELLER CARD & DESCRIPTION ========== */}
                <SellerAboutPanel 
                    product={product}
                    handleChatSeller={handleChatSeller}
                    chatRequirementMessage={chatRequirementMessage}
                />

                {/* ========== REVIEWS ========== */}
                <ProductReviewsSection 
                    product={product}
                    productRating={productRating}
                    auth={auth}
                    currentUserReview={currentUserReview}
                    canWriteReview={canWriteReview}
                    isPendingArtisan={isPendingArtisan}
                    submitReview={submitReview}
                    handleDeleteReview={handleDeleteReview}
                    processing={reviewProcessing}
                    deletingReview={deletingReview}
                    errors={reviewErrors}
                    data={reviewData}
                    setData={setReviewData}
                    reviewPhotoPreviewUrls={reviewPhotoPreviewUrls}
                    currentReviewPhotos={currentReviewPhotos}
                />
            </div>

            {/* ========== RECENTLY VIEWED ========== */}
            <RecentlyViewedGrid recentlyViewed={recentlyViewed} />

            {/* ========== RELATED PRODUCTS ========== */}
            <RelatedProductsGrid relatedProducts={relatedProducts} />

            {/* Mobile Sticky Bar */}
            <div className="md:hidden">
                <StickyActionBar>
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
                    ) : isAdmin ? (
                        <div className="flex h-11 flex-1 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 px-4 text-[13px] font-bold text-stone-700">
                            Disabled for admins
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleChatSeller}
                                aria-label={product?.viewer_can_chat_seller ? 'Open seller chat' : 'View seller chat policy'}
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 ${
                                    product?.viewer_can_chat_seller
                                        ? 'border-stone-200 bg-white text-gray-700 hover:bg-stone-50'
                                        : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                }`}
                            >
                                <MessageCircle size={16} />
                            </button>
                            <button
                                onClick={(e) => addToCart(e)}
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
                                className="flex h-11 items-center justify-center rounded-xl bg-clay-600 px-4 text-sm font-bold text-white shadow-sm shadow-clay-200 transition-colors hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Buy Now
                            </button>
                        </div>
                    )}
                </StickyActionBar>
            </div>

            {/* Reporting Modal */}
            <Modal show={isReporting} onClose={() => setIsReporting(false)} maxWidth="sm">
                <div className="p-6">
                    <h2 className="text-lg font-bold text-stone-900 mb-2">Report Content</h2>
                    <p className="text-sm text-stone-500 mb-4">
                        If you believe this product violates community guidelines, please let us know why.
                    </p>
                    <form onSubmit={submitReport}>
                        <textarea
                            value={reportData.reason}
                            onChange={(e) => setReportData('reason', e.target.value)}
                            placeholder="Explain why you are reporting this product..."
                            required
                            rows={4}
                            className="w-full rounded-xl border-stone-200 focus:ring-red-500 focus:border-red-500 text-sm shadow-sm resize-none mb-4"
                        ></textarea>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsReporting(false)}
                                className="px-4 py-2 rounded-xl text-stone-500 font-bold hover:bg-stone-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={reportProcessing}
                                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 active:scale-95 transition disabled:opacity-50"
                            >
                                {reportProcessing ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
        </ShopLayout>
    );
}

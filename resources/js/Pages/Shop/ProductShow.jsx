import React, { useState, Suspense } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import ShopLayout from '@/Layouts/ShopLayout';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF, Html, useProgress } from '@react-three/drei';
import { 
    Star, MapPin, Truck, ShieldCheck, Minus, Plus, Box, Image as ImageIcon, 
    Rotate3d, Loader2, Heart, ChevronRight, Check,
    Clock, ShoppingCart, MessageCircle, Store, Award, Package
} from 'lucide-react';

// --- Loading Indicator for 3D ---
function Loader() {
    const { progress } = useProgress();
    return (
        <Html center>
            <div className="flex flex-col items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-3 rounded-lg shadow">
                <Loader2 className="w-6 h-6 animate-spin text-clay-600" />
                <span className="text-xs font-medium text-gray-500">{progress.toFixed(0)}%</span>
            </div>
        </Html>
    );
}

// --- 3D Model Component ---
function Model({ url }) {
    if (url) {
        const { scene } = useGLTF(url);
        return <primitive object={scene.clone()} scale={1} />;
    }
    return (
        <mesh castShadow receiveShadow>
            <torusKnotGeometry args={[1, 0.35, 100, 16]} />
            <meshStandardMaterial color="#c07251" roughness={0.4} />
        </mesh>
    );
}

import { useToast } from '@/Components/ToastContext';



export default function ProductShow({ product, relatedProducts = [], auth }) {
    const { addToast } = useToast();
    
    const [viewMode, setViewMode] = useState('image');
    const [quantity, setQuantity] = useState(1);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [addedToCart, setAddedToCart] = useState(false);
    const [isWishlisted, setIsWishlisted] = useState(false);

    // Build gallery
    const gallery = [
        product.image || product.img,
        ...(product.gallery_paths || []).map(path => `/storage/${path}`)
    ].filter(Boolean);

    // Review Form
    const { data, setData, post, processing, reset } = useForm({
        product_id: product.id,
        rating: 5,
        comment: '',
    });

    const submitReview = (e) => {
        e.preventDefault();
        post(route('reviews.store'), {
            onSuccess: () => reset('comment'),
        });
    };

    const addToCart = () => {
        setIsAddingToCart(true);
        router.post(route('cart.store'), { 
            product_id: product.id,
            quantity: quantity 
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setAddedToCart(true);
                addToast("Added to cart successfully!", 'success');
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

    return (
        <ShopLayout>
            <Head title={product.name} />

            <div className="max-w-6xl mx-auto px-4 py-4">
                
                {/* Breadcrumb - Compact */}
                <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                    <Link href="/" className="hover:text-clay-600">Home</Link>
                    <ChevronRight size={12} />
                    <Link href={route('shop.index')} className="hover:text-clay-600">Shop</Link>
                    <ChevronRight size={12} />
                    <Link href={`${route('shop.index')}?category=${product.category}`} className="hover:text-clay-600">
                        {product.category}
                    </Link>
                    <ChevronRight size={12} />
                    <span className="text-gray-600 truncate max-w-[150px]">{product.name}</span>
                </nav>

                {/* Main Content Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                        
                        {/* ========== LEFT: IMAGE GALLERY ========== */}
                        <div className="lg:col-span-5 p-4 border-r border-gray-100">
                            
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
                                    <div className="w-full h-full bg-gradient-to-b from-gray-50 to-white">
                                        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 4], fov: 50 }}>
                                            <Suspense fallback={<Loader />}>
                                                <Stage environment="city" intensity={0.5}>
                                                    <Model url={product.model_url} />
                                                </Stage>
                                                <OrbitControls autoRotate autoRotateSpeed={2} enableZoom={true} />
                                            </Suspense>
                                        </Canvas>
                                        <div className="absolute bottom-3 left-0 right-0 text-center">
                                            <span className="inline-flex items-center gap-1.5 bg-black/50 text-white px-2.5 py-1 rounded-full text-[10px] font-medium">
                                                <Rotate3d size={12} /> Drag to rotate
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* View Toggle */}
                                {product.has3D && (
                                    <div className="absolute top-3 right-3 flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <button
                                            onClick={() => setViewMode('image')}
                                            className={`px-3 py-2 text-xs font-bold transition ${
                                                viewMode === 'image' ? 'bg-clay-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                                            }`}
                                        >
                                            <ImageIcon size={14} />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('3d')}
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
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {gallery.map((img, index) => (
                                    <button
                                        key={index}
                                        onClick={() => { setActiveImageIndex(index); setViewMode('image'); }}
                                        className={`flex-shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden transition ${
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
                                    onClick={() => setIsWishlisted(!isWishlisted)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                                        isWishlisted ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:text-red-500'
                                    }`}
                                >
                                    <Heart size={14} className={isWishlisted ? 'fill-current' : ''} />
                                    {isWishlisted ? 'Saved' : 'Save'}
                                </button>
                            </div>
                        </div>

                        {/* ========== RIGHT: PRODUCT INFO ========== */}
                        <div className="lg:col-span-7 p-6">
                            
                            {/* Title */}
                            <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
                                {product.name}
                            </h1>

                            {/* Rating & Sold */}
                            <div className="flex items-center gap-3 text-sm mb-4">
                                <div className="flex items-center gap-1">
                                    <span className="text-clay-600 font-bold underline">{product.rating || 0}</span>
                                    <div className="flex">
                                        {[1,2,3,4,5].map(s => (
                                            <Star key={s} size={12} className={s <= Math.round(product.rating) ? 'fill-clay-600 text-clay-600' : 'text-gray-300'} />
                                        ))}
                                    </div>
                                </div>
                                <span className="text-gray-300">|</span>
                                <span className="text-gray-500 font-medium">{product.reviews_count || 0} Ratings</span>
                                {product.sold > 0 && (
                                    <>
                                        <span className="text-gray-300">|</span>
                                        <span className="text-gray-500 font-medium">{product.sold} Sold</span>
                                    </>
                                )}
                            </div>

                            {/* Price Box */}
                            <div className="bg-clay-50/50 px-5 py-4 rounded-xl mb-6 border border-clay-100">
                                <span className="text-3xl font-bold text-clay-700">
                                    ₱{Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </span>
                            </div>

                            {/* Specifications - Compact Grid */}
                            <div className="space-y-3 mb-6 text-sm">
                                {product.clay_type && (
                                    <div className="flex">
                                        <span className="w-28 text-gray-400 font-bold flex-shrink-0 uppercase text-xs tracking-wide pt-0.5">Material</span>
                                        <span className="text-gray-700 font-medium">{product.clay_type}</span>
                                    </div>
                                )}
                                {product.glaze_type && (
                                    <div className="flex">
                                        <span className="w-28 text-gray-400 font-bold flex-shrink-0 uppercase text-xs tracking-wide pt-0.5">Finish</span>
                                        <span className="text-gray-700 font-medium">{product.glaze_type}</span>
                                    </div>
                                )}
                                {(product.height > 0 || product.width > 0) && (
                                    <div className="flex">
                                        <span className="w-28 text-gray-400 font-bold flex-shrink-0 uppercase text-xs tracking-wide pt-0.5">Dimensions</span>
                                        <span className="text-gray-700 font-medium">{product.height || 0}"H × {product.width || 0}"W</span>
                                    </div>
                                )}
                                {product.firing_method && (
                                    <div className="flex">
                                        <span className="w-28 text-gray-400 font-bold flex-shrink-0 uppercase text-xs tracking-wide pt-0.5">Firing</span>
                                        <span className="text-gray-700 font-medium">{product.firing_method}</span>
                                    </div>
                                )}
                                {product.food_safe && (
                                    <div className="flex">
                                        <span className="w-28 text-gray-400 font-bold flex-shrink-0 uppercase text-xs tracking-wide pt-0.5">Food Safe</span>
                                        <span className="text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full text-xs">
                                            <Check size={12} /> Yes
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Quantity */}
                            <div className="flex items-center gap-4 mb-6">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide w-28 flex-shrink-0">Quantity</span>
                                <div className="flex items-center">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="w-10 h-10 border border-gray-200 rounded-l-xl flex items-center justify-center hover:bg-gray-50 transition"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span className="w-12 h-10 border-t border-b border-gray-200 flex items-center justify-center text-sm font-bold text-gray-900">
                                        {quantity}
                                    </span>
                                    <button
                                        onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                                        className="w-10 h-10 border border-gray-200 rounded-r-xl flex items-center justify-center hover:bg-gray-50 transition"
                                    >
                                        <Plus size={16} />
                                    </button>
                                    <span className="ml-4 text-xs font-medium text-gray-500">{product.stock || 0} pieces available</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 mb-8">
                                <button
                                    onClick={addToCart}
                                    disabled={product.stock === 0 || isAddingToCart}
                                    className={`flex-1 h-12 border-2 border-clay-600 rounded-xl font-bold flex items-center justify-center gap-2 transition transform active:scale-95 ${
                                        addedToCart
                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : 'bg-white text-clay-600 hover:bg-clay-50'
                                    } disabled:opacity-50`}
                                >
                                    {isAddingToCart ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : addedToCart ? (
                                        <><Check size={20} /> Added!</>
                                    ) : (
                                        <><ShoppingCart size={20} /> Add To Cart</>
                                    )}
                                </button>
                                <button
                                    onClick={handleBuyNow}
                                    disabled={product.stock === 0}
                                    className="flex-1 h-12 bg-clay-600 text-white rounded-xl font-bold hover:bg-clay-700 shadow-lg shadow-clay-200 transition transform active:scale-95 disabled:opacity-50"
                                >
                                    Buy Now
                                </button>
                            </div>

                            {/* Product Info */}
                            <div className="border-t border-gray-100 pt-6 space-y-3 text-sm">
                                <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-xl">
                                    <Package size={20} className="text-clay-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <span className="block text-gray-900 font-bold text-xs uppercase mb-0.5">Fragile Item Handling</span>
                                        <span className="text-gray-600 text-xs">Extra care packaging for safe delivery</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-xl">
                                    <Clock size={20} className="text-clay-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <span className="block text-gray-900 font-bold text-xs uppercase mb-0.5">Lead Time</span>
                                        <span className="text-gray-600 text-xs">{product.lead_time || 3}-{(product.lead_time || 3) + 2} business days</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-xl">
                                    <Award size={20} className="text-clay-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <span className="block text-gray-900 font-bold text-xs uppercase mb-0.5">Authenticity Guaranteed</span>
                                        <span className="text-gray-600 text-xs">100% handmade by verified artisan</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ========== SELLER CARD & DESCRIPTION IN ONE ROW ========== */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                    
                    {/* Seller Card (Left Col) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between h-full">
                        <div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-full border border-gray-100 overflow-hidden flex-shrink-0">
                                    {product.seller?.avatar ? (
                                        <img
                                            src={`/storage/${product.seller.avatar}`}
                                            alt={product.seller?.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-clay-50 flex items-center justify-center text-clay-600 font-bold text-xl uppercase">
                                            {(product.seller?.shop_name || product.seller?.name || 'A').charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 text-lg truncate">
                                        {product.seller?.shop_name || product.seller?.name || 'Artisan'}
                                    </h3>
                                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                                        <MapPin size={14} className="text-gray-400" />
                                        <span className="truncate">{product.seller?.location || 'Philippines'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full mt-4">
                            <button className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition flex items-center justify-center gap-2">
                                <MessageCircle size={16} />
                                Chat
                            </button>
                            <Link href={route('shop.seller', product.seller?.slug || '#')} className="flex-1 px-4 py-2 bg-clay-600 text-white rounded-xl text-sm font-bold hover:bg-clay-700 transition flex items-center justify-center gap-2">
                                <Store size={16} />
                                View Shop
                            </Link>
                        </div>
                    </div>

                    {/* Description (Right Col - 2/3 width) */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            Product Description
                        </h2>
                        <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
                            <p className="whitespace-pre-line">
                                {product.description || "A beautifully handcrafted piece made with care and traditional techniques by a skilled Filipino artisan. Each piece is unique and may have slight variations that add to its character."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ========== REVIEWS ========== */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-6 p-8">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                        <span>Product Ratings ({product.reviews?.length || 0})</span>
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg">
                            <span className="text-xl font-bold text-clay-600">{product.rating || 0}</span>
                            <span className="text-xs text-gray-400 font-bold">/ 5</span>
                        </div>
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Reviews List */}
                        <div className="lg:col-span-2 space-y-6">
                            {product.reviews && product.reviews.length > 0 ? (
                                product.reviews.slice(0, 5).map((review) => (
                                    <div key={review.id} className="border-b border-gray-50 pb-4 last:border-0">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-gray-100">
                                                {review.user?.avatar ? (
                                                    <img
                                                        src={review.user.avatar.startsWith('http') ? review.user.avatar : `/storage/${review.user.avatar}`} 
                                                        alt={review.user.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-clay-100 flex items-center justify-center text-clay-600 font-bold text-xs uppercase">
                                                        {(review.user?.name || 'A').charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900">{review.user?.name || 'Anonymous'}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <div className="flex">
                                                        {[1,2,3,4,5].map(s => (
                                                            <Star key={s} size={10} className={s <= review.rating ? 'fill-clay-600 text-clay-600' : 'text-gray-300'} />
                                                        ))}
                                                    </div>
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(review.created_at).toLocaleDateString('en-PH')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-2">{review.comment}</p>
                                                
                                                {/* Photos Grid */}
                                                {review.photos && review.photos.length > 0 && (
                                                    <div className="flex gap-2 mt-3">
                                                        {review.photos.map((photo, i) => (
                                                            <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-gray-100 cursor-pointer hover:opacity-90 transition">
                                                                <img 
                                                                    src={`/storage/${photo}`} 
                                                                    alt="Review Attachment" 
                                                                    className="w-full h-full object-cover"
                                                                    onClick={() => window.open(`/storage/${photo}`, '_blank')}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <Star size={32} className="text-gray-200 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">No reviews yet</p>
                                </div>
                            )}
                        </div>

                        {/* Write Review */}
                        <div className="lg:col-span-1">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-900 mb-3">Write a Review</h3>
                                
                                {auth?.user ? (
                                    <form onSubmit={submitReview} className="space-y-3">
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Rating</label>
                                            <div className="flex gap-1">
                                                {[1,2,3,4,5].map((star) => (
                                                    <button
                                                        key={star}
                                                        type="button"
                                                        onClick={() => setData('rating', star)}
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
                                            <label className="text-xs text-gray-500 mb-1 block">Add Photos (Max 3)</label>
                                            <input 
                                                type="file" 
                                                multiple 
                                                accept="image/*"
                                                onChange={(e) => setData('photos', Array.from(e.target.files))}
                                                className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-clay-50 file:text-clay-700 hover:file:bg-clay-100 transition"
                                            />
                                            {data.photos && data.photos.length > 0 && (
                                                <div className="flex gap-2 mt-2">
                                                    {data.photos.map((file, i) => (
                                                        <div key={i} className="w-10 h-10 rounded overflow-hidden border border-gray-200">
                                                            <img 
                                                                src={URL.createObjectURL(file)} 
                                                                alt="Preview" 
                                                                className="w-full h-full object-cover" 
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="w-full py-2 bg-clay-600 text-white text-sm font-medium rounded hover:bg-clay-700 transition disabled:opacity-50"
                                        >
                                            {processing ? 'Submitting...' : 'Submit'}
                                        </button>
                                    </form>
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

            {/* ========== RELATED PRODUCTS ========== */}
            {product.relatedProducts && product.relatedProducts.length > 0 && (
                <div className="max-w-6xl mx-auto px-4 py-8 mb-10">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <span className="w-1 h-6 bg-clay-600 rounded-full"></span>
                        You Might Also Like
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {product.relatedProducts.map((related) => (
                            <Link 
                                href={route('product.show', related.slug)} 
                                key={related.id} 
                                className="bg-white rounded-xl border border-gray-100 hover:border-clay-200 hover:shadow-lg transition-all duration-300 group overflow-hidden"
                            >
                                <div className="aspect-square relative bg-gray-50 overflow-hidden">
                                    <img 
                                        src={related.image ? (related.image.startsWith('http') || related.image.startsWith('/storage') ? related.image : `/storage/${related.image}`) : '/images/no-image.png'} 
                                        onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                    />
                                    {related.rating > 0 && (
                                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm">
                                            {Number(related.rating).toFixed(1)} <Star size={10} className="fill-amber-400 text-amber-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-3">
                                    <h3 className="text-sm font-medium text-gray-800 line-clamp-1 group-hover:text-clay-600 transition">
                                        {related.name}
                                    </h3>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-clay-700 font-bold text-sm">
                                            ₱{Number(related.price).toLocaleString()}
                                        </span>
                                        {related.sold > 0 && (
                                            <span className="text-[10px] text-gray-400">{related.sold} sold</span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </ShopLayout>
    );
}
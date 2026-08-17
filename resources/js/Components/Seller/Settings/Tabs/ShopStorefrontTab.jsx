import React, { useState, useRef, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { useToast } from '@/Components/ToastContext';
import { compressImage } from '@/utils/imageCompressor';
import ProductCard from '@/Pages/Consumer/Shop/Partials/ProductCard';
import {
    Camera, Star, Pencil, MapPin, Calendar, Crown, Sparkles, Heart,
    CheckCircle2, AlertCircle, MessageSquare, Package
} from 'lucide-react';

const formatImgUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('/storage')) return path;
    return `/storage/${path}`;
};

export default function ShopStorefrontTab({ sellerOwner, stats, products = [], permissions }) {
    const { addToast } = useToast();
    const canEdit = permissions?.can_edit_shop_settings ?? true;
    const isPremiumOrElite = permissions?.is_premium_tier ?? (sellerOwner?.premium_tier === 'premium' || sellerOwner?.premium_tier === 'super_premium');

    const bannerInputRef = useRef(null);
    const avatarInputRef = useRef(null);

    const [bannerPreview, setBannerPreview] = useState(formatImgUrl(sellerOwner.banner_image));
    const [avatarPreview, setAvatarPreview] = useState(formatImgUrl(sellerOwner.avatar));

    const { data, setData, post, processing, errors } = useForm({
        bio: sellerOwner.bio || '',
        banner_image: null,
        avatar: null,
        auto_reply_on_completion: sellerOwner.auto_reply_on_completion ?? true,
        auto_reply_completion_message: sellerOwner.auto_reply_completion_message || '',
    });

    const revokePreview = (url) => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    };

    useEffect(() => () => {
        revokePreview(avatarPreview);
        revokePreview(bannerPreview);
    }, [avatarPreview, bannerPreview]);

    const handleAvatarChange = async (e) => {
        if (!canEdit) return;
        const file = e.target.files[0];
        if (file) {
            const compressed = await compressImage(file, 800, 800, 0.85);
            setData('avatar', compressed);
            revokePreview(avatarPreview);
            setAvatarPreview(URL.createObjectURL(compressed));
        }
    };

    const handleBannerChange = async (e) => {
        if (!canEdit) return;
        const file = e.target.files[0];
        if (file) {
            const compressed = await compressImage(file, 1920, 1080, 0.85);
            setData('banner_image', compressed);
            revokePreview(bannerPreview);
            setBannerPreview(URL.createObjectURL(compressed));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canEdit) return;
        post(route('shop.settings.update'), {
            preserveScroll: true,
            onSuccess: () => {
                if (addToast) addToast('Shop storefront settings updated.', 'success');
            },
            onError: () => {
                if (addToast) addToast('Failed to update shop settings.', 'error');
            }
        });
    };

    const shopName = sellerOwner.shop_name || sellerOwner.name || 'Your Shop';
    const location = sellerOwner.city || 'Philippines';
    const joinedAt = sellerOwner.created_at
        ? new Date(sellerOwner.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'Recently';
    const bioLength = data.bio?.length || 0;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* EDIT HINT */}
            <div className="flex items-center gap-2 text-xs text-stone-400 font-medium">
                <Pencil className="w-3.5 h-3.5" />
                Click the banner or avatar to edit your buyer-facing storefront.
            </div>

            {/* SELLER PROFILE CARD */}
            <div className="bg-white rounded-[24px] border border-stone-200/80 overflow-hidden shadow-xs">
                {/* Banner Image (Editable with Camera Overlay) */}
                <div
                    className="h-36 md:h-48 relative overflow-hidden bg-stone-100 group cursor-pointer"
                    onClick={() => canEdit && bannerInputRef.current?.click()}
                >
                    {bannerPreview ? (
                        <img 
                            src={bannerPreview} 
                            alt="Shop Banner" 
                            className="w-full h-full object-cover" 
                            onError={() => setBannerPreview(null)}
                        />
                    ) : (
                        <div className="absolute inset-0 bg-stone-800">
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_2px_2px,#fff_1px,transparent_0)] bg-[length:32px_32px]" />
                            <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                            <div className="absolute bottom-0 left-0 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                    {/* Camera Upload Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center gap-2 text-white">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
                                <Camera className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold drop-shadow">Click to change banner</span>
                            <span className="text-xs text-white/70">1200 x 300 recommended • max 5 MB</span>
                        </div>
                    </div>

                    <input
                        ref={bannerInputRef}
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={handleBannerChange}
                    />
                </div>

                {/* Profile Details Header */}
                <div className="px-5 md:px-8 pb-6 flex flex-col md:flex-row items-center md:items-start gap-4 relative z-10 -mt-12">
                    {/* Avatar (Editable with Camera Overlay) */}
                    <div 
                        className="w-24 h-24 min-w-[6rem] min-h-[6rem] aspect-square rounded-full border-4 border-white bg-white shadow-md flex items-center justify-center overflow-hidden flex-none self-start relative z-20 group cursor-pointer"
                        onClick={() => canEdit && avatarInputRef.current?.click()}
                    >
                        {avatarPreview ? (
                            <img 
                                src={avatarPreview} 
                                alt={shopName} 
                                className="w-full h-full object-cover" 
                                onError={() => setAvatarPreview(null)}
                            />
                        ) : (
                            <div className="w-full h-full bg-stone-100 text-stone-600 flex items-center justify-center text-3xl font-bold uppercase">
                                {shopName.charAt(0)}
                            </div>
                        )}

                        {/* Camera Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                            <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        <input
                            ref={avatarInputRef}
                            type="file"
                            className="hidden"
                            accept="image/jpeg,image/png,image/jpg"
                            onChange={handleAvatarChange}
                        />
                    </div>

                    {/* Info & Stats Block */}
                    <div className="flex-1 flex flex-col md:flex-row justify-between w-full md:mt-12 gap-6">
                        <div className="text-center md:text-left flex-1">
                            <div className="mb-1.5 flex flex-col items-center gap-3 md:flex-row md:items-baseline">
                                <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-stone-900 md:text-2xl">
                                    {shopName}
                                    {sellerOwner?.premium_tier === 'premium' && (
                                        <div title="Premium Artisan" className="flex items-center justify-center rounded-full bg-amber-100 p-1.5 text-amber-500 shadow-xs">
                                            <Crown size={16} strokeWidth={3} />
                                        </div>
                                    )}
                                    {sellerOwner?.premium_tier === 'super_premium' && (
                                        <div title="Elite Artisan" className="flex items-center justify-center rounded-full bg-violet-100 p-1.5 text-violet-500 shadow-xs">
                                            <Sparkles size={16} strokeWidth={3} />
                                        </div>
                                    )}
                                </h1>
                                <span className="text-[10px] uppercase font-bold tracking-widest bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full shrink-0">
                                    Verified Artisan
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-bold text-stone-600 shadow-xs">
                                    <Heart size={12} />
                                    Follow Shop
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 text-[12px] text-stone-500 font-medium mb-3">
                                <span className="flex items-center gap-1.5"><MapPin size={15} className="text-stone-400" /> {location}</span>
                                <span className="flex items-center gap-1.5"><Calendar size={15} className="text-stone-400" /> Joined {joinedAt}</span>
                            </div>

                            {/* Bio Textarea */}
                            <div className="relative group/bio max-w-xl">
                                <textarea
                                    value={data.bio}
                                    disabled={!canEdit}
                                    onChange={(e) => setData('bio', e.target.value)}
                                    placeholder="Write your artisan story - buyers love knowing the person behind the craft..."
                                    maxLength={500}
                                    rows={3}
                                    className="w-full text-stone-700 text-[13px] leading-relaxed bg-stone-50/50 border border-stone-200 hover:border-stone-300 focus:border-clay-500 focus:bg-white focus:outline-none rounded-xl px-3 py-2 transition-all resize-none placeholder-stone-400"
                                />
                                <p className="text-right text-[10px] text-stone-400 mt-0.5 pr-0.5">
                                    <span className={bioLength > 450 ? 'text-orange-500 font-semibold' : ''}>{bioLength}</span>/500
                                </p>
                            </div>
                            {errors.bio && (
                                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {errors.bio}
                                </p>
                            )}
                        </div>

                        {/* Stats Badges */}
                        <div className="flex bg-stone-50 rounded-2xl border border-stone-200/80 p-1.5 self-center md:self-start overflow-hidden shrink-0">
                            <div className="px-5 py-2 text-center border-r border-stone-200">
                                <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-0.5">Products</p>
                                <p className="text-xl font-bold text-stone-900">{stats?.products ?? '-'}</p>
                            </div>
                            <div className="px-5 py-2 text-center border-r border-stone-200">
                                <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-0.5">Sales</p>
                                <p className="text-xl font-bold text-stone-900">{stats?.sales ?? '-'}</p>
                            </div>
                            <div className="px-5 py-2 text-center">
                                <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-0.5">Rating</p>
                                <div className="flex items-center justify-center gap-1 text-xl font-bold text-stone-900">
                                    {stats?.rating ?? '-'} <Star size={14} className="fill-amber-400 text-amber-400 -mt-0.5" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Automated Thank You Message Card (Premium / Elite only) */}
            {isPremiumOrElite && (
                <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs space-y-3">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="auto_reply"
                            checked={data.auto_reply_on_completion}
                            onChange={(e) => setData('auto_reply_on_completion', e.target.checked)}
                            disabled={!canEdit}
                            className="rounded border-stone-300 text-clay-600 focus:ring-clay-500"
                        />
                        <label htmlFor="auto_reply" className="text-xs font-bold text-stone-800">
                            Automated Thank-You Message on Order Completion
                        </label>
                    </div>

                    {data.auto_reply_on_completion && (
                        <div>
                            <textarea
                                rows={3}
                                value={data.auto_reply_completion_message}
                                onChange={(e) => setData('auto_reply_completion_message', e.target.value)}
                                disabled={!canEdit}
                                placeholder="Thank you for supporting our artisan craft! We hope you love your handcrafted item..."
                                className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Products Collection Preview */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                            <Package size={16} className="text-clay-600" />
                            Products Collection Preview
                        </h3>
                        <p className="text-xs text-stone-500 font-medium mt-0.5">
                            How your active product catalog appears to buyers visiting your storefront.
                        </p>
                    </div>
                    <a
                        href={route('products.index')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition self-start sm:self-auto"
                    >
                        Manage Products
                    </a>
                </div>

                {products && products.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 pt-2">
                        {products.map((product) => (
                            <ProductCard key={product.id} product={product} previewOnly={true} />
                        ))}
                    </div>
                ) : (
                    <div className="py-8 bg-stone-50/50 rounded-xl border border-dashed border-stone-200 text-center space-y-2">
                        <Package size={24} className="mx-auto text-stone-300" />
                        <p className="text-xs font-bold text-stone-700">No active products yet</p>
                        <p className="text-[11px] text-stone-400">List your handcrafted products to showcase them on your storefront.</p>
                    </div>
                )}
            </div>

            {canEdit && (
                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={processing}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-clay-600 text-white text-xs font-bold hover:bg-clay-700 transition disabled:opacity-50 min-h-[44px]"
                    >
                        <CheckCircle2 size={16} />
                        Save Storefront Settings
                    </button>
                </div>
            )}
        </form>
    );
}

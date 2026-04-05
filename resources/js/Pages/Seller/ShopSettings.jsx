import React, { useEffect, useState, useRef } from 'react';
import { Head, useForm } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import SellerHeader from '@/Components/SellerHeader';
import { useToast } from '@/Components/ToastContext';
import {
    Camera, Save, Star, Package, MapPin, Calendar,
    Filter, CheckCircle, Pencil, AlertCircle
} from 'lucide-react';
import { hasRating, formatRating } from '@/utils/rating';

export default function ShopSettings({ auth, user, stats }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const bannerInputRef = useRef(null);
    const { addToast } = useToast();

    const [bannerPreview, setBannerPreview] = useState(
        user?.banner_image
            ? (user.banner_image.startsWith('http') || user.banner_image.startsWith('/storage') ? user.banner_image : `/storage/${user.banner_image}`)
            : null
    );

    const [avatarPreview, setAvatarPreview] = useState(
        user?.avatar ? (user.avatar.startsWith('http') || user.avatar.startsWith('/storage') ? user.avatar : `/storage/${user.avatar}`) : null
    );
    const avatarInputRef = useRef(null);

    const { data, setData, post, processing, errors, isDirty } = useForm({
        bio: user?.bio || '',
        banner_image: null,
        avatar: null,
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

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('avatar', file);
            revokePreview(avatarPreview);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleBannerChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('banner_image', file);
            revokePreview(bannerPreview);
            setBannerPreview(URL.createObjectURL(file));
        }
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('shop.settings.update'), { 
            preserveScroll: true,
            onSuccess: () => {
                addToast('Shop settings updated.', 'success');
            },
            onError: () => {
                addToast('Failed to update shop settings.', 'error');
            }
        });
    };

    const shopName = data.shop_name || user?.name || 'Your Shop';
    const location = user?.city || 'Philippines';
    const joinedAt = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'Recently';
    const bioLength = data.bio?.length || 0;

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="Shop Settings - Artisan Dashboard" />
            <SellerSidebar active="settings" user={auth.user} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-h-screen overflow-hidden lg:ml-56">
                <SellerHeader
                    title="Shop Settings"
                    subtitle="Edit your shop directly - what you see is what buyers see"
                    auth={auth}
                    onMenuClick={() => setSidebarOpen(true)}
                />

                <form onSubmit={submit} className="flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">

                        {/* Success Banner - Removed in favor of Toast */}
                        
                        {/* EDIT HINT */}
                        <div className="flex items-center gap-2 mb-4 text-xs text-stone-400 font-medium">
                            <Pencil className="w-3.5 h-3.5" />
                            Click the banner, name or bio to edit. This is exactly how buyers see your shop.
                        </div>

                        {/* ── SELLER PROFILE CARD (mirrors SellerProfile.jsx exactly) ── */}
                        <div className="bg-white rounded-[24px] border border-stone-100 overflow-hidden shadow-sm mb-10">

                            {/* ── Banner (editable) ── */}
                            <div
                                className="h-36 md:h-48 relative overflow-hidden bg-stone-100 group cursor-pointer"
                                onClick={() => bannerInputRef.current?.click()}
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

                                {/* Upload Overlay */}
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

                            {/* ── Profile Details ── */}
                            <div className="px-5 md:px-8 pb-6 flex flex-col md:flex-row items-center md:items-start gap-4 relative z-10 -mt-12">

                                {/* Avatar (editable) */}
                                <div 
                                    className="w-24 h-24 min-w-[6rem] min-h-[6rem] aspect-square rounded-full border-4 border-white bg-white shadow-lg flex items-center justify-center overflow-hidden flex-none self-start relative z-20 group cursor-pointer"
                                    style={{ width: '6rem', height: '6rem' }}
                                    onClick={() => avatarInputRef.current?.click()}
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

                                    {/* Upload Overlay */}
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

                                {/* Info & Stats */}
                                <div className="flex-1 flex flex-col md:flex-row justify-between w-full md:mt-12 gap-6">

                                    {/* Editable Info */}
                                    <div className="text-center md:text-left flex-1">
                                        {/* Shop Name — read-only display */}
                                        <div className="flex flex-col md:flex-row items-center md:items-baseline gap-3 mb-1.5 group/name relative">
                                            <h1 className="text-xl md:text-2xl font-bold text-stone-900 tracking-tight px-2 py-1 -ml-2">
                                                {shopName}
                                            </h1>
                                            <span className="text-[10px] uppercase font-bold tracking-widest bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full shrink-0">
                                                Verified Artisan
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 text-[12px] text-stone-500 font-medium mb-3">
                                            <span className="flex items-center gap-1.5"><MapPin size={15} className="text-stone-400" /> {location}</span>
                                            <span className="flex items-center gap-1.5"><Calendar size={15} className="text-stone-400" /> Joined {joinedAt}</span>
                                        </div>

                                        {/* Bio — inline editable textarea */}
                                        <div className="relative group/bio max-w-xl">
                                            <textarea
                                                value={data.bio}
                                                onChange={(e) => setData('bio', e.target.value)}
                                                placeholder="Write your artisan story - buyers love knowing the person behind the craft..."
                                                maxLength={500}
                                                rows={3}
                                                className="w-full text-stone-600 text-[13px] leading-relaxed bg-transparent border border-transparent hover:border-stone-200 focus:border-orange-300 focus:bg-white focus:outline-none rounded-xl px-2 pt-2 pb-1 -mx-2 transition-all resize-none placeholder-stone-300"
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

                                    {/* Stats Block — read-only, exact match */}
                                    <div className="flex bg-stone-50 rounded-2xl border border-stone-100 p-1.5 self-center md:self-start overflow-hidden shrink-0">
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

                        {/* Products Section — real preview */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 mt-10">
                            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                                <Package size={22} className="text-orange-600" />
                                Products Collection
                            </h2>
                            <div className="flex gap-2">
                                <a 
                                    href={route('products.index')}
                                    className="text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 transition px-4 py-2 rounded-full shadow-sm"
                                >
                                    Manage Products
                                </a>
                            </div>
                        </div>

                        {user?.products?.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-10">
                                {user.products.map((product) => (
                                    <div 
                                        key={product.id} 
                                        className="group bg-white rounded-2xl border border-stone-200/60 shadow-sm hover:border-stone-300 hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden"
                                    >
                                        <div className="aspect-square relative bg-stone-50 border-b border-stone-100 overflow-hidden flex items-center justify-center p-4">
                                            <img 
                                                src={product.img ? (product.img.startsWith('http') || product.img.startsWith('/storage') ? product.img : `/storage/${product.img}`) : '/images/no-image.png'} 
                                                alt={product.name} 
                                                className="w-full h-full object-contain mix-blend-multiply transition duration-500 group-hover:scale-110"
                                                onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                            />
                                            {hasRating(product.rating) && (
                                                <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm shadow-sm text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 text-stone-700">
                                                    {formatRating(product.rating)} <Star size={10} className="fill-amber-400 text-amber-400 -mt-0.5" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4 flex flex-col justify-between flex-1 bg-white">
                                            <h3 className="text-xs font-semibold text-stone-800 line-clamp-2 group-hover:text-orange-600 transition leading-snug mb-2">
                                                {product.name}
                                            </h3>
                                            <div className="flex items-end justify-between mt-auto">
                                                <div className="font-bold text-sm text-stone-900 tracking-tight">
                                                    PHP {Number(product.price).toLocaleString('en-PH')}
                                                </div>
                                                {product.sold > 0 && (
                                                    <span className="text-[10px] text-stone-500 font-medium bg-stone-100 px-1.5 py-0.5 rounded-md">{product.sold} sold</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-stone-100 py-10 text-center mb-10 shadow-sm flex flex-col items-center justify-center">
                                <div className="w-14 h-14 bg-stone-50 rounded-full flex items-center justify-center mb-3 text-stone-300">
                                    <Package size={28} />
                                </div>
                                <p className="text-sm font-medium text-stone-500">Your products appear here to buyers</p>
                                <p className="text-xs text-stone-400 mt-1 mb-4">You haven't listed any products yet.</p>
                                <a 
                                    href={route('products.index')}
                                    className="text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 transition px-4 py-2 rounded-full shadow-sm"
                                >
                                    Add Your First Product
                                </a>
                            </div>
                        )}

                    </div>

                    {/* ── Floating Save Bar ── */}
                    <div className="sticky bottom-0 z-30 bg-white/80 backdrop-blur-xl border-t border-stone-100 shadow-lg">
                        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between gap-4">
                            <p className="text-xs text-stone-400 hidden sm:block">
                                {errors.banner_image && (
                                    <span className="text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5" /> {errors.banner_image}
                                    </span>
                                )}
                                {!errors.banner_image && 'Edits are not saved until you click Save Changes.'}
                            </p>
                            <button
                                type="submit"
                                disabled={processing}
                                className="ml-auto flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded-xl text-sm font-bold transition-colors shadow-sm shadow-orange-200 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {processing ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
}

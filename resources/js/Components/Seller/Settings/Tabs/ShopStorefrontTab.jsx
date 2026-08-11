import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Store, Image, CheckCircle2, UploadCloud } from 'lucide-react';

const formatImgUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('/storage')) return path;
    return `/storage/${path}`;
};

export default function ShopStorefrontTab({ sellerOwner }) {
    const [avatarPreview, setAvatarPreview] = useState(formatImgUrl(sellerOwner.avatar));
    const [bannerPreview, setBannerPreview] = useState(formatImgUrl(sellerOwner.banner_image));

    const form = useForm({
        bio: sellerOwner.bio || '',
        auto_reply_on_completion: sellerOwner.auto_reply_on_completion || false,
        auto_reply_completion_message: sellerOwner.auto_reply_completion_message || '',
        banner_image: null,
        avatar: null,
    });

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            form.setData('avatar', file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleBannerChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            form.setData('banner_image', file);
            setBannerPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        form.post(route('shop.settings.update'), {
            preserveScroll: true,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-clay-50 flex items-center justify-center text-clay-700">
                    <Store size={20} />
                </div>
                <div>
                    <h3 className="text-base font-bold text-stone-900">Shop Storefront Branding</h3>
                    <p className="text-xs text-stone-500">Configure public storefront details, bio, and automated order completion messages.</p>
                </div>
            </div>

            {/* Shop Story / Bio */}
            <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Shop Story / Bio
                </label>
                <textarea
                    rows={4}
                    value={form.data.bio}
                    onChange={(e) => form.setData('bio', e.target.value)}
                    placeholder="Tell buyers about your handcrafted products, artisan passion, and workspace story..."
                    className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500"
                />
                {form.errors.bio && (
                    <p className="text-xs text-rose-600 mt-1">{form.errors.bio}</p>
                )}
            </div>

            {/* Image Uploads Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Shop Logo / Avatar
                    </label>
                    <div className="flex items-center gap-4 p-3 rounded-xl border border-stone-200 bg-stone-50/50">
                        {avatarPreview ? (
                            <img
                                src={avatarPreview}
                                alt="Shop Avatar"
                                className="w-14 h-14 rounded-xl object-cover border border-stone-200 shrink-0"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-xl bg-stone-200 flex items-center justify-center text-stone-500 shrink-0">
                                <Store size={22} />
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="text-xs text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-clay-600 file:text-white hover:file:bg-clay-700 cursor-pointer"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Storefront Banner Image
                    </label>
                    <div className="flex items-center gap-4 p-3 rounded-xl border border-stone-200 bg-stone-50/50">
                        {bannerPreview ? (
                            <img
                                src={bannerPreview}
                                alt="Shop Banner"
                                className="w-20 h-14 rounded-xl object-cover border border-stone-200 shrink-0"
                            />
                        ) : (
                            <div className="w-20 h-14 rounded-xl bg-stone-200 flex items-center justify-center text-stone-500 shrink-0">
                                <Image size={22} />
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleBannerChange}
                            className="text-xs text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-clay-600 file:text-white hover:file:bg-clay-700 cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* Auto-Reply Settings */}
            <div className="pt-4 border-t border-stone-100 space-y-3">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="auto_reply"
                        checked={form.data.auto_reply_on_completion}
                        onChange={(e) => form.setData('auto_reply_on_completion', e.target.checked)}
                        className="rounded border-stone-300 text-clay-600 focus:ring-clay-500"
                    />
                    <label htmlFor="auto_reply" className="text-xs font-bold text-stone-800">
                        Automated Thank-You Message on Order Completion
                    </label>
                </div>

                {form.data.auto_reply_on_completion && (
                    <div>
                        <textarea
                            rows={2}
                            value={form.data.auto_reply_completion_message}
                            onChange={(e) => form.setData('auto_reply_completion_message', e.target.value)}
                            placeholder="Thank you for supporting our artisan craft! We hope you love your item..."
                            className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500"
                        />
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-2">
                <button
                    type="submit"
                    disabled={form.processing}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-clay-600 text-white text-xs font-bold hover:bg-clay-700 transition disabled:opacity-50 min-h-[40px]"
                >
                    <CheckCircle2 size={15} />
                    Save Storefront Details
                </button>
            </div>
        </form>
    );
}

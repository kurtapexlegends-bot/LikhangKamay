import React from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Globe, Image, Palette, Search } from 'lucide-react';

export default function BrandingForm({ data, setData, updateNested, errors }) {
    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (file) {
            setData(field, file);
            const previewField = `${field}_preview`;
            setData(previewField, URL.createObjectURL(file));
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Platform Branding */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Globe className="text-clay-600" size={16} />
                    <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-wider">Platform Branding</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <InputLabel value="Platform Name" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <TextInput
                            className="block w-full bg-stone-50/30 text-xs py-2 min-h-[44px]"
                            value={data.platform_name}
                            onChange={(e) => setData('platform_name', e.target.value)}
                        />
                    </div>
                    <div>
                        <InputLabel value="Primary Theme Color" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Palette className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={12} />
                                <TextInput
                                    className="block w-full pl-8 bg-stone-50/30 text-xs py-2 min-h-[44px]"
                                    value={data.primary_color}
                                    onChange={(e) => setData('primary_color', e.target.value)}
                                />
                            </div>
                            <input
                                type="color"
                                value={data.primary_color}
                                onChange={(e) => setData('primary_color', e.target.value)}
                                className="w-10 h-10 border border-stone-200 rounded-lg cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-100">
                    {/* Logo Upload */}
                    <div>
                        <InputLabel value="Platform Logo" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <div className="flex items-center gap-4">
                            {data.platform_logo_preview && (
                                <div className="w-16 h-16 rounded-xl border border-stone-200 bg-stone-50/30 flex items-center justify-center overflow-hidden shrink-0">
                                    <img src={data.platform_logo_preview} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                                </div>
                            )}
                            <div className="flex-1">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'platform_logo')}
                                    className="block w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-clay-50 file:text-clay-700 hover:file:bg-clay-100 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Favicon Upload */}
                    <div>
                        <InputLabel value="Favicon Icon" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <div className="flex items-center gap-4">
                            {data.favicon_preview && (
                                <div className="w-12 h-12 rounded-xl border border-stone-200 bg-stone-50/30 flex items-center justify-center overflow-hidden shrink-0">
                                    <img src={data.favicon_preview} alt="Favicon Preview" className="w-6 h-6 object-contain" />
                                </div>
                            )}
                            <div className="flex-1">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'favicon')}
                                    className="block w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-clay-50 file:text-clay-700 hover:file:bg-clay-100 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SEO Metadata */}
            <div className="pt-6 border-t border-stone-100 space-y-4">
                <div className="flex items-center gap-2">
                    <Search className="text-clay-600" size={16} />
                    <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-wider">SEO Metadata</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <InputLabel value="Meta Title" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <TextInput
                            className="block w-full bg-stone-50/30 text-xs py-2 min-h-[44px]"
                            value={data.seo_metadata.title}
                            onChange={(e) => updateNested('seo_metadata', 'title', e.target.value)}
                        />
                    </div>
                    <div>
                        <InputLabel value="Meta Description" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <textarea
                            className="block w-full rounded-xl border-stone-200 bg-stone-50/30 focus:ring-clay-500/20 focus:border-clay-500 min-h-[70px] text-xs p-3 font-medium text-stone-800"
                            value={data.seo_metadata.description}
                            onChange={(e) => updateNested('seo_metadata', 'description', e.target.value)}
                        />
                    </div>
                    <div>
                        <InputLabel value="Meta Keywords" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <TextInput
                            className="block w-full bg-stone-50/30 text-xs py-2 min-h-[44px]"
                            placeholder="handmade, artisan, clay, pottery"
                            value={data.seo_metadata.keywords}
                            onChange={(e) => updateNested('seo_metadata', 'keywords', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

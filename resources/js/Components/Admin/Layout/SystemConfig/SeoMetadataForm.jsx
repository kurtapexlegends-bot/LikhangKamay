import React from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { ChevronRight } from 'lucide-react';

export default function SeoMetadataForm({ data, updateNested }) {
    return (
        <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-6 shadow-sm">
            <div className="space-y-4">
                <div>
                    <InputLabel htmlFor="seo_title" value="Default Meta Title" className="text-stone-700 font-bold mb-1.5 uppercase tracking-wider text-[10px]" />
                    <TextInput
                        id="seo_title"
                        className="block w-full border-stone-200 bg-stone-50/30 text-xs py-2 min-h-[44px]"
                        value={data.seo_metadata.title}
                        onChange={(e) => updateNested('seo_metadata', 'title', e.target.value)}
                        required
                    />
                </div>

                <div>
                    <InputLabel htmlFor="seo_description" value="Default Meta Description" className="text-stone-700 font-bold mb-1.5 uppercase tracking-wider text-[10px]" />
                    <textarea
                        id="seo_description"
                        className="block w-full rounded-xl border-stone-200 bg-stone-50/30 focus:ring-clay-500/20 focus:border-clay-500 min-h-[100px] text-xs p-3 font-medium text-stone-800"
                        value={data.seo_metadata.description}
                        onChange={(e) => updateNested('seo_metadata', 'description', e.target.value)}
                        required
                    />
                </div>

                <div>
                    <InputLabel htmlFor="seo_keywords" value="Keywords (Comma separated)" className="text-stone-700 font-bold mb-1.5 uppercase tracking-wider text-[10px]" />
                    <TextInput
                        id="seo_keywords"
                        className="block w-full border-stone-200 bg-stone-50/30 text-xs py-2 min-h-[44px]"
                        value={data.seo_metadata.keywords}
                        onChange={(e) => updateNested('seo_metadata', 'keywords', e.target.value)}
                    />
                </div>
            </div>

            <div className="pt-6 border-t border-stone-100">
                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3">Google Search Preview</h4>
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-1 max-w-lg">
                    <div className="text-[#1a0dab] text-sm font-medium hover:underline cursor-pointer">
                        {data.seo_metadata.title || 'Likhang Kamay | Artisan Marketplace'}
                    </div>
                    <div className="text-[#006621] text-[10px] flex items-center gap-1">
                        https://likhangkamay.app <ChevronRight size={8} />
                    </div>
                    <div className="text-[#545454] text-xs leading-relaxed line-clamp-2">
                        {data.seo_metadata.description || 'Discover unique handmade treasures from across the Philippines.'}
                    </div>
                </div>
            </div>
        </div>
    );
}

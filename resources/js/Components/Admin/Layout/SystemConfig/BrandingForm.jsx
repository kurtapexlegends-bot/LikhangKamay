import React from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Search } from 'lucide-react';
import FormSkeleton from './Partials/FormSkeleton';

export default function BrandingForm({ data, setData, updateNested, errors, processing }) {
    if (processing) {
        return <FormSkeleton />;
    }

    return (
        <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* SEO Metadata */}
            <div className="space-y-4">
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

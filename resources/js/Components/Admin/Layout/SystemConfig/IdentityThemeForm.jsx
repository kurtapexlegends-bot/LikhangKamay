import React from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import { Sparkles, Image as ImageIcon, Globe } from 'lucide-react';

export default function IdentityThemeForm({ data, setData, errors, handleFileChange }) {
    return (
        <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <InputLabel htmlFor="platform_name" value="Platform Name" className="text-stone-700 font-bold mb-2 uppercase tracking-wider text-[10px]" />
                        <TextInput
                            id="platform_name"
                            className="block w-full border-stone-200 bg-stone-50/30 focus:ring-clay-500/20 focus:border-clay-500 text-xs min-h-[44px]"
                            value={data.platform_name}
                            onChange={(e) => setData('platform_name', e.target.value)}
                            required
                        />
                        <InputError className="mt-2" message={errors.platform_name} />
                    </div>

                    <div>
                        <InputLabel htmlFor="primary_color" value="Primary Brand Color" className="text-stone-700 font-bold mb-1.5 uppercase tracking-wider text-[10px]" />
                        <div className="flex items-center gap-2">
                            <div 
                                className="w-11 h-11 rounded-lg border border-stone-200 shadow-sm shrink-0"
                                style={{ backgroundColor: data.primary_color }}
                            />
                            <TextInput
                                id="primary_color"
                                className="block w-full border-stone-200 bg-stone-50/30 font-mono text-xs py-2 min-h-[44px]"
                                value={data.primary_color}
                                onChange={(e) => setData('primary_color', e.target.value)}
                            />
                            <input 
                                type="color" 
                                className="w-11 h-11 p-1 bg-white border border-stone-200 rounded-lg cursor-pointer shrink-0"
                                value={data.primary_color}
                                onChange={(e) => setData('primary_color', e.target.value)}
                            />
                        </div>
                        <InputError className="mt-1" message={errors.primary_color} />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-clay-50/50 rounded-2xl border border-clay-100/50">
                        <Sparkles className="text-clay-600 shrink-0 mt-0.5" size={16} />
                        <div>
                            <h4 className="text-xs font-bold text-clay-950 mb-0.5">Primary Theme Identity</h4>
                            <p className="text-[10px] text-clay-700 leading-relaxed font-medium">This primary tone renders across action buttons, links, and key active elements.</p>
                            <div className="mt-3 flex gap-2">
                                <div className="px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: data.primary_color }}>Primary</div>
                                <div className="px-3 py-1 rounded-full text-[10px] font-bold border" style={{ borderColor: data.primary_color, color: data.primary_color }}>Outline</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-stone-100">
                <div className="space-y-2">
                    <InputLabel value="Platform Logo" className="text-stone-700 font-bold uppercase tracking-wider text-[9px]" />
                    <div className="relative group aspect-[16/9] bg-stone-50 rounded-xl border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden transition-all hover:border-clay-300">
                        {data.platform_logo_preview ? (
                            <img src={data.platform_logo_preview} className="w-full h-full object-contain p-4" alt="Preview" />
                        ) : (
                            <ImageIcon className="text-stone-300" size={24} />
                        )}
                        <label htmlFor="platform_logo" className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                            <span className="text-white text-[9px] font-bold bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 flex items-center gap-1.5">
                                <ImageIcon size={12} /> Replace Logo
                            </span>
                        </label>
                        <input id="platform_logo" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'platform_logo')} />
                    </div>
                    <p className="text-[9px] text-stone-400">Supported: PNG/SVG, max 2MB.</p>
                </div>

                <div className="space-y-2">
                    <InputLabel value="Favicon Icon" className="text-stone-700 font-bold uppercase tracking-wider text-[9px]" />
                    <div className="relative group aspect-square max-w-[100px] bg-stone-50 rounded-xl border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden transition-all hover:border-clay-300">
                        {data.favicon_preview ? (
                            <div className="bg-white p-2 rounded-lg shadow-sm border border-stone-100">
                                <img src={data.favicon_preview} className="w-8 h-8 object-contain" alt="Favicon" />
                            </div>
                        ) : (
                            <Globe className="text-stone-300" size={24} />
                        )}
                        <label htmlFor="favicon" className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                            <span className="text-white text-[8px] font-bold bg-white/10 backdrop-blur-md px-2 py-1 rounded">Change</span>
                        </label>
                        <input id="favicon" type="file" className="hidden" accept=".ico,.png" onChange={(e) => handleFileChange(e, 'favicon')} />
                    </div>
                    <p className="text-[9px] text-stone-400">Favicon size: 32x32px .ico/png.</p>
                </div>
            </div>
        </div>
    );
}

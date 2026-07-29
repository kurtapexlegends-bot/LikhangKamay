import React from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Mail, Phone, MapPin, Globe, Share2 } from 'lucide-react';

export default function ContactSocialsForm({ data, updateNested }) {
    return (
        <div className="bg-white rounded-2xl border border-clay-100 p-4 sm:p-6 space-y-6 shadow-sm animate-in fade-in duration-200">
            {/* Primary Support Channels Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                    <div className="w-7 h-7 rounded-lg bg-clay-50 flex items-center justify-center border border-clay-200/50 shrink-0">
                        <Mail size={14} className="text-clay-600" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Primary Support Channels</h3>
                        <p className="text-[10px] text-stone-500 font-medium mt-0.5">Platform email, phone hotline, and main physical office address.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <InputLabel value="Support Email Address" className="text-[9px] font-bold text-stone-700 uppercase tracking-wider mb-1.5" />
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                            <TextInput 
                                type="email"
                                className="block w-full pl-9 bg-stone-50/30 text-xs py-2 min-h-[44px] focus:ring-clay-500/20 focus:border-clay-500" 
                                placeholder="support@likhangkamay.app"
                                value={data.contact_info?.email || ''}
                                onChange={(e) => updateNested('contact_info', 'email', e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <InputLabel value="Contact Phone Hotline" className="text-[9px] font-bold text-stone-700 uppercase tracking-wider mb-1.5" />
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                            <TextInput 
                                type="tel"
                                className="block w-full pl-9 bg-stone-50/30 text-xs py-2 min-h-[44px] focus:ring-clay-500/20 focus:border-clay-500" 
                                placeholder="+63 917 123 4567"
                                value={data.contact_info?.phone || ''}
                                onChange={(e) => updateNested('contact_info', 'phone', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <InputLabel value="Headquarters Physical Address" className="text-[9px] font-bold text-stone-700 uppercase tracking-wider mb-1.5" />
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 text-stone-400" size={14} />
                        <textarea 
                            rows={3}
                            className="block w-full pl-9 rounded-xl border-stone-200 bg-stone-50/30 focus:ring-clay-500/20 focus:border-clay-500 min-h-[80px] text-xs p-3 font-medium text-stone-800"
                            placeholder="Enter complete office address..."
                            value={data.contact_info?.address || ''}
                            onChange={(e) => updateNested('contact_info', 'address', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Social Media Presence Section */}
            <div className="pt-4 border-t border-stone-100 space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                    <div className="w-7 h-7 rounded-lg bg-clay-50 flex items-center justify-center border border-clay-200/50 shrink-0">
                        <Share2 size={14} className="text-clay-600" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Social Media Accounts</h3>
                        <p className="text-[10px] text-stone-500 font-medium mt-0.5">Official community channels and brand social profiles.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { key: 'facebook', label: 'Facebook Page URL', placeholder: 'https://facebook.com/likhangkamay' },
                        { key: 'instagram', label: 'Instagram Profile URL', placeholder: 'https://instagram.com/likhangkamay' },
                        { key: 'twitter', label: 'Twitter / X Handle URL', placeholder: 'https://x.com/likhangkamay' }
                    ].map(social => (
                        <div key={social.key}>
                            <InputLabel value={social.label} className="text-[9px] font-bold text-stone-700 uppercase tracking-wider mb-1.5" />
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                                <TextInput 
                                    type="url"
                                    className="block w-full pl-9 bg-stone-50/30 text-xs py-2 min-h-[44px] focus:ring-clay-500/20 focus:border-clay-500" 
                                    placeholder={social.placeholder}
                                    value={data.social_links?.[social.key] || ''}
                                    onChange={(e) => updateNested('social_links', social.key, e.target.value)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

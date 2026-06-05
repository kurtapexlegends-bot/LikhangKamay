import React from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function ContactSocialsForm({ data, updateNested }) {
    return (
        <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <InputLabel value="Support Email" className="text-[10px] font-bold text-stone-700 uppercase tracking-wider mb-1.5" />
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                        <TextInput 
                            className="block w-full pl-9 bg-stone-50/30 text-xs py-2 min-h-[44px]" 
                            value={data.contact_info.email}
                            onChange={(e) => updateNested('contact_info', 'email', e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <InputLabel value="Contact Phone" className="text-[10px] font-bold text-stone-700 uppercase tracking-wider mb-1.5" />
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                        <TextInput 
                            className="block w-full pl-9 bg-stone-50/30 text-xs py-2 min-h-[44px]" 
                            value={data.contact_info.phone}
                            onChange={(e) => updateNested('contact_info', 'phone', e.target.value)}
                        />
                    </div>
                </div>
            </div>
            <div>
                <InputLabel value="Headquarters Address" className="text-[10px] font-bold text-stone-700 uppercase tracking-wider mb-1.5" />
                <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-stone-400" size={14} />
                    <textarea 
                        className="block w-full pl-9 rounded-xl border-stone-200 bg-stone-50/30 focus:ring-clay-500/20 focus:border-clay-500 min-h-[70px] text-xs p-3 font-medium text-stone-800"
                        value={data.contact_info.address}
                        onChange={(e) => updateNested('contact_info', 'address', e.target.value)}
                    />
                </div>
            </div>

            <div className="pt-6 border-t border-stone-100 space-y-4">
                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Social Accounts</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['Facebook', 'Instagram', 'Twitter'].map(social => (
                        <div key={social}>
                            <InputLabel value={`${social} URL`} className="text-[9px] font-bold text-stone-750 uppercase tracking-wider mb-1.5" />
                            <TextInput 
                                className="block w-full bg-stone-50/30 text-xs py-2 min-h-[44px]" 
                                placeholder={`https://${social.toLowerCase()}.com/`}
                                value={data.social_links[social.toLowerCase()]}
                                onChange={(e) => updateNested('social_links', social.toLowerCase(), e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

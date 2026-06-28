import React from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Mail, ShieldCheck, Key, User } from 'lucide-react';
import FormSkeleton from './Partials/FormSkeleton';

export default function SMTPForm({ data, setData, errors, processing }) {
    if (processing) {
        return <FormSkeleton />;
    }

    return (
        <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* SMTP Server Configuration */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="text-clay-600" size={16} />
                    <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-wider">SMTP Server Configuration</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <InputLabel value="Mail Host" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <TextInput
                            className="block w-full bg-stone-50/30 text-xs py-2 min-h-[44px]"
                            value={data.mail_host}
                            onChange={(e) => setData('mail_host', e.target.value)}
                        />
                    </div>
                    <div>
                        <InputLabel value="Port" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <TextInput
                            type="number"
                            className="block w-full bg-stone-50/30 text-xs py-2 min-h-[44px]"
                            value={data.mail_port}
                            onChange={(e) => setData('mail_port', e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <InputLabel value="Encryption" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <select
                            value={data.mail_encryption}
                            onChange={(e) => setData('mail_encryption', e.target.value)}
                            className="block w-full rounded-xl border-stone-200 bg-stone-50/30 text-xs py-2 px-3 min-h-[44px] text-stone-800 font-medium focus:ring-clay-500/20 focus:border-clay-500"
                        >
                            <option value="tls">TLS</option>
                            <option value="ssl">SSL</option>
                            <option value="none">None</option>
                        </select>
                    </div>
                    <div>
                        <InputLabel value="Username" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={12} />
                            <TextInput
                                className="block w-full pl-8 bg-stone-50/30 text-xs py-2 min-h-[44px]"
                                value={data.mail_username}
                                onChange={(e) => setData('mail_username', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <InputLabel value="Password" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={12} />
                            <TextInput
                                type="password"
                                className="block w-full pl-8 bg-stone-50/30 text-xs py-2 min-h-[44px]"
                                value={data.mail_password}
                                onChange={(e) => setData('mail_password', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Email Dispatch Info */}
            <div className="pt-6 border-t border-stone-100 space-y-4">
                <div className="flex items-center gap-2">
                    <Mail className="text-clay-600" size={16} />
                    <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-wider">Sender Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <InputLabel value="From Email Address" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <TextInput
                            type="email"
                            className="block w-full bg-stone-50/30 text-xs py-2 min-h-[44px]"
                            value={data.mail_from_address}
                            onChange={(e) => setData('mail_from_address', e.target.value)}
                        />
                    </div>
                    <div>
                        <InputLabel value="From Name" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <TextInput
                            className="block w-full bg-stone-50/30 text-xs py-2 min-h-[44px]"
                            value={data.mail_from_name}
                            onChange={(e) => setData('mail_from_name', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

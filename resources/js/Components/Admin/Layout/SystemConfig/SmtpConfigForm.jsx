import React from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import { Server } from 'lucide-react';

export default function SmtpConfigForm({ data, setData, errors }) {
    return (
        <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-2 border-b border-stone-50 pb-3">
                <Server className="text-clay-600" size={16} />
                <div>
                    <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">SMTP Outgoing Server</h3>
                    <p className="text-[9px] text-stone-400 font-medium">Define outgoing settings to dispatch transaction notifications and verification codes.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <InputLabel htmlFor="mail_host" value="SMTP Host" className="text-[9px] font-bold text-stone-750 uppercase tracking-wider mb-1.5" />
                    <TextInput 
                        id="mail_host"
                        className="block w-full bg-stone-50/30 text-xs py-2 min-h-[44px]" 
                        value={data.mail_host}
                        onChange={(e) => setData('mail_host', e.target.value)}
                    />
                    <InputError className="mt-1" message={errors.mail_host} />
                </div>

                <div>
                    <InputLabel htmlFor="mail_port" value="SMTP Port" className="text-[9px] font-bold text-stone-750 uppercase tracking-wider mb-1.5" />
                    <TextInput 
                        id="mail_port"
                        className="block w-full bg-stone-50/30 text-xs py-2 min-h-[44px]" 
                        value={data.mail_port}
                        onChange={(e) => setData('mail_port', e.target.value)}
                    />
                    <InputError className="mt-1" message={errors.mail_port} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <InputLabel htmlFor="mail_encryption" value="Encryption Protocol" className="text-[9px] font-bold text-stone-750 uppercase tracking-wider mb-1.5" />
                    <select
                        id="mail_encryption"
                        className="block w-full rounded-xl border-stone-200 bg-stone-50/30 focus:ring-clay-500/20 focus:border-clay-500 text-xs font-medium text-stone-700 py-2.5 min-h-[44px]"
                        value={data.mail_encryption}
                        onChange={(e) => setData('mail_encryption', e.target.value)}
                    >
                        <option value="tls">TLS</option>
                        <option value="ssl">SSL</option>
                        <option value="none">None</option>
                    </select>
                    <InputError className="mt-1" message={errors.mail_encryption} />
                </div>

                <div>
                    <InputLabel htmlFor="mail_username" value="SMTP Username" className="text-[9px] font-bold text-stone-750 uppercase tracking-wider mb-1.5" />
                    <TextInput 
                        id="mail_username"
                        className="block w-full bg-stone-50/30 text-xs py-2 min-h-[44px]" 
                        value={data.mail_username}
                        onChange={(e) => setData('mail_username', e.target.value)}
                    />
                    <InputError className="mt-1" message={errors.mail_username} />
                </div>

                <div>
                    <InputLabel htmlFor="mail_password" value="SMTP Password" className="text-[9px] font-bold text-stone-750 uppercase tracking-wider mb-1.5" />
                    <TextInput 
                        id="mail_password"
                        type="password"
                        className="block w-full bg-stone-50/30 text-xs py-2 min-h-[44px]" 
                        value={data.mail_password}
                        onChange={(e) => setData('mail_password', e.target.value)}
                    />
                    <InputError className="mt-1" message={errors.mail_password} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-stone-50">
                <div>
                    <InputLabel htmlFor="mail_from_address" value="Sender Email Address" className="text-[9px] font-bold text-stone-750 uppercase tracking-wider mb-1.5" />
                    <TextInput 
                        id="mail_from_address"
                        className="block w-full bg-stone-50/30 text-xs py-2 min-h-[44px]" 
                        value={data.mail_from_address}
                        onChange={(e) => setData('mail_from_address', e.target.value)}
                    />
                    <InputError className="mt-1" message={errors.mail_from_address} />
                </div>

                <div>
                    <InputLabel htmlFor="mail_from_name" value="Sender Display Name" className="text-[9px] font-bold text-stone-750 uppercase tracking-wider mb-1.5" />
                    <TextInput 
                        id="mail_from_name"
                        className="block w-full bg-stone-50/30 text-xs py-2 min-h-[44px]" 
                        value={data.mail_from_name}
                        onChange={(e) => setData('mail_from_name', e.target.value)}
                    />
                    <InputError className="mt-1" message={errors.mail_from_name} />
                </div>
            </div>
        </div>
    );
}

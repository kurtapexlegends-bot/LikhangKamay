import React from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Banknote, Percent, ShieldAlert, CreditCard, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function PlatformOpsForm({ data, setData }) {
    return (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 space-y-6 shadow-sm">
            {/* Financial Parameters */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-clay-50 border border-clay-200/60 flex items-center justify-center">
                        <Banknote className="text-clay-700" size={15} />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Financial Thresholds</h3>
                        <p className="text-[10px] text-stone-400 font-medium">Configure system commission rates and checkout fee percentages.</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-stone-50/50 p-4 rounded-xl border border-stone-200/70 focus-within:ring-2 focus-within:ring-clay-500/20 focus-within:border-clay-500 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <InputLabel value="Commission Rate (%)" className="text-[10px] font-bold text-stone-600 uppercase tracking-wider" />
                            <span className="text-[9.5px] font-bold text-stone-400">Default Seller Fee</span>
                        </div>
                        <div className="relative">
                            <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                            <TextInput 
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                className="block w-full pl-9 bg-white text-xs font-bold text-stone-900 py-2.5 min-h-[42px] border-stone-200 rounded-xl" 
                                value={data.commission_rate}
                                onChange={(e) => setData('commission_rate', e.target.value)}
                                placeholder="0.0"
                            />
                        </div>
                    </div>

                    <div className="bg-stone-50/50 p-4 rounded-xl border border-stone-200/70 focus-within:ring-2 focus-within:ring-clay-500/20 focus-within:border-clay-500 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <InputLabel value="Convenience Fee (%)" className="text-[10px] font-bold text-stone-600 uppercase tracking-wider" />
                            <span className="text-[9.5px] font-bold text-stone-400">Checkout Service Fee</span>
                        </div>
                        <div className="relative">
                            <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                            <TextInput 
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                className="block w-full pl-9 bg-white text-xs font-bold text-stone-900 py-2.5 min-h-[42px] border-stone-200 rounded-xl" 
                                value={data.convenience_fee}
                                onChange={(e) => setData('convenience_fee', e.target.value)}
                                placeholder="0.0"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Feature & Safety Controls */}
            <div className="pt-6 border-t border-stone-100 space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-stone-100 border border-stone-200/80 flex items-center justify-center">
                        <ShieldAlert className="text-stone-700" size={15} />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Gateways & Safety Mode</h3>
                        <p className="text-[10px] text-stone-400 font-medium">Control live payment processing and platform access locks.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Maintenance Mode Card */}
                    <div 
                        role="button"
                        tabIndex={0}
                        onClick={() => setData('maintenance_mode', !data.maintenance_mode)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setData('maintenance_mode', !data.maintenance_mode); } }}
                        className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 group select-none ${
                            data.maintenance_mode 
                                ? 'bg-amber-50/70 border-amber-300 text-amber-900 shadow-sm ring-1 ring-amber-500/20' 
                                : 'bg-white border-stone-200/80 hover:border-stone-300 hover:bg-stone-50/50 text-stone-900'
                        }`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl transition-colors shrink-0 ${data.maintenance_mode ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-500 group-hover:bg-stone-200/70'}`}>
                                    <AlertTriangle size={18} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold leading-tight">Maintenance Mode</h4>
                                    <p className="text-[10px] text-stone-500 font-medium mt-0.5">Restrict buyer & artisan access to the platform.</p>
                                </div>
                            </div>

                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shrink-0 ${
                                data.maintenance_mode ? 'bg-amber-200/80 text-amber-800 border border-amber-300' : 'bg-stone-100 text-stone-400 border border-stone-200'
                            }`}>
                                {data.maintenance_mode ? 'Active' : 'Off'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-stone-200/50">
                            <span className="text-[10px] font-bold text-stone-400">Status Control</span>
                            <div className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${data.maintenance_mode ? 'bg-amber-500' : 'bg-stone-300'}`}>
                                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-all ${data.maintenance_mode ? 'left-5.5' : 'left-0.5'}`} />
                            </div>
                        </div>
                    </div>

                    {/* PayMongo Gateway Card */}
                    <div 
                        role="button"
                        tabIndex={0}
                        onClick={() => setData('paymongo_enabled', !data.paymongo_enabled)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setData('paymongo_enabled', !data.paymongo_enabled); } }}
                        className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 group select-none ${
                            data.paymongo_enabled 
                                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-sm ring-1 ring-emerald-500/20' 
                                : 'bg-white border-stone-200/80 hover:border-stone-300 hover:bg-stone-50/50 text-stone-900'
                        }`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl transition-colors shrink-0 ${data.paymongo_enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500 group-hover:bg-stone-200/70'}`}>
                                    <CreditCard size={18} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold leading-tight">PayMongo Gateway</h4>
                                    <p className="text-[10px] text-stone-500 font-medium mt-0.5">Process online checkouts via e-wallets & cards.</p>
                                </div>
                            </div>

                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shrink-0 ${
                                data.paymongo_enabled ? 'bg-emerald-200/80 text-emerald-800 border border-emerald-300' : 'bg-stone-100 text-stone-400 border border-stone-200'
                            }`}>
                                {data.paymongo_enabled ? 'Online' : 'Disabled'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-stone-200/50">
                            <span className="text-[10px] font-bold text-stone-400">Gateway Status</span>
                            <div className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${data.paymongo_enabled ? 'bg-emerald-600' : 'bg-stone-300'}`}>
                                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-all ${data.paymongo_enabled ? 'left-5.5' : 'left-0.5'}`} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

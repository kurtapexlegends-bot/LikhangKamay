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
                        <p className="text-[10px] text-stone-400 font-medium">Configure system checkout fee percentages and payment thresholds.</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
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
                        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Payments &amp; Maintenance</h3>
                        <p className="text-[10px] text-stone-400 font-medium">Manage PayMongo payment processing and turn maintenance mode on or off.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Maintenance Mode Card */}
                    {(() => {
                        const isMaintenanceActive = Boolean(data.maintenance_mode);
                        return (
                            <button 
                                type="button"
                                onClick={() => setData('maintenance_mode', !isMaintenanceActive)}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 group select-none text-left w-full outline-none focus:ring-2 focus:ring-amber-500/20 ${
                                    isMaintenanceActive 
                                        ? 'bg-amber-50/70 border-amber-300 shadow-2xs' 
                                        : 'bg-white border-stone-200/80 hover:border-stone-300 hover:bg-stone-50/50'
                                }`}
                            >
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className={`p-2.5 rounded-xl transition-colors shrink-0 ${isMaintenanceActive ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-500 group-hover:bg-stone-200/70'}`}>
                                        <AlertTriangle size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-xs font-bold text-stone-900 leading-tight">Maintenance Mode</h4>
                                        <p className="text-[10px] text-stone-500 font-medium mt-0.5">Restrict buyer & artisan access to the platform.</p>
                                    </div>
                                </div>

                                <div className={`w-11 h-6 rounded-full p-1 flex items-center transition-colors shrink-0 ${isMaintenanceActive ? 'bg-amber-500' : 'bg-stone-200'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-200 ${isMaintenanceActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </button>
                        );
                    })()}

                    {/* PayMongo Gateway Card */}
                    {(() => {
                        const isPaymongoActive = Boolean(data.paymongo_enabled);
                        return (
                            <button 
                                type="button"
                                onClick={() => setData('paymongo_enabled', !isPaymongoActive)}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 group select-none text-left w-full outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                                    isPaymongoActive 
                                        ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs' 
                                        : 'bg-white border-stone-200/80 hover:border-stone-300 hover:bg-stone-50/50'
                                }`}
                            >
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className={`p-2.5 rounded-xl transition-colors shrink-0 ${isPaymongoActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500 group-hover:bg-stone-200/70'}`}>
                                        <CreditCard size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-xs font-bold text-stone-900 leading-tight">PayMongo Gateway</h4>
                                        <p className="text-[10px] text-stone-500 font-medium mt-0.5">Process online checkouts via e-wallets & cards.</p>
                                    </div>
                                </div>

                                <div className={`w-11 h-6 rounded-full p-1 flex items-center transition-colors shrink-0 ${isPaymongoActive ? 'bg-emerald-600' : 'bg-stone-200'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-200 ${isPaymongoActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </button>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}

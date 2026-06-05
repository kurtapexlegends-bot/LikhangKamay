import React from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Banknote, Percent, Hash, ArrowRight, ShieldAlert, CreditCard } from 'lucide-react';

export default function PlatformOpsForm({ data, setData }) {
    return (
        <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-6 shadow-sm">
            {/* Financial Parameters */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Banknote className="text-clay-600" size={16} />
                    <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-wider">Financial Thresholds</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <InputLabel value="Commission Rate (%)" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <div className="relative">
                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={12} />
                            <TextInput 
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                className="block w-full pl-8 bg-stone-50/30 text-xs py-2 min-h-[44px]" 
                                value={data.commission_rate}
                                onChange={(e) => setData('commission_rate', e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <InputLabel value="Convenience Fee (%)" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                        <div className="relative">
                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={12} />
                            <TextInput 
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                className="block w-full pl-8 bg-stone-50/30 text-xs py-2 min-h-[44px]" 
                                value={data.convenience_fee}
                                onChange={(e) => setData('convenience_fee', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Feature Toggles */}
            <div className="pt-6 border-t border-stone-100 space-y-4">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="text-clay-600" size={16} />
                    <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-wider">Gateways & Safety</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                        onClick={() => setData('maintenance_mode', !data.maintenance_mode)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group min-h-[56px] select-none ${data.maintenance_mode ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-stone-100 hover:border-stone-200'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${data.maintenance_mode ? 'bg-amber-100 text-amber-700' : 'bg-stone-50 text-stone-400 group-hover:bg-stone-100'}`}>
                                <ShieldAlert size={15} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-stone-900 leading-tight">Maintenance Mode</h4>
                                <p className="text-[9px] text-stone-500 font-medium">Prevent login and access for buyers & artisans.</p>
                            </div>
                        </div>
                        <div className={`w-10 h-5.5 rounded-full relative transition-colors shrink-0 ${data.maintenance_mode ? 'bg-amber-500' : 'bg-stone-200'}`} style={{ minWidth: '40px', minHeight: '22px' }}>
                            <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-all ${data.maintenance_mode ? 'left-5' : 'left-0.5'}`} />
                        </div>
                    </div>

                    <div 
                        onClick={() => setData('paymongo_enabled', !data.paymongo_enabled)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group min-h-[56px] select-none ${data.paymongo_enabled ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-stone-100 hover:border-stone-200'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${data.paymongo_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-50 text-stone-400 group-hover:bg-stone-100'}`}>
                                <CreditCard size={15} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-stone-900 leading-tight">PayMongo Gateway</h4>
                                <p className="text-[9px] text-stone-500 font-medium">Enable real-time transaction processing.</p>
                            </div>
                        </div>
                        <div className={`w-10 h-5.5 rounded-full relative transition-colors shrink-0 ${data.paymongo_enabled ? 'bg-emerald-500' : 'bg-stone-200'}`} style={{ minWidth: '40px', minHeight: '22px' }}>
                            <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-all ${data.paymongo_enabled ? 'left-5' : 'left-0.5'}`} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

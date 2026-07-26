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
                    <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-wider">Financial Parameters</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <InputLabel value="Platform Commission Rate (%)" className="text-xs text-stone-600 font-semibold" />
                        <div className="relative mt-1">
                            <TextInput
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={data.platform_commission_rate}
                                onChange={(e) => setData('platform_commission_rate', e.target.value)}
                                className="w-full pl-9 text-xs"
                                placeholder="5.0"
                            />
                            <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        </div>
                        <p className="text-[10px] text-stone-400 mt-1">Cut taken from completed order totals.</p>
                    </div>

                    <div>
                        <InputLabel value="Base Shipping Fee (₱)" className="text-xs text-stone-600 font-semibold" />
                        <div className="relative mt-1">
                            <TextInput
                                type="number"
                                step="1"
                                min="0"
                                value={data.base_shipping_fee}
                                onChange={(e) => setData('base_shipping_fee', e.target.value)}
                                className="w-full pl-9 text-xs"
                                placeholder="100"
                            />
                            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        </div>
                        <p className="text-[10px] text-stone-400 mt-1">Default flat shipping fallback.</p>
                    </div>
                </div>
            </div>

            {/* Storage & Limits */}
            <div className="pt-6 border-t border-stone-100 space-y-4">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="text-clay-600" size={16} />
                    <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-wider">Storage & Product Limits</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <InputLabel value="Max 3D File Size (MB)" className="text-xs text-stone-600 font-semibold" />
                        <TextInput
                            type="number"
                            min="1"
                            max="50"
                            value={data.max_3d_file_mb}
                            onChange={(e) => setData('max_3d_file_mb', e.target.value)}
                            className="w-full text-xs mt-1"
                        />
                    </div>

                    <div>
                        <InputLabel value="Free Tier Product Limit" className="text-xs text-stone-600 font-semibold" />
                        <TextInput
                            type="number"
                            min="1"
                            value={data.free_tier_product_limit}
                            onChange={(e) => setData('free_tier_product_limit', e.target.value)}
                            className="w-full text-xs mt-1"
                        />
                    </div>
                </div>
            </div>

            {/* Payment Gateways */}
            <div className="pt-6 border-t border-stone-100 space-y-4">
                <div className="flex items-center gap-2">
                    <CreditCard className="text-clay-600" size={16} />
                    <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-wider">Payment Integration</h3>
                </div>

                <div className="bg-stone-50 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-xs font-bold text-stone-900 leading-tight">PayMongo E-Wallet Gateway</h4>
                            <p className="text-[9px] text-stone-500 font-medium mt-0.5">Enable direct GCash / Maya payments at checkout.</p>
                        </div>
                        <div
                            onClick={() => setData('paymongo_enabled', !data.paymongo_enabled)}
                            className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer ${data.paymongo_enabled ? 'bg-clay-600' : 'bg-stone-300'}`}
                        >
                            <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-all ${data.paymongo_enabled ? 'left-5' : 'left-0.5'}`} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
